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
| `Checkbox` | `checkbox.tsx` | §4 Checkbox 18×18 | `align`: start(texto multilínea)·center(etiqueta de una línea) · `aria-label` (Fase 8, casillas de selección de fila sin texto visible junto a ellas) | E1 · E8 |
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
| `StatusChip` (ampliado, 2) | `status-chip.tsx` | §4 "el chip de estado de reserva" — Confirmed/In progress/Completed/Cancelled | dos props nuevas: `emphasis` (borde dorado + punto con halo, "In progress") y `dot` (oculta el punto de "Cancelled"). Es "un StatusChip con mapa de estados por dominio" tal como ya lo preveía este mapa | E6 |
| `Switch` | `switch.tsx` | §4 Switch de ajuste | píldora 44×26, `checked`/`onCheckedChange`. `AlwaysOnChip` cubre el canal que no se puede apagar | E6 |
| `ChannelSettingRow` | `channel-setting-row.tsx` | §4 Fila de ajuste por canal | título/subtítulo + tres `Switch`/`AlwaysOnChip` (Push·Email·SMS); `titleExtra` para el selector de hora del aviso matinal | E6 |
| `NotificationBellButton` | `notification-bell-button.tsx` | §4 Campana de notificaciones | botón 40×40 + badge de no leídas; `active` cuando el panel está abierto | E6 |
| `NotificationRow` | `notification-row.tsx` | §4 Fila de notificación | estado `read` decide fondo/sombra/punto, como fija §4; `onMarkRead` (opcional) marca la propia fila como leída al hacer clic — no vuelve atrás una vez leída; `actions` para "View pass"/"Directions" o un enlace secundario ("View lounge", "Manage membership") | E6 |
| `ReferralCode` | `referral-code.tsx` | §4 Código de referido | caja de 50px con borde discontinuo dorado + botón "Copy" (`navigator.clipboard`, real) | E6 |
| `DetailRow` | `detail-row.tsx` | Derivado de §4 "Fila de opción" | icono de 32px sobre `--gold-100` + una línea de texto — la lista "What happens next"/"What happens" que comparten `CancelBookingModal` y `DeleteAccountModal` | E6 |
| `Field` (ampliado) | `field.tsx` | §3 label + control + hint | nueva prop `labelExtra` — contenido junto a la etiqueta, no debajo del control (el badge "Verified" de `Profile.dc.html`) | E6 |
| `StatusChip` (ampliado, 3) | `status-chip.tsx` | §4 "Chip de asistencia (oscuro)" — Arrived | nueva prop `outlined` añade el borde `--gold-500` de 1px que "Arrived" lleva y "Confirmed" (claro) no — resto de estados (New booking/Pending/No-show/Cancelled) ya cubiertos por `emphasis`/`dashed`/`dot` | E7 |
| `AttendanceCheckbox` | `attendance-checkbox.tsx` | §4 Casilla de asistencia | `status`: arrived·pending·no-show·cancelled · `onMarkArrived`. Marcarla es el gesto completo del check-in, sin confirmación aparte | E7 |
| `MetricTile` | `metric-tile.tsx` | §4 Tile de métrica (oscuro) | `label`/`value`/`note` · `highlighted`. Solo cubre la mitad oscura — el gemelo claro (Fase 9) se añade como variante cuando llegue ese epic | E7 |
| `Toast` | `toast.tsx` | §4 Toast (oscuro) | `icon`/`title`/`body`/`primaryLabel` · `onPrimary`/`onDismiss`. Fijo en `bottom:26px; right:32px` | E7 |
| `Modal` (ampliado) | `modal.tsx` | §5 patrón 18 — modal oscuro | nueva prop `dark` pone `data-theme="dark"` en `Dialog.Overlay`/`Dialog.Content`, no en un wrapper externo — el diálogo vive en un portal, así que un wrapper en el árbol de React no es su ancestro real en el DOM | E7 |
| `Drawer` (ampliado) | `drawer.tsx` | §5 patrón 18 — drawer oscuro (472px) | misma `dark` que `Modal`, mismo motivo | E7 |
| `NavBadge` | `nav-badge.tsx` | §4 "Badge de nav (oscuro)" | `count` · `active` (fondo `--gold-500` en el item activo, borde `--gold-600` en uno inactivo) | E8 |
| `CommLogEntry` | `comm-log-entry.tsx` | §4 "Entrada de log de comunicación" | `entry: CommLogEntryData`. El avatar cambia con `kind` (sistema/email automático = cuadro con icono; miembro = círculo dorado; nota interna/respuesta de soporte/partner = cuadro con borde `--gold-600`); el mensaje del miembro lleva caja con borde dorado y una nota interna el chip discontinuo | E8 |
| `StatusChip` (ampliado, 4) | `status-chip.tsx` | §4 "Chip de estado de caso (oscuro)" | sin props nuevas — `CaseStatusChip` (`src/components/admin/case-status-chip.tsx`) compone `emphasis`/`available`+`outlined`/`dashed`/default ya existentes; solo "Escalated" es distinto de verdad (icono en vez de punto, ver el propio componente). `LoungeStatusChip` (`src/components/admin/lounge-status-chip.tsx`) reutiliza el mismo mapa para Live/Draft/N to approve, tal como ya declara la fila del design system | E8 |
| `ApprovalDiff` | `approval-diff.tsx` | §4 "Diff de aprobación" | `change: PendingChange` — valor anterior tachado, flecha dorada, valor nuevo en negrita, nota opcional debajo | E8 |
| `BulkActionBar` | `bulk-action-bar.tsx` | §4 "Barra de acción masiva" | `count` · `itemLabel` · `onClear`; `BulkActionButton` para cada acción (`destructive` con borde discontinuo) | E8 |
| `MetricTile` (ampliado) | `metric-tile.tsx` | §4 "Tile de métrica (claro)" | nueva prop `tone`: `"dark"` (por defecto, sin tocar E7/E8) · `"light"` cambia el fondo a la Card de contenido (`bg-surface` + borde + sombra) en vez de `--dark-card` — mismo resto de anatomía, el gemelo claro que este mapa ya preveía | E9 |
| `ComparisonTable` | `comparison-table.tsx` | §4 "Tabla comparativa" | `leadingLabel` · `columns` · `rows` (`values` mezcla texto, `boolean` para check dorado/`—`, y `isTotal` para la fila resaltada) | E9 |
| `ConsumptionBar` | `consumption-bar.tsx` | §4 "Barra de consumo" | `used` · `included` · `unitLabel` — solo la barra + la cifra; cada pantalla la envuelve en su propio card (`VisitsCard` en `variant="full"`/`"compact"`) | E9 |

## Capa 2 — Patrones (`src/components/patterns/`)

| Patrón | Archivo | DESIGN-SYSTEM | Notas |
|---|---|---|---|
| Split-screen de autenticación | `auth-split.tsx` | §5 patrón **1** | `cardWidth` 440/460 · `centered`. Sirve a sign up, log in, reset password, verificación y pasos de perfil |
| Full-bleed de confirmación | `full-bleed-success.tsx` | §5 patrón **2** | Lleva `data-theme="dark"` incorporado |
| App shell (miembro) | `app-shell.tsx` | §5 patrón **3** | Sidebar de 248px + área de contenido. `padded={false}` para el patrón 5 (Explore), que va a sangre. Fija la nav de los Epics 2–6. Prop `member` (Story 9.1, por defecto `SAMPLE_MEMBER`) — el bloque de usuario de la sidebar es la cuenta de Naomi Feldstein en `MonthlyPlan.dc.html`/`Upgrade.dc.html`, no siempre Alexandra |
| Modal sobre pantalla | `modal.tsx` | §5 patrón **4** | Radix Dialog. `width` 640 por defecto (520–540 en los diálogos de ubicación). `align="center"` + `media` para el diálogo de permiso. El patrón **18** (modal oscuro) es este mismo dentro de `data-theme="dark"` |
| Drawer lateral | `drawer.tsx` | §5 patrón **6** | Radix Dialog con `modal={false}` — el fondo debe seguir siendo perceptible mientras se filtra. `width` 436 (472 en el patrón **18** oscuro) |
| Explore (mapa + resultados) | `explore-layout.tsx` | §5 patrón **5** | Topbar de 88px, fila de filtros de 52px, panel de 372px + mapa. El panel es la `region` "Results" que comparten mapa y lista |
| Perfil de lounge (detalle) | `app/lounges/[id]/page.tsx` compone `lounges/hero-carousel.tsx` + `lounges/availability-card.tsx` | §5 patrón **7** | Sin archivo de patrón único: la topbar de 64px y el hero de 268px solo los usa esta pantalla, igual que Explore no extrae su topbar aparte de `explore-layout.tsx` |
| Sub-vista de lounge | `lounges/lounge-subview-header.tsx` | §5 patrón **8** | Topbar 64px + header 84px (miniatura, nombre, sello de frescura). Reutilizado por `/lounges/[id]/availability` y `/lounges/[id]/reviews`. Dos posiciones de chip, no una: `badge` va junto al título (`Main.dc.html` "Accepting bookings", `NoRatings.dc.html` "New on LuxePass"); `trailingBadge` (nuevo, Epic 4) va en el extremo derecho, donde por defecto vive el sello de frescura — ahí es donde `Payment.dc.html`/`Summary.dc.html` dibujan el chip "Slot held for M:SS", no junto al título. `topbarRight` (nuevo, Epic 4) sustituye "Booking help" por "Secure checkout"; `hideFreshness` (nuevo, Epic 4) oculta el sello cuando `trailingBadge` ocupa su sitio |
| Flujo por pasos con rail de resumen | `step-flow-rail.tsx` | §5 patrón **9** | Compone `LoungeSubviewHeader` + `StepProgress` + el rail de 344px. Usado en los tres pasos de `/lounges/[id]/book` |
| Tarjeta de confirmación oscura | `confirmation-card.tsx` | §5 patrón **10** | Card de 344px, `data-theme="dark"` propio + `.surface-night.dot-pattern`. `rows: {label,value}[]` genérico para que el patrón 11 (pase digital, Fase 6) lo extienda sin reescribirlo |
| Pase digital | `passes/digital-pass-card.tsx` | §5 patrón **11** | Card de 380px, `data-theme="dark"` propio. Cuatro estados por `state: PassLifecycleState` (`upcoming`·`today`·`checked-in`·`expired`) en vez de cuatro componentes — el pase es el mismo, solo cambia lo que muestra. El sello de expirado va inline (un solo uso, no se sube a primitivo) |
| Consola de recepción | `app/reception/page.tsx` | §5 patrón **12** | Sin archivo de patrón aparte — como el perfil de lounge (patrón 7), la topbar de 72px y la columna de 900px solo las usa esta pantalla. El campo de lookup (oscuro) también va inline aquí, no como primitivo, por el mismo motivo |
| Sección de cuenta con sub-nav | `patterns/account-shell.tsx` | §5 patrón **13** | Topbar 64px (miga "Account › X" + `topbarRight` + campana) + sub-nav de 232px. `topbarRight` es el botón "Save changes" en Profile details o el chip `SavedIndicatorChip` ("Saved as you change them") en el resto — misma pantalla, dos variantes de autoguardado que ya distinguen los propios artboards. `actionAfterBell` invierte el orden campana/acción: `Profile.dc.html` pone la campana antes de "Save changes"; el resto pone el chip antes de la campana. `breadcrumb` acepta un array (Story 9.1/9.2, miga de tres niveles "Account › Membership › Compare plans"/"› Referrals"); `notificationExtras` reenvía a `NotificationBellMenu` (Story 9.2, `?state=credited`); `member` reenvía a `AppShell` (Story 9.1, Naomi en las sub-vistas mensuales) |
| Panel de notificaciones | `components/account/notification-bell-menu.tsx` | §5 patrón **14** | Radix Popover de 380px anclado a `NotificationBellButton`. No vive en `patterns/` porque trae su propio estado de datos (`lib/notifications.ts`), a diferencia de Modal/Drawer que son solo anatomía — mismo criterio que ya separa `passes/digital-pass-card.tsx` de los patrones puros. Prop `extraItems` (Story 9.2) antepone notificaciones de un estado concreto de pantalla sin mutar el array `NOTIFICATIONS` global |
| App shell del partner | `patterns/partner-shell.tsx` | §5 patrón **15** | Gemelo oscuro del patrón 3, con su propia nav (Today · Guests · Analytics · Reports · Settings) y el bloque del local en vez del bloque de usuario. `topbarLabel`/`topbarMeta`/`topbarRight` para que cada pantalla componga su propia topbar; `blurred` como en `AppShell` |
| Panel de actividad | `components/partner/activity-panel.tsx` | §5 patrón **17**, gemelo del 14 | Reutiliza `NotificationBellButton` + `NotificationRow` tal cual — solo cambia a oscuro por `data-theme`. No vive en `patterns/` por el mismo motivo que el panel de notificaciones (trae su propio estado) |
| Vista de analítica | `app/partner/analytics/page.tsx` | §5 patrón **19**, sobre el 15 | Sin archivo de patrón aparte — como el perfil de lounge (patrón 7), la composición de 4 tiles + gráficos + rail de 344px solo la usa esta pantalla |
| App shell del admin | `patterns/admin-shell.tsx` | §5 patrón **21** | Gemelo oscuro del patrón 3/15, con su propia nav (Support · Members · Bookings · Lounges · Analytics · Reports) y `NavBadge` en Support/Lounges. El chip "Every action logged", la campana (inerte, ver desviaciones) y el refrescar van fijos en la topbar — a diferencia de `PartnerShell`, ninguna pantalla de la Fase 8 los personaliza, así que no viajan por `topbarRight` |

