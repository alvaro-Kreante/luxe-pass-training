# LuxePass — Mapa de componentes

Puente entre `DESIGN-SYSTEM.md` (la especificación) y `src/components/` (el código).

**Antes de crear cualquier componente, buscarlo aquí.** Si ya existe, se usa o se le
añade una variante — no se escribe uno nuevo. Después de crearlo, añadir su fila.

`DESIGN-SYSTEM.md` ya anota los parecidos entre epics ("gemelo claro del patrón 16",
"es el chip de estado de reserva sin cambiar geometría"). Este archivo traduce esas
anotaciones a decisiones de código, para que un epic futuro no reinvente lo que la
Fase 1 ya pagó.

---

## Arquitectura

```
Capa 0  tokens        src/app/globals.css            §2 Tokens · §3 Tipografía
Capa 1  primitivos    src/components/ui/             §4 Componentes
Capa 2  patrones      src/components/patterns/       §5 Patrones de pantalla
Capa 3  pantallas     src/app/**/page.tsx            solo componen
```

**Regla:** una pantalla (capa 3) no escribe un `px` ni un `#hex`. Si necesita algo que
no existe, se sube a capa 1 o 2 y se anota aquí.

### Tokens: literales y semánticos

`globals.css` tiene tres bloques encadenados:

1. **Literales** — los valores exactos de §2 (`--gold-500`, `--dark-card`). No se editan
   sin actualizar el design system.
2. **Semánticos** — lo que consumen los componentes (`--surface`, `--fg`, `--line`),
   redefinidos bajo `[data-theme="dark"]`.
3. **`@theme inline`** — el puente a Tailwind, que genera `bg-surface`, `text-fg-muted`,
   `border-line`, `rounded-panel`, `shadow-ring`…

Por eso **un mismo componente sirve a los dos temas**: el shell pone `data-theme="dark"`
y los tokens resuelven en la mitad oscura del sistema. Esto cubre los "gemelos" que el
design system identifica (tile de métrica, fila de datos, lista de datos, modal, drawer,
chip de estado, input…).

Lo que el tema **no** resuelve son las diferencias de *geometría* entre gemelos: input
oscuro 44px vs. claro 50px, fila de datos 54px vs. 58px, drawer 436px vs. 472px. Esas van
como variante explícita (`inputSize="compact"`), nunca coladas por el token.

> ⚠️ Tailwind v4 **no lee `tailwind.config.ts`**. El tema vive en `@theme inline` dentro
> de `globals.css`. El config JS se eliminó porque no tenía efecto.

---

## Capa 1 — Primitivos (`src/components/ui/`)

