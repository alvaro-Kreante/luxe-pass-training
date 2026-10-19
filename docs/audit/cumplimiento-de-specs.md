# Auditoría — cumplimiento de specs (Acceptance Criteria)

Fecha: 12 oct 2026 · Rama: `docs/project-audit` · Solo lectura (sin `npm test`, sin tocar remoto).

**Método.** Cada ítem de `## Acceptance Criteria` de las 24 historias (Epics 1–9) y de las 12 historias del Epic 10 se contrastó con el código (`src/`, `supabase/schemas/`, `supabase/functions/`), con `docs/design/COMPONENT-MAP.md` (§Backend real — Epic N y §Desviaciones), con `docs/PENDIENTES.md` y con los informes previos de `docs/audit/`. Lo ya conocido se cita y no se reinvestiga.

**Estados.**
- **CUMPLE** — comportamiento real (Supabase/Stripe/Brevo/navegador), no solo pantalla. Puede llevar una nota de riesgo citada de otro informe.
- **PARCIAL** — hay implementación real pero falta parte del criterio, o el servidor no lo hace cumplir.
- **NO CUMPLE** — no existe comportamiento que satisfaga el criterio.
- **PROVISIONAL** — se ve en pantalla gracias a `?state=`, datos de muestra sembrados o literales en código.
- **NO VERIFICABLE** — depende de infraestructura o medición que no existe en local.

Marca **(conocido)** = ya registrado en `PENDIENTES.md` o en otro informe de `docs/audit/`.

> **Advertencia sobre `PENDIENTES.md` §3.** Varias filas de esa tabla están desactualizadas (p. ej. 7.1 "llega por un `setTimeout`", 7.2 "no se envía ningún correo", 7.3 "cifras de muestra"): el Epic 7 ya es real (`COMPONENT-MAP.md` §Backend real — Epic 7). Este informe usa el estado actual del código, no esa tabla.

---

## Resumen por epic

| Epic | Criterios | Cumple | Parcial | No cumple | Provisional | No verificable |
|---|---:|---:|---:|---:|---:|---:|
| 1 · Onboarding y autenticación | 13 | 9 | 2 | 1 | 1 | 0 |
| 2 · Descubrimiento y búsqueda | 22 | 18 | 2 | 0 | 1 | 1 |
| 3 · Perfil de lounge | 13 | 9 | 3 | 0 | 1 | 0 |
| 4 · Reservas y pagos | 23 | 19 | 3 | 0 | 0 | 1 |
| 5 · Pase y check-in | 10 | 7 | 1 | 1 | 1 | 0 |
| 6 · Experiencia de miembro | 22 | 13 | 5 | 1 | 3 | 0 |
| 7 · Partner Dashboard | 15 | 12 | 3 | 0 | 0 | 0 |
| 8 · Admin y soporte | 26 | 21 | 4 | 1 | 0 | 0 |
| 9 · Membresía y referidos | 10 | 9 | 1 | 0 | 0 | 0 |
| **Subtotal 1–9 (24 historias)** | **154** | **117** | **24** | **4** | **7** | **2** |
| 10 · Partner = organización (12 historias) | 92 | 90 | 2 | 0 | 0 | 0 |
| **Total** | **246** | **207** | **26** | **4** | **7** | **2** |

Lectura rápida: el 76 % de los criterios de las 24 historias del cliente se cumplen con backend real. Los huecos se concentran en el Epic 6 (notificaciones de muestra, historial con cifras fijas, soporte inerte) y en criterios que el servidor no hace cumplir aunque la pantalla los muestre (contraseña, restricciones de reserva, bloqueo de login).

### Criterios satisfechos solo visualmente (resumen)

| Dónde | Qué es fijo | Criterio afectado |
|---|---|---|
| `src/lib/passes.ts:456` + `src/app/my-pass/page.tsx:424-449` | "Your record: 14 visits · 11 completed · 2 cancelled · 1 no-show" y "CSV, all 14 visits" son literales para todo miembro; la fila "Download your booking history" no es un botón | 6.1 Booking history (SPEC-05) |
| `/my-pass/[reference]?state=` | Los 4 estados del pase (conocido, E2E-06) | 5.1 expiración, 5.2 confirmación de check-in |
| Seed de `notifications` al crear perfil | Partner announcements, promociones, cumpleaños (conocido) | 6.2 |
| `lounges.rating`/`review_count` sembrados; reseñas de `reviewsFor` | Valoraciones (conocido) | 3.1 |
| `src/app/partner/reports/page.tsx:49-89` | Los CSV "Weekly/Monthly booking volume" y "No-show log" solo traen la cabecera | 7.3 (SPEC-07) |
| `lounges.booking_restrictions` sembrado | Texto de restricciones que no coincide con la regla real | 3.2 (SPEC-04) |
| Shell mientras carga | "Alexandra Rivas · Annual member" (E2E-11, conocido) | — (cosmético) |
| `/partner/emails/*` | Vistas previas con `PARTNER_VENUE` fijo (conocido, `PENDIENTES.md` §4.13); los emails reales sí son reales | 7.2 (no afecta) |

---

## Epic 1 — Onboarding y autenticación

