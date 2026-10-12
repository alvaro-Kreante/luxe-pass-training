# Auditoría — Seguridad y acceso a datos

- **Rama / base:** `docs/project-audit` desde `dev` @ `eae116a`
- **Fecha:** 2026-10-12
- **Alcance:** `supabase/schemas/*.sql` (28 archivos), Storage, 15 Edge Functions, reglas Stripe de `CLAUDE.md`, variables `NEXT_PUBLIC_*`, historial git.
- **Método:** lectura estática + consultas de solo lectura al Supabase **local** (`API_URL http://127.0.0.1:54331`, `linked_project: null`) sobre `pg_proc`, `pg_policies`, `pg_class`, `information_schema`, `storage.buckets`, `cron.job`; `supabase db advisors --local`. No se ejecutaron tests, migraciones ni nada remoto. "Confirmado" = verificado en el catálogo local o en código; no se explotó nada.

## Resumen ejecutivo

| ID | Severidad | Título |
|---|---|---|
| SEC-01 | **Crítica** | RPC de recepción ejecutables por `anon` sin autenticación exponen PII y permiten check-in / no-show con cargo sobre cualquier reserva adivinando un código de 6 dígitos |
| SEC-02 | **Alta** | `confirm_booking` acepta un pago `pending`: una reserva de pago queda confirmada aunque el cobro nunca se complete o falle |
| SEC-03 | **Alta** | El bloqueo por intentos fallidos es solo de cliente: `anon` puede resetear el contador de cualquier email o bloquear a cualquier víctima |
| SEC-04 | Media | `stripe-webhook` sin idempotencia ni orden: un evento reenviado puede revertir un `refunded` a `succeeded`, y los errores de escritura devuelven 200 |
| SEC-05 | Media | `email_exists` permite enumerar cuentas a cualquier anónimo |
| SEC-06 | Baja | HTML sin escapar en el email de recibo (`special_requests`, nombre) |
| SEC-07 | Baja | Mensajes de error internos (`error.message` de Postgres/Stripe/Brevo) devueltos al cliente |
| SEC-08 | Baja | CORS `*` en Edge Functions invocadas por el navegador |
| SEC-09 | Baja | Comparación no constante del secreto compartido `x-webhook-secret` |
| SEC-10 | Info | 56 funciones `SECURITY DEFINER` (incl. 31 `admin_*`) ejecutables por `anon` por privilegio por defecto; hoy protegidas solo por el chequeo interno |
| SEC-11 | Info | Guardas de `/admin` y `/partner` solo en cliente (no hay `middleware.ts`) — aceptable porque los datos dependen de RLS/RPC |

## Hallazgos

### SEC-01 — RPC de recepción anónimas: PII + acciones con cargo por fuerza bruta (Crítica, Confirmado)

- **Ubicación:** `supabase/schemas/bookings.sql:343`, `:380`, `:418`, `:436` (`grant execute … to anon, authenticated`); `booking_reference` en `bookings.sql:64-83`; cliente `src/lib/reception.ts`.
- **Evidencia:** `reception_lookup_booking`, `reception_checkin_booking`, `reception_report_no_show` y `reception_today_summary` son `SECURITY DEFINER`, ejecutables por `anon` (`has_function_privilege('anon',…)=t`) y no comprueban `auth.uid()` ni rol. La única "autorización" es conocer `(lounge_id, fecha, LP-XXXXXX)`. El código es `'LP-' || (100000 + hash % 900000)`: 900 000 valores, determinista, sin rate limit en PostgREST. `lounge_id` es público y `p_date` lo elige quien llama (no se ata a la fecha real).
- **Dato expuesto (clasificado):** identificadores directos — nombre completo, email; contacto de emergencia (nombre, relación, teléfono de un tercero); `special_requests`. Masivo: se puede recorrer el espacio de códigos por lounge/fecha.
- **Impacto:** (1) exfiltración de PII de miembros y terceros; (2) `reception_report_no_show` marca la reserva como no-show con `cancellation_fee_cents = 3500` y abre ticket de soporte (trigger `open_support_ticket_for_no_show`); (3) check-in fraudulento invalida el pase real; (4) `reception_today_summary` filtra ocupación de cualquier lounge.
- **Remediación:** exigir sesión de personal: comprobar en el cuerpo que `p_lounge_id in (select public.partner_lounge_ids())` (como ya hacen `partner_checkin_booking`/`partner_guest_list`) y `revoke execute … from anon`; o, si el kiosco debe ser anónimo, un token de dispositivo por lounge guardado en Vault + rate limit y código con entropía real (≥ 8 caracteres aleatorios, no derivado de hash de 6 dígitos). Fijar `p_date` al rango "hoy" en servidor. Limitar las columnas devueltas a lo que la pantalla de recepción necesita.
- **Cierre:** `select has_function_privilege('anon','public.reception_lookup_booking(text,date,text)','execute')` = `f`; un test que llama la RPC con un usuario sin rol partner del lounge recibe error.

