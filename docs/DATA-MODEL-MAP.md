# LuxePass — Mapa de entidades de datos

Mapa liviano de qué tablas de Supabase va a necesitar cada epic y cómo se
referencian entre sí. **No es un diseño de schema**: no lista columnas, tipos,
índices ni policies — eso se decide historia por historia, con TDD, cuando
toque implementar cada epic (ver "Cómo implementar una historia nueva" en
`CLAUDE.md`). Su único propósito es anticipar los acoplamientos entre epics
para no tener que rediseñar una FK a mitad de camino.

Se construyó leyendo los `## Acceptance Criteria` de las 24 historias en
`docs/specs/` y los flows de `docs/specs/flows/` — nunca los artboards, igual
que exige la metodología de test del proyecto.

Cuando se implemente un epic, el diseño real de columnas/RLS se documenta como
siempre en `supabase/schemas/*.sql` y en la fila correspondiente de
`docs/design/COMPONENT-MAP.md`. Este archivo se actualiza si al implementar
algo cambia de dueño o aparece una entidad que aquí no se previó.

---

## Por epic

### Epic 1 — User Onboarding & Authentication *(implementado, referencia de estilo)*

- `profiles` (dueño) — perfil de miembro, 1:1 con `auth.users`.
- `login_attempts` (dueño) — bloqueo tras 5 intentos.
- Función `email_exists`, bucket de storage `profile-photos`.

### Epic 2 — Location & Discovery *(implementado — Supabase local, sept 2026)*

- `lounges` (**nace aquí**, implementada) — `id, name, neighborhood, city,
  city_id, lat, lng, amenities, rating, open_now, slots_today, hours, bands,
  closed_weekdays, featured`. RLS de solo lectura `to authenticated`; sin
  policies de escritura (se siembra por migración). Ver
  `supabase/schemas/lounges.sql` y `docs/design/COMPONENT-MAP.md` §Backend
  real — Epic 2.
- Amenities (WiFi, Spa, Co-working…): resuelto como `text[]` dentro de
  `lounges`, sin tabla propia — como ya anticipaba esta fila.
- `open_now`/`slots_today` siguen siendo columnas reales pero **estáticas**
  (sembradas 1:1 del mock, no en vivo): maduran cuando Epic 4 aporte
  disponibilidad real de bookings. `rating`/`review_count` sí son reales
  ahora (Epic 3) — siguen sin ser una agregación en vivo porque no existe
  tabla `reviews` (ver su fila más abajo), pero ya no son del mock.
- Sin tabla propia: 2.1 (el mapa dibujado sigue siendo cliente — proveedor
  real fuera de alcance, ver `docs/PENDIENTES.md` §2.3), 2.3 (vista de lista,
  paginada en cliente sobre el catálogo ya traído).
- Cruce resuelto: el filtro "by availability" de 2.2 sigue siendo una
  aproximación por `bands`/`closed_weekdays` de `lounges` (no consulta
  `lounge_availability` fila a fila para el filtro, desproporcionado para
  un filtro de catálogo) — `lounge_availability` ya existe (Epic 3,
  implementada), pero 2.2 no se tocó al conectar Epic 3.

### Epic 3 — Lounge Profiles & Details *(implementado — Supabase local, sept 2026)*

- Extiende `lounges` (mismo dueño, Epic 2) con `address`/`phone`/`email`/
  `website`/`reception_note`, `weekly_hours` (jsonb), `review_count`,
  `capacity`, `booking_restrictions`. Ninguna historia permite *dejar* una
  reseña, así que `rating`/`review_count` son columnas agregadas, no una
  tabla `reviews` — el contenido de cada reseña sigue siendo dato de muestra
  (`lib/lounge-profile.ts`) — señalar si aparece una historia futura de
  reviews.
- `lounge_images` (implementada, dueño Epic 3) — colección ordenada; Epic 8.3
  la gestionará desde admin, de ahí tabla propia en vez de array. La
  fotografía sigue sin ser real (bloques de marca, ver `DESIGN-SYSTEM.md`
  §6 Fase 4) — lo real es que la fila viene de Supabase, no el contenido.
