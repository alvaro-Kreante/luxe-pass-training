# Arquitectura de integraciones — LuxePass

Detalle técnico de cada integración con Supabase, Stripe y Brevo (movido desde `CLAUDE.md`, 25 sept 2026). Las reglas vivas que hay que seguir siempre siguen resumidas en `CLAUDE.md`.

### Envío de email transaccional (Auth Hook + Brevo)

Desde Story 1.1/1.2, el email de confirmación y de recovery no usa el SMTP
simulado de Supabase (Inbucket/Mailpit) — Auth llama al Hook `send_email`
(`[auth.hook.send_email]` en `config.toml`), que invoca la Edge Function
`supabase/functions/send-email`, la cual despacha el correo real vía Brevo.

- **Secrets de la function** — nunca commitear: `supabase/functions/.env`
  (gitignored vía el `.env` del `.gitignore` raíz), plantilla en
  `supabase/functions/.env.example`. Incluye `BREVO_API_KEY`,
  `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `SEND_EMAIL_HOOK_SECRET`,
  `APP_URL`, `APP_ENV`.
- **`APP_URL` no es `auth.site_url` ni `email_data.site_url`** del payload
  del hook — ese último campo resuelve al puerto del API de Supabase
  (`127.0.0.1:54331` en local), no al dev server de Next. `APP_URL` es su
  propio secret (`http://127.0.0.1:3000` en local); si `npm run dev` corre
  en otro puerto en tu máquina, ajustarlo ahí y reiniciar Supabase.
- **Regla del subject: prefijo de ambiente entre corchetes.** El asunto de
  cada correo lleva `[LOCAL]`, `[STAGING]` o `[PROD]` según el secret
  `APP_ENV` de esa function (`send-email/index.ts` lo antepone al subject de
  cada plantilla) — así se distingue de un vistazo de qué ambiente vino un
  correo de prueba. Nunca se pone a mano en Brevo ni en el template.
- **En `LOCAL`, los destinatarios de test no reciben email.** La suite
  completa agotaba la cuota diaria de Brevo (25 sept 2026):
  `_shared/brevo.ts` no envía cuando `APP_ENV=LOCAL` y el destinatario es
  de un dominio de test (`*-test.com`, `example.*`, `email.com`,
  `_shared/test-recipient.ts`) — solo lo registra en el log de la
  function. Un email real en local sí se envía; en staging/prod, siempre.
- **Sin `APP_ENV`, nada sale (29 sept 2026).** El runner de GitHub Actions
  (`ci.yml`) no define `APP_ENV` ni tiene clave de Brevo: `emailSkipReason`
  (`_shared/test-recipient.ts`, con test en Vitest) devuelve
  `"no-environment"` y `_shared/brevo.ts` solo lo registra. Los tests
  solo pueden mandar emails desde local; subir a GitHub nunca envía nada.
- **Staging/prod:** el hook se registra **a mano**, una vez por proyecto
  remoto, en su dashboard (`Authentication` → `Hooks` → `Send Email`) —
  nunca vía `supabase config push`, que sincroniza *todo* `config.toml`
  contra el proyecto remoto (no solo el hook) y arriesga pisar `site_url`,
  redirect URLs u otra config de Auth puesta a mano en el dashboard.
  Ya hecho para `luxepass-dev` y `luxepass-prod`; detalle del rollout
  (orden de pasos, secrets de GitHub, los 4 bugs reales que salieron en el
  camino) en `docs/ci-cd/RESUMEN.md` y `docs/PENDIENTES.md` → Resueltos.
  Wiring de CI (`supabase functions deploy` + `supabase secrets set`) en
  `.github/workflows/deploy.yml`.
- **Rate limit de Auth: también a mano, por proyecto remoto.** Un proyecto
  Supabase nuevo trae `Authentication → Rate Limits → Rate limit for
  sending emails` en 2/hora por defecto, y ese límite **aplica aunque el
  envío real vaya por el Hook a Brevo** — no es el mailer nativo el que lo
  dispara, es un límite general del endpoint de Auth. Sin subirlo, el
  signup funciona un par de veces y luego el resto de flujos (recovery,
  resend) fallan en silencio: nada en los logs de la function, el hook ni
  se invoca. Súbelo junto con el registro del hook, antes de dar por
  probado un ambiente nuevo.

## Procesamiento de pagos (Stripe)

Decisión de alcance (17 sept 2026, revierte la nota original de
`docs/DATA-MODEL-MAP.md` que era válida solo durante el periodo de mockup):
Story 4.2 se implementa contra **Stripe real, en modo test** durante
desarrollo — no se simula. Motivo completo en "Alcance" §Procesamiento de
pagos real (Story 4.2).