### Componentes de epic (`src/components/partner/`)

| Componente | DESIGN-SYSTEM | Notas |
|---|---|---|
| `GuestDetailDrawer` | Drawer oscuro (patrón 18, 472px) | Story 7.1 — ficha del invitado (`GuestDetail.dc.html`): datos de la reserva, contacto, peticiones especiales, contacto de emergencia y las acciones "Mark as arrived"/"No-show" cuando aún está pendiente |
| `NoShowModal` | Modal oscuro (patrón 18, 620px) | Story 7.1 — motivo del no-show (`NoShow.dc.html`), reutiliza `PaymentOptionRow` para las tres alternativas |
| `ExportGuestListPopover` | — | Story 7.1 — exportación a CSV que sigue los filtros de pantalla (`Export.dc.html`), Radix Popover con selección de columnas real |
| `GuestListTable` | §4 Fila de datos (oscura) + §5 patrón 16 | Story 7.1 — la lista del día (`Main.dc.html`). Inline, no primitivo — igual que `RepeatGuests` (Story 7.3) dibuja su propia fila de datos: **la fila de datos oscura sigue sin ser un primitivo compartido**, ver "Pendiente de implementar" |
| `TodayDashboard` | — | Story 7.1/7.2 — toda la lógica de `/partner`. Vive fuera de `app/partner/page.tsx` porque un archivo de ruta del App Router solo puede exportar `default`; los tests importan `TodayDashboard` directamente con `liveBookingDelayMs`/`cancellationDelayMs` cortos en vez de fake timers (ver la nota en el propio archivo) |

### Componentes de epic (`src/components/membership/`)

| Componente | DESIGN-SYSTEM | Notas |
|---|---|---|
| `PlanSummaryCard` | Card de contenido | Story 9.1 — "Current plan", compartida por `Main.dc.html` (Alexandra, anual) y `MonthlyPlan.dc.html` (Naomi, mensual) |
| `BenefitsGrid` | Grid 2×3 de "Fila de opción" | Story 9.1 — "What your membership includes" (`Main.dc.html`), solo el plan anual |
| `VisitsCard` | Usa `ConsumptionBar` | Story 9.1 — "Visits this month"; `variant="full"` (card completa + aviso de day passes complementarios, `Main.dc.html`) y `variant="compact"` (fila corta sin ese aviso, `MonthlyPlan.dc.html` — Naomi no tiene day passes complementarios porque no ha enviado ninguna invitación) |
| `RenewalRailCard` | Card + `Switch` | Story 9.1 — "Renewal"/"Next charge", compartida. `manageable=false` para Naomi (ver desviaciones) |
| `BillingRailCard` | Card + `CardBrandBadge` | Story 9.1 — "Billing", compartida |
| `ReferralSummaryRailCard` | Card + `ReferralCode` | Story 9.1/9.2 — "Referrals" del rail; el botón "Open referrals" solo aparece cuando la cuenta ya ha enviado invitaciones (Alexandra) |
| `UpgradeOfferCard` | Card con borde dorado | Story 9.1 — "Switch to annual" (`MonthlyPlan.dc.html`), solo Naomi |
| `AutoRenewModal` | Modal (patrón 4) | Story 9.1 — "Turn off auto-renewal?" (`AutoRenew.dc.html`), generaliza fecha/visitas/código a partir de la cuenta que lo abre |
| `UpgradeConfirmModal` | Modal (patrón 4) | Story 9.1 — "Confirm your new plan" (`Upgrade.dc.html`), reutilizado desde `/profile/membership?plan=monthly` y desde `/profile/membership/plans?plan=monthly` |
| `ReferralInvitationsTable` | "Lista de datos clara" (patrón 25) | Story 9.2 — las 5 invitaciones de `Referrals.dc.html`/`RewardCredited.dc.html`. Inline, no primitivo compartido — su rejilla de 4 columnas es propia, igual que `GuestListTable`/`RepeatGuests` con la fila de datos oscura (ver "Pendiente de implementar") |
| `ReferralShareModal` | Calca `ShareDialog` (Story 3.1) | Story 9.2 — "Share your invitation" (`Share.dc.html`), `navigator.clipboard` real |
| `ReferralTermsModal` | Modal (patrón 4) | Story 9.2 — "Terms and conditions" (`Terms.dc.html`), la nota de versión va en `headerExtra` |

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
| `/auth/confirm` | — (Route Handler, no tiene artboard) | 1.1 · 1.2 |
| `/onboarding/basics` | `ProfileBasic.dc.html` | 1.1 |
| `/onboarding/personal` | `ProfilePersonal.dc.html` | 1.1 |
| `/onboarding/professional` | `ProfileProfessional.dc.html` | 1.1 |
| `/welcome` | `Welcome.dc.html` | 1.1 |
| `/login` | `Login.dc.html` | 1.2 |
| `/forgot-password` | `ForgotPassword.dc.html` | 1.2 |
| `/reset-password` | — (sin artboard, ver desviaciones) | 1.2 |
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
| `/my-pass` | `Main` + `Cancel` + `CancelFee` + `History` (sustituyen a `MyBookings`/`NoShow` de la Fase 6, ver desviaciones) | 6.1 |
| `/notifications` | `Notifications` | 6.2 |
| `/profile` | `Profile` | 6.3 |
| `/profile/preferences` | `Preferences` | 6.3 |
| `/profile/notifications` | `NotificationSettings` | 6.2 |
| `/profile/privacy` | `Privacy` + `DeleteAccount` | 6.3 |
| `/partner/login` | `Login.dc.html` | Acceso de partner (sin historia propia, ver flow) |
| `/partner` | `Main` + `GuestDetail` + `NoShow` + `Export` + `LiveUpdate` | 7.1 · 7.2 |
| `/partner/emails/digest` | `EmailDigest.dc.html` | 7.2 |
| `/partner/emails/new-booking` | `EmailNewBooking.dc.html` | 7.2 |
| `/partner/emails/cancellation` | `EmailCancellation.dc.html` | 7.2 |
| `/partner/analytics` | `Analytics.dc.html` | 7.3 |
| `/partner/guests` | `RepeatGuests.dc.html` | 7.3 |
| `/partner/reports` | `Reports.dc.html` | 7.3 |
| `/admin/support` | `Main.dc.html` | 8.1 |
| `/admin/support/[id]` | `CaseDetail` + `Refund` | 8.1 |
| `/admin/members` | `MemberSearch.dc.html` | 8.1 |
| `/admin/members/[id]` | `MemberProfile` + `BookingOverride` | 8.1 |
| `/admin/analytics` | `Analytics.dc.html` | 8.2 |
| `/admin/analytics/demand` | `Popularity.dc.html` | 8.2 |
| `/admin/reports` | `Export.dc.html` | 8.2 |
| `/admin/reports/scheduled` | `ScheduledReports.dc.html` | 8.2 |
| `/admin/lounges` | `Lounges.dc.html` | 8.3 |
| `/admin/lounges/[id]` | `LoungeEdit.dc.html` | 8.3 |
| `/admin/lounges/approvals` | `Approval.dc.html` | 8.3 |
| `/profile/membership` | `Main` (Alexandra, anual) + `MonthlyPlan` (Naomi, mensual, sobre `?plan=monthly`) + `AutoRenew` + `Upgrade` | 9.1 |
| `/profile/membership/plans` | `Plans.dc.html` (el plan "actual" se decide por `?plan=`) | 9.1 |
| `/profile/membership/referrals` | `Referrals` + `RewardCredited` (sobre `?state=credited`) + `Share` + `Terms` | 9.2 |

### Lógica de epic (`src/components/onboarding/`, `src/lib/`)