### Story 1.1 — User registration

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Register with email and password | CUMPLE | `src/app/signup/page.tsx` (`supabase.auth.signUp`); `src/app/signup/page.test.tsx`; E2E F1.1 PASS |
| 2 | Email verification before activation | CUMPLE | `supabase/config.toml:244` `enable_confirmations = true`; `src/app/auth/confirm/route.ts`; `supabase/functions/send-email` (Auth Hook) |
| 3 | Password 8+ chars, special characters | **PARCIAL** | Cliente: `src/lib/registration.ts:9,80`. Servidor: `config.toml:195` solo `minimum_password_length = 8`, `config.toml:198` `password_requirements = ""` → una llamada directa a GoTrue (o `/reset-password` vía `updateUser`) acepta contraseñas sin carácter especial. **SPEC-01** |
| 4 | Welcome email with app download links | **NO CUMPLE** (conocido) | `PENDIENTES.md` §3 (1.1): solo pantalla `/welcome`; `send-email/index.ts:35-40` solo manda la confirmación. Enlaces de tienda a `#` |
| 5 | Profile: name*, phone*, photo, interests, location*, cities, job, Industry*, Company, DOB (día/mes) | CUMPLE | `src/app/onboarding/{basics,personal,professional}/page.tsx` (todos los campos: "Cities you travel to most", "Date of birth (day / month)", "Industry"…); `supabase/schemas/profiles.sql`; bucket `profile-photos` |
| 6 | Terms & privacy acceptance required | CUMPLE | Modal de términos en `/signup` (E2E F1.1, F9.4). Nota: texto legal de relleno (`PENDIENTES.md` §1.2) y sin versión (PRIV-09) |
| 7 | Duplicate email prevented with clear message | CUMPLE | RPC `supabase/schemas/email_exists.sql`; E2E F1.1b. Trade-off de enumeración conocido (SEC-05, E2E-09) |

### Story 1.2 — Login

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Login email/password | CUMPLE | `src/app/login/page.tsx`; `page.test.tsx`; E2E F1.5 |
| 2 | Remember me | **PROVISIONAL** (conocido) | Checkbox en `login/page.tsx:35,214` sin efecto en la sesión — `PENDIENTES.md` §3 (1.2) |
| 3 | Password reset via email, secure token | CUMPLE | `/forgot-password`, `supabase/templates/recovery.html`, `/reset-password` (`updateUser`) |
| 4 | Lockout after 5 attempts, 15 min | **PARCIAL** (conocido) | `supabase/schemas/login_attempts.sql`; en local lo aplica Supabase Auth (hook); en remoto solo el cliente hasta activar el hook (plan Team) — SEC-03 / E2E-03 |
| 5 | Auto logout after 30 days inactivity | CUMPLE | `config.toml:320-323` `inactivity_timeout = "720h"` |
| 6 | Clear error messages | CUMPLE | E2E F1.2 ("4…1 attempts left", aviso de bloqueo) |

---

## Epic 2 — Descubrimiento y búsqueda

### Story 2.1 — Map-based discovery

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Interactive map with user's location | CUMPLE | `src/components/explore/city-map.tsx` (`@vis.gl/react-google-maps`); E2E F2.1 |
| 2 | Custom En Soleil markers | CUMPLE | `AdvancedMarker` con pin de marca en `city-map.tsx` |
| 3 | Distance miles/km per user preference (phone) | **PARCIAL** (conocido) | Haversine real (`src/lib/distance.ts`), toggle manual; no lee la configuración del teléfono ni se recuerda — `PENDIENTES.md` §3 (2.1) |
| 4 | Zoom and pan | CUMPLE | Google Maps + `city-map.test.tsx` |
| 5 | Location detection with permission request | CUMPLE | `src/lib/geolocation.ts`; diálogo de permiso en `src/app/explore/page.tsx` |
| 6 | Manual location fallback | CUMPLE | `ManualLocation` con Google Places (`src/lib/place-search.ts`); falta Places API en remoto (`PENDIENTES.md` §4.11) |
| 7 | Map loads within 3 s | **NO VERIFICABLE** | Solo existe un timeout de 3 s que muestra el estado de error (`useMapLoadStatus`); no hay medición. Riesgo de bundle: PERF-01 |
| 8 | Offline shows cached nearby locations | **PROVISIONAL** (conocido) | `navigator.onLine` real, "cacheados" = 6 más cercanos del catálogo ya cargado; SW no guarda datos — `PENDIENTES.md` §3 (2.1) |

### Story 2.2 — Filtering and search

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Amenity filter (WiFi, Lounge, Spa, Co-working, Day Rooms, Luggage) | CUMPLE | `src/lib/amenities.ts`, `src/lib/filters.ts` |
| 2 | Distance <0.5/1/2/5 mi | CUMPLE | `src/lib/filters.ts:20` `DISTANCE_BANDS = [0.5, 1, 2, 5]` |
| 3 | Availability: calendar view | **PARCIAL** (conocido) | Filtra por `bands`/`closed_weekdays`, no por disponibilidad en vivo ni temporadas — `COMPONENT-MAP.md` §Backend real Epic 2; `PENDIENTES.md` §4.14 |
| 4 | Text search by name/location/amenities | CUMPLE | `searchLounges` (`src/lib/lounge-directory.ts`, `ilike` + amenities) |
| 5 | Clear all filters | CUMPLE | Drawer de filtros de `/explore`; `filters.test.ts` |
| 6 | Real-time update | CUMPLE | Filtros en TS sobre el resultado, búsqueda con debounce 250 ms |
| 7 | No-results with suggestions | CUMPLE | `src/lib/filters.ts:165-177` (sugerencias "Extend distance…" con conteo real) |

