# Auditoría E2E — flujos críticos (local)

Fecha: 12 oct 2026 · Rama: `docs/project-audit` · Ejecución: **solo local**.

## Entorno y alcance

- Supabase local `http://127.0.0.1:54331` (`supabase status` → `linked_project: null`); `.env.local` apunta a `127.0.0.1:54331`, ninguna variable a `*.supabase.co`. Todos los scripts abortan si la URL no es local (`scripts/playwright/audit-e2e/env.mjs`).
- Edge Functions servidas por el contenedor `supabase_edge_runtime_Luxe_Pass` (el de `supabase start`). Había un `stripe listen` corriendo en la máquina: el webhook `stripe-webhook` **sí** llegó en local (los pagos pasan a `succeeded`).
- Stripe en modo test (4242 4242 4242 4242 / 4000 0000 0000 0002).
- Cuentas creadas solo con dominio `@example.com` (`e2e-<flujo>-<Date.now()>@example.com`), así que `cleanTestData` las reconoce. Los partner/admin se dieron de alta replicando `src/lib/testing/confirmed-user.ts` (service role).
- **Incidencia de entorno:** había otro `next dev` (puerto 3000, otra sesión, mismo directorio) escribiendo en el mismo `.next`. Con `next dev -p 3005` hubo recargas completas de HMR (`*.webpack.hot-update.json` 404) y 500 `SyntaxError: Unexpected non-whitespace character after JSON` en `/book/payment`. Por eso la mayor parte de los flujos corrió contra `npm run build` + `next start -p 3005` (`.next-build`, sin HMR). El servidor de la otra sesión no se tocó. Servidor 3005 detenido al acabar.
- Scripts: `scripts/playwright/audit-e2e/*.mjs`. Capturas y logs (consola + red por flujo): `scripts/playwright/audit-e2e/screenshots/` (`*-log.json` = resultado + errores de consola/red).

## Resultados por escenario