### SEC-02 — Reserva confirmada con pago `pending` sin reconciliación (Alta, Confirmado)

- **Ubicación:** `supabase/schemas/bookings.sql:166-178` (`confirm_booking`), `supabase/functions/stripe-webhook/index.ts:53-75`.
- **Evidencia:** `confirm_booking` acepta `p.status in ('pending','succeeded')`. `stripe-create-checkout-session` inserta el `payments` en `pending` antes de cualquier cobro. Cuando llega `payment_failed`/`async_payment_failed` el webhook solo actualiza `payments`; no hay trigger sobre `payments` que cancele la reserva (triggers existentes: `apply_membership_payment`, `credit_referral_on_first_payment`) ni cron que expire pendientes (`cron.job` no tiene ninguno).
- **Impacto:** un miembro autenticado crea la sesión de checkout, no paga (o usa una tarjeta que falla) y llama `confirm_booking(p_payment_id)` directamente: obtiene una plaza confirmada gratis, consumiendo `seats_left`. Incumple la regla "el webhook es la única fuente de verdad del pago".
- **Remediación:** al pasar un pago de day pass a `failed` (o al expirar `pending` > N min, vía cron o `checkout.session.expired`), cancelar la reserva enlazada y liberar plaza; o confirmar la reserva solo desde el webhook (`succeeded`) dejándola en `pending_payment` hasta entonces. Recepción no debe aceptar reservas cuyo pago no esté `succeeded`.
- **Cierre:** test: pago `pending` → `failed` deja la reserva `cancelled`; `reception_checkin_booking` rechaza una reserva sin pago `succeeded`/cobertura.

### SEC-03 — Bloqueo de login solo cosmético y manipulable por anónimos (Alta, Confirmado)

- **Ubicación:** `supabase/schemas/login_attempts.sql:82-84`; `src/app/login/page.tsx:69-110`.
- **Evidencia:** `check_login_lock`, `record_failed_login` y `reset_login_attempts` son `SECURITY DEFINER` ejecutables por `anon` y reciben un email arbitrario. El chequeo de bloqueo ocurre en el navegador antes de `signInWithPassword`; GoTrue no lo conoce.
- **Impacto:** (a) fuerza bruta: el atacante llama `/auth/v1/token` directamente y el lockout no aplica (solo el rate limit por IP de Auth, `sign_in_sign_ups = 200`/5 min); además puede llamar `reset_login_attempts(victima)` a voluntad. (b) DoS: `record_failed_login(victima)` ×5 bloquea la UI de login de cualquier usuario 15 min, repetible.
- **Remediación:** mover el lockout al servidor (Auth Hook / Edge Function que haga el sign-in o `password_verification_attempt` hook de Supabase Auth); revocar `reset_login_attempts` de `anon` y resetear solo para `auth.uid()`'s propio email; captcha/rate limit en Auth.
- **Cierre:** `reset_login_attempts` no ejecutable por `anon`; un `signInWithPassword` directo tras 5 fallos es rechazado.

### SEC-04 — Webhook de Stripe sin idempotencia ni guarda de transición (Media, Confirmado por lectura)

- **Ubicación:** `supabase/functions/stripe-webhook/index.ts:43-110`.
- **Evidencia:** firma verificada correctamente (`constructEventAsync`), pero no se registra `event.id`, no se condiciona la transición (`update … set status='succeeded'` sin `where status in ('pending')`) y los `error` de `service.update` se ignoran devolviendo 200.
- **Impacto:** un reenvío o evento fuera de orden (`checkout.session.completed` tras `charge.refunded`) vuelve un pago reembolsado a `succeeded` y dispara de nuevo `apply_membership_payment`/créditos de referido; un fallo de BD se pierde porque Stripe no reintenta.
- **Remediación:** tabla `stripe_events(id primary key)` con insert-on-conflict; transiciones con estado origen permitido; devolver 5xx si la escritura falla.
- **Cierre:** test que reenvía el mismo evento dos veces y uno `completed` tras `refunded` sin cambiar estado.