### Story 2.3 — List view

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Toggle map/list | CUMPLE | `src/app/explore/page.tsx` |
| 2 | Sorted by distance | CUMPLE | `withDistance` (`lounge-directory.ts`) |
| 3 | Name, distance, amenity icons, availability | CUMPLE | Tarjeta de resultado; "N slots today"/"Full" real vía `lounge_seats_on` |
| 4 | Image thumbnails | CUMPLE | `src/lib/lounge-directory-photos.test.ts` (fotos de `lounge_images`) |
| 5 | Tap to details | CUMPLE | Enlace "View details" (bug del callout corregido, `lounge-callout.test.tsx`) |
| 6 | Infinite scroll | CUMPLE | `IntersectionObserver` sobre el pie (`COMPONENT-MAP.md` §Desviaciones) |
| 7 | Loading states | CUMPLE | `LoungeList loading` real; `lounge-list.test.tsx` |

---

## Epic 3 — Perfil de lounge

### Story 3.1 — Detailed information

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Hero carousel, min 3 images | **PARCIAL** | Carrusel real sobre `lounge_images`; nada exige 3 fotos: el checklist de publicar cuenta 4 puntos sin fotos (`lounge_checklist_missing`, `COMPONENT-MAP.md` §Desviaciones Epic 10). **SPEC-02** |
| 2 | Name, address, contact | CUMPLE | `fetchLoungeProfile` (`src/lib/lounge-profile.ts`), columnas `address/phone/email/website` |
| 3 | Operating hours, today highlighted | CUMPLE | `operatingHoursFor(weeklyHours)`; temporadas 10.9 aplicadas en la ficha |
| 4 | Amenity icons with descriptions | CUMPLE | `src/lib/amenities.ts` |
| 5 | Ratings and review count | **PROVISIONAL** (conocido) | `rating`/`review_count` sembrados, reseñas de muestra (`reviewsFor`); no hay tabla `reviews` — `COMPONENT-MAP.md` §Backend real Epic 3, `PENDIENTES.md` §2.5 |
| 6 | Call and Directions (Google Maps URL) | CUMPLE | `tel:` + URL de Google Maps con la dirección real |
| 7 | Share via social/messaging apps | **PARCIAL** (conocido + nuevo) | Destinos sin integración, solo "Copy" (`PENDIENTES.md` §3); además el enlace copiado es `https://luxepass.co/l/<id>` (`src/components/lounges/share-dialog.tsx:52-55`), una ruta que no existe en la app. **SPEC-03** |

### Story 3.2 — Availability

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Real-time Available / Not Available | CUMPLE | RPC `lounge_availability_range` (aforo − reservas, cierres, temporadas) |
| 2 | Weekly availability calendar | CUMPLE | `/lounges/[id]/availability`, `WeeklyCalendar` |
| 3 | Booking restrictions display (tier, advance notice) | **PARCIAL** | Se muestran, pero son texto sembrado que contradice o no aplica la regla real: "Free cancellation up to 4 hours before" frente a la regla de 24 h de `cancel_booking`; "Annual and Signature members" (no existe plan Signature y no se exige plan para reservar); "Book at least 2 hours ahead" no se valida en `confirm_booking` (`supabase/migrations/*seed_lounge_profiles*:15,26`). **SPEC-04** |
| 4 | Holiday/special closure notifications | CUMPLE | `lounge_closures` + aviso semanal; cierres 10.9 |
| 5 | Last updated timestamp | CUMPLE | `FreshnessNote` con `lastUpdatedAt` real |
| 6 | Auto refresh every 5 min | CUMPLE | `setInterval` + refetch en la página (`COMPONENT-MAP.md` §Backend real Epic 3) |

---

## Epic 4 — Reservas y pagos

### Story 4.1 — Booking flow

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Date picker from today | CUMPLE | `src/components/booking/visit-details-form.tsx`; `today()` real (`src/lib/availability.ts:49`, ver QA-04) |
| 2 | Admission for one only | CUMPLE | Sin selector de invitados; `bookings` sin columna de acompañantes |
| 3 | Special requests 100 chars | CUMPLE | Cliente `visit-details-form.tsx:151`; servidor `supabase/schemas/bookings.sql:18` `check (char_length(...) <= 100)` |
| 4 | Booking summary | CUMPLE | `/lounges/[id]/book/summary` |
| 5 | Terms and cancellation policy display | CUMPLE | Resumen/pago; ver SPEC-04 sobre el texto contradictorio de la ficha |
| 6 | One-tap confirmation | CUMPLE | `handleConfirm` en `summary/page.tsx` |
| 7 | Immediate confirmation screen | CUMPLE | `/book/confirmed`; E2E F3.1 |
| 8 | If full, waitlist | **PARCIAL** (conocido) | `join_waitlist` real; sin promoción automática — `PENDIENTES.md` §2.11 |