| ID | Precondición | Pasos | Esperado | Observado | Estado | Evidencia |
|---|---|---|---|---|---|---|
| F1.1 | Anónimo | `/signup`: datos inválidos → mensajes; datos válidos + modal Terms & Privacy (2 checks) → Create account | Validación de campo; cuenta creada; ir a verificar email | "Enter a valid email address", "Use at least 8 characters", "Both passwords must match"; botón deshabilitado hasta aceptar términos; usuario creado sin confirmar → `/verify-email?email=…` | PASS | `f1-signup-validation.png`, `f1-signup-submitted.png` |
| F1.1b | Email ya registrado | Signup con el mismo email | Mensaje genérico | "An account already exists with this email. Log in instead…" → enumeración de cuentas | PASS (con hallazgo E2E-09) | `f1-signup-duplicate.png` |
| F1.1c | Signup hecho | Recibir email de verificación | Email recibido | Lo envía el Auth Hook vía Brevo real a `@example.com` (no entregable); Mailpit vacío | BLOCKED — envío externo por Brevo, no observable en local | — |
| F1.2 | Miembro confirmado | 6 logins con contraseña errónea | Contador de intentos y bloqueo a los 5 | "4…1 attempts left"; al 5º "Account temporarily locked · 5 failed attempts… Try again in 15 minutes", botón "Locked for 15 minutes" | PASS | `f1-login-locked.png` |
| F1.3 | Cuenta bloqueada | `signInWithPassword` directo a GoTrue con anon key; `rpc reset_login_attempts` como anon | Bloqueo aplicado en servidor | Login directo **obtiene sesión** con la cuenta bloqueada; anon resetea el contador de cualquier email | FAIL → E2E-03 | `f1-f2-log.json` |
| F1.4 | Cuenta ajena | `rpc record_failed_login` ×5 como anon | No permitido | Cuenta víctima queda bloqueada en la UI 15 min (DoS) | FAIL → E2E-03 | `f1-f2-log.json` |
| F1.5 | Miembro | Login correcto | Entra a `/` | `/` | PASS | `f1-login-ok.png` |
| F2.1 | Miembro, geolocalización concedida | `/explore`, modal de ubicación, búsqueda "Ainsworth" y sin resultados | Lista + mapa; filtra | "18 lounges near you", mapa Google con clusters; búsqueda responde | PASS | `f2-explore*.png` |
| F2.2 | Miembro | `/lounges/the-ainsworth` | Ficha | 200, ficha completa | PASS | `f2-lounge-detail.png` |
| F2.3 | Miembro | `/lounges/does-not-exist-xyz` | 404 | Página "404 This page could not be found" pero **HTTP 200** | PASS (nota menor E2E-12) | `f2-lounge-404.png` |
| F2.4 | Miembro | `/explore?map=error` | Estado de error del mapa | Renderiza | PASS | `f2-explore-maperror.png` |
| F3.1 | Miembro sin plan | Reserva 20 oct, tarjeta nueva 4242 + "Save this card" → Confirm and pay | `/book/confirmed`, pago `succeeded` vía webhook, reserva enlazada | Exacto (build de producción). En `next dev` con recarga HMR durante el pago: **pago `succeeded` y ninguna reserva** (2 veces) | PASS en build / ver E2E-04 | `f3-confirmed.png`, `FAIL-F3.1.png` (dev) |
| F3.2 | Miembro | Tarjeta 4000…0002 | Modal de error, nada creado | "Your card has been declined. Nothing was charged… slot still held"; sin reserva. La fila `payments` queda `pending` indefinidamente | PASS (alimenta SEC-02/E2E-05) | `f3-declined.png` |
| F3.3 | Miembro | Doble clic en "Confirm and pay" con tarjeta nueva | Un cobro, una reserva | 1 pago, 1 reserva | PASS | `f3-doubleclick.png` |
| F3.6b | Miembro con tarjeta guardada | Doble clic en "Confirm and pay" con la tarjeta guardada | Un cobro, una reserva | **2 cobros de $81.66 y 2 reservas** para el mismo slot (28 oct 8:00) | FAIL → E2E-01 | `f3-saved-card-dblclick.png`, `f3c-log.json` |
| F3.4 | Miembro | Recargar en `/book/payment` y en `/book/summary` | Conserva el borrador o avisa | Vuelve a `/book` paso 1, borrador perdido, sin mensaje | PASS con observación (E2E-04) | `f3-reload-*.png` |
| F3.5 | Reserva recién pagada | Botón atrás desde `/book/confirmed` y volver a pulsar pagar | No duplica | Vuelve a summary; el segundo intento falla (Stripe 400, sesión ya completada); no se crea otra reserva ni cobro | PASS | `f3-back-after-confirm.png` |
| F3.6 | Miembro | Marcar "Save this card" y pagar; volver al paso 2 | La tarjeta aparece | Aparece ("VISA", "Use a new card") tras cargar; la primera captura muestra un flash del miembro de muestra "Alexandra Rivas · Annual member" | PASS (E2E-11) | `f3-saved-cards*.png` |
| F4.1 | Reserva de hoy | `/my-pass` y `/my-pass/LP-…` | Lista + QR | Lista y QR que codifica el LP | PASS | `f4-my-pass-list.png`, `f4-my-pass-qr.png` |
| F4.2 | Miembro | `/my-pass/LP-000001` (inexistente) | Estado "no encontrado" | Muestra la lista de "My bookings" | PASS | `f4-my-pass-unknown.png` |
| F4.3 | Navegador **sin sesión** | `/reception` → buscar LP → Check in | Requiere personal autenticado | Sin login: muestra nombre + email del miembro y hace check-in (`in_progress`) | PASS funcional / FAIL de seguridad (SEC-01) | `f4-reception-found.png`, `f4-reception-checked-in.png` |
| F4.4 | Recepción | LP inexistente | "Not recognised" | "Not recognised · No booking matches…" | PASS | `f4-reception-notfound.png` |
| F4.5 | Recepción | Mark no-show | `completed`, `no_show`, fee 3500 | Exacto | PASS | `f4-reception-noshow.png` |
| F4.6 | Ya con check-in | Buscar otra vez | Muestra estado | "Checked in ✓", pero badge "Valid booking" y "Checked in at" como ISO crudo `2026-10-12T21:23:26.399638+00:00` | PASS (E2E-10) | `f4-reception-repeat.png` |
| F4.7 | Check-in hecho | Miembro abre su pase | Pase "Checked in" (AC "Check-in confirmation to member's app") | Sigue "Your digital pass · **Valid · in 2 days**" para una visita de hoy ya con check-in | FAIL → E2E-06 | `f4-my-pass-after-checkin.png` |
| F5.1 | Reserva pagada a 14 días | `/my-pass` → Cancel → "Cancel booking" (doble clic) | Cancelada gratis; reembolso | `cancelled`, sin fee; segundo clic → 400 inocuo. **El pago sigue `succeeded`, sin reembolso** | FAIL → E2E-07 | `f5-cancel-modal.png`, `f5-cancelled.png` |
| F5.1b | Pase individual | Botones "Cancel visit" / "Add to calendar" en `/my-pass/[reference]` | Abren su acción | No hacen nada (botones sin handler) | FAIL → E2E-08 | `FAIL-F5.1.png` |
| F6.1 | Miembro sin plan | `/profile/membership/plans` → Choose monthly → 4242 → "Pay $249.00 and join" | Plan activo tras el webhook | `memberships` monthly `active`; pago `succeeded` 24900 | PASS | `f6-upgrade-modal.png`, `f6-upgrade-result.png` |
| F6.2 | Miembro | `insert`/`update` directos a `memberships` | Denegado | insert 42501; update de otro → 0 filas | PASS | `f6-log.json` |
| F6.3 | Miembro con plan | `/profile/membership/referrals`; anónimo abre `/join/<code>` y `/join/NOPE-INVALID` | Redirige al signup con `ref` | Ambos acaban en `/signup` (el inválido sin aviso) | PASS | `f6-referrals.png`, `f6-join-*.png` |
| F7.1–7.2 | Usuario partner de The Ainsworth | `/partner/login` → dashboard, guests, analytics | Datos del propio partner | Correcto | PASS | `f7-partner-*.png` |
| F7.3 | Partner | `/admin/members` | Denegado | Redirige a `/admin/login` | PASS | `f7-partner-to-admin.png` |
| F8.1 | Admin | members, partners, lounges, support, analytics, reports | 200 | Todas 200 y renderizan | PASS | `f8-admin-*.png` |
| F8.2–8.3 | Miembro sin rol / anónimo | `/admin/*`, `/partner/*`, `/my-pass` | Redirección a login | `/admin/login`, `/partner/login`, `/login` | PASS | `f8-member-to-*.png`, `f8-anon-mypass.png` |
| F9.1–9.2 | Viewport 390×844 | 10 rutas | Sin scroll horizontal | Desbordan: `/reception` 566px, `/lounges/the-ainsworth` 598, `/book` 676, `/my-pass` 599, `/profile` 948, `/profile/membership/plans` 686 (ok: `/login`, `/signup`, `/`, `/explore`) | FAIL → E2E-13 | `m390-*.png` |
| F9.3 | Teclado | `/login`: Tab y Enter | Orden lógico, submit con Enter | email → password → mostrar → remember → forgot → LOG IN → create; Enter envía | PASS | `f9-log.json` |
| F9.4 | Teclado | `/signup`: Tab hasta el checkbox de términos + Space | Accesible | Alcanzable; Space abre el modal Terms & Privacy (diseño) | PASS | `f9-signup-kbd-space.png` |
| F9.5 | Teclado | `/lounges/…/book`: Tab | Días y franjas alcanzables | Navegación → mes siguiente → días habilitados uno a uno | PASS | `f9-kbd-book-focus.png` |
| CON | Todos | Errores de consola/red | Ninguno inesperado | Solo 400 esperables (login fallido, Stripe al re-confirmar una sesión ya pagada, 2º `cancel_booking`) y `_rsc` abortados por navegación; ningún `pageerror` en el build | PASS | `*-log.json` |