| Componente | Archivo | DESIGN-SYSTEM | Variantes | Usado en |
|---|---|---|---|---|
| `Button` | `button.tsx` | §4 Botón primario / secundario / outline de acento / "atrás" | `variant`: primary·secondary·outline·ghost · `size`: lg(52px)·md(44px)·square(52×52) · `block` | E1 |
| `Input` | `input.tsx` | §4 Input · §4 Input/búsqueda (oscuro) | `inputSize`: default(50px)·compact(44px) · `icon` · `trailing` | E1 |
| `Select` | `select.tsx` | §4 Input / select | hereda `controlVariants` de `Input` · `icon` | E1 |
| `Field` | `field.tsx` | §3 label 13px/600 · hint 12px | `required` · `optional` · `hint` | E1 |
| `Checkbox` | `checkbox.tsx` | §4 Checkbox 18×18 | `align`: start(texto multilínea)·center(etiqueta de una línea) | E1 |
| `Card` | `card.tsx` | §4 Card/panel · Card de contenido | `variant`: panel(24px)·content(18px)·flat · `interactive` · `padded` | E1 |
| `Eyebrow` | `eyebrow.tsx` | §3 eyebrow 12px/700 uppercase | `muted` (cabeceras de tabla, tile de métrica claro) | E1 |
| `StepProgress` | `step-progress.tsx` | §4 Progress de pasos | `current` / `total` / `label` | E1 |
| `SelectableChip` | `chip.tsx` | §4 Chip seleccionable | `selected` | E1 |
| `AddChip` | `chip.tsx` | §4 (variante "Other", borde discontinuo) | — | E1 |
| `RemovableChip` | `chip.tsx` | §4 Chip removible | — | E1 |
| `Segmented` | `segmented.tsx` | §5 patrón 5 — los dos segmented de la topbar de Explore | `size`: md(50px)·sm(38px) · `icon` por opción | E2 |
| `StatusChip` | `status-chip.tsx` | §5 "Estados" — disponibilidad | `available` · `size`: md(11.5px)·sm(11px) | E2 · E3 |
| `EmptyState` | `empty-state.tsx` | §5 "Estados" — vacío / error | `width` 440–660 · `icon` · `footnote` | E2 · E3 (`NoRatings.dc.html`) |
| `Spinner` | `spinner.tsx` | §5 "Estados" — spinner de 18px | `size` | E2 |
| `Skeleton` | `skeleton.tsx` | §5 "Estados" — carga, misma geometría que la pieza real | — | E2 |
| `Rating` | `rating.tsx` | **Derivado** — §4 no le da fila; la geometría (estrella dorada de 13px + cifra en 12.5px/600) se repite en `Home`, `ListView` y el callout del mapa | — | E2 |
| `Notice` | `notice.tsx` | **Derivado** — §4 geometría de "Fila de opción" + borde discontinuo de §5 Estados | `tone`: muted·attention | E1 |
| `MonthCalendar` | `date-picker.tsx` | §4 Date picker mensual | `days: MonthDay[]` (de `lib/booking.ts`) · `selectedDate` · `onSelectDate` · `onPrevMonth`/`onNextMonth` · `canGoPrev` | E4 |
| `TimeSlotGrid` | `time-slot.tsx` | §4 Slot de hora | `slots: BookingSlot[]` · `selectedTime` · `onSelect` | E4 |
| `PaymentOptionRow` | `payment-option-row.tsx` | §4 Fila de opción / método de pago | `selected` · `onSelect` · `title`/`subtitle` · `leading`/`trailing` · `disabled`. Reutilizada literalmente por las alternativas de `Waitlist.dc.html` y `PaymentError.dc.html` — la nota de §4 ya preveía este doble uso | E4 |
| `CardBrandBadge` | `card-brand-badge.tsx` | §4 Marca de tarjeta | `brand`: visa·mastercard | E4 |
| `QrCode` | `qr-code.tsx` | §4 Código QR del pase (Fase 6) | `size`. Decorativo: dibuja los mismos módulos de los artboards, no codifica de verdad el LP# — pendiente conocido de la Fase 6 | E5 |
| `StatusChip` (ampliado) | `status-chip.tsx` | §4 "Estados" — disponibilidad, ahora también No-show/Waitlisted del pase | nueva variante `dashed` (borde discontinuo) junto a `available`/`size` | E2 · E3 · E5 |
| `Button` (ampliado) | `button.tsx` | §4 Botón fantasma (oscuro) | la variante `ghost` (ya existía sin usar) gana el borde `border-line`/hover `border-accent` que pide la Fase 2, y la estrena la consola de recepción | E5 |

## Capa 2 — Patrones (`src/components/patterns/`)

| Patrón | Archivo | DESIGN-SYSTEM | Notas |
|---|---|---|---|
| Split-screen de autenticación | `auth-split.tsx` | §5 patrón **1** | `cardWidth` 440/460 · `centered`. Sirve a sign up, log in, reset password, verificación y pasos de perfil |
| Full-bleed de confirmación | `full-bleed-success.tsx` | §5 patrón **2** | Lleva `data-theme="dark"` incorporado |
| App shell (miembro) | `app-shell.tsx` | §5 patrón **3** | Sidebar de 248px + área de contenido. `padded={false}` para el patrón 5 (Explore), que va a sangre. Fija la nav de los Epics 2–6 |
| Modal sobre pantalla | `modal.tsx` | §5 patrón **4** | Radix Dialog. `width` 640 por defecto (520–540 en los diálogos de ubicación). `align="center"` + `media` para el diálogo de permiso. El patrón **18** (modal oscuro) es este mismo dentro de `data-theme="dark"` |
| Drawer lateral | `drawer.tsx` | §5 patrón **6** | Radix Dialog con `modal={false}` — el fondo debe seguir siendo perceptible mientras se filtra. `width` 436 (472 en el patrón **18** oscuro) |
| Explore (mapa + resultados) | `explore-layout.tsx` | §5 patrón **5** | Topbar de 88px, fila de filtros de 52px, panel de 372px + mapa. El panel es la `region` "Results" que comparten mapa y lista |
| Perfil de lounge (detalle) | `app/lounges/[id]/page.tsx` compone `lounges/hero-carousel.tsx` + `lounges/availability-card.tsx` | §5 patrón **7** | Sin archivo de patrón único: la topbar de 64px y el hero de 268px solo los usa esta pantalla, igual que Explore no extrae su topbar aparte de `explore-layout.tsx` |
| Sub-vista de lounge | `lounges/lounge-subview-header.tsx` | §5 patrón **8** | Topbar 64px + header 84px (miniatura, nombre, sello de frescura). Reutilizado por `/lounges/[id]/availability` y `/lounges/[id]/reviews`. Dos posiciones de chip, no una: `badge` va junto al título (`Main.dc.html` "Accepting bookings", `NoRatings.dc.html` "New on LuxePass"); `trailingBadge` (nuevo, Epic 4) va en el extremo derecho, donde por defecto vive el sello de frescura — ahí es donde `Payment.dc.html`/`Summary.dc.html` dibujan el chip "Slot held for M:SS", no junto al título. `topbarRight` (nuevo, Epic 4) sustituye "Booking help" por "Secure checkout"; `hideFreshness` (nuevo, Epic 4) oculta el sello cuando `trailingBadge` ocupa su sitio |
| Flujo por pasos con rail de resumen | `step-flow-rail.tsx` | §5 patrón **9** | Compone `LoungeSubviewHeader` + `StepProgress` + el rail de 344px. Usado en los tres pasos de `/lounges/[id]/book` |
| Tarjeta de confirmación oscura | `confirmation-card.tsx` | §5 patrón **10** | Card de 344px, `data-theme="dark"` propio + `.surface-night.dot-pattern`. `rows: {label,value}[]` genérico para que el patrón 11 (pase digital, Fase 6) lo extienda sin reescribirlo |
| Pase digital | `passes/digital-pass-card.tsx` | §5 patrón **11** | Card de 380px, `data-theme="dark"` propio. Cuatro estados por `state: PassLifecycleState` (`upcoming`·`today`·`checked-in`·`expired`) en vez de cuatro componentes — el pase es el mismo, solo cambia lo que muestra. El sello de expirado va inline (un solo uso, no se sube a primitivo) |
| Consola de recepción | `app/reception/page.tsx` | §5 patrón **12** | Sin archivo de patrón aparte — como el perfil de lounge (patrón 7), la topbar de 72px y la columna de 900px solo las usa esta pantalla. El campo de lookup (oscuro) también va inline aquí, no como primitivo, por el mismo motivo |