- `lounge_availability` (implementada, dueño Epic 3) — plazas por
  `(lounge_id, date, band)`, con horizonte finito sembrado (18 semanas desde
  `TODAY`), no calendario infinito. Referenciada por Epic 2 (el filtro de
  disponibilidad sigue siendo una aproximación, ver `COMPONENT-MAP.md`),
  Epic 4 (flujo de booking, todavía sobre el mock), Epic 9 (el tier de
  membresía condiciona restricciones, todavía no implementado).
- `lounge_closures` (implementada, dueño Epic 3, **no anticipada por nombre
  en la primera versión de este mapa** — se documentó aquí como parte de
  "cierres especiales" de `lounge_availability`, pero se implementó como
  tabla separada porque es un evento por rango de fechas con sus propios
  metadatos, no una propiedad por celda día/franja).

### Epic 4 — Booking System

- `bookings` (**nace aquí, implementada** — 17 sept 2026, Story 4.1) —
  `member_id`, `lounge_id`, `date`, `band`, `slot_time`, `special_requests`,
  `status` (confirmed / in_progress / completed / cancelled / waitlisted,
  dominio completo desde ya aunque 4.1 solo produce los dos primeros). Es la
  tabla más referenciada del proyecto (Epic 5, 6, 7, 8, 9). RLS: solo
  `select` de las propias filas — se escribe exclusivamente vía los RPC
  `confirm_booking`/`join_waitlist` (`SECURITY DEFINER`), nunca insert/update
  directo. Ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 4".
- `waitlist_entries` vs. `status='waitlisted'` en `bookings` — **decidido**:
  `status='waitlisted'` en la misma tabla (sin cola/posición — ninguna AC de
  4.1 la pide), escrita por `join_waitlist`.
- `payments` (**nace aquí, implementada** — 18 sept 2026, Story 4.2;
  decisión de alcance cambiada el 17 sept 2026 — la nota original de este
  mapa, "Stripe fuera de alcance", era válida solo durante el periodo de
  mockup) — `member_id`, `booking_id` (nullable: la fila de pago nace antes
  que la reserva, el cobro se confirma primero), `stripe_checkout_session_id`,
  `stripe_payment_intent_id`, `amount_cents`, `currency`, `status`
  (`pending`/`succeeded`/`failed`). RLS: solo `select` de las propias filas
  — sin policies de insert/update de cliente, la escriben solo las Edge
  Functions/el webhook (rol de servicio). `profiles.stripe_customer_id`
  (columna en Epic 1, cruce con Epic 4: el Customer de Stripe es 1:1 con el
  miembro, no con la reserva). Pago contra **Stripe real (modo test)**, no
  simulado: Checkout Sessions (`ui_mode: 'elements'`) + `<PaymentElement>`
  para tarjeta nueva, `PaymentIntent` directo servidor-a-servidor para
  tarjeta guardada. Su `status` lo escribe el webhook de Stripe (fuente de
  verdad), nunca el cliente tras el submit — mismo principio que ya usa
  Brevo con el Auth Hook. Arquitectura: 4 Supabase Edge Functions
  (`stripe-create-checkout-session`, `stripe-charge-saved-method`,
  `stripe-payment-methods`, `stripe-webhook`), no route handlers de
  Next.js, por consistencia con `send-email`. Apple Pay/Google Pay quedan
  fuera de esta conexión real (exigen dominio verificado ante Stripe/Apple,
  no viable en `localhost` ni sin el rollout de Vercel) — gap de
  infraestructura, no simulación de UI de la historia. Detalle completo en
  `CLAUDE.md` §Procesamiento de pagos (Stripe) y
  `docs/design/COMPONENT-MAP.md` "Backend real — Epic 4".
- Story 4.3 (calendario `.ics`): sin tabla propia, se genera al vuelo desde
  `bookings` + `lounges`.