## Confirmación de SEC-01 / SEC-02

Script `scripts/playwright/audit-e2e/sec-01-02.mjs` (+ `sec-anon-noshow.mjs`), salida en `sec-01-02.log`. Anon key leída de `.env.local`, nunca impresa.

- **SEC-01 — CONFIRMADO.** Con un cliente `anon` sin sesión, `rpc('reception_lookup_booking', {the-ainsworth, 2026-10-15, LP-596559})` devolvió `member_name`, `member_email`, `status`, `special_requests` y los campos de contacto de emergencia (nulos en este caso). `reception_today_summary` también responde a anon. `reception_report_no_show` como anon cerró la reserva en `completed / no_show=true / cancellation_fee_cents=3500`. El código tiene el formato `LP-` + 6 dígitos (10⁶ combinaciones por lounge y fecha). La UI `/reception` hace lo mismo sin login (F4.3).
- **SEC-02 — CONFIRMADO.** Un miembro sin plan llama a `stripe-create-checkout-session` (crea un pago `pending` de 8166) y, **sin pagar**, `rpc('confirm_booking', … p_payment_id)` → reserva `confirmed` (2026-10-15 morning) y el pago queda `pending` con `booking_id` enlazado. Además, la tarjeta rechazada de F3.2 deja otro pago `pending` reutilizable del mismo modo.