### SEC-05 — Enumeración de cuentas vía `email_exists` (Media, Confirmado)

- **Ubicación:** `supabase/schemas/email_exists.sql:17`; uso en `src/lib/registration.ts:47`.
- **Evidencia:** `select exists(select 1 from auth.users where lower(email)=lower(p_email))` ejecutable por `anon`, sin límite.
- **Impacto:** cualquiera confirma si un email es miembro (lista de clientes de un servicio de lujo); combinable con SEC-03.
- **Remediación:** eliminar el pre-chequeo y dejar que `signUp` responda de forma uniforme, o pasar por Edge Function con rate limit/captcha.
- **Cierre:** `has_function_privilege('anon','public.email_exists(text)','execute') = f`.

### SEC-06 — HTML sin escapar en el email de recibo (Baja, Confirmado por lectura)

- **Ubicación:** `supabase/functions/send-booking-receipt/index.ts:124-132`.
- **Evidencia:** `${input.specialRequests}` y `${input.memberFirstName}` se interpolan en HTML sin escape; `_shared/partner-emails.ts:7` sí tiene `escape()`.
- **Impacto:** el propio miembro inyecta HTML en su email (bajo); si el contenido se reenvía a partner/soporte, phishing con la marca.
- **Remediación/cierre:** reutilizar `escape()` del módulo compartido para todo dato de usuario.

### SEC-07 — Fuga de mensajes de error internos (Baja, Confirmado por lectura)

- **Ubicación:** p. ej. `stripe-create-checkout-session/index.ts:97`, `stripe-charge-saved-method/index.ts:75,103`, `admin-partners/index.ts:132-283`, `send-email/index.ts:69,97`, `stripe-webhook/index.ts:36`.
- **Impacto:** detalles de Postgres/Stripe/Brevo al navegador. **Remediación:** mensaje genérico + `console.error` del detalle. **Cierre:** grep `error.message` en respuestas = 0 fuera de errores de validación propios.

### SEC-08 — CORS `Access-Control-Allow-Origin: *` (Baja, Confirmado)

- **Ubicación:** `supabase/functions/_shared/cors.ts:5`. Mitigado porque la auth va en header `Authorization` (no cookie). **Remediación:** allowlist con `APP_URL` por entorno.

### SEC-09 — Comparación no constante del secreto de cron/DB webhook (Baja, Confirmado)

- **Ubicación:** `delete-account/index.ts:28`, `send-admin-report/index.ts:24` y análogos (`send-booking-receipt`, `send-booking-reminder`, `send-partner-*`, `membership-renewal`). **Remediación:** `timingSafeEqual` de `std/crypto`, y rechazar si la variable de entorno está vacía.

### SEC-10 — `EXECUTE` a `anon` en funciones `SECURITY DEFINER` (Info, Confirmado)

- **Evidencia:** 56 funciones definer ejecutables por `anon` (privilegio por defecto de `public`). Las 31 `admin_*` y las `partner_*` comprueban `has_role('admin')`/`partner_lounge_ids()` en el cuerpo; las `notify_*`/`seed_sample_notifications` son triggers (no invocables por RPC). Todas tienen `search_path=''`.
- **Recomendación:** `alter default privileges in schema public revoke execute on functions from anon, public;` y `grant` explícito solo a lo público — defensa en profundidad para que un olvido del chequeo no sea explotable sin sesión.

### SEC-11 — Guardas de rol solo en cliente (Info, Inferido)

- No existe `src/middleware.ts`; `/admin` y `/partner` se protegen en el cliente. Los datos dependen de RLS/RPC con `has_role`, así que no se encontró fuga; queda como nota.

## Matriz de explotabilidad

| ID | Quién | Necesita | Esfuerzo | Escala |
|---|---|---|---|---|
| SEC-01 | Cualquier anónimo | URL + anon key (públicas) y un `lounge_id` | Script trivial, ≤ 900k peticiones por lounge/fecha | Masiva |
| SEC-02 | Miembro autenticado | Cuenta + llamar `confirm_booking` | Bajo | Ilimitada (cada reserva) |
| SEC-03 | Anónimo | Email de la víctima | Trivial | Cualquier cuenta |
| SEC-04 | Stripe (reenvíos) / desorden de eventos | — | No intencional | Puntual |
| SEC-05 | Anónimo | Lista de emails | Trivial | Masiva |
| SEC-06..09 | Varios | — | Bajo | Puntual |