- Story 4.2/5.1 (email real de recibo de reserva, **implementado** — 18
  sept 2026): sin tabla propia — un trigger `AFTER INSERT` sobre `bookings`
  (`supabase/schemas/booking_receipts.sql`, **primer Database Webhook del
  proyecto**, distinto del Auth Hook de Epic 1) llama de forma asíncrona
  (`pg_net`) a la Edge Function `send-booking-receipt`, que resuelve
  `auth.users`/`profiles`/`lounges`/`payments` del `booking_id` recibido y
  despacha el correo vía Brevo (mismo remitente que Epic 1, factorizado en
  `supabase/functions/_shared/brevo.ts`). Detalle en `CLAUDE.md` §Email de
  recibo de reserva.

### Epic 5 — QR Code & Check-in *(implementado — Supabase local, sept 2026)*

- No crea tabla nueva de fondo: extiende `bookings` (Epic 4) con
  `confirmation_code` (LP#, **columna generada**, no insertada aparte —
  replica en SQL el mismo hash que `bookingReferenceFromId`, ver
  `docs/design/COMPONENT-MAP.md` "Backend real — Epic 5"), `checked_in_at`,
  `no_show`, `reminder_sent_at` (guarda contra reenvíos del cron de 5.3).
- Story 5.2 ("emergency contact information accessible to staff") —
  **gap resuelto**: `profiles.emergency_contact_name`/`_relation`/`_phone`
  (nullable — la Story 1.1 no lo pide en el alta). La captura real de ese
  dato (editarlo desde `/profile/privacy`) sigue siendo Story 6.3, sin
  conectar.
- Story 5.2, RPC "de kiosco" (`reception_lookup_booking`/
  `reception_checkin_booking`/`reception_report_no_show`/
  `reception_today_summary`, `SECURITY DEFINER`, concedidas a `anon`):
  decisión tomada con el usuario para no bloquear en la decisión de rol
  staff/partner que esta misma tabla dejaba abierta para Epic 7 —
  **resuelta al implementar ese epic** (tabla `user_roles`, ver más abajo) —
  autorizadas solo por LP# + lounge + fecha (`TODAY` de mockup, no
  `current_date`), sin login de personal.
- Story 5.3 (reminder 24h antes) — **decisión revertida el 21 sept 2026**:
  ya no depende de `notifications` (Epic 6). Se conecta con **`pg_cron`
  real** (primer job programado del proyecto, `dispatch_booking_reminders()`
  en `supabase/schemas/booking_reminders.sql`) + Edge Function
  `send-booking-reminder`, mismo patrón de Database Webhook por `pg_net`
  que `booking_receipts.sql` (Story 4.2/5.1) pero disparado por el paso del
  tiempo en vez de un insert. Sin poder ejercitarse de punta a punta en este
  entorno todavía — ver desviación en `docs/design/COMPONENT-MAP.md` y
  `docs/PENDIENTES.md`.

### Epic 6 — Member Experience & Notifications

**Conectado a Supabase real desde el 21 sept 2026** — ver CLAUDE.md §Alcance y
`docs/design/COMPONENT-MAP.md` "Backend real — Epic 6".

- `notifications` (**nace aquí**, dueño, ya real) — member_id, category, icon,
  title, body, read_at, created_at. Story 5.3 (reminder) terminó sin
  depender de esta tabla (se conectó con `pg_cron` propio, ver más arriba);
  Epic 7 **decidió conscientemente no usarla tampoco** (el AC de Story 7.2
  es "recibir un email", no una fila en el centro de notificaciones del
  miembro — se conectó con el mismo patrón de Database Webhook/pg_cron que
  Story 5.3, ver "Epic 7" más abajo); Epic 9 (confirmación de referido)
  sigue sin conectarse a ella todavía.
- Story 6.1 reutiliza `bookings` (Epic 4), sin tabla propia — `cancel_booking`
  (RPC) y columnas `cancellation_fee_cents`/`cancelled_at` viven en
  `bookings.sql`. "Support contact" sigue cruzando a `support_tickets`
  (Epic 8, sin conectar).