## Hallazgos

| ID | Severidad | Resumen |
|---|---|---|
| E2E-01 | Alta | Doble clic en "Confirm and pay" con tarjeta guardada → 2 cobros y 2 reservas |
| E2E-02 | Crítica | = SEC-01 confirmado en E2E (recepción anónima: PII + check-in/no-show con cargo) |
| E2E-03 | Alta | Bloqueo de login solo en cliente: se salta llamando a GoTrue directo; anon puede resetearlo o bloquear cuentas ajenas |
| E2E-04 | Media | Cobro sin reserva si la página se recarga entre el cobro y `confirm_booking`; borrador no persiste |
| E2E-05 | Alta | = SEC-02 confirmado (reserva con pago `pending`; pagos rechazados quedan `pending` para siempre) |
| E2E-06 | Media | El pase no refleja el check-in y calcula mal "in 2 days" para una visita de hoy |
| E2E-07 | Alta | Cancelar a tiempo una reserva pagada no reembolsa el cobro |
| E2E-08 | Media | "Cancel visit" y "Add to calendar" del pase individual no hacen nada |
| E2E-09 | Baja | Signup revela si un email ya tiene cuenta |
| E2E-10 | Baja | Recepción: "Valid booking" en una reserva ya con check-in y hora en ISO crudo |
| E2E-11 | Baja | Mientras carga, el shell muestra al miembro de muestra "Alexandra Rivas · Annual member" |
| E2E-12 | Baja | Lounge inexistente responde HTTP 200 con texto 404; fechas duplicadas en la copy de cancelación |
| E2E-13 | Media | Desbordamiento horizontal a 390px en 6 pantallas |

### E2E-01 — Doble cobro con tarjeta guardada (Alta)
- **Ubicación:** `src/app/lounges/[id]/book/summary/page.tsx` (`handleConfirm` sin guarda de "en curso"), `src/components/booking/confirm-payment-rail.tsx` (`disabled={!canConfirm}` no contempla envío en curso), Edge Function `stripe-charge-saved-method` (sin idempotency key).
- **Repro:** miembro con tarjeta guardada → reservar → paso 2 elegir "VISA ·4242" → summary → aceptar términos → doble clic en "Confirm and pay". Observado: pagos `46ecc264…` y `41a4f902…` (`succeeded`, 8166 cada uno, con 1 s de diferencia) y reservas `b70a986b…` / `90f0fb58…` para 2026-10-28 8:00.
- **Impacto:** cobro duplicado real al cliente; dos plazas consumidas.
- **Remediación:** estado `submitting` que deshabilite el botón y haga return temprano en `handleConfirm`; idempotency key en `paymentIntents.create` (p. ej. hash de miembro+lounge+fecha+franja+intento); restricción única en servidor sobre una reserva activa por miembro/lounge/fecha/franja.
- **Cierre:** test Vitest que dispare dos clics y verifique una sola llamada; repetir F3.6b → 1 pago y 1 reserva.

### E2E-02 — Recepción anónima (Crítica) = SEC-01
- **Ubicación:** `supabase/schemas/bookings.sql` (`grant execute … to anon` en `reception_lookup_booking`, `reception_checkin_booking`, `reception_report_no_show`, `reception_today_summary`); `src/app/reception/page.tsx` sin login.
- **Repro:** ver §SEC-01 y F4.3–F4.5.
- **Impacto:** exposición de PII (nombre, email, contacto de emergencia) y check-in/no-show con fee de $35 sobre reservas ajenas, adivinando un código de 6 dígitos.
- **Remediación y cierre:** las de SEC-01 en `seguridad-y-datos.md` (revocar `anon`, sesión de personal con rol y pertenencia al lounge). Cierre: el script `sec-01-02.mjs` debe recibir error de permiso en las cuatro RPC.