| Módulo | Qué resuelve |
|---|---|
| `onboarding/terms-modal.tsx` | Story 1.1 — aceptación de TOS + Privacy con fecha y versión |
| `onboarding/profile-context.tsx` | Borrador de perfil compartido por los 3 pasos (Context, sin persistencia entre recargas; guarda también el `File` real de la foto para poder subirlo al final) |
| `onboarding/require-session.tsx` | Story 1.1 — guarda de sesión de `/onboarding/*`: sin sesión (llega directo, sin pasar por `/auth/confirm`) manda a `/login` |
| `lib/registration.ts` | Validación de email/contraseña (8+ y 1 especial) en cliente; `emailExists` consulta el RPC `email_exists` contra Supabase local para el email duplicado |
| `lib/authentication.ts` | Story 1.2 — solo las constantes de los criterios (5 intentos, 15 min, 30 días); deben coincidir con `supabase/schemas/login_attempts.sql` y `config.toml`. El acceso en sí es real (`/login` llama a Supabase Auth) |
| `lib/lounges.ts` | Catálogo de muestra de lounges y los destacados del Home |
| `lib/member.ts` | El miembro de muestra que pinta el App shell |
| `lounges/featured-lounge-card.tsx` | Card de lounge destacado del Home |
| `lounges/lounge-thumb.tsx` | Miniatura de lounge; el tono sale del id, igual en todas las vistas |
| `explore/city-map.tsx` · `sun-mark.tsx` · `use-map-load-status.ts` | Story 2.1 — Google Maps real (`@vis.gl/react-google-maps`), sus markers, zoom/pan y el timeout de carga |
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
| `lib/lounge-profile.ts` | Story 3.1 / 3.2 — backend real (`fetchLoungeProfile`/`fetchLoungeImages`/`fetchWeeklyAvailability`/`fetchClosuresForWeek`/`fetchNextAvailableSlot`), más `reviewsFor`/`ratingBreakdownFor`/`mentionsFor` de muestra (sin tabla `reviews`) y una sección "legacy" (`contactFor`/`closureCovering`/`weeklyAvailability` síncronas sobre el mock) que Epic 4 sigue usando sin conectar — ver "Backend real — Epic 3" |
| `lounges/hero-carousel.tsx` | Story 3.1 — el carousel de la ficha; recibe `images` de `lounge_images` (Supabase) |
| `lounges/photo-gallery-dialog.tsx` | Story 3.1 — la galería a pantalla completa (`Gallery.dc.html`), mismas `images` reales |
| `lounges/share-dialog.tsx` | Story 3.1 — la hoja de compartir (`Share.dc.html`); "Copy" sí usa `navigator.clipboard` |
| `lounges/amenities-grid.tsx` · `operating-hours.tsx` · `contact-info.tsx` | Story 3.1 — las tres secciones de la columna principal del perfil; horario y contacto ya vienen del perfil real |
| `lounges/availability-card.tsx` · `booking-restrictions.tsx` · `freshness-note.tsx` | Story 3.2 — la card de disponibilidad del perfil (Available / Not available), con plazas y `lastUpdatedAt` reales |
| `lounges/profile-skeleton.tsx` | Estado de carga del perfil (`Loading.dc.html`), solo alcanzable por `?loading=1` |
| `lounges/lounge-subview-header.tsx` | Story 3.1 / 3.2 — cabecera de la sub-vista de lounge (patrón 8) |
| `lounges/weekly-calendar.tsx` · `closure-banner.tsx` | Story 3.2 — el calendario semanal de franjas (recibe `cells` ya resueltas) y el aviso de cierre por festivo |
| `lounges/rating-summary.tsx` · `review-card.tsx` | Story 3.1 — el resumen de valoración (rating/recuento reales, desglose y reseñas de muestra) |
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
| `app/my-pass/page.tsx` | Story 6.1 — pestañas Upcoming/Past (`Main.dc.html` / `History.dc.html`), cancelar con la política de 24 h |
| `app/my-pass/[reference]/page.tsx` | Story 5.1 — el pase digital y su expiración automática, alcanzada por `?state=` |
| `app/my-pass/[reference]/reminder/page.tsx` | Story 5.3 — el email de recordatorio (`Reminder.dc.html`), igual de visual que `Receipt.dc.html` |
| `app/reception/page.tsx` | Story 5.2 — la consola de recepción (patrón 12): búsqueda por LP#, contacto de emergencia y check-in |
| `passes/cancel-booking-modal.tsx` | Story 6.1 — el diálogo de cancelar (`Cancel.dc.html` / `CancelFee.dc.html` son sus dos estados, según `isFreeCancellation`) |
| `lib/notifications.ts` | Story 6.2 — los seis tipos de notificación, el contador de no leídas y los ajustes por canal (`NotificationSettings.dc.html`); `QUIET_HOURS_START_OPTIONS`/`QUIET_HOURS_END_OPTIONS` acotan los dos desplegables de horas de silencio a tarde/noche y madrugada/mañana respectivamente, para que ninguna combinación sea absurda ("10 PM to 3 PM") |
| `account/notification-bell-menu.tsx` | Story 6.2 — la campana + el panel desplegable (patrón 14), reutilizada en My Pass y en toda la sección de cuenta |
| `app/notifications/page.tsx` | Story 6.2 — el centro de notificaciones completo, con filtro por categoría (`Notifications.dc.html`) |
| `patterns/account-shell.tsx` | Story 6.3 — el shell de la sección de cuenta (patrón 13): sub-nav + topbar con miga |
| `lib/profile.ts` | Story 6.3 — perfil, lounges favoritos, amenities/intereses preferidos, membresía, código de referido y ajustes de privacidad |
| `app/profile/page.tsx` | Story 6.3 — "Profile details" (`Profile.dc.html`): todos los campos editables + membresía + código de referido |
| `app/profile/preferences/page.tsx` | Story 6.3 — lounges favoritos, amenities e intereses preferidos, unidad de distancia (`Preferences.dc.html`) |
| `app/profile/notifications/page.tsx` | Story 6.2 — ajustes de notificación por canal y horas de silencio (`NotificationSettings.dc.html`) |
| `app/profile/privacy/page.tsx` | Story 6.3 — uso de datos, contacto de emergencia, exportar/descargar datos (`Privacy.dc.html`) |
| `account/delete-account-modal.tsx` | Story 6.3 — borrar la cuenta con confirmación por casilla + escribir DELETE (`DeleteAccount.dc.html`) |
| `lib/partner.ts` | Story 7.1 / 7.2 / 7.3 — el turno de muestra de The Ainsworth (14→15 invitados, la reserva en vivo, la cancelación+promoción de waitlist), Analytics, invitados recurrentes y los seis informes de `Reports.dc.html` |
| `lib/download.ts` | Descarga real de CSV (`downloadTextFile`), compartida por los cuatro CSV del Epic 7 — mismo criterio que `downloadIcsFile` (Story 4.3) |
| `partner/guest-detail-drawer.tsx` | Story 7.1 — ficha del invitado (`GuestDetail.dc.html`) |
| `partner/no-show-modal.tsx` | Story 7.1 — reportar un no-show con motivo (`NoShow.dc.html`) |
| `partner/export-guest-list-popover.tsx` | Story 7.1 — exportar CSV siguiendo los filtros de pantalla (`Export.dc.html`) |
| `partner/guest-list-table.tsx` | Story 7.1 — la lista del día (`Main.dc.html` / `LiveUpdate.dc.html`) |
| `partner/activity-panel.tsx` | Story 7.1 / 7.2 — panel de actividad (patrón 17) con enlace "View email" a los emails de la Story 7.2 |
| `partner/today-dashboard.tsx` | Story 7.1 / 7.2 — orquesta `/partner`: búsqueda, check-in, no-show, exportación y la reserva/cancelación en vivo por temporizador |
| `app/partner/login/page.tsx` | Acceso de partner (`Login.dc.html`), sin historia propia |
| `app/partner/emails/digest/page.tsx` | Story 7.2 — digest matinal de las 6:30 AM (`EmailDigest.dc.html`) |
| `app/partner/emails/new-booking/page.tsx` | Story 7.2 — email por cada reserva nueva (`EmailNewBooking.dc.html`) |
| `app/partner/emails/cancellation/page.tsx` | Story 7.2 — cancelación + promoción automática desde waitlist (`EmailCancellation.dc.html`) |
| `app/partner/analytics/page.tsx` | Story 7.3 — volumen de reservas, atribución de ingresos (`Analytics.dc.html`) |
| `app/partner/guests/page.tsx` | Story 7.3 — invitados recurrentes y niveles de lealtad (`RepeatGuests.dc.html`) |
| `app/partner/reports/page.tsx` | Story 7.3 — centro de seis informes descargables (`Reports.dc.html`) |
| `lib/admin.ts` | Story 8.1 — casos de soporte (`SUPPORT_CASES`), búsqueda de miembros (`searchMembers`), ficha de miembro (`getMemberProfile`) y caso con log de comunicación (`getCaseDetail`); Camille Duforest/CS-4417 son los únicos literales, el resto se deriva de su id — mismo criterio que `lounge-profile.ts` |
| `app/admin/support/page.tsx` | Story 8.1 — la mesa de soporte (`Main.dc.html`): cola de casos con estado, responsable y antigüedad |
| `app/admin/support/[id]/page.tsx` | Story 8.1 — caso con log de comunicación, resolución y escalado (`CaseDetail.dc.html`) |
| `app/admin/members/page.tsx` | Story 8.1 — búsqueda de miembro por nombre, email, teléfono o LP# (`MemberSearch.dc.html`) |
| `app/admin/members/[id]/page.tsx` | Story 8.1 — ficha de miembro: historial, pagos y membresía (`MemberProfile.dc.html`) |
| `lib/admin-analytics.ts` | Story 8.2 — analítica de red, popularidad, datasets de export y reportes programados; los importes cuadran con `lib/partner.ts` (The Ainsworth: 187 reservas, $8,616.50) |
| `app/admin/analytics/page.tsx` | Story 8.2 — "How the network is doing": reservas, no-shows, miembros e ingresos (`Analytics.dc.html`) |
| `app/admin/analytics/demand/page.tsx` | Story 8.2 — "Where the demand is": lounges, amenities y ciudades más demandados (`Popularity.dc.html`) |
| `app/admin/reports/page.tsx` | Story 8.2 — "Export data": dataset, filtros, columnas anonimizadas por defecto y entrega (`Export.dc.html`) |
| `app/admin/reports/scheduled/page.tsx` | Story 8.2 — "Reports that send themselves": reportes automáticos y su historial de entrega (`ScheduledReports.dc.html`) |
| `lib/admin-content.ts` | Story 8.3 — catálogo de 13 lounges (`ADMIN_LOUNGES`), los 3 cambios pendientes literales de The Vestry y su comparación live/propuesto |
| `admin/lounge-status-chip.tsx` | Story 8.3 — `LoungeStatusChip`, el mapa Live/Draft/N to approve sobre `StatusChip` |
| `app/admin/lounges/page.tsx` | Story 8.3 — "Add/edit/remove lounge profiles" y "Bulk update capabilities": la lista con selección y barra de acción masiva (`Lounges.dc.html`) |
| `app/admin/lounges/[id]/page.tsx` | Story 8.3 — editor de contenido (fotos, amenities, horario, disponibilidad) y aprobación inline (`LoungeEdit.dc.html`) |
| `app/admin/lounges/approvals/page.tsx` | Story 8.3 — "Content approval workflow": cola de aprobación con comparación live/propuesto (`Approval.dc.html`) |
| `lib/membership.ts` | Story 9.1 — los dos planes ($249/mes, $2,400/año), la cuenta anual de Alexandra (reutiliza `MEMBERSHIP_SUMMARY`/`REFERRAL_CODE` de `lib/profile.ts` y `VISITS_THIS_MONTH` de `lib/passes.ts`) y la mensual de Naomi Feldstein, los 6 beneficios, la tabla comparativa y la proración de `Upgrade.dc.html` |
| `lib/referrals.ts` | Story 9.2 — las 5 invitaciones, las stats, los day passes del rail, los términos del programa y `referralViewState`, que deriva el estado "credited" (`RewardCredited.dc.html`) a partir del "default" (`Referrals.dc.html`) sin backend que lo dispare |
| `app/profile/membership/page.tsx` | Story 9.1 — "Membership": estado del plan, beneficios, consumo del mes, renovación/auto-renovación y la oferta de subida mensual→anual (`Main.dc.html`/`MonthlyPlan.dc.html`) |
| `app/profile/membership/plans/page.tsx` | Story 9.1 — "Compare plans": los dos planes lado a lado y la tabla comparativa (`Plans.dc.html`) |
| `app/profile/membership/referrals/page.tsx` | Story 9.2 — "Referrals": código, invitaciones, day passes y términos (`Referrals.dc.html`/`RewardCredited.dc.html`) |