### Utilidades de superficie (`globals.css`)

| Clase | DESIGN-SYSTEM | Usada por los patrones |
|---|---|---|
| `.surface-night` | §2 radial de artboard oscuro | 12, 15, 21 |
| `.surface-night-panel` | §5 patrón 1 (panel de marca) | 1, 2 |
| `.surface-blush` | §5 patrón 1 (área de contenido) | 1 |
| `.dot-pattern` | §2 puntos dorados a 18px | 1, 2, 10, 12, 15, 21 |
| `.lounge-hero` | Placeholder de imagen de lounge (3 tonos) | Card del Home, `LoungeThumb` |
| `.spinner` | §5 "Estados" — giro de 1s | `Spinner` |
| `.map-canvas` | §5 "Mapa" — el plano cubre su contenedor sin deformarse | `CityMap` |
| `.map-marker` | §5 "Mapa" — gota de 36 / 46px | `CityMap` |
| `.map-offline` | §5 "Mapa" — plano cacheado en gris | `CityMap` |
| `.skeleton` | §5 Estados (carga) | — |

## Capa 3 — Pantallas

| Ruta | Artboard | Story |
|---|---|---|
| `/signup` | `Main.dc.html` + `Terms.dc.html` | 1.1 |
| `/verify-email` | `Verification.dc.html` | 1.1 |
| `/onboarding/basics` | `ProfileBasic.dc.html` | 1.1 |
| `/onboarding/personal` | `ProfilePersonal.dc.html` | 1.1 |
| `/onboarding/professional` | `ProfileProfessional.dc.html` | 1.1 |
| `/welcome` | `Welcome.dc.html` | 1.1 |
| `/login` | `Login.dc.html` | 1.2 |
| `/forgot-password` | `ForgotPassword.dc.html` | 1.2 |
| `/` | `Home.dc.html` (epic-1-onboarding) | Home del área de miembro |
| `/explore` | `Main` + `LocationPermission` + `ManualLocation` + `MapError` + `Offline` + `Filters` + `NoResults` + `ListView` + `ListLoading` | 2.1 · 2.2 · 2.3 |
| `/lounges/[id]` | `Main` + `Gallery` + `Share` + `NotAvailable` + `Loading` | 3.1 · 3.2 |
| `/lounges/[id]/availability` | `Availability` + `Closure` | 3.2 |
| `/lounges/[id]/reviews` | `Reviews` + `NoRatings` | 3.1 |
| `/lounges/[id]/book` | `Main` (+ `MembershipCovered` sobre `?covered=1`, ver desviaciones) | 4.1 |
| `/lounges/[id]/book/payment` | `Payment` + `MembershipCovered` | 4.2 |
| `/lounges/[id]/book/summary` | `Summary` + `Waitlist` + `PaymentError` | 4.1 |
| `/lounges/[id]/book/confirmed` | `Confirmed` + `Calendar` | 4.1 · 4.3 |
| `/lounges/[id]/book/receipt` | `Receipt` | 4.2 |
| `/my-pass` | `MyBookings` (Upcoming) + `NoShow` (Past) | 5.1 · 5.2 |
| `/my-pass/[reference]` | `Main` + `ArrivalDay` + `CheckedIn` + `Expired` (sobre `?state=`) | 5.1 |
| `/my-pass/[reference]/reminder` | `Reminder` | 5.3 |
| `/reception` | `Reception` + `CheckInError` | 5.2 |