### Story 4.2 — Payment processing

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Stripe integration | CUMPLE | `supabase/functions/stripe-*`; webhook fuente de verdad |
| 2 | Major credit/debit cards | CUMPLE | Payment Element; E2E F3.1/F3.2 |
| 3 | Apple Pay / Google Pay | **NO VERIFICABLE** (conocido) | Requiere dominio verificado — `PENDIENTES.md` §3 (4.2) y §4.4 |
| 4 | Payment method storage | CUMPLE | `stripe-payment-methods`, "Save this card"; E2E F3.6 |
| 5 | Subscription pricing display | CUMPLE | `/profile/membership/plans` (Epic 9) |
| 6 | Individual day-pass pricing | CUMPLE | `src/lib/booking.ts` (precio + `booking_coverage`) |
| 7 | Tax calculation and display | **PARCIAL** (conocido) | Tipo fijo NY `src/lib/booking.ts:163` `TAX_RATE = 0.08875` para todo lounge — PAY-13 |
| 8 | Payment confirmation email receipt | CUMPLE | Trigger `booking_receipts.sql` → `send-booking-receipt` (Brevo). HTML sin escapar: SEC-06 |
| 9 | PCI DSS | CUMPLE | Datos de tarjeta solo en Stripe Elements (SAQ A) |

### Story 4.3 — Calendar integration

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Add to Calendar post-booking | CUMPLE | `AddToCalendarModal` en `/book/confirmed`. El botón del pase individual está inerte (E2E-08, conocido) |
| 2 | iOS / Google / Outlook (.ics) | CUMPLE | `src/lib/calendar-export.ts` (.ics + URL de Google Calendar) |
| 3 | Pre-populated event with details/address | CUMPLE | `calendar-export.ts`; `calendar-export.test.ts` |
| 4 | 15-minute reminder default | CUMPLE | `VALARM` `calendar-export.ts:72-76`; `REMINDER_MINUTES` en `add-to-calendar-modal.tsx:52` |
| 5 | Directions link in event | CUMPLE | `calendar-export.ts:47` |
| 6 | Booking reference in description | CUMPLE | `calendar-export.ts:52` |

---

## Epic 5 — Pase y check-in

### Story 5.1 — Digital pass

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Unique LP# per booking | CUMPLE | Columna generada `confirmation_code` (`bookings.sql`, `booking_reference(uuid)`) |
| 2 | Member name, lounge, date/time, duration | CUMPLE | `fetchDigitalPass` (`src/lib/passes.ts`), nombre real del perfil |
| 3 | Available from My Bookings | CUMPLE | `/my-pass` → `/my-pass/[reference]`; E2E F4.1 |
| 4 | Screenshot-friendly | CUMPLE | Diseño del pase. Nota: el QR es decorativo (`PENDIENTES.md` §2.6) |
| 5 | Expires automatically after window | **PROVISIONAL** (conocido) | Sin cron de expiración; estados por `?state=` — `PENDIENTES.md` §3 (5.1), E2E-06 |

### Story 5.2 — Check-in

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Instant validity verification | CUMPLE | `reception_lookup_booking`; partner `partner_checkin_booking` |
| 2 | Check-in confirmation to member's app | **NO CUMPLE** (conocido) | El pase no refleja el check-in — E2E-06 |
| 3 | No-show tracking | CUMPLE | `bookings.no_show`, `reception_report_no_show`/`partner_report_no_show`; E2E F4.5 |
| 4 | Emergency contact accessible to staff | **PARCIAL** (conocido) | Lectura real, pero el miembro no puede introducirlo ("Edit" inerte en `/profile/privacy`) — `PENDIENTES.md` §3 (5.2) |

### Story 5.3 — Reminder

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | 24 h before the booking | CUMPLE | `supabase/schemas/booking_reminders.sql` (pg_cron 30 min) → `send-booking-reminder`. No ejercitado de punta a punta (envío Brevo) |

---

## Epic 6 — Experiencia de miembro