- Story 6.3 extiende `profiles` (ya real): `membership_status` (stub mínimo,
  Active/Inactive — el resto de membresía sigue en Epic 9),
  `preferred_amenities`, `privacy_*` (4 columnas), `deleted_at` (soft-delete).
  Favoritos → tabla puente `member_favorite_lounges` (nace aquí, dueño Epic 6,
  ya real, cruza a `lounges`). Membership status ya no es "solo leer" — nace
  con su propio stub; referral code sharing sigue sin tabla `referrals`
  propia (Epic 9, sin conectar): `referralCodeFor` es determinista, no
  persistido.

### Epic 7 — Partner Dashboard

**Resuelto** (22 sept 2026, al implementar este epic — ver
`docs/design/COMPONENT-MAP.md` "Backend real — Epic 7"):

- `partners` (**nace aquí**, dueño) — cuenta de partner. `partner_lounges`
  es la tabla puente many-to-many con `lounges` (decisión tomada con el
  usuario: un partner puede gestionar varios lounges, no una FK directa
  `lounges.partner_id`).
- Auth de partners: tabla `user_roles` (`user_id`, `role` — 'partner'/'admin'),
  no un custom claim en el JWT ni esquemas separados. Sin fila = miembro
  corriente; solo se registran roles elevados. Ver `supabase/schemas/user_roles.sql`.
- 7.1/7.2 reutilizan `bookings` + `profiles`. 7.3 (analytics) es vista
  agregada vía RPC (`partner_analytics.sql`), sin tabla propia.
  `notifications` (Epic 6) **no** se usa para 7.2 — se mantiene el patrón de
  Database Webhook/pg_cron por email directo al partner (mismo mecanismo que
  `booking_receipts.sql`), ya que el AC es "recibir un email", no una fila
  en el centro de notificaciones del miembro.
