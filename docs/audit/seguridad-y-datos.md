# Auditoría — Seguridad y acceso a datos

- **Rama / base:** `docs/project-audit` desde `dev` @ `eae116a`
- **Fecha:** 2026-10-12
- **Alcance:** `supabase/schemas/*.sql` (28 archivos), Storage, 15 Edge Functions, reglas Stripe de `CLAUDE.md`, variables `NEXT_PUBLIC_*`, historial git.
- **Método:** lectura estática + consultas de solo lectura al Supabase **local** (`API_URL http://127.0.0.1:54331`, `linked_project: null`) sobre `pg_proc`, `pg_policies`, `pg_class`, `information_schema`, `storage.buckets`, `cron.job`; `supabase db advisors --local`. No se ejecutaron tests, migraciones ni nada remoto. "Confirmado" = verificado en el catálogo local o en código; no se explotó nada.

## Resumen ejecutivo

| ID | Severidad | Título |
|---|---|---|
| SEC-03 | **Alta** | Resuelto en código y en local (hook `password_verification_attempt`); en remoto sigue abierto hasta pasar a plan Team y activar el hook |
| SEC-05 | Media | `email_exists` permite enumerar cuentas a cualquier anónimo |
| SEC-06 | Baja | HTML sin escapar en el email de recibo (`special_requests`, nombre) |
| SEC-07 | Baja | Mensajes de error internos (`error.message` de Postgres/Stripe/Brevo) devueltos al cliente |
| SEC-08 | Baja | CORS `*` en Edge Functions invocadas por el navegador |
| SEC-09 | Baja | Comparación no constante del secreto compartido `x-webhook-secret` |
| SEC-10 | Info | 56 funciones `SECURITY DEFINER` (incl. 31 `admin_*`) ejecutables por `anon` por privilegio por defecto; hoy protegidas solo por el chequeo interno |
| SEC-11 | Info | Guardas de `/admin` y `/partner` solo en cliente (el `middleware.ts` raíz solo refresca la sesión, no comprueba rol) — aceptable porque los datos dependen de RLS/RPC |

## Hallazgos

### SEC-03 — Bloqueo de login solo en el cliente (Alta, abierto solo en remoto)

- **Ya corregido (#52, 13 oct 2026):** `reset_login_attempts` solo reinicia el contador de quien acaba de iniciar sesión con ese email.
- **Ya corregido en código (19 oct 2026):** `hook_password_verification_attempt` (`supabase/schemas/login_attempts.sql`) cuenta cada fallo de contraseña dentro de Supabase Auth, bloquea al quinto y rechaza el login (también con la contraseña correcta) mientras dura el bloqueo. Activo en local vía `config.toml`; test en `src/lib/login-attempts.test.ts`.
- **Falta:** el hook es del plan Team. En `luxepass-dev`/`luxepass-prod` hay que subir de plan y activarlo en Authentication → Hooks (Postgres, `public.hook_password_verification_attempt`); hasta entonces una llamada directa a `/auth/v1/token` no sufre el bloqueo. `record_failed_login` sigue abierto a `anon` (bloquear una cuenta ajena: trade-off de la Story 1.2).
- **Cierre:** en remoto, tras 5 fallos un `signInWithPassword` directo es rechazado.

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

- El `middleware.ts` de la raíz solo llama a `updateSession` (refresco de sesión de Supabase) y no comprueba rol; `/admin` y `/partner` se protegen en el cliente. Los datos dependen de RLS/RPC con `has_role`, así que no se encontró fuga; queda como nota.

## Matriz de explotabilidad

| ID | Quién | Necesita | Esfuerzo | Escala |
|---|---|---|---|---|
| SEC-03 | Anónimo | Email de la víctima | Trivial | Cualquier cuenta |
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
| Funciones definer: grants, `search_path`, chequeo de auth | Fallo — SEC-03, SEC-05, SEC-10 |
| Vistas `security_invoker` | N/A (no hay vistas) |
| Grants de tabla a `anon` | Presentes por defecto; neutralizados por RLS (sin policies para anon) |
| Storage buckets/policies | OK |
| Edge Functions: auth, firma, secreto, CORS, errores | Parcial — SEC-07, 08, 09 |
| Reglas Stripe de CLAUDE.md | OK — importe, membresías y webhook como fuente de verdad |
| `NEXT_PUBLIC_*` / service role en cliente | OK |
| Secretos en historial git | OK (sin coincidencias) |
| `supabase db advisors --local` | OK (solo perf) |
| Explotación dinámica (llamadas reales a RPC) | No ejecutado — fuera de alcance read-only |