### Story 6.1 — Booking management

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | My Bookings upcoming/past | CUMPLE | `fetchUpcomingBookings`/`fetchPastBookings` (`src/lib/passes.ts:354`) |
| 2 | Status Confirmed / In Progress / Completed / Cancelled | CUMPLE | `src/lib/passes.ts:273,297,338`. "Completed" sin no-show no es alcanzable por ningún camino real (`COMPONENT-MAP.md` §Backend real Epic 5) |
| 3 | Modification: Cancel | CUMPLE | RPC `cancel_booking` desde `/my-pass`. Sin reembolso si cancela el admin: PAY-08. "Cancel visit" del pase individual inerte: E2E-08 |
| 4 | No-show policy, flat fee | **PARCIAL** (conocido) | Fee de $35 registrado en `cancellation_fee_cents`, nunca cobrado — `PENDIENTES.md` §3 (6.1), `pagos-y-logica-de-negocio.md` |
| 5 | 24-hour cancellation notice | CUMPLE | `cancel_booking` (`bookings.sql:438`) |
| 6 | Booking history | **PARCIAL** | La lista de pasadas es real, pero el rail "Your record" es literal para todos (`src/lib/passes.ts:456-462`: 14 visitas, 11, 2, 1; `my-pass/page.tsx:424-437`) y "Download your booking history · CSV, all 14 visits" (`my-pass/page.tsx:443-450`) no es un botón. **SPEC-05** |
| 7 | Email per booking with confirmation number | CUMPLE | `send-booking-receipt` (LP# en el email) |
| 8 | Support contact for booking issues — Admin | **NO CUMPLE** (conocido) | `SupportRow` (`my-pass/page.tsx:414,441,456`) sin enlace ni acción — `PENDIENTES.md` §3 (6.1) |

### Story 6.2 — In-app notifications

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Booking confirmation | CUMPLE | Trigger `booking_confirmed_notify_in_app` (`supabase/schemas/notifications.sql`) |
| 2 | 6 am notification | CUMPLE | `dispatch_morning_notifications()` (pg_cron). Preferencias/horas de silencio no persistidas ni respetadas: PRIV-03 (conocido) |
| 3 | New lounge partner announcements | **PROVISIONAL** (conocido) | Fila sembrada al crear el perfil — `PENDIENTES.md` §3 (6.2) |
| 4 | Membership renewal reminders | CUMPLE | `dispatch_membership_renewals()` inserta la notificación real (Epic 9). Nota: el seed de Epic 6 la siembra además a todo perfil nuevo, también sin plan (`PENDIENTES.md` §2.12) |
| 5 | Special offers and promotions | **PROVISIONAL** (conocido) | Fila sembrada — `PENDIENTES.md` §3 (6.2) |
| 6 | Birthday month promotion | **PROVISIONAL** (conocido) | Fila sembrada — `PENDIENTES.md` §3 (6.2) |

### Story 6.3 — Profile and preferences

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Edit profile, all onboarding fields | CUMPLE | `/profile` (`updateProfile`, foto incluida) |
| 2 | Favorite lounges list | CUMPLE | `member_favorite_lounges`; botón en `/lounges/[id]` |
| 3 | Preferred amenities | CUMPLE | `profiles.preferred_amenities`, autoguardado |
| 4 | Membership status Active/Inactive | CUMPLE | Espejo de `memberships` (`sync_profile_membership_status`) |
| 5 | Referral code sharing | CUMPLE | `profiles.referral_code`; `referral-share-modal.tsx` |
| 6 | Privacy settings for data usage | **PARCIAL** (conocido) | Se guardan pero nadie los consume (PRIV-07) |
| 7 | Account deletion with confirmation | **PARCIAL** (conocido) | Soft-delete + cron real; borrado incompleto fuera de Postgres (PRIV-02); cron silencioso sin secretos (PRIV-08) |
| 8 | Export personal data (GDPR) | **PARCIAL** (conocido) | Descarga real pero omite pagos, membresías, referidos, tickets y foto — PRIV-06 |

---

## Epic 7 — Partner Dashboard

### Story 7.1 — Daily guest management

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Today's guest list | CUMPLE | `partner_guest_list` (`src/components/partner/today-dashboard.tsx:74`) |
| 2 | Guest name, contact, email | CUMPLE | Mismo RPC |
| 3 | Real-time updates | CUMPLE | Supabase Realtime `postgres_changes` (`today-dashboard.tsx:110-175`) |
| 4 | Check-in status per guest | CUMPLE | `partner_checkin_booking` |
| 5 | No-show reporting | CUMPLE | `partner_report_no_show` (+ ticket automático, Epic 8) |
| 6 | Guest contact info for communication | CUMPLE | Contacto mientras la reserva está abierta |
| 7 | Print-friendly list, CSV | CUMPLE | `window.print()` (`today-dashboard.tsx:313`) + CSV "daily-guest-list" (`src/app/partner/reports/page.tsx:62-69`) |
| 8 | Search/filter guests by name **or date** | **PARCIAL** | Búsqueda por nombre en `/partner` y `/partner/guests`; la lista siempre es de `today()` (`today-dashboard.tsx:74,85`), no hay filtro por fecha ni vista de otro día. **SPEC-06** |

### Story 7.2 — Booking notifications for partners

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Email per new booking | CUMPLE | Trigger `booking_confirmed_notify_partner` → `send-partner-booking-event` (`supabase/schemas/partner_notifications.sql`); destinatarios 10.7 |
| 2 | Morning digest | CUMPLE | `dispatch_partner_morning_digest()` (6:30) → `send-partner-digest` |
| 3 | Cancellation with updated count | CUMPLE | `booking_cancelled_notify_partner`; `_shared/partner-emails.ts` |

### Story 7.3 — Partner analytics

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Weekly/monthly booking volume reports | **PARCIAL** | En pantalla, `/partner/analytics` agrega real (`partner_analytics_summary`, `partner_bookings_by_day`). Como informe, "Weekly booking volume" y "Monthly booking volume" descargan **solo la cabecera** (`src/app/partner/reports/page.tsx:46-53,89`). **SPEC-07** |
| 2 | Revenue attribution | CUMPLE | `partner_analytics_summary` + `revenueBreakdownFor` (day pass vs. membresía derivado de `payments`) |
| 3 | Repeat guest identification | CUMPLE | `partner_repeat_guests`. Privacidad: PRIV-04 |
| 4 | Downloadable reports in CSV | **PARCIAL** | Reales: daily guest list, repeat guests, revenue attribution. Vacíos (solo cabecera): weekly, monthly, no-show log (`reports/page.tsx:89`). **SPEC-07** |

---

## Epic 8 — Admin y soporte

### Story 8.1 — Customer support dashboard

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Member search by email/phone/name | CUMPLE | `admin_search_members` (`supabase/schemas/support_tickets.sql`) |
| 2 | Complete booking history | CUMPLE | `admin_member_bookings` |
| 3 | Payment transaction details | CUMPLE | `admin_member_payments` |
| 4 | Account status and membership level | CUMPLE | Plan real de `memberships` en `/admin/members/[id]` |
| 5 | Issue tracking and resolution notes | CUMPLE | `support_tickets`/`support_ticket_messages` |
| 6 | Booking modification | CUMPLE | `admin_reschedule_booking` (`BookingOverrideDrawer`) |
| 7 | Refund processing interface | CUMPLE | `stripe-refund-payment` real, con importe validado y efecto sobre reserva, membresía y referido |
| 8 | Communication log with customer | CUMPLE | Hilo de `support_ticket_messages` en el caso |
| 9 | Escalation to manager | **PARCIAL** (conocido) | Cambia `status = 'escalated'`; manager `DUTY_MANAGER` fijo, sin bandeja ni aviso — `PENDIENTES.md` §3 (8.1) |

### Story 8.2 — Data export and analytics

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | User data export (anonymized) | CUMPLE | `admin_export_members` + `buildExportCsv` (anonimizado por defecto, motivo obligatorio para columnas personales) |
| 2 | No-show rate tracking | CUMPLE | `admin_network_summary`; `admin_export_no_shows_cancellations` |
| 3 | Booking export with date range | CUMPLE | `admin_export_bookings` + rango (`dateRangeForPreset`) |
| 4 | Revenue by partner and time period | **PARCIAL** (conocido) | `admin_revenue_by_partner` agrupa por lounge, no por partner — `PENDIENTES.md` §4.13 |
| 5 | Member acquisition and retention | CUMPLE | `/admin/analytics` ("joined / left in the period", `page.tsx:144`) |
| 6 | Most popular lounges and amenities | CUMPLE | `admin_lounge_popularity`, `admin_amenity_demand` |
| 7 | Geographic usage patterns | CUMPLE | `admin_city_demand` |
| 8 | Automated daily/weekly report generation | CUMPLE | `scheduled_reports` + `dispatch_scheduled_reports()` (pg_cron 15 min) |
| 9 | CSV export | CUMPLE | `/admin/reports` (fallo de test conocido con base acumulada, `PENDIENTES.md` §4.9) |
| 10 | Scheduled email delivery | CUMPLE | `send-admin-report` con adjunto vía Brevo. "Email it to me" puntual deshabilitado (desviación declarada) |

### Story 8.3 — Content management

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Add/edit/remove lounges | CUMPLE | `/admin/lounges/new`, borrador/live, archivar/suspender |
| 2 | Upload and manage images | CUMPLE | Bucket `lounge-images`; editor 10.10 |
| 3 | Update amenities **(shower)** and hours | **PARCIAL** | Horario y amenities editables, pero el catálogo de 6 amenities no tiene "Shower", la única que el criterio nombra (`src/lib/amenities.ts`; `COMPONENT-MAP.md` §Backend real Epic 8). **SPEC-08** |
| 4 | Booking availability and restrictions | CUMPLE | `capacity`, `bands`, `booking_restrictions`, temporadas/cierres (10.9) |
| 5 | Bulk update | CUMPLE | Acciones masivas desde el detalle del partner (10.11). En `/admin/lounges` solo "Archive" es real (desviación declarada) |
| 6 | Content approval workflow | **NO CUMPLE** | Retirado por decisión interna del 29 sept 2026 ("cualquier admin publica"), declarado solo como desviación en `COMPONENT-MAP.md` §Desviaciones; no está en `PENDIENTES.md`. **SPEC-10** |
| 7 | Image optimization and resizing | CUMPLE | Story 10.10: recorte + tamaño final + compresión en cliente (`src/lib/photo-crop.ts`). `PENDIENTES.md` §3 (8.3) está desactualizado en este punto |

---

## Epic 9 — Membresía y referidos

### Story 9.1 — Membership

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Membership display active/inactive | CUMPLE | `/profile`, `/profile/membership` (`memberships`) |
| 2 | Benefits explanation | CUMPLE | `src/app/profile/membership/page.tsx` |
| 3 | Upgrade options and pricing (monthly → yearly) | CUMPLE | `membership_change_quote` + `stripe-membership-checkout`; E2E F6.1. Carrera: PAY-06 |
| 4 | Renewal date and auto-renewal settings | **PARCIAL** | Fecha real y cron de renovación real; pero `AutoRenewModal` solo existe para el plan anual: con plan mensual "Manage renewal" y el `Switch` quedan inertes (desviación declarada en `COMPONENT-MAP.md`, no en `PENDIENTES.md`). Riesgos de cobro: PAY-09. **SPEC-09** |

### Story 9.2 — Referral program

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Unique referral code | CUMPLE | `profiles.referral_code` único (`supabase/schemas/referrals.sql`). Entropía: PAY-15 |
| 2 | Sharing via social, email, SMS | CUMPLE | `src/components/membership/referral-share-modal.tsx:34-86` (`sms:`, `wa.me`, `mailto:`, `navigator.share`) |
| 3 | Referral tracking and status | CUMPLE | Tabla `referrals`, `/profile/membership/referrals` |
| 4 | Reward crediting (pending) | CUMPLE | Trigger `credit_referral_on_first_payment`. Abuso: PAY-07; tope anual y reembolso sin retirar premio (`PENDIENTES.md` §2.12) |
| 5 | Friend's sign-up notification | CUMPLE | `create_referral_from_signup` inserta la notificación |
| 6 | Bonus terms and conditions | CUMPLE | Términos en la vista de referidos |

---

## Epic 10 — Partner como organización

Verificado por `COMPONENT-MAP.md` (§Backend real Epic 7/8 y desviaciones Epic 10), `PENDIENTES.md` §4.13–4.14 y la presencia de tests dedicados (`src/lib/partner-organization.test.ts`, `admin-partners.test.ts`, `admin-partner-access.test.ts`, `partner-lounges.test.ts`, `partner-notifications.test.ts`, `partner-for-members.test.tsx`, `partner-bulk.test.ts`, `lounge-schedule.test.ts`, `member-lounge-schedule.test.ts`, `photo-crop.test.ts`, `src/app/admin/partners/[id]/bulk.test.tsx`). Profundidad menor que en Epics 1–9: no se trazó cada criterio a línea.

| Historia | Criterios | Estado | Notas |
|---|---:|---|---|
| 10.1 Modelo organización | 10 | 10 CUMPLE | `supabase/schemas/partners.sql` (`partners`, `partner_members`, `lounges.partner_id`, `partner_lounge_ids()`); seed `scripts/seed-partners.mjs` |
| 10.2 Listado de partners | 7 | 7 CUMPLE | `/admin/partners` |
| 10.3 Crear y editar | 12 | 12 CUMPLE | Edge Function `admin-partners`; rol único por email |
| 10.4 Activar y suspender | 10 | 10 CUMPLE | Suspender no invalida el token al instante, pero `partner_context()` corta el acceso al recargar (`PENDIENTES.md` §4.13) |
| 10.5 Lounge asociado | 9 | 9 CUMPLE | `LoungeDraftPartner`; publicar exige partner `active` |
| 10.6 Selector de lounge | 8 | 8 CUMPLE | `src/lib/partner-lounges.ts`, `lounge-switcher.tsx` |
| 10.7 Notificaciones al partner | 4 | 4 CUMPLE | `send-partner-booking-event`, `send-partner-digest`, `_shared/partner-emails.ts` |
| 10.8 Partner en vista de miembro | 6 | 6 CUMPLE | Pase de un lounge no-live sin partner (conocido, `PENDIENTES.md` §4.13) |
| 10.9 Temporadas y cierres | 8 | 7 CUMPLE · 1 **PARCIAL** (conocido) | Criterio 2: `/explore` (tarjetas y filtro de fecha) ignora la temporada — `PENDIENTES.md` §4.14 |
| 10.10 Fotos optimizadas | 8 | 7 CUMPLE · 1 **PARCIAL** | Criterio 8 "ve el progreso": solo "Uploading" sin porcentaje (desviación declarada en `COMPONENT-MAP.md`; `PENDIENTES.md` §4.14 la menciona) |
| 10.11 Acciones masivas | 6 | 6 CUMPLE | Sin registro de auditoría (fuera de AC) |
| 10.12 Búsqueda en el partner | 4 | 4 CUMPLE | `bulk.test.tsx` cubre la selección al buscar |

---

## Hallazgos nuevos (no registrados en `PENDIENTES.md`)

Severidad según el impacto para el cliente. Los PARCIAL/NO CUMPLE marcados "(conocido)" en las tablas no se repiten aquí.

### SPEC-04 · Alta · Las restricciones de reserva de la ficha contradicen las reglas reales
- **Criterio:** 3.2 "Booking restrictions display (member tier, advance notice)" + 6.1 "24-hour advance notice requirement for cancellation".
- **Evidencia:** `booking_restrictions` sembrado (`supabase/migrations/*_seed_lounge_profiles_story_3.sql:15,26`): "Free cancellation up to 4 hours before", "Annual and Signature members", "Book at least 2 hours ahead". La regla real es 24 h (`cancel_booking`, `bookings.sql:438`), no existe plan "Signature", reservar no exige plan (sin plan se paga day pass) y `confirm_booking` no valida antelación de 2 h.
- **Impacto:** el miembro lee que cancelar con 5 h de antelación es gratis y se le registra la tarifa de $35. Promesa contractual falsa en el flujo de reserva.
- **Recomendación:** derivar las restricciones de las reglas reales (24 h, admisión de uno) o validarlas en servidor; corregir el seed y los lounges de admin.

### SPEC-05 · Media · Historial de reservas con cifras fijas y descarga inexistente
- **Criterio:** 6.1 "Booking history".
- **Evidencia:** `src/lib/passes.ts:456-462` (`BOOKING_RECORD_SUMMARY`: 14/11/2/1) usado en `src/app/my-pass/page.tsx:424-437`; "Download your booking history · CSV, all 14 visits" (`page.tsx:443-450`) es un `div` sin acción.
- **Impacto:** todos los miembros ven "14 visits" y "1 no-show" aunque no tengan ninguno; puede generar quejas o disputas.
- **Recomendación:** calcular el resumen con `fetchPastBookings` y conectar la descarga (`downloadTextFile`).

### SPEC-07 · Media · Informes CSV semanal/mensual y de no-shows del partner vacíos
- **Criterio:** 7.3 "Weekly/monthly booking volume reports" y "Downloadable reports in CSV".
- **Evidencia:** `src/app/partner/reports/page.tsx:46-53` (comentario: "nunca tuvieron CSV completo") y `:89` (devuelve solo la cabecera para "weekly-booking-volume", "monthly-booking-volume" y "no-show-log").
- **Impacto:** el partner descarga un archivo vacío de los dos informes que nombra el criterio.
- **Recomendación:** agregar con `partner_bookings_by_day` por semana/mes y exportar no-shows con un RPC propio.

### SPEC-10 · Media · "Content approval workflow" retirado sin aceptación del cliente registrada
- **Criterio:** 8.3 "Content approval workflow".
- **Evidencia:** `COMPONENT-MAP.md` §Desviaciones ("Sin cola de aprobación… Decisión del usuario (29 sept 2026)… Deja sin implementar el criterio"); no consta en `PENDIENTES.md` §5 ni hay acuerdo con En Soleil.
- **Impacto:** criterio del contrato no entregado; las tablas/RPC de aprobación (`lounge_content_submissions`, `admin_approve_lounge_submission`) quedan sin uso.
- **Recomendación:** confirmar con el cliente la retirada (y anotarla en `PENDIENTES.md` §5) o reactivar la cola.

### SPEC-01 · Media · La regla de contraseña (carácter especial) solo se valida en el cliente
- **Criterio:** 1.1 "Password must meet security requirements (8+ chars, special characters)".
- **Evidencia:** `src/lib/registration.ts:80` (cliente); `supabase/config.toml:198` `password_requirements = ""`. `/reset-password` (`updateUser`) y cualquier llamada directa a GoTrue aceptan "password1".
- **Recomendación:** `password_requirements = "lower_upper_letters_digits_symbols"` (o el nivel acordado) en `config.toml` y en los remotos.

### SPEC-09 · Media · Ajustes de auto-renovación inexistentes para el plan mensual
- **Criterio:** 9.1 "Renewal date and auto-renewal settings".
- **Evidencia:** `COMPONENT-MAP.md` §Desviaciones ("`AutoRenewModal` solo se abre para el plan anual… 'Manage renewal' y el `Switch` quedan inertes con un plan mensual"). No figura en `PENDIENTES.md`.
- **Impacto:** un miembro mensual no puede desactivar la renovación; la pantalla muestra un control que no hace nada.

### SPEC-06 · Baja · Sin filtro de invitados por fecha en el dashboard del partner
- **Criterio:** 7.1 "Search/filter guests by name or date".
- **Evidencia:** `today-dashboard.tsx:74,85` (siempre `p_date: today()`); `/partner/guests` filtra repetidores por nombre, no por fecha.

### SPEC-02 · Baja · Nada exige el mínimo de 3 imágenes del carrusel
- **Criterio:** 3.1 "High-quality hero image carousel (min 3 images)".
- **Evidencia:** el checklist de publicación (`lounge_checklist_missing`) cuenta contacto, dirección, horario y plazas, sin fotos (`COMPONENT-MAP.md` §Desviaciones Epic 10). Un lounge puede publicarse con 0–2 fotos.

### SPEC-03 · Baja · El enlace de "Share lounge" apunta a una ruta que no existe
- **Criterio:** 3.1 "Share lounge option".
- **Evidencia:** `src/components/lounges/share-dialog.tsx:52-55` copia `https://luxepass.co/l/<id>`; la app no tiene `/l/[id]` y el dominio no está resuelto (`CLAUDE.md`). La parte de destinos sin integración ya es conocida (`PENDIENTES.md` §3).

### SPEC-08 · Baja · La amenity "Shower" que nombra el criterio no existe en el catálogo
- **Criterio:** 8.3 "Update amenities (shower) and operating hours".
- **Evidencia:** `src/lib/amenities.ts` (6 amenities de la Story 2.2); `COMPONENT-MAP.md` §Backend real Epic 8 reconoce que "Showers" nunca existió.

### SPEC-11 · Info · `PENDIENTES.md` §3 desactualizado
- Las filas de 7.1, 7.2, 7.3 y 8.3 ("Image optimization") describen el estado de mockup, que ya no es real (Epic 7 conectado, Story 10.10 hecha). Confunde a quien audite contra esa tabla. Recomendación: depurarla.

---

## Relación con informes previos

| Criterio | Hallazgo previo citado |
|---|---|
| 1.2 lockout | SEC-03, E2E-03 |
| 1.1 duplicado | SEC-05, E2E-09 |
| 4.2 Stripe / impuestos | PAY-13, SEC-06 |
| 4.3 / 6.1 botones del pase | E2E-08 |
| 5.1 / 5.2 estados del pase | E2E-06 |
| 6.1 cancelación / fee | PAY-08 |
| 6.2 preferencias | PRIV-03 |
| 6.3 privacidad / borrado / export | PRIV-02, PRIV-06, PRIV-07, PRIV-08 |
| 7.1 / 7.3 datos de huéspedes | PRIV-04 |
| 9.1 renovación / upgrade | PAY-06, PAY-09 |
| 9.2 referidos | PAY-07, PAY-15 |