---

## Backend real (Supabase local) — Epic 1 (Stories 1.1 y 1.2)

Único epic con backend real hasta ahora (ver CLAUDE.md §Supabase Local Development).
Todo corre contra el proyecto local, nunca contra un Supabase remoto.

| Módulo | Qué resuelve |
|---|---|
| `lib/supabase/client.ts` | Cliente de Supabase para componentes `"use client"` |
| `lib/supabase/server.ts` | Cliente de Supabase para el Route Handler `/auth/confirm` |
| `lib/supabase/middleware.ts` + `middleware.ts` (raíz) | Refresco de la sesión en cada request (patrón oficial de `@supabase/ssr`) |
| `lib/testing/confirmed-user.ts` | Solo para tests: crea un usuario ya confirmado vía API de admin (service role) para no tener que leer Mailpit en cada test que necesita sesión |
| `supabase/schemas/profiles.sql` | Tabla `public.profiles` (los campos de los 3 pasos de onboarding), RLS propia |
| `supabase/schemas/email_exists.sql` | Story 1.1 — RPC `email_exists`, la excepción consciente al anti-enumeración de Supabase Auth, para poder cumplir el AC "clear error messaging" de emails duplicados |
| `supabase/schemas/login_attempts.sql` | Story 1.2 — tabla `login_attempts` + RPC `check_login_lock`/`record_failed_login`/`reset_login_attempts`. Supabase Auth no tiene lockout por cuenta (solo rate-limit por IP); sin policies, solo se toca vía esas funciones `security definer` |
| `supabase/schemas/storage.sql` + bucket `profile-photos` (`config.toml`) | Foto de perfil opcional, un archivo por usuario bajo `{auth.uid()}/` |
| `supabase/templates/confirmation.html` | Story 1.1 — enlace propio a `/auth/confirm?token_hash=...&type=signup` en vez del flujo implícito por defecto |
| `supabase/templates/recovery.html` | Story 1.2 — mismo patrón para `type=recovery`, destino `/reset-password` |
| `[auth.sessions] inactivity_timeout` (`config.toml`) | Story 1.2 — "Automatic logout after 30 days of inactivity", real y global (ver desviación de "Remember me" más abajo) |

`/auth/confirm` es el único Route Handler y sirve a las dos historias: según
el `type` del enlace, `signup` pasa primero por el estado "Email confirmed"
de `/verify-email` (ver más abajo) y cualquier otro tipo (`recovery`, …) va
directo a `next`. **Bug real encontrado y corregido al construir la 1.2**: en
`next dev`, `new URL(request.url).origin` puede devolver `localhost` sin
importar el host por el que entró la petición; si el navegador usaba
`127.0.0.1` (como fija `site_url`), el redirect saltaba de dominio y el
navegador perdía la cookie de sesión recién puesta (dominios distintos para
cookies). Se corrigió leyendo el host real de la cabecera `Host`/`X-Forwarded-Host`.

`/auth/confirm` no lleva directo a `/onboarding/basics` en el caso `signup`:
redirige a `/verify-email?verified=1&next=...`, un segundo estado de esa
misma pantalla (sin artboard propio, reutiliza la anatomía de
`Verification.dc.html` — mismo criterio que el acuse de `/forgot-password`)
que confirma y continúa solo tras un momento, con un botón "Continue" para no
depender del temporizador. La sesión que dejó `/auth/confirm` sigue activa:
no hay un login de por medio, igual que documenta `flow-onboarding.md`
(`EmailVerified → ProfileCreation`).

`/reset-password` (Story 1.2, sin artboard propio) hace lo mismo para
`type=recovery`: la sesión de recuperación permite `supabase.auth.updateUser`,
y al terminar va a Home (`/`), no a login — así lo fija el nodo
`PwdReset → HomeScreen` de `flow-onboarding.md`.

Desviaciones conscientes de esta parte (no son bugs, son decisiones tomadas con el usuario):

- **Welcome email** (AC "User receives welcome email with app download links"): sigue sin enviarse de verdad. Supabase Auth solo manda el correo de confirmación de forma nativa; un segundo correo exigiría un Database Webhook + Edge Function solo para esto. La pantalla `/welcome` ya muestra el estado (cuenta creada + botones de descarga).
- **Duplicado de email**: Supabase Auth no revela por diseño si un email ya existe cuando la confirmación está activa (anti-enumeración). Se resolvió con `email_exists`, aceptando el trade-off a cambio de cumplir el AC al pie de la letra.
- El enlace manual "I have verified my email" de `/verify-email` **ya no existe** — la verificación real llega por el enlace de Mailpit (`http://127.0.0.1:54334` en local) vía `/auth/confirm`.
- **Bloqueo de cuenta (Story 1.2) es por email, no por usuario autenticado**: cualquiera que conozca el email de otra persona puede bloquearle el acceso 15 min fallando adrede. Es inherente a "lockout tras N intentos" tal como lo pide el AC; no se resuelve con más infraestructura (IP+email, captcha) porque el AC no lo pide.
- **"Remember me" (Story 1.2) no crea dos modos de sesión reales**: implementar de verdad una cookie persistente vs. una de solo-sesión exigiría que el middleware conociera esa elección en cada refresco de token (una cookie aparte, chequeada en cada request) — infraestructura desproporcionada para dos historias marcadas como pequeñas. El checkbox se queda como preferencia de UI con su nota explicativa; el logout a los 30 días de inactividad (`inactivity_timeout`) es real pero global, no depende de si se marcó "Remember me".

---

## Backend real (Supabase local) — Epic 2 (Stories 2.1, 2.2, 2.3)

Segundo epic con backend real. `src/lib/lounges.ts` (el array `LOUNGES` y el
tipo `Lounge`) **no se tocó**: lo siguen usando Home y Epic 3-9 (mockup
todavía), y además pasa a ser la fuente literal del seed de abajo. Toda la
lógica de red nueva vive en módulos propios que solo usa `/explore`.

| Módulo | Qué resuelve |
|---|---|
| `supabase/schemas/lounges.sql` | Tabla `public.lounges` (nace en Epic 2, ver `docs/DATA-MODEL-MAP.md`), RLS de solo lectura `to authenticated` |
| `supabase/migrations/..._seed_lounges_story_2_1.sql` | Seed de los 17 lounges, escrito a mano (el seed de datos no es DDL, `db diff`/`declarative sync` no lo genera) — copiado literal de `LOUNGES`, con lat/lng añadidos |
| `lib/lounge-directory.ts` | `fetchLounges` (trae el catálogo completo — 17 filas, no compensa paginar en la query) y `withDistance` (adjunta `distanceMiles` real vía Haversine y ordena) |
| `lib/distance.ts` | `haversineMiles`/`Coordinates` — distancia real entre dos puntos, sin PostGIS/RPC: el catálogo es pequeño y no hace falta |
| `lib/geolocation.ts` | `getCurrentPosition`, envoltorio de `navigator.geolocation` en `Promise<LocationResult>` (`granted`/`denied`/`unavailable`/`timeout`) |
| `lib/location.ts` | `CITIES` gana `lat`/`lng` (centroide, origen del fallback manual); `loungeCountIn` pasa a ser puro (cuenta sobre el catálogo que se le pasa, no sobre un mock global) |
| `lib/online-status.ts` | `useOnlineStatus`: `navigator.onLine` real + eventos `online`/`offline`, sustituye el query param `?offline=1` |
| `app/explore/page.tsx` | `RequireSession` (mismo patrón que `/onboarding`: sin sesión, redirige a `/login`); geolocalización real con fallback manual; fetch real del catálogo |

`/explore` exige sesión real ahora (`RequireSession`), decisión tomada con el
usuario: el catálogo es de un miembro autenticado (RLS `to authenticated`),
no un directorio público, así que la pantalla se comporta como el resto de la
app real lo haría en `app.luxepass.co`, aunque Epic 3-9 (el resto del área de
miembro) siga sin exigirla mientras sigan siendo mockup.

Desviaciones conscientes de esta parte (no son bugs, son decisiones tomadas con el usuario):