### Lógica de epic (`src/components/onboarding/`, `src/lib/`)

| Módulo | Qué resuelve |
|---|---|
| `onboarding/terms-modal.tsx` | Story 1.1 — aceptación de TOS + Privacy con fecha y versión |
| `onboarding/profile-context.tsx` | Borrador de perfil compartido por los 3 pasos (Context, sin persistencia) |
| `lib/registration.ts` | Validación de email, contraseña (8+ y 1 especial) y email duplicado |
| `lib/authentication.ts` | Story 1.2 — credenciales de muestra y las constantes de los criterios (5 intentos, 15 min, 30 días) |
| `lib/lounges.ts` | Catálogo de muestra de lounges y los destacados del Home |
| `lib/member.ts` | El miembro de muestra que pinta el App shell |
| `lounges/featured-lounge-card.tsx` | Card de lounge destacado del Home |
| `lounges/lounge-thumb.tsx` | Miniatura de lounge; el tono sale del id, igual en todas las vistas |
| `explore/city-map.tsx` · `city-map-base.tsx` · `sun-mark.tsx` | Story 2.1 — el plano dibujado, sus markers y el zoom/pan |
| `explore/location-dialogs.tsx` | Story 2.1 — permiso de ubicación y entrada manual |
| `explore/result-card.tsx` · `lounge-callout.tsx` · `amenity-icon.tsx` | Story 2.1 — la lista del panel y el detalle sobre el mapa |
| `explore/filter-drawer.tsx` · `availability-calendar.tsx` | Story 2.2 — amenities, distancia, calendario y franja |
| `explore/no-results.tsx` | Story 2.2 — estado vacío con las sugerencias que devuelven resultados |
| `lib/filters.ts` | Story 2.2 — el pipeline que comparten mapa y lista: filtros, chips activos y sugerencias |
| `explore/lounge-list.tsx` · `lounge-list-item.tsx` | Story 2.3 — la lista, su scroll infinito y su estado de carga |
| `lib/distance.ts` | Story 2.1 — conversión mi/km y tiempo a pie |
| `lib/location.ts` | Story 2.1 — ciudades de muestra y su búsqueda |
| `lib/availability.ts` | Etiqueta de disponibilidad a partir de las plazas del día |
| `lib/amenities.ts` | Las seis amenities de la Story 2.2, sus etiquetas y (Story 3.1) su descripción |
| `lib/lounge-profile.ts` | Story 3.1 / 3.2 — contacto, horario, reseñas, cierres y calendario semanal derivados del lounge base (ver desviaciones) |
| `lounges/hero-carousel.tsx` · `hero-photos.ts` | Story 3.1 — el carousel de la ficha y las 6 fotos de muestra que comparte con la galería |
| `lounges/photo-gallery-dialog.tsx` | Story 3.1 — la galería a pantalla completa (`Gallery.dc.html`) |
| `lounges/share-dialog.tsx` | Story 3.1 — la hoja de compartir (`Share.dc.html`); "Copy" sí usa `navigator.clipboard` |
| `lounges/amenities-grid.tsx` · `operating-hours.tsx` · `contact-info.tsx` | Story 3.1 — las tres secciones de la columna principal del perfil |
| `lounges/availability-card.tsx` · `booking-restrictions.tsx` · `freshness-note.tsx` | Story 3.2 — la card de disponibilidad del perfil (Available / Not available) y sus piezas compartidas |
| `lounges/profile-skeleton.tsx` | Estado de carga del perfil (`Loading.dc.html`), solo alcanzable por `?loading=1` |
| `lounges/lounge-subview-header.tsx` | Story 3.1 / 3.2 — cabecera de la sub-vista de lounge (patrón 8) |
| `lounges/weekly-calendar.tsx` · `closure-banner.tsx` | Story 3.2 — el calendario semanal de franjas y el aviso de cierre por festivo |
| `lounges/rating-summary.tsx` · `review-card.tsx` | Story 3.1 — el resumen de valoración (con y sin reseñas) y cada reseña |
| `lib/booking.ts` | Story 4.1 / 4.2 — date picker mensual, slots de llegada, precio (day pass vs. cubierto por membresía), métodos de pago de muestra, referencias de reserva y la cuenta atrás del slot |
| `lib/calendar-export.ts` | Story 4.3 — `.ics` real y URL real de Google Calendar; la única lógica del epic que no se simula |
| `booking/booking-context.tsx` | Borrador de reserva compartido por los 3 pasos y por `/book/confirmed`+`/book/receipt` (Context, sin persistencia); también la cuenta atrás compartida "Slot held for M:SS" |
| `booking/visit-details-form.tsx` · `visit-summary-rail.tsx` | Story 4.1 — paso 1 "Visit details" (`Main.dc.html`): date picker, slots, admisión fija y peticiones especiales |
| `booking/payment-method-form.tsx` · `payment-summary-rail.tsx` | Story 4.2 — paso 2 "Payment method" (`Payment.dc.html` / `MembershipCovered.dc.html`) |
| `booking/booking-summary-card.tsx` · `terms-policy-card.tsx` · `confirm-payment-rail.tsx` | Story 4.1 — paso 3 "Review and confirm" (`Summary.dc.html`): resumen editable, política de cancelación y la confirmación de un toque |
| `booking/waitlist-modal.tsx` | Story 4.1 — "if full, option to be on the waitlist" (`Waitlist.dc.html`) |
| `booking/payment-error-modal.tsx` | Story 4.1 — error handling + retry del chequeo final (`PaymentError.dc.html`) |
| `booking/confirmed-visit-card.tsx` | Story 4.1 — detalle de la visita en la confirmación inmediata (`Confirmed.dc.html`) |
| `booking/add-to-calendar-modal.tsx` | Story 4.3 — "Add to Calendar" (`Calendar.dc.html`), conecta con `lib/calendar-export.ts` |
| `booking/slot-hold-badge.tsx` | Chip "Slot held for M:SS" de los pasos 2 y 3 |
| `lib/passes.ts` | Story 5.1 / 5.2 / 5.3 — el pase de muestra LP-842193 (independiente del borrador de `booking-context.tsx`, igual que `lounge-profile.ts` fija literalmente a The Ainsworth), la lista de "My Pass" y la consola de recepción |
| `passes/digital-pass-card.tsx` | Story 5.1 — la tarjeta del pase (patrón 11) en sus cuatro estados |
| `app/my-pass/page.tsx` | Story 5.1 / 5.2 — pestañas Upcoming/Past (`MyBookings.dc.html` / `NoShow.dc.html`) |
| `app/my-pass/[reference]/page.tsx` | Story 5.1 — el pase digital y su expiración automática, alcanzada por `?state=` |
| `app/my-pass/[reference]/reminder/page.tsx` | Story 5.3 — el email de recordatorio (`Reminder.dc.html`), igual de visual que `Receipt.dc.html` |
| `app/reception/page.tsx` | Story 5.2 — la consola de recepción (patrón 12): búsqueda por LP#, contacto de emergencia y check-in |