### E2E-03 — Bloqueo de login evitable y abusable (Alta)
- **Ubicación:** `src/app/login/page.tsx` (el cliente llama a `check_login_lock`, `record_failed_login` y `reset_login_attempts`); `supabase/schemas/login_attempts.sql:82-84` (las tres con `grant … to anon`).
- **Repro:** `f1-f2-auth-explore.mjs` F1.3/F1.4: con la cuenta bloqueada, `supabase.auth.signInWithPassword` directo devuelve sesión; `rpc('reset_login_attempts',{p_email})` como anon pone `locked=false`; `rpc('record_failed_login')` ×5 sobre un email ajeno lo bloquea.
- **Impacto:** no protege contra fuerza bruta (solo la UI respeta el bloqueo); cualquiera puede desbloquear o bloquear cuentas ajenas (DoS a miembros).
- **Remediación:** mover el contador a servidor (Auth Hook / rate limit de GoTrue / Edge Function de login); revocar `anon` en `reset_login_attempts` y `record_failed_login` o ligarlos a un resultado real de autenticación.
- **Cierre:** con 5 fallos, `signInWithPassword` directo falla; anon no puede llamar `reset_login_attempts`.

### E2E-04 — Cobro sin reserva al recargar durante el pago (Media)
- **Ubicación:** `src/components/booking/booking-context.tsx` (borrador solo en memoria), `summary/page.tsx` (cobro y `confirm_booking` en dos pasos del cliente), `stripe-webhook` (no crea la reserva).
- **Repro:** observado dos veces con `next dev` (una recarga HMR tras el clic en "Confirm and pay"): pagos `cf001402…` y otro posterior `succeeded` con `booking_id = null` y la página vuelve a `/book`. Equivalente en producción: cerrar la pestaña o perder red justo después de confirmar en Stripe. F3.4: recargar en payment/summary devuelve al paso 1 sin aviso.
- **Impacto:** el cliente paga y no tiene reserva; solo se arregla por soporte.
- **Remediación:** que el webhook (o una reconciliación) cree/complete la reserva a partir de la metadata de la Checkout Session (`lounge_id`, `date`, `band`, `slot_time` ya están), o reembolse automáticamente los pagos `succeeded` sin `booking_id` tras N minutos.
- **Cierre:** simular la interrupción (cerrar la página tras `checkout.confirm`) → en <N min existe la reserva o el reembolso.

### E2E-05 — Reserva con pago `pending` (Alta) = SEC-02
- **Ubicación:** `supabase/schemas/bookings.sql` `confirm_booking` (`p.status in ('pending','succeeded')`).
- **Repro:** §SEC-02; además F3.2 deja pagos `pending` tras un rechazo (no se pasan nunca a `failed`).
- **Impacto:** reservas de pago sin cobro.
- **Remediación/cierre:** las de SEC-02; además marcar como `failed`/`canceled` los pagos rechazados o expirados (`checkout.session.expired`, `payment_intent.payment_failed`). Cierre: `sec-01-02.mjs` recibe `Invalid payment for this booking`.

### E2E-06 — El pase no refleja el check-in (Media)
- **Ubicación:** `src/app/my-pass/[reference]/page.tsx:49-51` (estado por `?state=`, no por datos) y el cálculo de "Valid · in N days".
- **Repro:** reserva de hoy → check-in en `/reception` (DB `in_progress`, `checked_in_at`) → el miembro abre `/my-pass/LP-762554`: "Valid · in 2 days", sin estado Checked in.
- **Impacto:** incumple el AC "Check-in confirmation to member's app" de la Story 5.2; información de fechas incorrecta.
- **Remediación:** derivar el estado del pase de `bookings.status/checked_in_at/date` (los query params solo como override de demo) y calcular "in N days" con la misma referencia de "hoy" que la recepción.
- **Cierre:** tras F4.3 el pase muestra el estado Checked in; una visita de hoy muestra "today".