**Cuenta:** una sandbox de Stripe propia de este proyecto (no el test mode
compartido de una cuenta), creada el 17 sept 2026 con
`stripe sandbox create --from-git` — `account_id` `acct_1UGUm6IBtxcBzVZb`.
**Ya reclamada** (21 sept 2026, `stripe sandbox claim` + `stripe login
--complete-device`), asociada a una cuenta Stripe real — ya no expira.
**Ojo: reclamar no cambia la clave ya emitida.** La clave `rkcs_test_…`
de antes del claim siguió funcionando, pero con el rate limit bajo de
"claimable sandbox" (la suite completa lo agotaba: "Claimable sandbox
request rate limit exceeded"); el 23 sept 2026 se sustituyó por una clave
de test normal (`sk_test_…`) creada en el Dashboard de la sandbox ya
reclamada, en `supabase/functions/.env`, `.env.local` y el secret de
GitHub `STRIPE_SECRET_KEY` (CI). Claves guardadas en `.env.local`
(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` para los
fixtures de test) y `supabase/functions/.env` (`STRIPE_SECRET_KEY`) —
ninguno de los dos archivos se comitea. **Vercel ya está montado** (staging/prod, ver
"Infraestructura real ya montada" más arriba) — lo pendiente es dar de alta
ahí `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (puede ser esta misma sandbox
reclamada, o una independiente por ambiente — decisión de producto, no
técnica) **y** ampliar `deploy.yml` para que despliegue las Edge Functions
de Stripe/recibo de reserva y sus secrets — hoy solo despliega `send-email`.
Ver `docs/PENDIENTES.md` §4.6.

Lo ya decidido, a seguir al implementar Story 4.2:

- **Checkout Sessions con `ui_mode: 'elements'` + Payment Element** — no un
  `PaymentIntent` crudo ni el Checkout hospedado/embebido de Stripe: el
  formulario de tarjeta vive dentro de la propia pantalla del design system
  (`Payment.dc.html`), con la sesión de Checkout gestionando el estado detrás.
- **Nunca pasar `payment_method_types`** a `checkout.sessions.create` — se
  omite para activar *dynamic payment methods* (Stripe decide qué métodos
  mostrar); Apple Pay/Google Pay simplemente no aparecerán sin dominio
  verificado (ver más abajo), no hace falta excluirlos a mano.
- **Sin route handlers de Next.js.** Mismo patrón que `send-email`: la
  lógica de servidor (crear la Checkout Session, verificar la firma del
  webhook) vive en Supabase Edge Functions, no en `src/app/api/`.
- **El webhook es la única fuente de verdad del `status` de `payments`.**
  El cliente nunca marca un pago como exitoso tras el submit. El handler
  escucha `checkout.session.completed` y `checkout.session.async_payment_succeeded`
  (fulfilment solo si `payment_status` no es `unpaid`) y
  `checkout.session.async_payment_failed` para el fallo — igual que Auth
  decide el resultado real del signup, no el formulario.
- **Instanciar `StripeClient`** (`new Stripe(secretKey)` vía SDK de Node en
  la Edge Function, import `npm:stripe` en Deno) y llamar sobre esa
  instancia — nunca el patrón global/deprecado (`stripe.api_key = …`).
- **Secrets de las functions** (mismo patrón que `BREVO_*`):
  `STRIPE_SECRET_KEY` (clave de test normal, `sk_test_`/`rk_test_` — nunca la `rkcs_` de sandbox sin reclamar) y `STRIPE_WEBHOOK_SECRET`.
  La clave publicable (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) es la única que
  sí llega al cliente, para `@stripe/stripe-js`/`@stripe/react-stripe-js`.
- **Modo test en local y en `staging`**; cambiar a claves live en `main`
  solo con confirmación explícita — no asumirlo como parte de la historia.
- **Prueba local del webhook**: Stripe CLI (`stripe listen --forward-to`)
  apuntando a la Edge Function servida localmente (`supabase functions
  serve`), igual que Brevo se prueba contra Supabase local antes de tocar
  remoto.
- **Apple Pay / Google Pay quedan fuera de esta conexión real.** El Payment
  Element de Stripe los ofrece automáticamente, pero exigen un dominio
  verificado ante Stripe/Apple que no funciona en `localhost` ni sin el
  rollout de Vercel (ver `docs/PENDIENTES.md` §4.4, mismo tipo de gap de
  infraestructura). Los botones pueden quedar visualmente presentes pero
  inertes hasta ese rollout — anotarlo como desviación en
  `COMPONENT-MAP.md` al implementar, no como criterio simulado de la
  historia.
- **Tabla `payments`** (dueño Epic 4, ver `docs/DATA-MODEL-MAP.md`):
  columnas exactas, RLS y su relación con `bookings` se deciden con TDD al
  implementar Story 4.2 — este archivo no lista columnas (ver "Schema
  management" arriba).

## Email de recibo de reserva (Database Webhook)

Story 4.2/5.1 — desde el 18 sept 2026, el recibo de reserva (`Receipt.dc.html`)
se envía de verdad para toda reserva `confirmed`, con o sin pago. Motivo
completo en "Alcance" §Email de recibo de reserva real.

**Por qué no es un Auth Hook como `send-email`.** Los Auth Hooks de Supabase
solo cubren eventos de Auth (signup, recovery) — "se confirmó una reserva" es
un evento de negocio sobre una tabla cualquiera, sin hook nativo. El
mecanismo equivalente es un **Database Webhook**: un trigger `AFTER INSERT`
en `bookings` que, solo cuando `status = 'confirmed'`, llama de forma
asíncrona (extensión `pg_net`) a la Edge Function `send-booking-receipt` —
primer uso de este mecanismo en el proyecto, ver
`supabase/schemas/booking_receipts.sql`.

**Autenticación: secreto compartido en Supabase Vault, no un JWT.** Postgres
no tiene sesión de usuario que pasarle a la function, así que no hay
`verify_jwt` que aplicar (`[functions.send-booking-receipt]` en
`config.toml` lo desactiva, igual que `stripe-webhook`). El trigger lee la
URL de la function y un secreto compartido desde
`vault.decrypted_secrets` (nunca hardcodeados en el schema versionado — la
URL cambia por ambiente y el secreto no debe comitearse) y los manda en la
cabecera `x-webhook-secret`, que la function verifica contra su propio
secret `BOOKING_RECEIPT_WEBHOOK_SECRET`. Alta de los dos secretos, **una vez
por proyecto** (local/dev/prod), igual que el resto de secretos de este
epic — nunca vía `supabase config push`:
*(Alta de secretos de Vault: ver `docs/ci-cd/VAULT-SECRETS.md`.)*
**Sin los dos secretos dados de alta, el trigger no hace nada** (guard
explícito en la función, `if v_url is null or v_secret is null then return
new`) — nunca falla el insert de la reserva por esto, y **no hace falta
desactivarlo a mano en CI** como sí exige el Auth Hook de Epic 1
(`ci.yml` nunca crea estos secretos de Vault, así que el trigger es un
no-op ahí sin tocar nada).

**Networking local: `host.docker.internal`, no `127.0.0.1`.** Postgres
corre en su propio contenedor Docker — `127.0.0.1` ahí apunta al contenedor
mismo, no al host. Verificado con `net.http_get`/`net.http_post` directo
contra el gateway (`supabase_kong_<project_id>`, puerto 54331) antes de dar
por buena la URL.

**Pago todavía `pending` al confirmar la reserva.** Con tarjeta nueva, el
`status` de `payments` pasa a `succeeded` cuando el webhook de Stripe lo
confirma — asíncrono, sin garantía de haber llegado ya cuando
`confirm_booking` inserta la reserva (el cliente llama a ambos casi
seguidos). `send-booking-receipt` reintenta unos segundos
(`findSettledPayment`, 3 intentos con 1s de espera) antes de componer el
email con el estado que tenga — por eso el trigger usa un timeout de 15s en
`net.http_post`, no los 5s por defecto (un timeout corto cortaba la llamada
a mitad de esa espera — bug real encontrado verificando con Playwright el
flujo completo, no con curl/psql sueltos).

**Brevo compartido con `send-email`.** El envío real (misma cuenta Brevo,
mismos secrets `BREVO_*`) se factorizó a `supabase/functions/_shared/brevo.ts`,
del que ahora dependen las dos functions — antes cada una llamaba a la API
de Brevo por su cuenta.

## Check-in de recepción (RPC de kiosco)

Story 5.2 — desde el 21 sept 2026, `/reception` verifica y actualiza
reservas de verdad. Motivo completo en "Alcance" §Check-in de recepción
real.

**Por qué RPC de kiosco y no un login de staff.** `docs/DATA-MODEL-MAP.md`
deja la decisión de rol (member/partner/admin) sobre `auth.users`
explícitamente para "en cuanto se empiece Epic 7, no antes" — construir un
login de personal solo para desbloquear Epic 5 habría adelantado esa
decisión fuera de tiempo. En su lugar, `reception_lookup_booking`/
`reception_checkin_booking`/`reception_report_no_show`/
`reception_today_summary` (`supabase/schemas/bookings.sql`) son funciones
`SECURITY DEFINER` concedidas a `anon` — autorizadas solo por conocer el
LP# de hoy en el lounge correcto, igual que un lector físico de QR en el
mostrador. `/reception` sigue sin sesión de miembro ni de personal, como ya
fijaba `docs/PENDIENTES.md` §2.7 antes de conectar este módulo.

**`p_date`, no `current_date`.** Todo el proyecto trabaja sobre el "hoy" de
mockup fijo (`TODAY` en `src/lib/availability.ts`, `2025-09-09`) — las
cuatro funciones reciben la fecha como parámetro explícito (que el cliente
manda como `TODAY`) en vez de asumir el reloj real de Postgres, mismo
criterio que `confirm_booking` recibe `p_date` en vez de asumirlo.

**Cuando llegue el login de staff de Epic 7**, ese es el momento de
endurecer estas RPC a exigir sesión en vez de `anon` — no antes, ver
`docs/PENDIENTES.md` §2.7.

## Recordatorio de reserva (pg_cron)

Story 5.3 — desde el 21 sept 2026, "receive an email 24 hrs before the
booking time" se envía de verdad. Motivo completo en "Alcance" §Recordatorio
de reserva real.

**Primer job programado del proyecto.** A diferencia de los Database
Webhooks de arriba (evento: un insert dispara la llamada), aquí no hay
ninguna escritura que lo dispare — el disparador es el propio paso del
tiempo. `pg_cron` (`supabase/schemas/booking_reminders.sql`) corre
`dispatch_booking_reminders()` cada 30 minutos, que a su vez llama
(`pg_net`, mismo mecanismo que `booking_receipts.sql`) a la Edge Function
`send-booking-reminder` por cada reserva `confirmed` cuya llegada
(`booking_arrival_at(date, slot_time)`) cae en la ventana "ahora + 24h" y
sin recordatorio ya mandado (`bookings.reminder_sent_at`, la guarda contra
reenvíos si el cron vuelve a correr dentro de esa misma ventana).

**Aquí `now()` sí es el reloj real, a propósito** — a diferencia de las
funciones de recepción de arriba: "24 horas antes de la reserva" es un
intervalo de verdad, no el "hoy" de mockup de la app.

**Autenticación y alta de secretos: mismo patrón que el recibo de
reserva** (Supabase Vault, no JWT — Postgres no tiene sesión de usuario;
`[functions.send-booking-reminder]` en `config.toml` desactiva
`verify_jwt`). Alta de los dos secretos, una vez por proyecto:
*(Alta de secretos de Vault: ver `docs/ci-cd/VAULT-SECRETS.md`.)*
Sin los dos secretos dados de alta, `dispatch_booking_reminders()` no hace
nada (mismo guard que `notify_booking_confirmed`) — el cron corre igual,
simplemente no manda nada.

**Limitación conocida de este entorno: no se puede ejercitar de punta a
punta desde la app.** La disponibilidad ya se calcula en vivo para
cualquier fecha (`lounge_availability_range`), pero el calendario de
reserva parte del `TODAY` fijo de la app (`2025-09-09`,
`src/lib/availability.ts`), así que ninguna reserva hecha desde la UI cae
dentro de "ahora + 24h" del reloj real. El mecanismo es correcto — mismo
patrón ya probado que `booking_receipts.sql` — pero queda sin poder
probarse de punta a punta mientras el "hoy" de la app sea esa fecha fija
(ver `docs/PENDIENTES.md` §2.10).

**Brevo compartido con `send-email`/`send-booking-receipt`** — misma
factorización en `supabase/functions/_shared/brevo.ts`.

## Notificaciones en la app (trigger + pg_cron)

Story 6.2 — desde el 21 sept 2026, la tabla `notifications`
(`supabase/schemas/notifications.sql`, nace en Epic 6) es real. Motivo
completo en "Alcance" §Notificaciones en la app reales.

**"Booking confirmation" es un INSERT directo, no un Database Webhook.**
`notify_booking_confirmed_in_app()` (trigger `AFTER INSERT` en `bookings`,
igual disparador que `notify_booking_confirmed` de `booking_receipts.sql`)
inserta la notificación en la misma base — sin `pg_net`, sin Vault, sin
Edge Function: no hay servicio externo que llamar para escribir en una
tabla de la misma base de datos.

**El aviso de las 6 AM sí es `pg_cron`, segundo uso del proyecto** (después
de `dispatch_booking_reminders`, Story 5.3) — pero tampoco llama a ninguna
Edge Function: `dispatch_morning_notifications()`
(`supabase/schemas/notifications.sql`) corre cada 15 minutos e inserta
directo en `notifications` para cada reserva `confirmed` cuya fecha es hoy
(reloj real, `now() at time zone 'UTC'`) y cuya hora cae en la ventana
05:45–06:15 UTC, sin aviso ya mandado (`bookings.morning_notification_sent_at`).
Mismo gap conocido que Story 5.3: el calendario de reserva parte del
`TODAY` fijo de la app (`2025-09-09`), así que ninguna reserva hecha desde
la UI cae en el `current_date` real que este cron usa a propósito — no
ejercitable de punta a punta desde la app.

**Los otros cuatro tipos se siembran al crear el perfil.** "New lounge
partner announcements", "Membership renewal reminders", "Special offers and
promotions" y "Birthday month promotion" dependen de datos que Epic 7/9
todavía no modelan de verdad (nuevos partners, renovación de membresía real)
— `seed_sample_notifications()` (trigger `AFTER INSERT` en `profiles`)
inserta las cuatro como notificaciones de muestra reales (contenido fijo,
filas de verdad) la primera vez que el miembro completa /onboarding.

## Borrado de cuenta (pg_cron)

Story 6.3 — desde el 21 sept 2026, "Account deletion option with
confirmation" conecta contra Supabase como un soft-delete reversible.
Motivo completo en "Alcance" §Borrado de cuenta real.

**Confirmar el modal no borra nada.** `request_account_deletion()`
(`supabase/schemas/account_deletion.sql`, RPC `SECURITY DEFINER`) marca
`profiles.deleted_at = now()` y cancela las reservas futuras del miembro
(mismo cálculo de fee que `cancel_booking`) — fiel a lo que
`DeleteAccountModal` ya declaraba ("upcoming bookings are cancelled...
charged the fee"). Reactivar es tan simple como `deleted_at = null`: el
login (`reactivateAccountIfDeleted`, `src/lib/profile.ts`) lo hace solo tras
un signInWithPassword exitoso, sin RPC propia — RLS "update own profile" ya
lo permite sobre la fila propia.

**El borrado físico real (30 días cumplidos) es `pg_cron`, tercer uso del
proyecto** — mismo patrón de Database Webhook por secreto compartido que
`booking_receipts.sql`/`booking_reminders.sql`, pero corriendo una vez al
día en vez de cada 15–30 min: `dispatch_account_deletions()`
(`supabase/schemas/account_deletion.sql`) busca `profiles` con
`deleted_at <= now() - interval '30 days'` y llama (`pg_net`) a la Edge
Function `delete-account`, primer uso del proyecto de
`auth.admin.deleteUser` — `on delete cascade` en `profiles`/`bookings`/
`payments`/`notifications`/`member_favorite_lounges` limpia el resto solo.
Alta de los dos secretos, una vez por proyecto:
*(Alta de secretos de Vault: ver `docs/ci-cd/VAULT-SECRETS.md`.)*
Sin los dos secretos dados de alta, `dispatch_account_deletions()` no hace
nada (mismo guard que el resto de este patrón). La Edge Function además
re-verifica los 30 días por su cuenta (defensa en profundidad) antes de
llamar a `auth.admin.deleteUser` — no confía solo en el filtro SQL que la
invocó.

**Limitación conocida de este entorno: no se puede ejercitar de punta a
punta en 30 días reales aquí** — mismo tipo de gap que el recordatorio de
Story 5.3, esta vez por la duración de la ventana (30 días) en vez de por
el seed de disponibilidad.

## Rol de partner real (`user_roles`)

Epic 7 — decisión de arquitectura pospuesta a propósito hasta este epic
(ver `docs/DATA-MODEL-MAP.md`: "cómo se distingue el rol member/partner/
admin sobre `auth.users`... conviene decidirla en cuanto se empiece Epic
7, no antes"). Decidido con el usuario (22 sept 2026): tabla `user_roles`
(`user_id`, `role` — 'partner'/'admin'), no un custom claim en el JWT ni
esquemas separados — no toca `auth.users`, no exige registrar un segundo
Custom Access Token Hook por proyecto remoto, y el rol se puede cambiar
sin esperar a que el JWT del miembro se refresque. Sin fila = miembro
corriente; solo se registran roles elevados. Epic 8 (rol admin) reutiliza
la misma tabla cuando se conecte.

**Partner = organización (Epic 10, 1 oct 2026).** El modelo del Epic 7/8
(un partner = una persona con un lounge, `partner_lounges` +
`lounge_partner_invites`, invitar al publicar) se sustituyó por
`partners` (organización) 1 → N `lounges.partner_id` y 1 → N
`partner_members` (usuarios, uno de ellos representante). Detalle en
`docs/DATA-MODEL-MAP.md` "Epic 10" y `supabase/schemas/partners.sql`.

- Un partner nace en `draft`; activarlo envía a sus usuarios el email de
  crear contraseña (Story 10.4). **Publicar un lounge ya no invita a nadie**:
  `admin_publish_lounge` exige un partner `active`. Las Edge Functions
  `admin-publish-lounge` y `admin-lounge-partners` y
  `_shared/partner-accounts.ts` se retiraron; el admin publica con la RPC.
- La invitación sigue llegando a `/partner/welcome?token_hash=…&type=invite`
  (`lib/partner-invite.ts`): el usuario corrige nombre/móvil/foto en
  `partner_members` y fija su contraseña. El email no lo puede cambiar
  (trigger `partner_members_guard_issued_fields`).
- El usuario partner ve todos los lounges de su partner
  (`partner_lounge_ids()`), nunca escribe en `lounges` (solo el admin) y
  pierde todo acceso si el partner o él mismo están suspendidos.
- Notificaciones (`partner_notifications.sql`): una por usuario activo del
  partner del lounge, con `partners.name` como nombre de negocio.
- Editar un lounge live lo devuelve a borrador (`admin_unpublish_lounge`); la
  policy de `lounges` lo mantiene visible para su partner y para quien tiene
  reserva allí.
- **Acceso (Story 10.4).** La Edge Function `admin-partners` (verifica JWT +
  `has_role('admin')`) hace lo que necesita la API de Auth: activar crea la
  cuenta invitada de cada usuario (`generateLink`, no envía nada), su rol y
  `partner_members.user_id`, y después envía la invitación por Brevo
  (`_shared/partner-invite-email.ts`); si una cuenta falla, borra las ya
  creadas y el partner sigue en draft. Añadir a un partner activo invita al
  momento; reenviar solo a quien no tiene `email_confirmed_at`; suspender un
  usuario es `suspended_at` + `ban_duration`; borrar, la fila (el trigger
  protege al representante) y luego su usuario de Auth. Suspender/reactivar
  el partner es la RPC más el ban de todos sus usuarios (al reactivar, salvo
  los suspendidos uno a uno). El estado de lounges lo deciden las RPC
  (`admin_suspend_partner`, `admin_reactivate_partner`, `admin_suspend_lounge`,
  `admin_reactivate_lounge`).
- `confirm_booking`/`join_waitlist` rechazan un lounge que no esté `live`
  ("This lounge is not taking bookings"): antes no comprobaban el estado.
- **Selector de lounge (Story 10.6).** `partner_context()` devuelve partner,
  usuario y lounges con la elección ya validada (si el lounge guardado dejó
  de ser del partner, el primero); `partner_select_lounge()` la guarda en
  `partner_members.selected_lounge_id`/`all_lounges`. Today usa siempre un
  lounge concreto; las RPC de analítica aceptan `p_lounge_id` (null = todos).
- Datos de muestra en local: `scripts/seed-partners.mjs`.

## Notificaciones al partner reales (Database Webhook + pg_cron)

Story 7.2 — "Email notification for each new booking", "Cancellation
notifications with updated guest count" y "Morning digest email with
day's guest list" se envían de verdad. Mismo mecanismo que
`booking_receipts.sql`/`booking_reminders.sql` (secreto compartido en
Supabase Vault, `pg_net`, sin `verify_jwt` — quien llama es Postgres, no
un miembro autenticado): dos triggers en `bookings`
(`notify_partner_new_booking`/`notify_partner_cancellation`, Database
Webhook) y un `pg_cron` a las 6:30 AM (`dispatch_partner_morning_digest`),
todos en `supabase/schemas/partner_notifications.sql`, hacia dos Edge
Functions nuevas (`send-partner-booking-event`, que cubre los dos eventos
distinguidos por `type` en el payload, y `send-partner-digest`).

**Decisión consciente: no se usa la tabla `notifications` de Epic 6.** El
AC de Story 7.2 es "recibir un email", no una fila en el centro de
notificaciones del miembro — `docs/DATA-MODEL-MAP.md` ya anticipaba a
Epic 7 como posible referenciador de esa tabla, pero al conectarse de
verdad se decidió lo mismo que ya había decidido Story 5.3 (pg_cron
propio en vez de depender de `notifications`).

Alta de los 4 secretos de Vault, una vez por proyecto (local/dev/prod):
*(Alta de secretos de Vault: ver `docs/ci-cd/VAULT-SECRETS.md`.)*
Sin los 4 secretos dados de alta, ninguna de las tres funciones hace nada
(mismo guard que el resto de este patrón) — así se comporta `ci.yml` a
propósito (nunca los crea).

**Las tres pantallas de email (`/partner/emails/digest`, `/new-booking`,
`/cancellation`) se quedan como preview fija de la narrativa de muestra,
sin conectar.** El AC ya está cubierto por el envío real de arriba —
ninguna historia pide que esas pantallas *muestren* el envío más
reciente.

**La promoción automática de la waitlist no tiene mecanismo real en
ningún epic.** `join_waitlist` (Epic 4) aparca la reserva en
`status='waitlisted'`, pero ningún epic conectado hasta ahora la sube a
`confirmed` cuando se libera un hueco — construirlo expandiría el
alcance del Epic 4 (dueño real de `bookings`), no del 7. Documentado
como hueco real en `docs/PENDIENTES.md` §2.11, no simulado.

## Reembolso real (Stripe, Story 8.1)

Decisión de alcance (22 sept 2026, tomada con el usuario antes de
implementar — revierte la nota de `docs/DATA-MODEL-MAP.md` que daba esto
por fuera de alcance): "Refund processing interface" reembolsa de verdad
un cargo real de Stripe (`payments.status = 'succeeded'`) vía la Edge
Function `stripe-refund-payment` (`stripe.refunds.create`), llamada
directamente por el cliente admin (no por un cron) tras verificar
`has_role('admin')` contra el llamador. `payments` se actualiza de forma
optimista en la misma respuesta (Stripe confirma un reembolso en modo
test al instante) — el webhook (`stripe-webhook`, caso `charge.refunded`
ya añadido) es la defensa en profundidad, mismo principio que el resto de
Story 4.2.

**Una tarifa de no-show/cancelación tardía (Story 6.1) nunca se cobró de
verdad, así que no pasa por aquí.** "Waive and refund" en ese caso solo
limpia `bookings.cancellation_fee_cents`/`no_show`
(`admin_waive_booking_fee`, `supabase/schemas/support_tickets.sql`) — no
hay nada que reversar en Stripe para un cargo que nunca existió. El
`RefundModal` (lenguaje de "cargo"/tarjeta/reembolso a 5-10 días) solo se
muestra cuando el caso trae un pago real `succeeded` ligado a la reserva.

## Reportes programados reales (pg_cron, Story 8.2)

Decisión de alcance (22 sept 2026, misma fecha y mismo criterio que el
reembolso de arriba — revierte la nota de `docs/DATA-MODEL-MAP.md`):
"Automated daily/weekly report generation" + "Scheduled email delivery of
reports" son reales, mismo mecanismo de Database Webhook/`pg_cron` que
Story 5.3/6.2/7.2 (secreto compartido en Supabase Vault, `pg_net`, sin
`verify_jwt`). Tabla `scheduled_reports` (nace aquí,
`supabase/schemas/admin_reports.sql`) + `dispatch_scheduled_reports()`
(pg_cron cada 15 min — la cadencia más corta de los tres cron del
proyecto, porque un reporte "diario"/"semanal"/"mensual" necesita que el
propio cron revise seguido si ya le toca, a diferencia de un evento puntual
como el recordatorio de 24h) → Edge Function `send-admin-report`, que
manda el CSV como adjunto real de Brevo (`sendBrevoEmailWithAttachment`,
nueva en `_shared/brevo.ts`) — no en el cuerpo del email.

**El CSV se genera en SQL, no en el cliente.**
`admin_generate_report_csv(dataset, from, to)` reutiliza las mismas RPC
`admin_export_*` que usa "Download CSV" en `/admin/reports`, así que el
reporte programado y la descarga manual nunca pueden desincronizarse en
qué columnas trae cada dataset.

**Bug real encontrado y corregido con TDD**: `admin_generate_report_csv`
y las `admin_export_*` de las que depende exigían `has_role('admin')`
igual que el resto de RPC de este epic — pero el cron las llama desde
Postgres, sin sesión (`auth.uid()` es `null` ahí), así que
`dispatch_scheduled_reports()` fallaba con "Not authorized" en cada
corrida. El guard de esas funciones pasó a
`if auth.uid() is not null and not has_role('admin') then raise
exception`: sigue rechazando a un autenticado sin el rol, pero deja pasar
la llamada interna sin sesión — mismo criterio que ya usan las RPC "de
kiosco" de recepción (Epic 5) al no exigir sesión en absoluto.

"Email it to me" en `/admin/reports` usa el mismo `send-admin-report`,
llamado directamente por el cliente (sin pasar por el cron) con el email
del propio admin como único destinatario.

Alta de los 2 secretos de Vault, una vez por proyecto (local/dev/prod):
*(Alta de secretos de Vault: ver `docs/ci-cd/VAULT-SECRETS.md`.)*
Sin los 2 secretos dados de alta, `dispatch_scheduled_reports()` no hace
nada (mismo guard que el resto de este patrón).

**Verificado de punta a punta**: `select
public.dispatch_scheduled_reports();` disparado a mano contra un reporte
de prueba, con `200` confirmado en `net._http_response` tras el envío
real por Brevo — a diferencia del recordatorio de reserva (Story 5.3) o
el aviso de las 6 AM (Story 6.2), este cron **sí** se pudo ejercitar de
punta a punta en local: la ventana de datos que reporta (`v_to` fijo en
`TODAY`, no el reloj real) no depende de que haya reservas en el "hoy"
real, solo de que existan reservas en el "hoy" de
mockup — que sí las hay.

## Membresía y referidos reales (Epic 9)

Decisiones de producto confirmadas con el usuario el 23 sept 2026 — motivo
completo en "Alcance" §Membresía y referidos reales.

**`memberships` no admite escrituras de cliente.** La fila nace o cambia
solo cuando un pago con `payments.membership_plan` pasa a `succeeded`
(trigger `apply_membership_payment`, `supabase/schemas/memberships.sql`) —
da igual si viene de la tarjeta guardada (la Edge Function inserta el pago
ya `succeeded`) o del webhook de Stripe (Checkout Session con
`<PaymentElement>`, ruta de tarjeta nueva): `stripe-webhook` no se tocó.
`profiles.membership_status` (stub de Story 6.3) es ahora un espejo
(`sync_profile_membership_status`) y, como `referral_code` y
`stripe_customer_id`, el miembro no puede escribirlo aunque "update own
profile" le deje tocar su fila (`guard_profile_managed_columns`,
`supabase/schemas/referrals.sql` — trigger `SECURITY INVOKER` a propósito:
dentro de un `DEFINER`, `current_user` sería siempre el dueño).

**El importe nunca lo decide el navegador.** `stripe-membership-checkout`
llama a `membership_change_quote` con el JWT del propio miembro, así que
hereda también sus reglas (no repetir plan, no bajar de anual a mensual —
eso no se cobra hoy: se programa con `schedule_membership_plan_change`).

**La renovación automática cobra de verdad** (Edge Function
`membership-renewal`, `type: "charge"`, llamada por el cron). Cobra
off-session la tarjeta por defecto del Customer de Stripe (o la primera
guardada) por `pending_plan ?? plan`; el trigger de `payments` abre el
término siguiente **desde el fin del anterior**, no desde "ahora". Si no hay
tarjeta o Stripe rechaza el cobro, la membresía vence y se inserta la
notificación "We couldn't renew your membership". La function relee la fila
antes de cobrar (409 si la auto-renovación se apagó o el término no ha
vencido) y el cron marca `renewal_attempted_at` antes de llamarla, para no
cobrar dos veces la misma renovación.

**Quién paga una reserva** (Epic 9 × Epic 4, `supabase/schemas/booking_coverage.sql`):
con plan activo, primero un day pass de regalo, luego una de las 8 visitas
incluidas del mes de la reserva, y si no, el day pass pagado; sin plan,
siempre se paga. `confirm_booking` lo hace cumplir: sin `p_payment_id` exige
cobertura real, y con él valida que el pago sea del propio miembro, de un
day pass y no pague ya otra reserva. `?covered=1` ya no existe.

**Tests:** `memberships` se siembra con el service role
(`grantTestMembership`, `src/lib/testing/membership-fixture.ts`, o la opción
`{ membership: "annual" }` de `signUpConfirmedMemberAndSignIn` — cualquier
test que cree una reserva sin pago la necesita), igual que el alta operativa
de un partner/admin; `giveTestMemberSavedCard` crea un
Customer real de Stripe con `pm_card_visa`. El cliente de navegador de
Supabase es un singleton en jsdom — el "amigo" de los tests de referidos se
crea con el service role, sin iniciar sesión.

Alta de los 2 secretos de Vault del aviso de renovación, una vez por
proyecto (local/dev/prod):
*(Alta de secretos de Vault: ver `docs/ci-cd/VAULT-SECRETS.md`.)*
Sin los 2 secretos, `dispatch_membership_renewals()` sigue insertando la
notificación en la app y venciendo los términos sin auto-renovación (no
dependen de Vault) — pero no cobra renovaciones ni manda el email: un
término vencido con auto-renovación sigue activo hasta que existan. El mismo
secreto también va en `.env.local` (`MEMBERSHIP_RENEWAL_WEBHOOK_SECRET`):
los tests invocan el cobro directamente; en CI se genera al vuelo
(`ci.yml`). **`supabase db reset` borra Vault**: volver a darlos de
alta después (igual que los de `admin_report_*`).

## Gestión de contenido real (Story 8.3)

`lounges` gana `content_status` (`live`/`draft`/`archived`) — la policy
`select lounges` (Epic 2) se actualizó para que un miembro solo vea
`content_status = 'live'`; un admin (`has_role('admin')`) sigue viendo
todo. Este estado es **ortogonal** a si el lounge tiene un cambio de
contenido pendiente de aprobar: un lounge `live` con una edición en
revisión sigue mostrando su contenido publicado a los miembros hasta que
se apruebe — "pending-approval" en la UI del admin (`LoungeStatusChip`)
sale de si existe una fila pendiente en `lounge_content_submissions`
(nace aquí, `supabase/schemas/admin_content.sql`), no de
`lounges.content_status`.

**"Content approval workflow" es real y genérico, no solo para The
Vestry como dibujaba el mock.** Un cambio (`admin_submit_lounge_content_
change`, cualquier combinación de amenities/horario/capacidad/
restricciones/fotos/publicación en un jsonb `proposed`) nunca toca
`lounges` directamente — solo se aplica al aprobarse
(`admin_approve_lounge_submission`) o se descarta sin aplicar al
rechazarse (`admin_reject_lounge_submission`). `lib/admin-content.ts`
expone `diffLoungeChanges`, un diff genérico campo por campo que
reemplaza al `VESTRY_PENDING_CHANGES` literal del mock.

**"Upload and manage lounge images" es real vía un bucket de Storage
nuevo, `lounge-images` (público a diferencia de `profile-photos`, que es
privado por usuario — una foto de lounge la ve cualquiera en `/explore`).**
Solo un admin puede escribir en él (policy `admin manages lounge images
bucket`, `has_role('admin')`); cualquiera puede leer. "Image optimization
and resizing" que el artboard anuncia **no** es real — no hay librería de
procesamiento de imágenes en el stack ni precedente de transformación de
imágenes en este proyecto.

**De la barra de acción masiva de `/admin/lounges`, solo "Archive" es
real** (`admin_archive_lounges`, directo, sin pasar por revisión — no es
contenido nuevo que aprobar, es su retiro). "Update hours", "Add an
amenity" y "Set closure dates" siguen inertes, mismo criterio que "New
case" en Story 8.1: ningún artboard dibuja su modal de edición masiva.

**"Add lounge" sigue sin llevar a ningún sitio propio.** Ningún artboard
de la Fase 8 dibuja el alta de un lounge nuevo — se paró antes de
inventarlo, ver `docs/PENDIENTES.md` §2.10.