---

## Pendiente de implementar

Lo que el design system especifica y **todavía no existe en código**. Antes de escribirlo,
comprobar si un componente de arriba ya lo cubre con una variante.

### Primitivos de §4 sin implementar

Item de nav · Fila de historial · **Chip de estado de reserva** (Fase 7) ·
Switch de ajuste · Fila de ajuste por canal · Campana de notificaciones ·
Fila de notificación · Código de referido ·
Casilla de asistencia · Chip de asistencia (oscuro) · **Fila de datos** (Fase 2 + 9) ·
**Tile de métrica** (Fase 2 + 9) · Segmented (oscuro) · Barra de volumen · Toast (oscuro) ·
Chip de estado de caso · Badge de nav · Barra de acción masiva · Entrada de log ·
Diff de aprobación · Barra de consumo · Tabla comparativa

Código QR del pase, Sello de expirado, Campo de lookup (oscuro) y Botón
fantasma (oscuro) ya están construidos (Fase 6, ver arriba) pero como piezas de
un único uso (`QrCode` es el único que se subió a primitivo reutilizable; el
sello y el campo de lookup viven inline en `DigitalPassCard` y en
`app/reception/page.tsx`) — se suben a primitivo aparte solo si un epic
siguiente los vuelve a necesitar.

### Patrones de §5 sin implementar

13 Sección de cuenta ·
14 Panel de notificaciones · 15 App shell del partner · 16 Lista de datos oscura ·
17 Panel de actividad · 18 Modal/drawer oscuros · 19 Vista de analítica ·
21 App shell admin · 22 Ficha de miembro · 23 Caso con log ·
24 Comparación live/propuesto · 25 Lista de datos clara · 26 Comparación de planes

(11 Pase digital y 12 Consola de recepción se implementaron con el Epic 5 — ver
la tabla de patrones arriba.)

### Gemelos que deben compartir componente

El design system ya los declaró equivalentes. Cuando llegue el segundo de cada par, se
extiende el existente con `data-theme` o una variante — **no se crea uno nuevo**:

| Par | Epics | Cómo |
|---|---|---|
| Tile de métrica claro ↔ oscuro | E9 ↔ E7 | mismo componente, `data-theme` |
| Fila de datos clara ↔ oscura | E9 ↔ E2/E8 | mismo componente, `data-theme` + alto 54/58px |
| Lista de datos clara (25) ↔ oscura (16) | E9 ↔ E2 | mismo componente, `data-theme` |
| Chip de estado: reserva ↔ asistencia ↔ caso ↔ referido | E7 ↔ E2 ↔ E8 ↔ E9 | un `StatusChip` con mapa de estados por dominio |
| Modal/drawer claro (4/6) ↔ oscuro (18) | E1 ↔ E2 | mismo componente, `data-theme` |
| App shell miembro (3) ↔ partner (15) ↔ admin (21) | E2–6 ↔ E7 ↔ E8 | mismo shell, distinta nav y `data-theme` |
| Panel notificaciones (14) ↔ actividad (17) | E6 ↔ E2 | mismo componente, `data-theme` |
| Barra de volumen horizontal ↔ barra de consumo | E7 ↔ E9 | mismo componente, `data-theme` |

---

## Desviaciones conscientes respecto a los artboards

| Qué | Por qué |
|---|---|
| Los artboards son desktop 1440×900 fijo; los componentes son responsive | La app es una PWA. En `AuthSplit`, el panel de marca de 600px se repliega a banda superior por debajo de `lg` |
| Iconos con `lucide-react` en lugar de SVG copiados | §1 especifica *regla* (stroke 1.6–1.8, grid 24, round), no un set concreto. `lucide-react` ya estaba en `package.json` |
| El desenfoque del patrón 4 no viaja en el HTML del servidor | El diálogo vive en un portal, que el servidor no renderiza. Si el desenfoque llegara en el HTML, la pantalla se vería borrosa y sin nada que lo explique hasta que hidratara — y así se quedaría si el JavaScript falla. `AppShell` lo aplica solo en cliente |
| El `filter: blur(3px)` del patrón 4 lo aplica la pantalla, no el modal | Un modal en portal no puede alcanzar a su hermano en el árbol. `/signup` pasa `blur-[3px]` al `AuthSplit` mientras el modal está abierto |
| `/verify-email` incluye "I have verified my email" | Sin backend, el enlace del correo no puede volver a la app. Desaparece cuando exista `/verify-email/[token]` |
| Texto legal del modal de términos | Relleno estructural, tal como ya advierte `DESIGN-SYSTEM.md` §6 (Fase 1). A reemplazar por el documento real de En Soleil |
| El acuse de "reset link sent" no tiene artboard | Se resuelve como segundo estado de `/forgot-password`, reutilizando la anatomía de `Verification.dc.html` (medallón de 76px + destinatario + reenvío), en lugar de inventar una pantalla |
| `/login` añade una nota de 11.5px bajo "Remember me" | El artboard no la trae, pero `flow-onboarding.md` fija el alcance del token ("Set remember token: 30-day auto-logout"). Decirlo evita que el miembro adivine qué activa la casilla |
| El scroll infinito de la lista carga de cuatro en cuatro | El artboard muestra "Showing 4 of 12" y el pie "Loading more lounges…". Un `IntersectionObserver` sobre ese pie pide la siguiente tanda |
| `vitest.setup.ts` rellena `IntersectionObserver` | jsdom no lo implementa, y sin él el scroll infinito no puede ni existir. Es una API del navegador que falta, no un mock de código del proyecto — la única excepción además de `next/navigation` |
| El día 14 de septiembre de 2025 es domingo, y el artboard lo llama "Sat" | La rejilla del propio artboard pone el 1 en lunes y el 14 en la columna del domingo, así que el calendario y el chip son coherentes entre sí aunque no con esa palabra |
| Los conteos de las sugerencias de `NoResults` se calculan, no se copian | El artboard promete "9 / 6 / 4 lounges would match". Con el catálogo de muestra salen otras cifras, pero cada una es cierta: la sugerencia que se ofrece devuelve exactamente los que anuncia |
| El calendario del drawer marca los días sin mirar el resto de filtros | Si dependiera de ellos, el día que deja la búsqueda a cero quedaría deshabilitado y el estado "sin resultados" sería inalcanzable — justo el que el artboard dibuja |
| El mapa es el SVG del artboard, no un proveedor de tiles | §6 (Fase 3) previó sustituirlo "por el proveedor real", pero este repo no llama a servicios externos ni gestiona claves. El zoom y el pan son reales sobre ese dibujo |
| Los markers se posicionan en % del plano, no en los píxeles del artboard | El artboard es 1440×900 fijo. En % el marker sigue al dibujo a cualquier tamaño; el `.map-canvas` mantiene la proporción 820×760 |
| El callout salta al otro lado del marker pasado el 55% del ancho | El artboard solo dibuja el caso de un marker centrado. Anclado siempre a la derecha, se salía del mapa |
| La card de resultado calcula su "+N" de amenities | El artboard escribe "+2" con cuatro amenities listadas en `ListView`. Se muestran tres iconos y el resto se cuenta |
| En el App shell, la sidebar de 248px pasa a barra de navegación inferior por debajo de `lg` | Es una PWA: en móvil la nav vive abajo. Los artboards son desktop 1440×900 |
| "View details" lleva `aria-label="View details for ‹lounge›"` | Tres enlaces con el mismo texto visible son indistinguibles para un lector de pantalla. El texto en pantalla no cambia |
| El item **Profile** del shell apunta a una ruta que aún no existe | Su artboard es del Epic 6. El shell fija la nav completa desde ya, tal como el design system la declara. **My Pass** ya existe desde el Epic 5 |
| El bloqueo por intentos fallidos no persiste | Es un contador en `useState`: basta para alcanzar y ver el estado bloqueado, que es lo que el diseño tiene que mostrar. La caducidad de 15 minutos se enuncia en el aviso, no se cuenta |
| El "hoy" del perfil de lounge es `TODAY` (2025-09-09, martes), no el jueves 12 de sept que dibujan los artboards de la Fase 4 | Explore ya fijó `TODAY` como el "hoy" del mockup para toda la app. Cambiarlo solo para el Epic 3 rompería la coherencia entre "hoy" al navegar de `/explore` a un lounge |
| Las amenities del perfil son las 6 de la Story 2.2 (`lib/amenities.ts`), no la lista propia de `Main.dc.html` (que incluye "Showers" y no incluye "Spa") | Una sola fuente de datos entre el filtro de Explore y el perfil evita que un lounge se anuncie con una amenity que el filtro dice que no tiene |
| "Next available times" de la card de disponibilidad ofrece franjas (Morning/Afternoon/Evening), no horas exactas como "2:00 PM" | El catálogo solo modela franjas (Story 2.2); no hay una agenda con horas sueltas de la que sacar "2:00 PM" |
| La capacidad "de 40" es una constante única para todo el catálogo | Ningún lounge trae su propio aforo; es la misma cifra que cita `Main.dc.html` para The Ainsworth |
| El contacto (dirección, teléfono, email, web) y las reseñas son literales solo para The Ainsworth y Belmont Terrace; el resto del catálogo los deriva de su id | Son los dos únicos lounges que un artboard de la Fase 4 cita por nombre (`Main.dc.html`/`Reviews.dc.html` y `NoRatings.dc.html`). Ver `docs/PENDIENTES.md` §2.4 |
| El aviso de cierre por festivo se calcula mirando los 7 días de la semana mostrada, no solo el lunes y el domingo | Thanksgiving cae a mitad de semana (jueves-viernes): mirar solo los extremos lo dejaría sin detectar |
| "Write a review" no lleva a ninguna pantalla | Ninguna historia de los 9 epics cubre redactar una reseña. Ver `docs/PENDIENTES.md` §2.5 |
| El date picker de `/lounges/[id]/book` es mensual (día a día) y distinto del calendario semanal (franjas) de la Story 3.2 | Son dos widgets del design system con geometría propia (§4 "Date picker mensual" vs. "Calendario de disponibilidad"). Ambos leen la misma fuente, `weeklyAvailability` de `lib/lounge-profile.ts` — no hay dos modelos de disponibilidad, solo dos vistas |
| Los cinco slots de llegada (`Main.dc.html`) reparten las plazas de su franja del catálogo, en vez de traer su propio número | El catálogo solo modela franjas (morning/afternoon/evening), no horas sueltas. `slotsFor` en `lib/booking.ts` divide `seatsLeft` de la franja entre sus slots, así que la suma nunca supera lo que ya declara `weeklyAvailability` |
| El modelo de negocio de precio (8 visitas/mes incluidas, day pass de $75 a partir de la 9.ª) es una decisión de producto asumida, no confirmada | Así lo advierte ya `DESIGN-SYSTEM.md` §6 (Fase 5): es la lectura que cubre a la vez "subscription pricing" e "individual day-pass pricing" de la Story 4.2. Ver `docs/PENDIENTES.md` |
| El rail del paso 1 (`Main.dc.html`) también desglosa "Day pass: Included" / "Estimated tax: $0.00" cuando `covered=true`, aunque ese artboard no dibuja esa variante | `Main.dc.html` no tiene un par "MembershipCovered" propio — solo `Payment.dc.html` lo tiene. Mostrar $81.66 en el paso 1 y saltar a $0.00 en el paso 2 sería más engañoso que extender la vocabulary visual que `MembershipCovered.dc.html` ya fija un paso después |
| La cuenta atrás "Slot held for M:SS" arranca en 10 minutos al entrar en `/lounges/[id]/book` y es continua entre los pasos 2 y 3 | El artboard no fija la duración exacta ("decisión de producto a confirmar", §6 Fase 5); 10 minutos es un valor de muestra razonable. Vive en `BookingContext`, no por pantalla, para que no se reinicie al pasar de Payment a Summary |
| El chequeo final de disponibilidad y el rechazo de pago son disparadores de muestra, no aleatorios | `isAtRiskOfWaitlist` ofrece la waitlist cuando el slot elegido tiene ≤2 plazas; `paymentWillDecline` falla solo con la tarjeta de muestra Mastercard·8801. Ambos son deterministas para que el estado se pueda alcanzar y probar, igual que el email duplicado de la Story 1.1 |
| Las tres alternativas de `Waitlist.dc.html` no navegan a nada al elegirlas | El criterio de la Story 4.1 es "ofrecer" la waitlist, no definir qué pasa al escoger cada alternativa (el flow tampoco lo especifica). Se muestran como opciones seleccionables; los botones fijos del pie ("Change date" / "Join waitlist") son los que actúan |
| La tercera alternativa de la waitlist ("The Vestry · 1.8 mi") es texto literal del artboard, no un lounge real ni un cálculo de cercanía | No existe en el catálogo ni hay lógica de "lounge más cercano a otro lounge" en ningún epic (Story 2.1 calcula distancia a la ubicación buscada, no lounge-a-lounge). Inventar ese modelo de datos está fuera del alcance de esta historia |
| `?covered=1` en `/lounges/[id]/book` alcanza la variante "la visita está cubierta por la membresía" (`MembershipCovered.dc.html`) | Igual que `/explore?map=error`: no hay backend de membresía que decida cuándo aplica, así que el estado se alcanza por query param y se documenta aquí en vez de inventar un botón que no está en ningún artboard |
| `SAMPLE_MEMBER` gana un campo `email` (`lib/member.ts`) | Los artboards de la Fase 5 citan el correo de Alexandra Rivas en tres pantallas distintas (Confirmed, Payment, Receipt); antes solo vivía como texto literal repetido |
| `/lounges/[id]/book/confirmed` añade el enlace "view the email receipt" | Ningún artboard de la Fase 5 enlaza `Confirmed.dc.html` con `Receipt.dc.html`, pero sin él la pantalla del recibo (criterio de la Story 4.2) quedaría implementada y sin ruta para llegar a ella navegando |
| El recibo por email (`/lounges/[id]/book/receipt`) es la pantalla del estado, no un envío real | "Payment confirmation email receipt" (Story 4.2) exige backend real (SMTP). Se implementa visualmente la pantalla del email tal como llegaría, con los mismos datos de la reserva — la desviación que ya fija la cabecera de este documento |
| El `.ics` y la URL de Google Calendar de `AddToCalendarModal` son reales, no simulados | A diferencia del resto del Epic 4, generar un archivo de calendario y abrir Google Calendar son capacidades del navegador, no llamadas a un servicio de LuxePass — no hay ninguna regla que lo prohíba |
| `/my-pass/[reference]` alcanza los cuatro estados del pase (`Main`/`ArrivalDay`/`CheckedIn`/`Expired`) por `?state=`, no por el paso del tiempo | Igual que `?covered=1`: no hay reloj real que dispare "hoy llegó" o "la ventana cerró", así que el estado se elige por query param en vez de inventar un timer que nadie pidió |
| Los datos de "My Pass" (`lib/passes.ts`) son literales, independientes del `booking-context.tsx` de la reserva en vivo | La reserva LP-842193 que citan los artboards de la Fase 6 no es la que produce `bookingReference()` para una fecha/hora elegida en `/lounges/[id]/book` — igual que `lounge-profile.ts` fija literalmente el contacto y las reseñas de The Ainsworth en vez de derivarlos del motor de disponibilidad |
| Solo la card de "Next visit" en `/my-pass` enlaza a un pase completo | Es la única reserva de muestra con las cuatro pantallas del patrón 11 dibujadas (`LP-842193`). Los botones "View pass"/"Manage"/"Receipt" de las demás filas no tienen artboard de destino propio y quedan inertes, como "Write a review" en el Epic 3 |
| `/reception` es una ruta suelta, sin App shell ni pantalla de login | El patrón 12 es "solo el momento del check-in de un invitado" (`DESIGN-SYSTEM.md` §6 Fase 6); la lista diaria de invitados y el acceso del partner son la Story 7.1, todavía sin diseñar. Se llega tecleando la URL, no desde la navegación del miembro |
| El código QR es el mismo SVG decorativo de 25×25 módulos del artboard, no una librería real | `DESIGN-SYSTEM.md` §6 (Fase 6) ya lo deja como pendiente ("al implementar se genera con una librería real sobre el LP#"); añadir una dependencia de generación de QR no cambia ningún criterio de aceptación, así que se queda para cuando haga falta que el código sea escaneable de verdad |
| El botón "Check in Alexandra" de `/reception` deshabilita y cambia de texto en vez de navegar a algún sitio | Ningún artboard dibuja el estado posterior de la consola de recepción; el efecto en el lado del miembro ya es la pantalla `CheckedIn` de `/my-pass/[reference]?state=checked-in`, alcanzable por separado |