## Controles positivos verificados

- RLS activado en **todas** las tablas de `public` (consulta `relrowsecurity`: 0 tablas sin RLS); ninguna vista (no aplica `security_invoker`).
- Ninguna policy `TO public` en `public`; todas las UPDATE tienen `USING` + `WITH CHECK`. Las tres `USING (true)` (`lounge_closures`, `lounge_images`, `lounge_seasons`) son lecturas de catálogo `TO authenticated`, por diseño.
- `payments`, `memberships`, `user_roles`, `referrals`: solo policy SELECT propia; ninguna escritura de cliente. `memberships` nace solo por trigger `apply_membership_payment` sobre pagos.
- `profiles`: el trigger `guard_profile_managed_columns` impide al cliente tocar `membership_status`, `stripe_customer_id`, `referral_code`. `partner_members`: `partner_members_guard_issued_fields` bloquea `partner_id`, `user_id`, `email`, `suspended_at`.
- Todas las funciones `SECURITY DEFINER` fijan `search_path = ''`.
- Importe decidido en servidor: `dayPassAmountCents()` y `membership_change_quote` (el navegador nunca envía importe). Checkout con `ui_mode: "elements"` sin `payment_method_types`.
- `stripe-webhook` verifica firma; el Auth Hook `send-email` verifica Standard Webhooks; crons/DB webhooks validan `x-webhook-secret` desde Vault; funciones de usuario usan `auth.getUser()`; `stripe-refund-payment` y `admin-partners` comprueban `has_role('admin')` en BD; `stripe-payment-methods` comprueba que el método pertenece al customer antes de `detach`.
- Storage: `profile-photos` privado con policies por carpeta `auth.uid()`; `lounge-images` público solo lectura, escritura solo admin; ambos con límite 5 MB y MIME `image/png,image/jpeg`.
- Cliente: solo `NEXT_PUBLIC_SUPABASE_URL`, `…_PUBLISHABLE_KEY`, `STRIPE_PUBLISHABLE_KEY`, `GOOGLE_MAPS_API_KEY/MAP_ID` (claves públicas por naturaleza; restringir la de Maps por referrer en GCP). `SUPABASE_SERVICE_ROLE_KEY` solo aparece en helpers de test (`src/lib/testing/`, `vitest.global-setup.ts`), no en código de app.
- Historial git: búsqueda pickaxe de patrones `sk_test_/sk_live_`, `whsec_`, `xkeysib-`, JWT — sin coincidencias. Archivos versionados sensibles: solo `supabase/functions/.env.example` y `docs/ci-cd/VAULT-SECRETS.md` (documentación de nombres).
- `supabase db advisors --local`: 0 avisos de seguridad; 2 WARN de rendimiento (múltiples policies permisivas en `partners` y `partner_members`).

## Checks ejecutados

| Check | Estado |
|---|---|
| `supabase status` (local, sin proyecto enlazado) | OK |
| RLS por tabla (`pg_class.relrowsecurity`) | OK — todas |
| Policies (`pg_policies`) — TO, USING(true), WITH CHECK | OK con notas |
| Funciones definer: grants, `search_path`, chequeo de auth | Fallo — SEC-01, SEC-03, SEC-05, SEC-10 |
| Vistas `security_invoker` | N/A (no hay vistas) |
| Grants de tabla a `anon` | Presentes por defecto; neutralizados por RLS (sin policies para anon) |
| Storage buckets/policies | OK |
| Edge Functions: auth, firma, secreto, CORS, errores | Parcial — SEC-04, 07, 08, 09 |
| Reglas Stripe de CLAUDE.md | Parcial — importe OK, membresías OK, webhook fuente de verdad roto por SEC-02 |
| `NEXT_PUBLIC_*` / service role en cliente | OK |
| Secretos en historial git | OK (sin coincidencias) |
| `supabase db advisors --local` | OK (solo perf) |
| Explotación dinámica (llamadas reales a RPC) | No ejecutado — fuera de alcance read-only |