### E2E-07 — Cancelación a tiempo sin reembolso (Alta)
- **Ubicación:** `cancel_booking` en `supabase/schemas/bookings.sql`; el reembolso solo existe en el flujo admin (`stripe-refund-payment`, `src/lib/admin.ts:622`).
- **Repro:** F5.1: reserva de $81.66 a 14 días → modal "Free cancellation… Nothing is charged" → `cancelled`; el pago `99246ebe…`/`80357c93…` sigue `succeeded`, `refunded_amount_cents = null`.
- **Impacto:** el miembro paga una visita cancelada dentro de plazo; contradice la copy de la UI ("Free cancellation up to 24 hours").
- **Remediación:** decidir con el cliente (no está en `PENDIENTES.md`) y, si aplica, que la cancelación gratuita de una reserva pagada dispare el reembolso (Edge Function) y lo refleje en la UI.
- **Cierre:** cancelar >24 h una reserva pagada deja el pago `refunded`, o la copy deja claro que no se reembolsa.

### E2E-08 — Botones inertes en el pase (Media)
- **Ubicación:** `src/app/my-pass/[reference]/page.tsx:231-236` (`<button type="button">` sin `onClick` para "Add to calendar" y "Cancel visit").
- **Repro:** abrir un pase próximo → pulsar "Cancel visit": no se abre ningún diálogo (`FAIL-F5.1.png`). La cancelación solo funciona desde la lista `/my-pass`.
- **Impacto:** el CTA principal del pase no funciona.
- **Remediación:** conectar `CancelBookingModal` y `AddToCalendarModal` (ya existen).
- **Cierre:** test de la página que abra los dos modales.

### E2E-09 — Enumeración de cuentas en signup (Baja)
- **Ubicación:** `src/app/signup/page.tsx` (mensaje "An account already exists with this email").
- **Impacto:** permite saber si un email es miembro (privacidad en un club exclusivo).
- **Remediación:** respuesta neutra ("Revisa tu correo") y aviso por email al titular. **Cierre:** el mismo mensaje para un email nuevo o existente.

### E2E-10 — Detalle visual de recepción (Baja)
- `f4-reception-repeat.png`: badge "Valid booking" en una reserva ya con check-in y "Checked in at" como ISO crudo. Remediación: formatear la hora y usar un badge "Checked in". Cierre: captura corregida.

### E2E-11 — Flash del miembro de muestra (Baja)
- **Ubicación:** `src/lib/current-member.ts` (estado inicial `SAMPLE_MEMBER`).
- **Impacto:** un miembro free ve por un momento "Alexandra Rivas · Annual member" (`f3-saved-cards.png`), lo que confunde y parece una fuga de datos.
- **Remediación:** estado inicial vacío o skeleton. **Cierre:** la captura inmediata tras navegar no muestra datos de muestra.

### E2E-12 — Detalles menores (Baja)
- `/lounges/<id inexistente>` devuelve HTTP 200 con la página 404 (renderizado cliente): usar `notFound()` en el servidor.
- Copy de fechas duplicada: "Monday, October 26, Monday, October 26 · arrive 8:00 AM" en el modal de cancelación y la lista de `/my-pass`.
- Un miembro sin plan ve "Visits this month 4 of 8" en `/my-pass`.

### E2E-13 — Desbordamiento a 390px (Media)
- **Repro:** `f9-mobile-keyboard.mjs`, `scrollWidth/clientWidth`: `/reception` 566/390, `/lounges/the-ainsworth` 598, `/lounges/the-ainsworth/book` 676, `/my-pass` 599, `/profile` 948, `/profile/membership/plans` 686.
- **Impacto:** scroll horizontal en móvil en pantallas de reserva y cuenta (la app es PWA).
- **Remediación:** revisar los anchos fijos y los grids de esas pantallas (patrones de capa 2) para que pasen a una columna; documentar las desviaciones en `COMPONENT-MAP.md`.
- **Cierre:** `scrollWidth == 390` en las 6 rutas y revisión visual de `m390-*.png`.

## Limitaciones

- Email (verificación, recibos): BLOCKED, se envía por Brevo real; no se puede observar en local con destinatarios `@example.com`.
- E2E-04 se reprodujo con una recarga forzada por el entorno, no con un corte de red controlado; el mecanismo (cobro y reserva en dos pasos del cliente, sin compensación en el webhook) se confirmó leyendo el código.
- Los datos de test (reservas de hoy creadas con service role para F4, cuentas `@example.com`) quedan hasta la próxima corrida de `cleanTestData`.