- **El proveedor de mapa es Google Maps real** (`@vis.gl/react-google-maps` + `@googlemaps/markerclusterer`), decisión tomada con el usuario — ver `docs/PENDIENTES.md` §2.3 (resuelto). El callout del lounge seleccionado se ancla siempre encima o debajo de su pin según haya espacio (`useLayoutEffect` mide su posición real y voltea a `top-full` si `bottom-full` lo recortaría contra el borde del mapa) — reemplaza el flip izquierda/derecha del mock, atado al viewBox del SVG que ya no existe.
- **Clustering y el flip del callout se verificaron y corrigieron con Google Maps real, no con el stub de jsdom.** El clustering tenía dos problemas invisibles en tests (rango de zoom demasiado estrecho para alcanzarlo, y un bug real de timing entre el montaje asíncrono de `AdvancedMarker` y el efecto que alimentaba a `MarkerClusterer`, que dejaba el clustering en cero marcadores siempre) — ambos corregidos y con test de regresión (`city-map.test.tsx`). El callout ahora voltea a `top-full` cuando su posición real (medida con `getBoundingClientRect`, vía el atributo `data-map-surface`) se recortaría contra el borde superior del mapa — con test de regresión (`lounge-callout.test.tsx`).
- **El filtro de disponibilidad de 2.2 ("Calendar view") es una aproximación, no la agenda real de Epic 3.** `filters.date`/`filters.band` siguen filtrando por `bands`/`closed_weekdays` — ahora columnas reales de `lounges`, ya no del mock — pero esas columnas son una instantánea sembrada por migración, no el calendario semanal con capacidad y cierres especiales que traerá `lounge_availability` (Epic 3, sigue sin construirse). Se sustituye cuando esa tabla exista.
- **`rating`/`open_now`/`slots_today` son columnas reales pero estáticas**, sembradas 1:1 desde el mock — no agregadas (rating) ni en vivo (disponibilidad). Maduran cuando Epic 3/4 aporten su propio modelo (rating agregado de reseñas, disponibilidad real de bookings).
- **Mini-mapa embebido en el perfil de lounge (Story 3.1) queda fuera de esta historia**: `/lounges/[id]` sigue en `lib/lounges.ts` (mock de Epic 3-9, sin lat/lng reales) y no tiene artboard con un hueco de mapa — ver `docs/PENDIENTES.md` nueva entrada §2.9.
- **Solo lectura**: sin policies de insert/update/delete — el catálogo se siembra por migración hasta que Epic 8.3 diseñe su propio flujo de admin sobre `lounges` (ya anticipado en `docs/DATA-MODEL-MAP.md`).
- **`explore/page.test.tsx` ya no cubre el instante exacto de "cargando" de la lista** (antes `?list=loading`, retirado: la carga ya es real). Ese estado tiene su propio test determinista en `components/explore/lounge-list.test.tsx`, sobre el componente directamente — una petición de red real no se puede fijar en un instante concreto desde un test.
- **El botón "Recentre the map" pana a la ubicación GPS real capturada al conceder el permiso, no a una nueva lectura en cada clic.** `origin` (pasado a `CityMap` desde `page.tsx`) es la coordenada real de `getCurrentPosition()` obtenida en `handleAllow` — ya no el punto fijo `{x:267,y:339}` que tenía el mock —, pero el botón no vuelve a pedir el GPS por clic: eso añadiría manejo de permiso denegado/timeout para un control secundario, desproporcionado para esta historia. Se sustituye si una historia futura pide una relectura de ubicación en vivo.
- **Seleccionar un lounge desde el panel de resultados recentra el mapa** (`SelectionRecentre` en `city-map.tsx`): pana a su lat/lng real y fija el zoom en `DETAIL_ZOOM` (15, entre `MIN_ZOOM` 10 y `MAX_ZOOM` 16), sin condicionarlo al zoom del que se venía — corrige tanto un zoom muy abierto (el pin no se notaría) como uno ya muy cerrado en otro punto. No estaba en el artboard porque el mock no tenía un mapa real que pudiera desincronizarse del panel.
- **`handleAllow` cierra el diálogo de permiso antes de que resuelva `getCurrentPosition()`, no después.** Un fix real de GPS puede tardar varios segundos incluso ya concedido el permiso — esperarlo (`await`) dejaba el diálogo abierto todo ese tiempo, un problema invisible en el test (el stub de `navigator.geolocation` resuelve síncrono). El mapa se muestra ya con la ciudad por defecto como origen provisional; `origin` se corrige en cuanto llega la posición real, y `OriginRecentre` (`city-map.tsx`) pana el mapa a ese origen corregido — `defaultCenter` de `@vis.gl/react-google-maps` solo aplica una vez, así que sin esto el mapa se quedaría en el centro de la ciudad por defecto pese a que `origin` ya tuviera la posición real.
- **Bug real (reportado por el usuario, sept 2026): "View details" del callout de un pin no navegaba nunca.** Invisible en jsdom (el stub de Google Maps no replica ni el `pointer-events` real ni los avisos de la librería) — solo se reprodujo con Playwright real. Dos causas independientes, ambas en el `AdvancedMarker` que envuelve el callout (`children` en `city-map.tsx`):
  1. Sin ningún handler interactivo propio, `@vis.gl/react-google-maps` le ponía `pointer-events: none` al contenido del marker (lo trata como no-clickable y deja pasar el clic al mapa de debajo) — se le añadió `onClick={() => {}}`, con comentario explicando por qué existe un handler vacío.
  2. Con eso corregido, el clic seguía sin llegar: Google Maps avisa en consola "Focusable child elements in AdvancedMarkerElement are not supported" y, en la práctica, intercepta el foco de un hijo enfocable (el `<Link>` "View details") entre `mousedown` y `mouseup`, desmontando el callout a mitad del clic. `tabIndex={-1}` en ese `Link` (`lounge-callout.tsx`) lo saca del focus-management de Google sin dejar de ser clickable con ratón ni de tener rol de link para lector de pantalla — dentro del callout del mapa deja de ser alcanzable por teclado, pero el mismo lounge se tabula desde el panel de resultados.
  3. De paso, se añadió `onClick={(e) => e.stopPropagation()}` al callout: `<Map onClick={onDeselect}>` escucha clics a nivel de mapa, y sin cortar la propagación cualquier clic dentro del callout (no solo "View details") lo deselecciona.
  Regresión cubierta en `lounge-callout.test.tsx` (lo que jsdom sí puede observar: `tabIndex` y que el clic no burbujee) y verificada de punta a punta con Playwright (`scripts/playwright/scripts/explore/view-details-from-pin-verification.js`).

---

## Backend real (Supabase local) — Epic 3 (Stories 3.1, 3.2)

Tercer epic con backend real. Extiende `public.lounges` (Epic 2 sigue siendo
dueño de la tabla) y añade tres tablas propias del Epic 3 — ver
`docs/DATA-MODEL-MAP.md`.

| Módulo | Qué resuelve |
|---|---|
| `supabase/schemas/lounges.sql` | Columnas nuevas: `address`, `phone`, `email`, `website`, `reception_note`, `weekly_hours` (jsonb, 7 entradas domingo→sábado), `review_count`, `capacity`, `booking_restrictions` |
| `supabase/schemas/lounge_images.sql` | Tabla `lounge_images` (nace en Epic 3) — colección ordenada de fotos por lounge, sustituye el `hero-photos.ts` estático compartido por todo el catálogo |
| `supabase/schemas/lounge_availability.sql` | Tabla `lounge_availability` (nace en Epic 3) — plazas por `(lounge_id, date, band)`; solo existe fila cuando la franja/día está soportado por `lounges.bands`/`closed_weekdays` |
| `supabase/schemas/lounge_closures.sql` | Tabla `lounge_closures` (nace en Epic 3, no anticipada por nombre en `DATA-MODEL-MAP.md` — se documentó ahí como parte de "disponibilidad") — cierres por festivo con `reopens_label`/`posted_on`, separada de `lounge_availability` porque es un evento por rango de fechas, no una propiedad por celda |
| `supabase/migrations/..._seed_lounge_profiles_story_3.sql` | Seed escrito a mano, reproduciendo la misma fórmula determinista que ya usaba el mock (`hashOf(id\|date\|band) % 21`) para no inventar números nuevos; ventana de disponibilidad sembrada: `mondayOf(TODAY) - 1 semana` a `TODAY + 16 semanas` |
| `lib/lounge-profile.ts` | `fetchLoungeProfile`/`fetchLoungeImages`/`fetchWeeklyAvailability`/`fetchClosuresForWeek`/`fetchNextAvailableSlot` (todas contra Supabase); `operatingHoursFor` pasa a recibir `weeklyHours` en vez de leer una constante compartida |
| `app/lounges/[id]/page.tsx`, `.../availability/page.tsx`, `.../reviews/page.tsx` | Las tres pasan a `RequireSession` (mismo patrón que `/explore`) y a resolver el lounge con `fetchLoungeProfile` en vez de `LOUNGES.find(...)` de `lib/lounges.ts` (ese archivo sigue intacto: lo siguen usando Home y Epic 4-9, sin conectar) |

Desviaciones conscientes de esta parte:

- **No hay tabla `reviews`.** Ninguna historia permite dejar una reseña
  (ver `docs/DATA-MODEL-MAP.md`): `rating`/`review_count` son columnas reales
  agregadas, pero el contenido de cada reseña, el desglose por estrellas y
  "what members mention" (`reviewsFor`/`ratingBreakdownFor`/`mentionsFor`)
  siguen siendo datos de muestra — mismo criterio que Camille Duforest
  (Epic 8) o LP-842193 (Epic 5).
- **`lib/lounge-profile.ts` es híbrido a propósito.** Conserva, sin tocar,
  las funciones síncronas que operaban sobre el mock (`contactFor`,
  `closuresFor`, `closureCovering`, `weeklyAvailability`, el tipo
  `LoungeContact`) porque `lib/booking.ts` y las pantallas de
  `/lounges/[id]/book/*` (Epic 4, sin conectar todavía) siguen dependiendo de
  ellas tal cual. Se retiran cuando Epic 4 se conecte a su vez.
- **Horizonte de disponibilidad finito (18 semanas), no infinito como el hash del mock.** Sembrar una tabla real exige un rango — se eligió uno que cubre la navegación semanal, `nextAvailableSlot` (3 semanas) y el cierre de Thanksgiving que ya citan artboards y tests. Navegar mucho más allá de ~4 meses desde TODAY no tiene filas y se trataría como sin datos (no ocurre en ningún flujo de la app hoy).
- **Se retiró el chip de distancia ("0.3 mi away") del perfil.** No está en los Acceptance Criteria de la Story 3.1, y añadir geolocalización real a esta pantalla (como en `/explore`) para un dato puramente decorativo es desproporcionado — mismo criterio que otras simplificaciones ya aceptadas (p. ej. "Remember me" en Epic 1).
- **`WeeklyCalendar` pasó de calcular sus celdas internamente a recibirlas por prop (`cells`).** El mock la dejaba recalcular `weeklyAvailability(lounge, weekStart)` por su cuenta (duplicado con el cálculo que ya hacía la página); con datos reales y async eso ya no es posible sin un estado de carga propio dentro del componente — se centralizó en la página, que ya tenía sus propias razones para calcular `cells`.
- **`FreshnessNote` pasó de simular un contador local a recibir `lastUpdatedAt` real.** El refresco cada 5 minutos (AC de la Story 3.2) vive en la página (`setInterval` + refetch), no en el componente — que solo recalcula el texto "hace N min" cada 15s a partir de ese timestamp.
- **La 4ª restricción de reserva ("Free cancellation up to 4 hours before") se añadió al sembrar.** El mock solo tenía 3; `Availability.dc.html` dibuja 4 — se cierra el gap al conectar el dato real en vez de arrastrarlo.

---

## Pendiente de implementar

Lo que el design system especifica y **todavía no existe en código**. Antes de escribirlo,
comprobar si un componente de arriba ya lo cubre con una variante.

### Primitivos de §4 sin implementar

Item de nav · Fila de historial · Segmented (oscuro, geometría propia de 36px —
se usa hoy con la variante `sm` existente, 38px, como aproximación) ·
Barra de volumen (vertical — el Epic 7 la dibuja inline en
`app/partner/analytics/page.tsx`, no como primitivo, por ahora un único uso)

