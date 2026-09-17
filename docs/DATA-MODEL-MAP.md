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
- `rating`/`open_now`/`slots_today`/`bands`/`closed_weekdays` son columnas
  reales pero **estáticas** (sembradas 1:1 del mock, no agregadas ni en
  vivo): rating madura con Epic 3 (reseñas reales), disponibilidad con
  Epic 3/4 (`lounge_availability`, `bookings`).
- Sin tabla propia: 2.1 (el mapa dibujado sigue siendo cliente — proveedor
  real fuera de alcance, ver `docs/PENDIENTES.md` §2.3), 2.3 (vista de lista,
  paginada en cliente sobre el catálogo ya traído).
- Cruce todavía abierto: el filtro "by availability" de 2.2 sigue siendo una
  aproximación por `bands`/`closed_weekdays` de `lounges`, no la agenda real
  de `lounge_availability`, que sigue naciendo en Epic 3 (aún no
  implementado).

### Epic 3 — Lounge Profiles & Details

- Extiende `lounges` (mismo dueño, Epic 2) con hero images, horarios,
  contacto, rating agregado. Ninguna historia permite *dejar* una reseña, así
  que rating/review_count son columnas agregadas, no una tabla `reviews` —
  señalar si aparece una historia futura de reviews.
- `lounge_images` (candidata, dueño Epic 3) — colección ordenada; Epic 8.3 la
  gestiona desde admin, así que conviene tabla propia en vez de array.
- `lounge_availability` (**nace aquí**, dueño Epic 3) — calendario semanal,
  capacidad, restricciones por tier, cierres especiales. Referenciada por
  Epic 2 (filtro), Epic 4 (flujo de booking), Epic 9 (el tier de membresía
  condiciona restricciones).

### Epic 4 — Booking System

- `bookings` (**nace aquí**, dueño) — fecha, notas, status (confirmed /
  in_progress / completed / cancelled / waitlisted). Es la tabla más
  referenciada del proyecto (Epic 5, 6, 7, 8, 9).
- `waitlist_entries` vs. `status='waitlisted'` en `bookings` — decidir al
  implementar, no antes.
- Story 4.2 (pago, Stripe/Apple Pay/Google Pay/PCI-DSS): **fuera de alcance
  real** — el repo es solo frontend + Supabase local. Recomendado: tabla
  `payments` mínima (amount, status, method) ligada a `bookings` para que la
  pantalla muestre sus estados simulando el resultado, igual que ya se hizo
  con `email_exists` en Epic 1. Anotar como desviación en `COMPONENT-MAP.md`
  al implementar.
- Story 4.3 (calendario `.ics`): sin tabla propia, se genera al vuelo desde
  `bookings` + `lounges`.

### Epic 5 — QR Code & Check-in

- No crea tabla nueva de fondo: extiende `bookings` con `confirmation_code`
  (LP#), `checked_in_at`, `no_show`.
- Story 5.2 menciona "emergency contact information accessible to staff" —
  `profiles` (Epic 1) hoy no tiene ese campo. **Gap a señalar** si se
  implementa: columna nueva en `profiles`, no tabla nueva.
- Story 5.3 (reminder 24h antes) depende de `notifications`, que nace en
  Epic 6 → cruce Epic 5→6.

### Epic 6 — Member Experience & Notifications

- `notifications` (**nace aquí**, dueño) — genérica: member_id, tipo, mensaje,
  leído/no leído. Referenciada por Epic 5 (reminder), Epic 7 (notificaciones a
  partners — evaluar `recipient_type` vs. tabla separada
  `partner_notifications`), Epic 9 (confirmación de referido).
- Story 6.1 reutiliza `bookings` (Epic 4), sin tabla propia; "Support contact"
  cruza a `support_tickets` (Epic 8).
- Story 6.3 extiende `profiles`: favoritos → tabla puente
  `member_favorite_lounges` (candidata, dueño Epic 6, cruza a `lounges`);
  membership status y referral code sharing solo *leen* `memberships` /
  `referrals` (Epic 9), no tabla propia aquí.

### Epic 7 — Partner Dashboard

- `partners` (**nace aquí**, dueño) — cuenta de partner. Implica FK
  `lounges.partner_id` (o tabla puente `partner_lounges` si un partner
  gestiona varias lounges) — **decisión de diseño pendiente**, afecta a
  `lounges` (Epic 2), resolver al implementar este epic.
- Auth de partners: ¿mismo `auth.users` con rol/claim, o esquema separado? —
  cruce directo a Epic 1, señalar antes de tocar RLS.
- 7.1/7.2 reutilizan `bookings` + `profiles` + `notifications`. 7.3
  (analytics) es vista agregada, sin tabla propia.

### Epic 8 — Admin & Support

- `support_tickets` (**nace aquí**, dueño) — issue tracking, resolution
  notes, log de comunicación, escalación. FK a `profiles` y `bookings`.
- `refunds`: candidata a extender `payments` (Epic 4) con un status, no tabla
  nueva — **fuera de alcance real** (Stripe refund), se simula visualmente
  igual que 4.2.
- Rol admin sobre `auth.users` — mismo cruce que partners con Epic 1.
- 8.2 (export/analytics) y parte de 8.3 (bulk update) son vistas/operaciones
  agregadas, no tablas nuevas. El CRUD real de 8.3 es sobre
  `lounges` / `lounge_images` / `lounge_availability` (Epic 2/3) —
  "content approval workflow" sugiere columna `status`
  (draft/pending/published) en `lounges`, no tabla nueva.

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
| `bookings` | 4 | 5, 6, 7, 8, 9 |
| `payments` | 4 | 8 (refunds) |
| `notifications` | 6 | 5, 7, 9 |
| `member_favorite_lounges` | 6 | 2/3 (`lounges`) |
| `partners` | 7 | 2/3 (`lounges.partner_id`) |
| `support_tickets` | 8 | 1/9 (member), 4 (`bookings`) |
| `memberships` | 9 | 3 (restricciones), 6 (status) |
| `referrals` | 9 | 6 (sharing) |

**Decisión abierta a resolver *antes* de tocar RLS de Epic 7/8** (no antes):
cómo se distingue el rol (member / partner / admin) sobre `auth.users` — vía
tabla `user_roles`, custom claim, o esquemas separados. Es la única pieza que
toca varios epics de golpe (7, 8, y las policies de 1), así que conviene
decidirla en cuanto se empiece Epic 7, no dejarla implícita.

**Historias que apuntan a backend fuera del alcance del repo** (se simulan
visualmente, se anotan como desviación al implementar): 4.2 (Stripe/Apple
Pay/Google Pay/PCI), 8.1 (refund processing real), 5.3/6.2/7.2/8.2 (envío de
email/reportes programados — Mailpit sirve para dev local, no hay cron de
producción).