- **Si una historia futura de este epic (u 8.3, "Add/edit/remove lounge
  profiles") necesita que un partner dé de alta un lounge y sus días
  disponibles: `lounges.bands`/`closed_weekdays`/`capacity`/`weekly_hours` y
  `lounge_closures` (Epic 3) sí son reutilizables tal cual — son la
  plantilla recurrente y los cierres puntuales, y un formulario de partner
  puede escribirlos directo. `lounge_availability` (Epic 3) **no** lo es
  todavía: hoy es un seed estático de filas por fecha (18 semanas desde
  `TODAY`, generado una sola vez por migración, ver su fila más abajo) —
  dar de alta un lounge nuevo no generaría sus propias filas de
  disponibilidad. Antes de apoyarse en ella, evaluar reemplazarla por un
  cálculo al vuelo desde la plantilla recurrente (decisión ya planteada y
  conscientemente aplazada el 17 sept 2026, ver `docs/PENDIENTES.md`) o
  esperar a que Epic 4 (`bookings`) exista y de ahí sí derivar plazas en
  vivo.

### Epic 8 — Admin & Support *(implementado — Supabase local, sept 2026)*

- `support_tickets`/`support_ticket_messages` (**nacen aquí**, dueño,
  implementadas) — issue tracking, resolution notes, log de comunicación,
  escalación. FK a `profiles` (vía `auth.users`) y `bookings`.
- **Resuelto (22 sept 2026, decisión tomada con el usuario antes de
  implementar, revierte la nota original de esta fila):** el reembolso
  (Story 8.1) **sí es real** para un cargo `succeeded` de Stripe (Edge
  Function `stripe-refund-payment`) — extiende `payments` con
  `refunded_amount_cents`/`refunded_at`/`refund_reason`/`stripe_refund_id`
  y el status `'refunded'`, sin tabla `refunds` propia. Una tarifa de
  no-show/cancelación tardía (Story 6.1) nunca se cobró de verdad, así que
  esa mitad ("waive") sigue sin tocar Stripe — solo limpia
  `bookings.cancellation_fee_cents`.
- Rol admin sobre `auth.users` — **resuelto al implementar Epic 7**:
  reutiliza `user_roles` (`role = 'admin'`), la misma tabla que partners.
- `lounge_content_submissions` (**nace aquí**, dueño, implementada) — cola
  de "Content approval workflow" real y genérica (no solo The Vestry): un
  cambio propuesto (`proposed`, jsonb) nunca toca `lounges` hasta
  aprobarse. `lounges` gana `content_status` (live/draft/archived),
  ortogonal a si hay una fila pendiente en esta tabla.
- `scheduled_reports` (**nace aquí**, dueño, implementada). **Resuelto (22
  sept 2026, decisión tomada con el usuario antes de implementar, revierte
  la nota original de esta fila):** los reportes programados (Story 8.2)
  **sí son reales** vía `pg_cron` (`dispatch_scheduled_reports`, cada 15
  min) + Edge Function `send-admin-report` (adjunto CSV real por Brevo) —
  mismo mecanismo de Database Webhook/cron que Story 5.3/6.2/7.2.
- 8.2 (export/analytics) es vistas/operaciones agregadas sobre
  `bookings`/`payments`/`profiles`/`lounges` ya reales, sin tabla propia
  (salvo `scheduled_reports` arriba). El CRUD real de 8.3 es sobre
  `lounges`/`lounge_images` (Epic 2/3) — `lounge_availability` (Epic 3) no
  se conectó a un editor de disponibilidad propio en esta pasada (sigue
  siendo el seed estático de 18 semanas, ver su fila en "Epic 3" y
  `docs/PENDIENTES.md`).

### Epic 9 — Membership & Referrals

- `memberships` (**nace aquí**, dueño) — tier, precio mensual/anual,
  renewal_date, auto_renew, status. FK 1:1 a `profiles`.
- `referrals` (**nace aquí**, dueño) — referrer_id, referido (email o
  user_id), código, estado, reward_status ("pending" — la propia historia 9.2
  lo deja abierto).

---

## Quién es dueño de qué

| Entidad | Epic dueño | Referenciada por |
|---|---|---|
| `profiles` | 1 | 3, 4, 5, 6, 7, 8, 9 |
| `lounges` | 2 (nace) / 3 (detalle) | 4, 5, 6, 7, 8 |
| `lounge_availability` | 3 | 2, 4, 9 |
| `lounge_images` | 3 | 8 (gestión) |
| `lounge_closures` | 3 | 4 (booking, sin conectar) |
| `bookings` | 4 | 5, 6, 7, 8, 9 |
| `payments` | 4 | 8 (refunds) |
| `notifications` | 6 | 5, 7, 9 |
| `member_favorite_lounges` | 6 | 2/3 (`lounges`) |
| `partners` / `partner_lounges` | 7 | 2/3 (`lounges`, many-to-many vía `partner_lounges`) |
| `user_roles` | 7 | 1 (auth), 8 (rol admin, cuando se conecte) |
| `support_tickets` / `support_ticket_messages` | 8 | 1/9 (member), 4 (`bookings`) |
| `lounge_content_submissions` | 8 | 2/3 (`lounges`) |
| `scheduled_reports` | 8 | — |
| `memberships` | 9 | 3 (restricciones), 6 (status) |
| `referrals` | 9 | 6 (sharing) |

**Resuelto** (22 sept 2026, al empezar Epic 7 — ver arriba "Epic 7 — Partner
Dashboard"): el rol (member / partner / admin) sobre `auth.users` se
distingue con la tabla `user_roles`, no un custom claim ni esquemas
separados. Epic 8 (rol admin) reutiliza la misma tabla.

**Historias que apuntan a backend fuera del alcance del repo** (se simulan
visualmente, se anotan como desviación al implementar): ninguna a esta
altura (22 sept 2026) — la última candidata, Story 4.2 (Stripe real, salvo
Apple Pay/Google Pay por dominio no verificado), salió el 17 sept 2026;
Story 5.3 (pg_cron) salió el 21 sept 2026; Story 8.1 (reembolso real) y
Story 8.2 (reportes programados reales) salieron el 22 sept 2026 al
implementar Epic 8 — ver sus filas arriba. Sigue habiendo gaps puntuales
documentados epic por epic (p. ej. Story 5.3/6.2/7.2 sin poder ejercitarse
de punta a punta en local/CI mientras `lounge_availability` siga anclada a
una fecha fija, o "image optimization and resizing" de Story 8.3 sin
redimensionado real) — ver `docs/PENDIENTES.md` y
`docs/design/COMPONENT-MAP.md`.