Casilla de asistencia, Chip de asistencia (oscuro) y Tile de métrica (oscuro)
se implementaron con el Epic 7 (`AttendanceCheckbox`, `StatusChip` ampliado y
`MetricTile` — ver Capa 1). Chip de estado de caso, Badge de nav, Entrada de
log de comunicación, Barra de acción masiva y Diff de aprobación se
implementaron con el Epic 8 (`CaseStatusChip`, `NavBadge`, `CommLogEntry`,
`BulkActionBar`, `ApprovalDiff` — ver Capa 1). Tile de métrica (claro), Barra
de consumo y Tabla comparativa se implementaron con el Epic 9 (`MetricTile`
con `tone="light"`, `ConsumptionBar`, `ComparisonTable` — ver Capa 1); la
barra de volumen horizontal de la Fase 2 y la barra de consumo de la Fase 9
son gemelas, pero como la primera sigue sin subirse a primitivo (vive inline
en `app/partner/analytics/page.tsx`), `ConsumptionBar` nace como primitivo
propio en vez de generalizar código que hoy no es compartido. **Fila de
datos (oscura)** sigue sin subirse a primitivo compartido: `GuestListTable`
(Story 7.1), `RepeatGuests` (Story 7.3) y las tres tablas del Epic 8 (`Main`,
`MemberSearch`, `MemberProfile`) dibujan cada una su propia fila inline
porque sus grids de columnas no coinciden — **su gemela clara** (`Fila de
datos (clara)`, patrón 25) sigue el mismo criterio: `ReferralInvitationsTable`
(Story 9.2) dibuja su propia rejilla de 4 columnas en vez de subir un
primitivo compartido — se sube cuando un epic lo necesite y obligue a
generalizar el grid.

Código QR del pase, Sello de expirado, Campo de lookup (oscuro) y Botón
fantasma (oscuro) ya están construidos (Fase 6, ver arriba) pero como piezas de
un único uso (`QrCode` es el único que se subió a primitivo reutilizable; el
sello y el campo de lookup viven inline en `DigitalPassCard` y en
`app/reception/page.tsx`) — se suben a primitivo aparte solo si un epic
siguiente los vuelve a necesitar.

### Patrones de §5 sin implementar

Ninguno — el Epic 9 (Fase 9) cierra los dos últimos: 25 Lista de datos clara
(inline, `ReferralInvitationsTable`, ver nota de arriba) y 26 Comparación de
planes (`app/profile/membership/plans/page.tsx`, sobre el patrón 13).

(11 Pase digital y 12 Consola de recepción se implementaron con el Epic 5; 13
Sección de cuenta y 14 Panel de notificaciones con el Epic 6; 15 App shell del
partner, 16 Lista de datos oscura (inline, ver nota de arriba), 17 Panel de
actividad, 18 Modal/drawer oscuros y 19 Vista de analítica con el Epic 7; 21
App shell admin, 22 Ficha de miembro y 23 Caso con log con la Story 8.1, y 24
Comparación live/propuesto con la Story 8.3 (`app/admin/lounges/approvals/page.tsx`) —
ver la tabla de patrones arriba.)

### Gemelos que deben compartir componente

El design system ya los declaró equivalentes. Cuando llegue el segundo de cada par, se
extiende el existente con `data-theme` o una variante — **no se crea uno nuevo**:

| Par | Epics | Cómo |
|---|---|---|
| Tile de métrica claro ↔ oscuro | E9 ↔ E7 (los dos implementados) | mismo componente — no por `data-theme` como preveía esta fila, sino por la nueva prop `tone` (`MetricTile` hardcodea `bg-dark-card` en vez de un token semántico, así que el tema no lo resolvía solo) |
| Fila de datos clara ↔ oscura | E9 ↔ E7/E8 (los dos pendientes) | pendiente de generalizar — `ReferralInvitationsTable` (E9) sigue inline igual que `GuestListTable`/`RepeatGuests` (E7), ver "Pendiente de implementar" |
| Lista de datos clara (25) ↔ oscura (16) | E9 ↔ E7 (los dos implementados) | no acabaron siendo un componente compartido: `ReferralInvitationsTable` (E9) y `GuestListTable`/`RepeatGuests` (E7) son implementaciones inline distintas, mismo motivo que la fila anterior |
| Chip de estado: reserva ↔ asistencia ↔ caso ↔ referido | E6 ↔ E7 ↔ E8 ↔ E9 (los cuatro implementados) | un `StatusChip` con mapa de estados por dominio |
| Modal/drawer claro (4/6) ↔ oscuro (18, implementado) | E1 ↔ E7 | mismo componente, `data-theme` — prop `dark` en `Modal`/`Drawer` |
| App shell miembro (3) ↔ partner (15, implementado) ↔ admin (21, implementado) | E2–6 ↔ E7 ↔ E8 | mismo shell, distinta nav y `data-theme` |
| Panel notificaciones (14) ↔ actividad (17, implementado) | E6 ↔ E7 | mismo componente, `data-theme` |
| Barra de volumen horizontal ↔ barra de consumo | E7 ↔ E9 (E9 implementado) | no llegaron a compartir componente: la horizontal de la Fase 2 sigue inline en `app/partner/analytics/page.tsx` (nunca se subió a primitivo), así que `ConsumptionBar` nace como primitivo propio en vez de generalizar código que hoy no es compartido |

---

## Desviaciones conscientes respecto a los artboards

| Qué | Por qué |
|---|---|
| Los artboards son desktop 1440×900 fijo; los componentes son responsive | La app es una PWA. En `AuthSplit`, el panel de marca de 600px se repliega a banda superior por debajo de `lg` |
| Iconos con `lucide-react` en lugar de SVG copiados | §1 especifica *regla* (stroke 1.6–1.8, grid 24, round), no un set concreto. `lucide-react` ya estaba en `package.json` |
| El desenfoque del patrón 4 no viaja en el HTML del servidor | El diálogo vive en un portal, que el servidor no renderiza. Si el desenfoque llegara en el HTML, la pantalla se vería borrosa y sin nada que lo explique hasta que hidratara — y así se quedaría si el JavaScript falla. `AppShell` lo aplica solo en cliente |
| El `filter: blur(3px)` del patrón 4 lo aplica la pantalla, no el modal | Un modal en portal no puede alcanzar a su hermano en el árbol. `/signup` pasa `blur-[3px]` al `AuthSplit` mientras el modal está abierto |
| ~~`/verify-email` incluye "I have verified my email"~~ | **Resuelto**: retirado al conectar Supabase Auth real. La verificación llega por el enlace de Mailpit vía `/auth/confirm` (ver "Backend real (Supabase local)" más arriba) |
| Texto legal del modal de términos | Relleno estructural, tal como ya advierte `DESIGN-SYSTEM.md` §6 (Fase 1). A reemplazar por el documento real de En Soleil |
| El acuse de "reset link sent" no tiene artboard | Se resuelve como segundo estado de `/forgot-password`, reutilizando la anatomía de `Verification.dc.html` (medallón de 76px + destinatario + reenvío), en lugar de inventar una pantalla |
| `/reset-password` no tiene artboard | Decisión tomada con el usuario: se construye igualmente para completar el AC de reset de contraseña, componiendo `Field`/`Input`/`Button` ya existentes (mismos campos de contraseña que `/signup`) en vez de inventar un layout nuevo |
| `/login` añade una nota de 11.5px bajo "Remember me" | El artboard no la trae, pero `flow-onboarding.md` fija el alcance del token ("Set remember token: 30-day auto-logout"). Decirlo evita que el miembro adivine qué activa la casilla — aunque el backend no diferencia hoy dos modos de sesión reales (ver "Backend real (Supabase local)") |
| El scroll infinito de la lista carga de cuatro en cuatro | El artboard muestra "Showing 4 of 12" y el pie "Loading more lounges…". Un `IntersectionObserver` sobre ese pie pide la siguiente tanda |
| `vitest.setup.ts` rellena `IntersectionObserver` | jsdom no lo implementa, y sin él el scroll infinito no puede ni existir. Es una API del navegador que falta, no un mock de código del proyecto — la única excepción además de `next/navigation` |
| El día 14 de septiembre de 2025 es domingo, y el artboard lo llama "Sat" | La rejilla del propio artboard pone el 1 en lunes y el 14 en la columna del domingo, así que el calendario y el chip son coherentes entre sí aunque no con esa palabra |
| Los conteos de las sugerencias de `NoResults` se calculan, no se copian | El artboard promete "9 / 6 / 4 lounges would match". Con el catálogo de muestra salen otras cifras, pero cada una es cierta: la sugerencia que se ofrece devuelve exactamente los que anuncia |
| El calendario del drawer marca los días sin mirar el resto de filtros | Si dependiera de ellos, el día que deja la búsqueda a cero quedaría deshabilitado y el estado "sin resultados" sería inalcanzable — justo el que el artboard dibuja |
| ~~El mapa es el SVG del artboard, no un proveedor de tiles~~ | **Resuelto**: sustituido por Google Maps real (`@vis.gl/react-google-maps`) — ver "Backend real — Epic 2" |
| ~~Los markers se posicionan en % del plano, no en los píxeles del artboard~~ | **Resuelto**: los markers (`AdvancedMarker`) usan lat/lng reales, no un porcentaje sobre el dibujo; `.map-canvas` queda como CSS sin uso (solo definida en `globals.css`, sin referencias en `src/components/explore/*.tsx`) — ver "Backend real — Epic 2" |
| ~~El callout salta al otro lado del marker pasado el 55% del ancho~~ | **Resuelto**: el flip ahora es vertical (encima/debajo del pin según espacio real, medido con `useLayoutEffect`), no izquierda/derecha por porcentaje del viewBox del SVG — ver "Backend real — Epic 2" |
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
| `?covered=1` en `/lounges/[id]/book` alcanza la variante "la visita está cubierta por la membresía" (`MembershipCovered.dc.html`) | Igual que `?state=` en `/my-pass/[reference]`: no hay backend de membresía que decida cuándo aplica, así que el estado se alcanza por query param y se documenta aquí en vez de inventar un botón que no está en ningún artboard |
| `SAMPLE_MEMBER` gana un campo `email` (`lib/member.ts`) | Los artboards de la Fase 5 citan el correo de Alexandra Rivas en tres pantallas distintas (Confirmed, Payment, Receipt); antes solo vivía como texto literal repetido |
| `/lounges/[id]/book/confirmed` añade el enlace "view the email receipt" | Ningún artboard de la Fase 5 enlaza `Confirmed.dc.html` con `Receipt.dc.html`, pero sin él la pantalla del recibo (criterio de la Story 4.2) quedaría implementada y sin ruta para llegar a ella navegando |
| El recibo por email (`/lounges/[id]/book/receipt`) es la pantalla del estado, no un envío real | "Payment confirmation email receipt" (Story 4.2) exige backend real (SMTP). Se implementa visualmente la pantalla del email tal como llegaría, con los mismos datos de la reserva — la desviación que ya fija la cabecera de este documento |
| El `.ics` y la URL de Google Calendar de `AddToCalendarModal` son reales, no simulados | A diferencia del resto del Epic 4, generar un archivo de calendario y abrir Google Calendar son capacidades del navegador, no llamadas a un servicio de LuxePass — no hay ninguna regla que lo prohíba |
| `/my-pass/[reference]` alcanza los cuatro estados del pase (`Main`/`ArrivalDay`/`CheckedIn`/`Expired`) por `?state=`, no por el paso del tiempo | Igual que `?covered=1`: no hay reloj real que dispare "hoy llegó" o "la ventana cerró", así que el estado se elige por query param en vez de inventar un timer que nadie pidió |
| Los datos de "My Pass" (`lib/passes.ts`) son literales, independientes del `booking-context.tsx` de la reserva en vivo | La reserva LP-842193 que citan los artboards de la Fase 6 no es la que produce `bookingReference()` para una fecha/hora elegida en `/lounges/[id]/book` — igual que `lounge-profile.ts` fija literalmente el contacto y las reseñas de The Ainsworth en vez de derivarlos del motor de disponibilidad |
| Solo la reserva de The Ainsworth (`LP-842193`) enlaza a un pase completo en `/my-pass` | Es la única con las cuatro pantallas del patrón 11 dibujadas. "View pass" de las demás filas (The Vestry, Bergdorf Lounge) no tiene artboard de destino propio y queda inerte, como "Write a review" en el Epic 3 |
| `/reception` es una ruta suelta, sin App shell ni pantalla de login | El patrón 12 es "solo el momento del check-in de un invitado" (`DESIGN-SYSTEM.md` §6 Fase 6); la lista diaria de invitados y el acceso del partner son el Epic 7 (`/partner`), una consola aparte. Se llega tecleando la URL, no desde la navegación del miembro ni desde `/partner` |
| El código QR es el mismo SVG decorativo de 25×25 módulos del artboard, no una librería real | `DESIGN-SYSTEM.md` §6 (Fase 6) ya lo deja como pendiente ("al implementar se genera con una librería real sobre el LP#"); añadir una dependencia de generación de QR no cambia ningún criterio de aceptación, así que se queda para cuando haga falta que el código sea escaneable de verdad |
| El botón "Check in Alexandra" de `/reception` deshabilita y cambia de texto en vez de navegar a algún sitio | Ningún artboard dibuja el estado posterior de la consola de recepción; el efecto en el lado del miembro ya es la pantalla `CheckedIn` de `/my-pass/[reference]?state=checked-in`, alcanzable por separado |
| `Main.dc.html`/`History.dc.html` de la Fase 7 sustituyen a `MyBookings.dc.html`/`NoShow.dc.html` de la Fase 6 en `/my-pass` | Son el mismo ítem de nav y la misma ruta rediseñados un epic después, con los cuatro estados de reserva y el flujo de cancelación que pide la Story 6.1. Se implementa el artboard vigente (el más nuevo), no los dos a la vez; la tarjeta con QR de la próxima visita que traía la Fase 6 se retira de la lista — sigue viva en `/my-pass/[reference]`, que no cambia |
| Las amenities preferidas de `/profile/preferences` son las 6 de `lib/amenities.ts`, no las 8 propias de `Preferences.dc.html` | Misma regla que ya fija este mapa para el perfil de lounge (Fase 4): una sola fuente de datos entre el filtro de Explore y aquí, para que una amenity preferida nunca sea una que el filtro no reconoce |
| Los lounges favoritos de `Preferences.dc.html` (The Ainsworth, The Vestry, Bergdorf Lounge) son datos literales en `lib/profile.ts`, no derivados del catálogo | Solo The Ainsworth está en las 12 lounges de `lib/lounges.ts`; The Vestry y Bergdorf Lounge son los mismos nombres de muestra que ya usa `lib/passes.ts` sin estar en el catálogo real — mismo criterio que ya fija ese archivo |
| La campana de notificaciones (patrón 14) no aparece en `/` ni en `/explore` | Ninguna historia de los Epics 1–6 exige rediseñar esas pantallas; se implementa donde los artboards de la Fase 7 la dibujan (My Pass, Notifications y toda la sección de cuenta). `MorningAlert.dc.html` la dibuja abierta sobre un Home más rico ("Good morning" + "Near you today"), pero ese rediseño de Home no lo pide ninguna de las tres historias del Epic 6, así que no se construye |
| "Membership" en el sub-nav de Account no tiene `href` | El Epic 9 diseña esa vista; `DESIGN-SYSTEM.md` §6 (Fase 9) ya declara que no añade una entrada nueva al sub-nav, así que el hueco ya está aquí. Ver `docs/PENDIENTES.md` §2.1b |
| Los botones de fila de 38–40px (`View pass`, `Cancel`, `Directions`, `Leave`, `Email receipt`, `Dispute`, `Book again`, `Book`, `Book a visit`, `Edit`, `Request export`, `Download`, `Delete account`, `Mark all as read`, `Settings`) llevan `normal-case` | `buttonVariants` pone mayúsculas a los tres tamaños por defecto (§4 solo lo fija para el botón de 52px), pero los artboards de la Fase 7 no llevan `text-transform: uppercase` en sus botones `.btn-outline` pequeños — sí lo llevan los `.btn-gold` grandes ("Save changes", "Share your code", "Cancel booking"…), que no cambian. Se corrige por pantalla con la clase, no en el primitivo, para no alterar botones ya aprobados de los Epics 1–5 |
| `/notifications` añade una flecha "Back" en el topbar (`router.back()`) | Ningún artboard de la Fase 7 la dibuja — `Notifications.dc.html` da por hecho que se navega por la sidebar del App shell — pero sin ella la pantalla no tenía ninguna forma evidente de abandonarse. Es la única desviación de este documento motivada por una prueba manual, no por un hueco de diseño |
| Cada notificación se puede marcar como leída por separado, con clic en la fila (no solo "Mark all as read") | `Notifications.dc.html` solo dibuja el botón global; marcar una por una es una mejora de uso directamente pedida en QA, y es coherente con el punto de la fila sin leer que ya declara §4 |
| Las horas de silencio son dos `<select>` con listas separadas (`QUIET_HOURS_START_OPTIONS` solo PM, `QUIET_HOURS_END_OPTIONS` solo AM), no un rango libre | `NotificationSettings.dc.html` dibuja el control pero no dice cómo se valida; en vez de una función que rechace combinaciones raras ("10 PM to 3 PM"), esa combinación deja de ser una opción posible en el desplegable |
| "Upload photo" en `/profile` es funcional de verdad (`FileReader.readAsDataURL`) | A diferencia del resto de botones sin backend detrás, leer un archivo local y pintarlo en el círculo del avatar es una capacidad del navegador, no una llamada a un servicio de LuxePass — mismo criterio que ya vale para el `.ics` del Epic 4 y el "Copy" del Epic 3 |
| El listado de invitados de `/partner` no pliega filas por antigüedad, a diferencia de `Main.dc.html`/`LiveUpdate.dc.html` | El artboard pliega las llegadas más antiguas en una fila "N earlier arrivals"; aquí se listan los 14 invitados con nombre en todo momento para que "guest list display: name, contact, email" (Story 7.1) se pueda comprobar sobre cualquier fila, no solo sobre las que el artboard deja expandidas en el instante que dibuja |
| Marcus Ellery y Priya Raghunathan (`lib/partner.ts`) son invitados completos, no la fila anónima "2 earlier arrivals" de `Main.dc.html` | `EmailDigest.dc.html` sí los nombra con LP# propio — se reconcilian como el mismo dato en vez de mantener dos versiones (una anónima, una nombrada) del mismo par de llegadas de las 9:00 AM |
| La reserva en vivo de Naomi Feldstein y la cancelación+promoción de Harriet Osei/Victor Almeida disparan por temporizador al entrar en `/partner`, no por el paso real del reloj | Igual que el chequeo de disponibilidad del Epic 4: sin backend no hay un evento real que las dispare, así que son deterministas (`applyLiveBooking`/`applyCancellationAndPromotion`) para que "real-time updates" (Story 7.1) y las alertas de cancelación/waitlist (Story 7.2) se puedan alcanzar y probar |
| `TodayDashboard` (`/partner`) acepta `liveBookingDelayMs`/`cancellationDelayMs` como props en vez de una constante fija | Los tests que verifican la actualización en vivo usan temporizadores reales con estos valores acortados — mezclar fake timers con el scheduler de React bajo jsdom se cuelga, porque jsdom implementa `requestAnimationFrame` sobre `setTimeout` |
| El eyebrow "Attendance" del modal de no-show sustituye a "Story 7.1 · attendance" de `NoShow.dc.html` | Ese texto lee como una anotación del propio proceso de diseño, no como copy de producto — no hay motivo de negocio para que la etiqueta de la historia aparezca en pantalla |
| El motivo elegido al reportar un no-show no cambia el flujo visible más allá de marcar la fila | Los tres motivos de `NoShow.dc.html` narran distintos matices (ventana cerrada, nota para soporte), pero ninguna historia define un tratamiento distinto por motivo; se guarda en `PartnerGuest.noShowReason` para el futuro informe "No-show log" (`Reports.dc.html`) |
| El rail de configuración de `/partner/reports` usa las mismas cinco columnas para los seis informes | `Reports.dc.html` solo detalla la configuración de "Monthly booking volume"; los otros cinco informes reutilizan esa misma anatomía de rail hasta que cada uno tenga su propio modelo de columnas |
| El segmented "Came back" de `RepeatGuests.dc.html` no está preseleccionado por defecto | El propio artboard dibuja a Elena Vasquez con una sola visita ("First visit") en su tabla de 10 filas mientras el segmented marca "Came back" — con ese filtro activo Elena no podría aparecer. Aquí el filtro por defecto es "Everyone" para que las tres etiquetas de lealtad se puedan ver sin interactuar |
| El gráfico "Bookings a day" no usa `SimpleBarChart` (Recharts) | Su cromo por defecto (ejes, tooltip, leyenda) no se parece a las barras mínimas que dibuja `Analytics.dc.html`; se construye con divs simples, igual que "When they come". `SimpleBarChart`/`SimpleLineChart` siguen sin un primer uso real — se retoman cuando un gráfico necesite de verdad ejes o tooltips interactivos sobre muchos puntos |
| La suma de las 14 barras de "Bookings a day" da 186, no 187 (el tile "Bookings") | Desajuste ya presente en `Analytics.dc.html` — la distribución semanal de "When they come" sí suma 187 exactos. Se documenta, no se corrige de más |
| El botón "Print list" (`/partner`) y "Download CSV"/"Print updated list" de los emails llaman a `window.print()`/`downloadTextFile` de verdad | Capacidades del navegador, no llamadas a un servicio de LuxePass — mismo criterio que el resto de descargas reales del proyecto (`.ics`, "Copy", "Upload photo") |
| Camille Duforest (`camille-duforest`) es la única ficha de miembro y CS-4417 el único caso con log/reembolso literales del Epic 8 | Son los únicos que `MemberProfile.dc.html`, `CaseDetail.dc.html` y `Refund.dc.html` dibujan; el resto de `ADMIN_MEMBERS`/`SUPPORT_CASES` deriva un perfil o un caso mínimo de sus propios datos en `getMemberProfile`/`getCaseDetail` (`lib/admin.ts`) — mismo criterio que `lounge-profile.ts` para el contacto/reseñas del Epic 3 |
| El reembolso ("Waive and refund") solo aparece en la ficha de un caso si modela un cargo (`refundableAmount`) | Solo CS-4417 lo trae; el resto muestra "Resolve case" sin reembolso. Ningún artboard dibuja el reembolso de un caso sin cargo asociado, así que no se inventa uno |
| La campana de la topbar del admin (patrón 21) no abre ningún panel | Ningún artboard de la Fase 8 dibuja el panel de notificaciones abierto para el admin, a diferencia del panel de cuenta (14) o de actividad del partner (17) — queda inerte, como "Write a review" en el Epic 3 |
| "New case", "Filters" (`/admin/support`), "Modify booking"/"Open case" cuando no hay reserva próxima y "Move to another lounge" (`BookingOverrideDrawer`) no llevan a ningún sitio propio | Ningún artboard dibuja un formulario de caso nuevo, un panel de filtros de casos, ni una segunda pantalla para elegir lounge de destino — quedan inertes en vez de inventar una pantalla |
| Las tres sugerencias de "Not the person you are looking for?" (`/admin/members`) son leyenda, no botones con destino propio | Las tres capacidades que describen (buscar por referencia, por cargo de Stripe, listar cuentas cerradas) ya las resuelve el mismo cuadro de búsqueda de la pantalla — un botón que solo repitiera esa acción no aportaría nada nuevo |
| La tabla de `MemberSearch.dc.html` reparte sus columnas con fracciones (`2fr 1.1fr 0.9fr 1fr 0.9fr`) en vez de los píxeles fijos del artboard | Los píxeles literales del artboard (`1fr 152px 128px 122px 112px 30px`) dejan la columna de miembro en ~94px una vez restados el rail de 344px y el resto de columnas — friable para un nombre real. Las fracciones reparten el mismo ancho total de forma proporcional en vez de fija |
| El segmented "14 days / Month / Quarter" de `/admin/analytics` solo cambia su propia selección, no los datos | `lib/admin-analytics.ts` solo modela la quincena del 1 al 14 de septiembre que fija `DESIGN-SYSTEM.md` §6 (Fase 8); no hay otro dataset que enseñar, igual que el rango fijo "Sep 1 – Sep 14" del Epic 7 |
| Los enlaces "Revenue by partner (CSV)" y "Open the acquisition report" (`/admin/analytics`) navegan a `/admin/reports?dataset=` con el dataset ya elegido | `Export.dc.html` no fija cómo se llega con un dataset preseleccionado, pero sin ese enlace el criterio "revenue reporting by partner" quedaría implementado y sin una ruta coherente para alcanzarlo desde donde se menciona |
| Las fechas rápidas de `/admin/reports` ("Last 7 days", "Last month", "Quarter to date") cambian la etiqueta del rango a un texto de muestra, no recalculan un calendario real | No hay reloj de negocio ni motor de fechas detrás; los tres textos son los mismos que citaría un cálculo real para el 14 de septiembre, fijados a mano como en el resto del proyecto sin backend |
| Marcar una columna personal en `/admin/reports` exige escribir un motivo antes de poder descargar | `DESIGN-SYSTEM.md` §6 (Fase 8) fija la regla ("marcar una de esas tres columnas exige un motivo que queda registrado"); se implementa como una validación real del formulario, no solo como el texto que la anuncia |
| "New report" (`/admin/reports/scheduled`) enlaza a `/admin/reports?delivery=schedule` en vez de abrir un formulario propio | El propio artboard lo dice: "every scheduled report is one of the exports on the previous screen, saved with its filters and columns" — no hay una segunda pantalla de creación que inventar |
| "Delivery history" (`/admin/reports/scheduled`) y "Add a filter"/"Select all" cuando incluye columnas personales sin motivo ya puesto no llevan a ningún sitio | Ningún artboard dibuja el historial de entregas completo ni un selector de filtros propio — quedan inertes, igual que "New case" en el Epic 8.1 |
| Solo The Vestry trae el editor completo (fotos, amenities, horario, disponibilidad) y la cola de aprobación; el resto de `ADMIN_LOUNGES` muestra una ficha mínima en `/admin/lounges/[id]` | Es el único ejemplo que dibujan `LoungeEdit.dc.html`/`Approval.dc.html` — mismo criterio que `getMemberProfile` (Story 8.1) y `lounge-profile.ts` (Epic 3) |
| La selección de la barra de acción masiva (`/admin/lounges`) empieza vacía, no con "3 lounges selected" como fija el artboard | El artboard congela un estado intermedio de la interacción; una casilla que arranca marcada sin que nadie la haya pulsado sería el estado real equivocado. Se implementa interactiva desde cero, como el resto de checkboxes del proyecto |
| "Add lounge", "Search lounges", "All cities" y los cuatro botones de la barra de acción masiva ("Update hours", "Add an amenity", "Set closure dates", "Archive") no llevan a ningún sitio | Ningún artboard dibuja el formulario de alta, el panel de filtro por ciudad ni el modal de edición masiva — quedan inertes, igual que el resto de botones sin destino de la Fase 8 |
| Los botones de 44px sin fondo dorado (`Assign to me`, `Escalate`, `Keep the fee and reply`, `Preview as a member`, `Send back to Theo`, `Approve one by one`, `Open the lounge editor`, `Send back with a note`, `Cancel`) llevan `normal-case` | El primitivo `Button` pone mayúsculas siempre (§4 solo la fija para el botón de 52px dorado); los artboards de la Fase 8 no llevan `text-transform:uppercase` en estos botones fantasma — mismo ajuste que ya documentó la Fase 7 para sus botones de fila |
| "Update hours" no sube a primitivo compartido con "Set closure dates" pese a tener la misma geometría | Ambos son `BulkActionButton` sin lógica propia — no hace falta una segunda variante, solo texto distinto |
| `MEMBERSHIP_SUMMARY.memberSince` (Epic 6) pasa de "March 2026" a "November 2025" | `Profile.dc.html` decía a la vez "Member since March 2026" y "Renews November 3, 2026", que no forman un término de doce meses. `DESIGN-SYSTEM.md` §6 (Fase 9) exige elegir uno de los dos al implementar: se conserva la renovación (citada en varios artboards de la Fase 9) y se corrige el alta — mismo criterio que el corazón de favorito que la Fase 7 dejó pendiente para que lo resolviera la Fase 4 |
| `AutoRenewModal` (`AutoRenew.dc.html`) solo se abre para el plan anual de Alexandra | Naomi (mensual) no tiene artboard propio del mismo diálogo con sus cifras — "Manage renewal" y el `Switch` quedan inertes en `/profile/membership?plan=monthly`, igual que otros controles sin destino documentados aquí |
| "Switch to monthly" (`/profile/membership/plans`, cuando el actual es el anual de Alexandra) no abre ningún diálogo | Solo `Upgrade.dc.html` dibuja la confirmación de un cambio de plan, y es mensual→anual (inmediata, con prorrateo). La bajada anual→mensual "espera al final del término" (`DESIGN-SYSTEM.md` §6 Fase 9) sin una pantalla de confirmación propia — el botón queda inerte, con `cursor-default` en vez de fingir una acción |
| `UpgradeConfirmModal` (`Upgrade.dc.html`) se reutiliza en dos puntos de entrada | "Switch to annual" de `/profile/membership?plan=monthly` y de `/profile/membership/plans?plan=monthly` abren el mismo modal — es la misma decisión de negocio (subir a anual desde el mensual de Naomi) alcanzada desde dos pantallas, no dos modales distintos |
| El aviso "View" de los day passes complementarios (`Main.dc.html`), las filas de la tabla de invitaciones, "Send again" en la fila expirada, "Use a day pass", "Update" y "Invoices and receipts" de la card de facturación no llevan a ningún sitio | Ningún artboard de la Fase 9 dibuja su pantalla de destino (un detalle de day pass, el perfil de un amigo referido, un formulario de reenvío, un selector de day pass, un formulario de tarjeta, una lista de facturas) — quedan inertes, igual que el resto de botones sin destino ya documentados en este mapa |
| El botón "Open referrals" del rail de Referrals no aparece en `MonthlyPlan.dc.html` (Naomi) | Ese artboard termina en la caja del código sin invitaciones que resumir — Naomi no ha enviado ninguna ("None sent"). `ReferralSummaryRailCard` lo omite cuando `referralsSentCount` es 0 en vez de mostrar un botón que abriría una pantalla sin nada que enseñar |
| El estado "credited" de `/profile/membership/referrals` (`RewardCredited.dc.html`) se alcanza por `?state=credited`, no por el paso del tiempo | Igual que `?covered=1` o `?state=` en `/my-pass/[reference]`: no hay un evento real (el primer pago de Daniel liquidando) que lo dispare, así que el estado se elige por query param |
| Las dos notificaciones de `RewardCredited.dc.html` solo aparecen cuando `/profile/membership/referrals` se abre con `?state=credited` | Se añaden como `extraItems` a `NotificationBellMenu` (nueva prop) en vez de sumarlas al array global `NOTIFICATIONS` de `lib/notifications.ts` — así no aparecen también en `/notifications` ni en el resto de la app, donde el amigo referido aún no se ha registrado |
| La rejilla de `ReferralInvitationsTable` no usa los píxeles literales de `.rrow` (`minmax(0, 1fr) 148px 196px 128px`, `gap:14px`) | Medido en un navegador real a 1440×900 — el propio `Referrals.dc.html`, sin tocar nada de nuestro código — esas cifras ya exceden el ancho de la columna principal (512px menos el rail de 344px y el subnav de 232px deja ~470px de contenido; 148+196+128+3×14=514 no cabe), así que la columna "Friend" queda a 0px y el resto se solapa: un defecto del propio artboard, no de la implementación. Se reparte con `minmax(96px,1fr) 74px 146px 100px` y `gap:10px` — mismo criterio que ya aplicó `MemberSearch.dc.html` (columnas por fracción en vez de píxeles fijos) |
| El bloque de usuario de la sidebar (`AppShell`) cambia a Naomi Feldstein en `/profile/membership?plan=monthly` y en `/profile/membership/plans?plan=monthly` | `DESIGN-SYSTEM.md` §6 Fase 9 lo pide explícitamente para `MonthlyPlan.dc.html`/`Upgrade.dc.html` ("el bloque de usuario de la sidebar lo dice"). `AppShell`/`AccountShell` ganan una prop opcional `member` (por defecto `SAMPLE_MEMBER`, sin tocar el resto de la app) — la extensión a la sub-vista de Compare plans es la misma generalización ya aceptada para esa pantalla (misma anatomía, solo cambia el dato "actual") |
