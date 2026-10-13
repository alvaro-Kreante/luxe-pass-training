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
| `BulkActionBar` | `bulk-action-bar.tsx` | §4 "Barra de acción masiva" | `count` · `itemLabel` · `onClear`; `BulkActionButton` para cada acción (`destructive` con borde discontinuo) | E8 |
| `MetricTile` (ampliado) | `metric-tile.tsx` | §4 "Tile de métrica (claro)" | nueva prop `tone`: `"dark"` (por defecto, sin tocar E7/E8) · `"light"` cambia el fondo a la Card de contenido (`bg-surface` + borde + sombra) en vez de `--dark-card` — mismo resto de anatomía, el gemelo claro que este mapa ya preveía | E9 |
| `ComparisonTable` | `comparison-table.tsx` | §4 "Tabla comparativa" | `leadingLabel` · `columns` · `rows` (`values` mezcla texto, `boolean` para check dorado/`—`, y `isTotal` para la fila resaltada) | E9 |
| `ConsumptionBar` | `consumption-bar.tsx` | §4 "Barra de consumo" | `used` · `included` · `unitLabel` — solo la barra + la cifra; cada pantalla la envuelve en su propio card (`VisitsCard` en `variant="full"`/`"compact"`) | E9 |
| `TableRow` + `TableRowChevron` | `table-row.tsx` | §4 "Fila de datos (oscura)" — solo el comportamiento | `onOpen` hace clicable toda la fila (`cursor-pointer` + `hover:bg-surface-hover`, 150 ms) salvo los controles internos (checkbox, enlace, botón), que conservan su acción; `selected` (fila destacada o marcada) con su propio hover, distinguible del normal. `TableRowChevron` es la flecha como botón "View <nombre>" (acceso por teclado). La geometría (grid, alto) sigue en cada pantalla. Ticket 002 | E7/E8 |

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
| Split de acceso de partner | `patterns/partner-auth-split.tsx` | Gemelo oscuro del patrón **1** | Las dos mitades oscuras (`AuthSplit` da por hecho un panel derecho claro). Frase de marca por props — cada artboard trae la suya. Usado por `/partner/login` (`Login.dc.html`) y `/partner/welcome` (`SetPassword.dc.html`/`InviteExpired.dc.html`) |
| App shell del admin | `patterns/admin-shell.tsx` | §5 patrón **21** | Gemelo oscuro del patrón 3/15, con su propia nav (Support · Members · Bookings · Lounges · Analytics · Reports) y `NavBadge` en Support/Lounges. El chip "Every action logged" y el refrescar van fijos (la campana se quitó en el ticket 002, ver desviaciones) en la topbar — a diferencia de `PartnerShell`, ninguna pantalla de la Fase 8 los personaliza, así que no viajan por `topbarRight` |
| Cerrar sesión | `patterns/logout-button.tsx` | §5 patrones **3/15/21** (bloque de usuario) | `redirectTo`. Icono `LogOut` (17px, trazo 1.6, `text-fg-subtle`) que llama a `supabase.auth.signOut()` y luego `router.replace(redirectTo)`. Compartido por `AppShell` (`/login`), `PartnerShell` (`/partner/login`) y `AdminShell` (`/admin/login`). Ticket 002 |

### Componentes de epic (`src/components/partner/`)

| Componente | DESIGN-SYSTEM | Notas |
|---|---|---|
| `GuestDetailDrawer` | Drawer oscuro (patrón 18, 472px) | Story 7.1 — ficha del invitado (`GuestDetail.dc.html`): datos de la reserva, contacto, peticiones especiales, contacto de emergencia y las acciones "Mark as arrived"/"No-show" cuando aún está pendiente |
| `NoShowModal` | Modal oscuro (patrón 18, 620px) | Story 7.1 — motivo del no-show (`NoShow.dc.html`), reutiliza `PaymentOptionRow` para las tres alternativas |
| `ExportGuestListPopover` | — | Story 7.1 — exportación a CSV que sigue los filtros de pantalla (`Export.dc.html`), Radix Popover con selección de columnas real |
| `GuestListTable` | §4 Fila de datos (oscura) + §5 patrón 16 | Story 7.1 — la lista del día (`Main.dc.html`). Inline, no primitivo — igual que `RepeatGuests` (Story 7.3) dibuja su propia fila de datos: **la fila de datos oscura sigue sin ser un primitivo compartido**, ver "Pendiente de implementar" |
| `PartnerWelcomeForm` | Tarjeta de 580px sobre `PartnerAuthSplit` | Epic 7 · `SetPassword.dc.html` — datos que escribió el admin (email en solo lectura), foto, contraseña con sus tres reglas |
| `PartnerPhotoPicker` | — | Epic 7 · `SetPassword.dc.html` — círculo de 64px con la previsualización local (data URL) de la foto elegida; solo se sube al crear la cuenta. Inline, no primitivo: el único otro avatar editable (Story 1.1) tiene otra geometría |
| `InviteExpiredCard` | Tarjeta de 460px sobre `PartnerAuthSplit` | Epic 7 · `InviteExpired.dc.html` — enlace de invitación usado, caducado o inventado |
| `TodayDashboard` | — | Story 7.1/7.2 — toda la lógica de `/partner`. Vive fuera de `app/partner/page.tsx` porque un archivo de ruta del App Router solo puede exportar `default`; los tests importan `TodayDashboard` directamente con `liveBookingDelayMs`/`cancellationDelayMs` cortos en vez de fake timers (ver la nota en el propio archivo) |

### Componentes de epic (`src/components/membership/`)

| Componente | DESIGN-SYSTEM | Notas |
|---|---|---|
| `PlanSummaryCard` | Card de contenido | Story 9.1 — "Current plan", compartida por `Main.dc.html` (anual) y `MonthlyPlan.dc.html` (mensual). Desde Epic 9 real, también el estado "Inactive" (sin membresía, sin artboard propio — ver desviaciones) |
| `BenefitsGrid` | Grid 2×3 de "Fila de opción" | Story 9.1 — "What your membership includes" (`Main.dc.html`); el plan anual y la membresía inactiva (AC "Benefits explanation" antes de elegir plan) |
| `VisitsCard` | Usa `ConsumptionBar` | Story 9.1 — "Visits this month"; `variant="full"` (card completa + aviso de day passes complementarios, `Main.dc.html`) y `variant="compact"` (fila corta sin ese aviso, `MonthlyPlan.dc.html`). Desde Epic 9 el aviso solo aparece si hay day passes reales (`complimentaryDayPassesCount`) y "View" lleva a `/profile/membership/referrals` |
| `RenewalRailCard` | Card + `Switch` | Story 9.1 — "Renewal"/"Next charge", compartida. `manageable=false` para el plan mensual (ver desviaciones); `onTurnOn` vuelve a encender la auto-renovación sin diálogo; la fecha del aviso de un mes antes es real (`renewalNoticeDateLabel`) |
| `BillingRailCard` | Card + `CardBrandBadge` | Story 9.1 — "Billing", compartida. La tarjeta es la guardada de verdad en Stripe (por defecto o la primera); sin ninguna, "No card saved yet." |
| `ReferralSummaryRailCard` | Card + `ReferralCode` | Story 9.1/9.2 — "Referrals" del rail; el botón "Open referrals" solo aparece cuando la cuenta ya ha compartido su código (`referral_shares`); el resumen sale de `referrals` reales (`referralsRailSummary`) |
| `UpgradeOfferCard` | Card con borde dorado | Story 9.1 — "Switch to annual" (`MonthlyPlan.dc.html`), solo con plan mensual activo |
| `AutoRenewModal` | Modal (patrón 4) | Story 9.1 — "Turn off auto-renewal?" (`AutoRenew.dc.html`), generaliza fecha/visitas/código a partir de la cuenta que lo abre |
| `UpgradeConfirmModal` | Modal (patrón 4) | Story 9.1 — "Confirm your new plan" (`Upgrade.dc.html`). Backend real: presupuesto de `membership_change_quote`, cobro real de Stripe con tarjeta guardada o `<PaymentElement>` embebido (Checkout Session propia) si no hay ninguna. Sirve a la subida mensual→anual (el artboard) y al alta desde una membresía inactiva (sin línea de crédito, "Pay … and join") — se monta solo mientras está abierto |
| `ReferralInvitationsTable` | "Lista de datos clara" (patrón 25) | Story 9.2 — los amigos que se registraron con el código (`referrals`), columna "Joined" en vez de "Sent" y fila vacía "No one has joined with your code yet." (ver desviaciones). Inline, no primitivo compartido — su rejilla de 4 columnas es propia, igual que `GuestListTable`/`RepeatGuests` con la fila de datos oscura (ver "Pendiente de implementar") |
| `ReferralShareModal` | Calca `ShareDialog` (Story 3.1) | Story 9.2 — "Share your invitation" (`Share.dc.html`). Destinos reales: Messages (`sms:`), WhatsApp (`wa.me`), Email (`mailto:`); Instagram/Nearby/More apps usan la Web Share API (o copian el enlace). `onShare` registra cada uso en `referral_shares`; el enlace es `/join/[code]` de esta misma app (`joinUrlFor`) |
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
| `/lounges/[id]/book` | `Main` (+ `MembershipCovered` cuando la visita la cubre el plan real o un day pass de regalo — `booking_coverage`, Epic 9) | 4.1 |
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
| `/partner/welcome` | `SetPassword.dc.html` (14) + `InviteExpired.dc.html` (15) · email `EmailInvite.dc.html` (13) | Invitación del partner (sin historia propia — pedido del usuario, 29 sept 2026). Pública: la sesión nace al verificar el `token_hash` del enlace |
| `/partner` | `Main` + `GuestDetail` + `NoShow` + `Export` + `LiveUpdate` | 7.1 · 7.2 |
| `/partner/emails/digest` | `EmailDigest.dc.html` | 7.2 |
| `/partner/emails/new-booking` | `EmailNewBooking.dc.html` | 7.2 |
| `/partner/emails/cancellation` | `EmailCancellation.dc.html` | 7.2 |
| `/partner/analytics` | `Analytics.dc.html` | 7.3 |
| `/partner/guests` | `RepeatGuests.dc.html` | 7.3 |
| `/partner/reports` | `Reports.dc.html` | 7.3 |
| `/admin/login` | — (sin artboard propio, reutiliza el layout de `/partner/login`) | 8.1 |
| `/admin/support` | `Main.dc.html` | 8.1 |
| `/admin/support/[id]` | `CaseDetail` + `Refund` | 8.1 |
| `/admin/members` | `MemberSearch.dc.html` | 8.1 |
| `/admin/members/[id]` | `MemberProfile` + `BookingOverride` | 8.1 |
| `/admin/bookings` | `Bookings` (29) + `BookingOverride` | 8.4 |
| `/admin/analytics` | `Analytics.dc.html` | 8.2 |
| `/admin/analytics/demand` | `Popularity.dc.html` | 8.2 |
| `/admin/reports` | `Export.dc.html` | 8.2 |
| `/admin/reports/scheduled` | `ScheduledReports.dc.html` | 8.2 |
| `/admin/partners` | Fase 10 · `Partners.dc.html` (1) | 10.2 |
| `/admin/partners/new` | Fase 10 · `PartnerNew.dc.html` (2) | 10.3 |
| `/admin/partners/[id]` | Fase 10 · `PartnerDetail.dc.html` (3) + `PartnerUserEdit.dc.html` (4) | 10.3 |
| `/admin/lounges` | `Lounges.dc.html` (11) + `LoungeFilterCity` (27) + `LoungeFilterApplied` (28) + Fase 10 · `LoungesWithPartner` (9) | 8.3, 10.5 |
| `/admin/lounges/[id]` | `LoungeLive.dc.html` (17, live) + `LoungeEditConfirm` (18) + `PartnerAdd`/`PartnerSuspend`/`PartnerDelete` (20–22) + `LoungePhotoViewer` (26) · `LoungeDraftPartners.dc.html` (19, borrador) + `LoungePartnersMain` (23) · avisos `LoungeDraftSaved`/`LoungePublished` (24–25) — sustituyen a `LoungeEdit` (12) | 8.3 |
| `/admin/lounges/new` | `LoungeDraftPartners.dc.html` (19) + `LoungePartnersMain` (23) — sustituyen a `LoungeNew`/`LoungeNewPartner` — + `PhotoCaption.dc.html` + avisos 24–25 | 8.3 |
| `/profile/membership` | `Main` (plan anual) + `MonthlyPlan` (plan mensual) + `AutoRenew` + `Upgrade` — el plan real decide cuál; sin membresía, estado "Inactive" sin artboard propio | 9.1 |
| `/profile/membership/plans` | `Plans.dc.html` (el plan "actual" es el de `memberships`; sin membresía, "Choose …" en las dos cards) | 9.1 |
| `/profile/membership/referrals` | `Referrals` + `RewardCredited` (cuando un premio se acreditó en las últimas 48 h) + `Share` + `Terms` | 9.2 |
| `/join/[code]` | Sin artboard — redirige a `/signup?ref=CODE` (decisión de producto, 23 sept 2026) | 9.2 |

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
| `lounges/lounge-thumb.tsx` | Miniatura de lounge: su foto principal (`mainImageUrl`, la `lounge_images` de menor `position`) en la lista, el callout del mapa y las tarjetas de Explore. Sin foto (datos de muestra del mock) queda el radial de marca, con el tono sacado del id. `HeroPhotoSurface` (carrusel y galería de la ficha) pinta igual la `url` real de cada foto |
| `explore/city-map.tsx` · `sun-mark.tsx` · `use-map-load-status.ts` | Story 2.1 — Google Maps real (`@vis.gl/react-google-maps`), sus markers, zoom/pan y el timeout de carga |
| `explore/location-dialogs.tsx` | Story 2.1 — permiso de ubicación y entrada manual |
| `explore/result-card.tsx` · `lounge-callout.tsx` · `amenity-icon.tsx` | Story 2.1 — la lista del panel y el detalle sobre el mapa |
| `explore/filter-drawer.tsx` · `availability-calendar.tsx` | Story 2.2 — amenities, distancia, calendario y franja |
| `explore/no-results.tsx` | Story 2.2 — estado vacío con las sugerencias que devuelven resultados |
| `lib/filters.ts` | Story 2.2 — el pipeline que comparten mapa y lista: filtros, chips activos y sugerencias |
| `explore/lounge-list.tsx` · `lounge-list-item.tsx` | Story 2.3 — la lista, su scroll infinito y su estado de carga |
| `explore/use-paged-count.ts` | Story 2.1/2.3 — scroll infinito por tandas de 12, compartido por la lista y el panel del mapa |
| `explore/use-location-options.ts` | Story 2.1 — sugerencias de la entrada manual: Google Places (sin países ni regiones, `lib/place-search.ts`), con las ciudades de `lib/location.ts` como respaldo si Places no carga |
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
| `lounges/lounge-schedule-sections.tsx` | Story 10.9 — "Seasonal hours" (tarjeta por temporada con In effect / Upcoming y `weekSummary`) y "Special closures" (un `ClosureBanner` por cierre) en la ficha del miembro (SeasonalHours.dc.html). Sin temporadas ni cierres no se pinta nada (NoSchedule.dc.html). El cierre que cubre hoy sube encima de las fotos y la `AvailabilityCard` pasa a "Closed today" (ClosedToday.dc.html). `OperatingHours` recibe las filas ya resueltas por `weekHoursFrom` (cierre → temporada → semana habitual) y, con temporada en curso, su nombre y la nota de vuelta al horario habitual |
| `lounges/rating-summary.tsx` · `review-card.tsx` | Story 3.1 — el resumen de valoración (rating/recuento reales, desglose y reseñas de muestra) |
| `lib/booking.ts` | Story 4.1 / 4.2 — date picker mensual, slots de llegada, precio (day pass vs. cubierto por membresía), wrappers de `confirmBooking`/`joinWaitlist` (RPC reales) y referencias de reserva reales (`bookingReferenceFromId`) |
| `lib/calendar-export.ts` | Story 4.3 — `.ics` real y URL real de Google Calendar, con dirección y referencia de reserva reales (`LoungeProfile` + `bookingReferenceFromId`) — capacidades del navegador, sin tocar Supabase |
| `booking/booking-context.tsx` | Borrador de reserva compartido por los 3 pasos y por `/book/confirmed`+`/book/receipt` (Context, sin persistencia); también la cuenta atrás compartida "Slot held for M:SS" |
| `booking/visit-details-form.tsx` · `visit-summary-rail.tsx` | Story 4.1 — paso 1 "Visit details" (`Main.dc.html`): date picker, slots, admisión fija y peticiones especiales |
| `booking/payment-method-form.tsx` · `payment-summary-rail.tsx` | Story 4.2 — paso 2 "Payment method" (`Payment.dc.html` / `MembershipCovered.dc.html`) |
| `booking/booking-summary-card.tsx` · `terms-policy-card.tsx` · `confirm-payment-rail.tsx` | Story 4.1 — paso 3 "Review and confirm" (`Summary.dc.html`): resumen editable, política de cancelación y la confirmación de un toque |
| `booking/waitlist-modal.tsx` | Story 4.1 — "if full, option to be on the waitlist" (`Waitlist.dc.html`) |
| `booking/payment-error-modal.tsx` | Story 4.1 — error handling + retry del chequeo final (`PaymentError.dc.html`) |
| `booking/confirmed-visit-card.tsx` | Story 4.1 — detalle de la visita en la confirmación inmediata (`Confirmed.dc.html`) |
| `booking/add-to-calendar-modal.tsx` | Story 4.3 — "Add to Calendar" (`Calendar.dc.html`), conecta con `lib/calendar-export.ts` |
| `booking/slot-hold-badge.tsx` | Chip "Slot held for M:SS" de los pasos 2 y 3 |
| `lib/passes.ts` | Story 5.1 / 5.3 — backend real (`fetchDigitalPass`/`fetchUpcomingBookings`/`fetchPastBookings`, ver "Backend real — Epic 5" más abajo); `AINSWORTH_PASS` se queda como fixture pura para tests de componente |
| `lib/reception.ts` | Story 5.2 — backend real (`lookupReceptionBooking`/`checkInReceptionBooking`/`reportReceptionNoShow`/`fetchReceptionTodaySummary`, RPC "de kiosco") — ver "Backend real — Epic 5" |
| `passes/digital-pass-card.tsx` | Story 5.1 — la tarjeta del pase (patrón 11) en sus cuatro estados |
| `app/my-pass/page.tsx` | Story 6.1 — pestañas Upcoming/Past (`Main.dc.html` / `History.dc.html`); el listado ya es real (Epic 5), cancelar con la política de 24 h sigue sin conectar (Story 6.1) |
| `app/my-pass/[reference]/page.tsx` | Story 5.1 — el pase digital real y su expiración automática, alcanzada por `?state=` (sigue sin cron que la dispare sola, ver "Backend real — Epic 5") |
| `app/my-pass/[reference]/reminder/page.tsx` | Story 5.3 — el email de recordatorio (`Reminder.dc.html`) sobre una reserva real; el envío real ya lo manda `send-booking-reminder` vía `pg_cron` |
| `app/reception/page.tsx` | Story 5.2 — la consola de recepción (patrón 12): búsqueda real por LP#, contacto de emergencia y check-in contra Supabase |
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
| `app/partner/welcome/page.tsx` | Invitación del partner: verifica el token y compone `PartnerWelcomeForm` o `InviteExpiredCard` |
| `lib/partner-invite.ts` | `acceptPartnerInvite` (verifyOtp `invite`), `completePartnerInvite` (datos, foto y contraseña), `passwordRules` |
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
| `app/admin/bookings/page.tsx` + `lib/admin-bookings.ts` | Story 8.4 — reservas de un día de toda la red: fecha, lounge, estado y búsqueda, agrupadas por hora de llegada; abre `BookingOverrideDrawer` (`Bookings.dc.html`) |
| `components/admin/lounge-combobox.tsx` | Story 8.4 — filtro de lounge en el que se escribe (combobox + listbox, mismas filas que `CityFilterPopover`); `null` = "All lounges" |
| `components/patterns/day-stepper.tsx` | ‹ fecha › de `Bookings.dc.html`: la fecha abre el `MonthCalendar` de §4 en un popover (todos los días elegibles, "Back to today"). Lo usan `/admin/bookings` (8.4) y `/partner` (7.1, "filter guests by date") |
| `partner/today-dashboard.tsx` — fecha elegible | Story 7.1 "Search/filter guests by name or date": `DayStepper` en la fila de los chips; otro día que no es hoy es de solo lectura (`readOnly` en `GuestListTable`/`GuestDetailDrawer`, casilla sin acción en `AttendanceCheckbox`). Sin artboard: `Main.dc.html` solo dibuja hoy |
| `lib/admin-analytics.ts` | Story 8.2 — analítica de red, popularidad, datasets de export y reportes programados; los importes cuadran con `lib/partner.ts` (The Ainsworth: 187 reservas, $8,616.50) |
| `app/admin/analytics/page.tsx` | Story 8.2 — "How the network is doing": reservas, no-shows, miembros e ingresos (`Analytics.dc.html`) |
| `app/admin/analytics/demand/page.tsx` | Story 8.2 — "Where the demand is": lounges, amenities y ciudades más demandados (`Popularity.dc.html`) |
| `app/admin/reports/page.tsx` | Story 8.2 — "Export data": dataset, filtros, columnas anonimizadas por defecto y entrega (`Export.dc.html`) |
| `app/admin/reports/scheduled/page.tsx` | Story 8.2 — "Reports that send themselves": reportes automáticos y su historial de entrega (`ScheduledReports.dc.html`) |
| `lib/admin-content.ts` | Story 8.3 — catálogo de 13 lounges (`ADMIN_LOUNGES`), los 3 cambios pendientes literales de The Vestry y su comparación live/propuesto |
| `admin/partner-status-chip.tsx` | Story 10.2 — `PartnerStatusChip`: Active / Draft / Suspended sobre `StatusChip`, mismo mapa que `LoungeStatusChip` |
| `admin/status-filter.tsx` | `StatusFilter`, el filtro rápido de estado de `/admin/lounges` (11) y `/admin/partners` (Fase 10 · 1): una pulsación filtra, otra lo quita. Extraído de la página de lounges |
| `lib/admin-partners.ts` | Epic 10 — `listAdminPartners` (10.2); `getAdminPartner`, `createPartnerDraft` (con sus primeros usuarios, en una transacción), `updatePartner`, `addPartnerMember`, `updatePartnerMember`, `setPartnerRepresentative`, `deletePartnerMember` (10.3); `activatePartner`, `suspendPartner`/`reactivatePartner`, `suspendPartnerMember`/`reactivatePartnerMember`, `resendPartnerMemberInvite`, `suspendLounge`/`reactivateLounge` (10.4). Lo que toca cuentas de Auth va por la Edge Function `admin-partners`; el resto, por las RPC de `supabase/schemas/admin_partners.sql` |
| `admin/partner-header.tsx` | Story 10.3 — `PartnerHeader` (iniciales, nombre, status, acciones) y `PartnerBreadcrumb`, misma anatomía que la cabecera de lounge (17) |
| `admin/partner-details-card.tsx` | Story 10.3 — "Partner details" (2, 3): nombre, contacto y edificio central en texto, sin mapa. Exporta `ADMIN_CARD`/`ADMIN_EYEBROW` |
| `admin/partner-user-fields.tsx` | Story 10.3 — los cuatro campos de un usuario partner en fila (lógica de 23); `emailLocked` para el lápiz (4) |
| `admin/partner-users-card.tsx` | Story 10.3 — tabla de usuarios (3, 4): lápiz en la fila, "Make representative", borrar con el aviso del representante, "Add user". Story 10.4 (6): suspender/reactivar, "Resend invitation", y confirmación al suspender o borrar a alguien con cuenta |
| `admin/partner-lounges-card.tsx` | Story 10.3 — los lounges del partner con su status y "Open lounge" a `/admin/lounges/[id]`. Story 10.12 — buscador por nombre, dirección y ciudad (sin mayúsculas ni tildes) con el patrón de input de las listas de admin (`Lounges.dc.html`). Story 10.11 — PartnerBulkSelect (28): casilla por lounge, "Select all shown", columna Checklist y `BulkActionBar` con Change status · Set hours · Add season · Add closure; la selección sobrevive a la búsqueda |
| `admin/partner-bulk-dialogs.tsx` | Story 10.11 — `PartnerBulkFlow`: modal de cada acción (PartnerBulkStatus 29, PartnerBulkHours 30, PartnerBulkSeason 31, PartnerBulkClosure 32) → confirmación (33) → resultado (34). Reglas en `src/lib/partner-bulk.ts` |
| `ui/bulk-action-bar.tsx` (ampliado) | Story 10.11 — prop `note` ("1 hidden by the search") y la barra pasa a envolver en dos líneas cuando no caben las acciones |
| `admin/weekly-hours-editor.tsx` | Story 8.3 / 10.9 — el editor "Operating hours" (switch y desde/hasta por día) sacado de `lounge-draft-form.tsx` para reutilizarlo en el horario de cada temporada (`SeasonalEdit.dc.html`) |
| `admin/lounge-schedule.tsx` | Story 10.9 — "Seasonal hours" y "Special closures" (SeasonalEmpty 17 … SeasonalFilled 22): listas, editores, aviso de reservas confirmadas con `ConfirmModal`, `NextDaysCard` ("Next 7 days") y `ScheduleOrderCard` ("Which hours a day uses"). En la vista live y en el borrador |
| `admin/photo-crop-dialog.tsx` | Story 10.10 — editor de fotos (PhotoCropOpen 23, PhotoCropSize 24, PhotoRecrop 26): `react-easy-crop` con marco fijo 3 : 2, zoom, y tamaño final Large/Standard/Light con peso estimado (`src/lib/photo-crop.ts`). Modal oscuro de la familia de `PhotoCaptionDialog` |
| `admin/partner-activation-checklist.tsx` | Story 10.3 — "Ready to activate" y la nota del rail (2, 3), con el botón de activar como `children`; Story 10.4 la reutiliza para "When you reactivate" (8) |
| `admin/partner-picker.tsx` | Story 10.5 — `PartnerPicker` (Fase 10 · 12): busca y elige el partner del borrador (también los draft; no los suspendidos), con el aviso "Not listed? Create the partner first" |
| `admin/lounge-partner-card.tsx` | Story 10.5 — `LoungePartnerCard` (Fase 10 · 10): el partner del lounge en solo lectura, con representante y "Open partner" |
| `admin/status-select.tsx` | Ajuste del 2 oct 2026 — `StatusSelect`: el status de un lounge (Live / Draft / Suspended) o de un partner (Draft / Active / Suspended) en un desplegable de la cabecera, con las opciones que no aplican deshabilitadas y su motivo. Sustituye a los botones sueltos (Suspend/Reactivate lounge, Activate/Suspend/Reactivate partner); cada opción abre la misma confirmación que antes |
| `admin/confirm-modal.tsx` | Story 10.4 — `ConfirmModal`, la confirmación con la geometría de PartnerSuspend (Fase 8 · 21): activar (5), suspender partner (7), suspender/borrar usuario y suspender lounge (11) |
| `admin/lounge-status-chip.tsx` | Story 8.3 — `LoungeStatusChip`, el mapa Live/Draft/N to approve sobre `StatusChip` |
| `admin/city-filter-popover.tsx` | Story 8.3 — `CityFilterPopover`, el botón de ciudad de `/admin/lounges` con su popover de Radix: busca solo entre las ciudades que ya tienen lounge (artboards 27–28). Los filtros Live/Draft no son componente propio: un `StatusChip` (`available`+`outlined` cuando está pulsado) dentro de un botón `aria-pressed` |
| `app/admin/lounges/page.tsx` | Story 8.3 — "Add/edit/remove lounge profiles" y "Bulk update capabilities": la lista con selección y barra de acción masiva (`Lounges.dc.html`). Story 10.5 (Fase 10 · 9): columna Partner, búsqueda por partner y filtro Suspended |
| `app/admin/lounges/[id]/page.tsx` | Story 8.3 — detalle de lounge: compone `LoungeLiveView` (live, bloqueado) o `LoungeDraftForm` (borrador) |
| `components/admin/lounge-live-view.tsx` | `LoungeLive.dc.html` (17) + popup `LoungeEditConfirm` (18): todo en solo lectura, ubicación con mapa (`LoungeLocationPreview`), fotos reales. Story 10.4: "Suspend lounge" (Fase 10 · 11) y, suspendido, solo "Reactivate lounge" (vuelve a draft) |
| `components/admin/lounge-saved-notice.tsx` | `LoungeDraftSaved.dc.html` (24) y `LoungePublished.dc.html` (25): aviso informativo tras guardar o publicar, sobre el patrón `Modal` centrado; exporta `ModalPoint`, los puntos de los popups del lounge |
| `components/admin/photo-viewer.tsx` | `LoungePhotoViewer.dc.html` (26): visor a pantalla completa con flechas, teclado y miniaturas (Radix Dialog) |
| `lib/membership.ts` | Story 9.1 — backend real desde Epic 9 (ver "Backend real — Epic 9"): los dos planes ($249/mes, $2,400/año), `fetchMembership`/`fetchMembershipAccount`/`fetchMembershipQuote`/`chargeMembershipWithSavedCard`/`createMembershipCheckoutSession`/`setMembershipAutoRenew`/`fetchVisitsThisMonth`, los 6 beneficios y la tabla comparativa. `ALEXANDRA_MEMBERSHIP`/`NAOMI_MEMBERSHIP` quedan como fixtures de componente, sin tocar Supabase |
| `lib/referrals.ts` | Story 9.2 — backend real desde Epic 9: `ensureReferralCode`, `fetchReferralOverview` (invitaciones, stats y day passes derivados de `referrals`/`referral_shares`/`birth_month`), `recordReferralShare`, `normalizeReferralCode` (para `/join/[code]`) y los términos del programa (`Terms.dc.html`, siguen siendo contenido fijo) |
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
| `supabase/schemas/storage.sql` + bucket `profile-photos` (`config.toml`) | Foto de perfil opcional, un archivo por usuario bajo `{auth.uid()}/`. Bucket privado: `profiles.photo_url` guarda la ruta del objeto y se muestra con URL firmada (`lib/profile-photo.ts`), en `/onboarding/basics` (vista previa), la sidebar del App shell y `/profile` |
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
- **El filtro de disponibilidad de 2.2 ("Calendar view") es una aproximación, no la agenda real de Epic 3.** `filters.date`/`filters.band` siguen filtrando por `bands`/`closed_weekdays` — ahora columnas reales de `lounges`, ya no del mock — no la disponibilidad en vivo con capacidad, reservas y cierres especiales (`lounge_availability_range`, Epic 3, calculada lounge a lounge — desproporcionada para un filtro de catálogo).
- **`rating`/`open_now`/`slots_today` son columnas reales pero estáticas**, sembradas 1:1 desde el mock — no agregadas (rating) ni en vivo (disponibilidad). Maduran cuando Epic 3/4 aporten su propio modelo (rating agregado de reseñas, disponibilidad real de bookings).
- **Mini-mapa embebido en el perfil de lounge (Story 3.1) queda fuera de esta historia**: `/lounges/[id]` sigue en `lib/lounges.ts` (mock de Epic 3-9, sin lat/lng reales) y no tiene artboard con un hueco de mapa — ver `docs/PENDIENTES.md` nueva entrada §2.9.
- **Solo lectura**: sin policies de insert/update/delete — el catálogo se siembra por migración hasta que Epic 8.3 diseñe su propio flujo de admin sobre `lounges` (ya anticipado en `docs/DATA-MODEL-MAP.md`).
- **/explore no filtra por ciudad**: muestra todo el catálogo ordenado por distancia al origen (GPS o ciudad elegida), también lounges de otros países, en tandas de 12 por scroll. La respuesta al permiso de ubicación se recuerda en `user_metadata.explore_location` atada al `session_id` del JWT (`lib/explore-location.ts`): se pregunta una vez por sesión.
- **Enlace "Change" junto a "Sorted by distance · …"** (panel del mapa y cabecera de la vista de lista): no está en Main.dc.html ni en ListView.dc.html; abre el mismo ManualLocation.dc.html para cambiar de ubicación sin cerrar sesión. Confirmado con el cliente-equipo (2 oct 2026).
- **"N slots today" / "Full" en /explore es disponibilidad real**: `lounge_seats_on(p_date)` suma las plazas libres de las franjas abiertas de cada lounge en `TODAY` (temporadas, cierres y reservas incluidos). La columna `lounges.slots_today` ya no se lee en /explore; `open_now` sigue siendo instantánea.
- **La búsqueda por texto va contra Supabase** (`searchLounges` en `lib/lounge-directory.ts`: `ilike` sobre nombre, barrio y ciudad + amenities por su nombre visible), con debounce de 250 ms; el resto de filtros sigue aplicándose en TS sobre ese resultado.
- **ManualLocation.dc.html busca con Google Places**: las filas muestran nombre y dirección secundaria de Google, sin el conteo de lounges (solo el respaldo local lo trae). "Recent" es la última ubicación escrita a mano (`user_metadata.explore_recent_place`), no Miami fijo; si no hay ninguna, la sección no aparece.
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
| `supabase/schemas/lounge_availability.sql` | **Sin tabla desde el 25 sept 2026** (la tabla `lounge_availability`, seed de 18 semanas, se eliminó — `docs/PENDIENTES.md` §2.10). RPC `lounge_availability_range(p_lounge_id, p_from, p_to)` (`SECURITY DEFINER`, `EXECUTE` solo `authenticated`, rango máx. 92 días): plazas en vivo = `lounges.capacity` (aforo **por franja**) − reservas `confirmed`/`in_progress`/`completed` (`booking_occupies_seat`). Solo devuelve fila si la franja abre: banda en `lounges.bands` (`late` cuelga de `evening`), día fuera de `closed_weekdays` y sin `lounge_closures`. Helpers internos `lounge_band_is_open`/`lounge_seats_left` sin `EXECUTE` para `anon`/`authenticated` (segunda migración `..._live_lounge_availability_revoke.sql`, mismo patrón que `epic9_booking_coverage_revoke`). Índice `bookings_lounge_date_band_idx` |
| `supabase/schemas/lounge_closures.sql` | Tabla `lounge_closures` (nace en Epic 3, no anticipada por nombre en `DATA-MODEL-MAP.md` — se documentó ahí como parte de "disponibilidad") — cierres por festivo con `reopens_label`/`posted_on`, separada de la disponibilidad porque es un evento por rango de fechas, no una propiedad por celda |
| `supabase/migrations/..._seed_lounge_profiles_story_3.sql` | Seed escrito a mano, reproduciendo la misma fórmula determinista que ya usaba el mock (`hashOf(id\|date\|band) % 21`) para no inventar números nuevos. Sus filas de disponibilidad (`mondayOf(TODAY) - 1 semana` a `TODAY + 16 semanas`) desaparecen con la tabla en `..._live_lounge_availability.sql` (25 sept 2026): "Full"/"Filling fast" ya solo salen de reservas reales (aforo sembrado: 40 por franja) |
| `lib/lounge-profile.ts` | `fetchLoungeProfile`/`fetchLoungeImages`/`fetchWeeklyAvailability`/`fetchClosuresForWeek`/`fetchNextAvailableSlot` (todas contra Supabase); `operatingHoursFor` pasa a recibir `weeklyHours` en vez de leer una constante compartida |
| `app/lounges/[id]/page.tsx`, `.../availability/page.tsx`, `.../reviews/page.tsx` | Las tres pasan a `RequireSession` (mismo patrón que `/explore`) y a resolver el lounge con `fetchLoungeProfile` en vez de `LOUNGES.find(...)` de `lib/lounges.ts` (ese archivo sigue intacto: lo siguen usando Home y Epic 5-9, sin conectar — Epic 4 se conectó a su vez, ver más abajo) |

Desviaciones conscientes de esta parte:

- **No hay tabla `reviews`.** Ninguna historia permite dejar una reseña
  (ver `docs/DATA-MODEL-MAP.md`): `rating`/`review_count` son columnas reales
  agregadas, pero el contenido de cada reseña, el desglose por estrellas y
  "what members mention" (`reviewsFor`/`ratingBreakdownFor`/`mentionsFor`)
  siguen siendo datos de muestra — mismo criterio que Camille Duforest
  (Epic 8) o LP-842193 (Epic 5).
- **`lib/lounge-profile.ts` sigue siendo parcialmente híbrido, ahora a
  propósito por una razón distinta.** Al conectar Epic 4 (ver más abajo) se
  retiraron `contactFor`/`LoungeContact`/`CONTACT_OVERRIDES` (ya no las usa
  nadie: las pantallas de `/lounges/[id]/book/*` leen `lounge.address`/`phone`
  reales). `closuresFor`/`closureCovering`/`weeklyAvailability`/`CLOSURES`
  **sí se quedan** — no por Epic 4, sino porque
  `app/lounges/[id]/availability/page.test.tsx` (Story 3.2) las usa como
  predictor offline de la fórmula determinista que sembró la migración.
- **Horizonte de disponibilidad finito (18 semanas), no infinito como el hash del mock.** Sembrar una tabla real exige un rango — se eligió uno que cubre la navegación semanal, `nextAvailableSlot` (3 semanas) y el cierre de Thanksgiving que ya citan artboards y tests. Navegar mucho más allá de ~4 meses desde TODAY no tiene filas y se trataría como sin datos (no ocurre en ningún flujo de la app hoy).
- **Se retiró el chip de distancia ("0.3 mi away") del perfil.** No está en los Acceptance Criteria de la Story 3.1, y añadir geolocalización real a esta pantalla (como en `/explore`) para un dato puramente decorativo es desproporcionado — mismo criterio que otras simplificaciones ya aceptadas (p. ej. "Remember me" en Epic 1).
- **`WeeklyCalendar` pasó de calcular sus celdas internamente a recibirlas por prop (`cells`).** El mock la dejaba recalcular `weeklyAvailability(lounge, weekStart)` por su cuenta (duplicado con el cálculo que ya hacía la página); con datos reales y async eso ya no es posible sin un estado de carga propio dentro del componente — se centralizó en la página, que ya tenía sus propias razones para calcular `cells`.
- **`FreshnessNote` pasó de simular un contador local a recibir `lastUpdatedAt` real.** El refresco cada 5 minutos (AC de la Story 3.2) vive en la página (`setInterval` + refetch), no en el componente — que solo recalcula el texto "hace N min" cada 15s a partir de ese timestamp.
- **La 4ª restricción de reserva ("Free cancellation up to 4 hours before") se añadió al sembrar.** El mock solo tenía 3; `Availability.dc.html` dibuja 4 — se cierra el gap al conectar el dato real en vez de arrastrarlo.

---

## Backend real (Supabase local) — Epic 4 (Story 4.1 y 4.2)

Cuarto epic con backend real — Story 4.1 (Seamless Booking Flow) y Story 4.2
(Payment Processing, Stripe real en modo test, ver `CLAUDE.md`
§Procesamiento de pagos) ya conectadas; 4.3 (Calendar Integration) ya era
real desde el mockup (genera `.ics`/URL de Google Calendar de verdad, no
toca Supabase). Nacen las tablas `bookings` y `payments` — ver
`docs/DATA-MODEL-MAP.md`.

| Módulo | Qué resuelve |
|---|---|
| `supabase/schemas/bookings.sql` | Tabla `bookings` (nace en Epic 4) — `member_id`, `lounge_id`, `date`, `band`, `slot_time`, `special_requests`, `status` (dominio completo `confirmed/in_progress/completed/cancelled/waitlisted` desde ya, aunque 4.1 solo produce los dos primeros). RLS: solo `select` de las propias filas — sin policies de insert/update, la tabla se toca solo vía las dos funciones de abajo |
| `confirm_booking` (RPC, `SECURITY DEFINER`) | AC "Final availability check before one-tap confirmation". Serializa las confirmaciones de la misma franja con `pg_advisory_xact_lock` (lounge\|fecha\|franja), cuenta las plazas en vivo (`lounge_seats_left`) y crea la reserva `'confirmed'` solo si queda plaza real en ese instante; si no, no inserta nada y devuelve cero filas. Una franja que el lounge no abre lanza `No availability window` |
| `join_waitlist` (RPC, `SECURITY DEFINER`) | AC "If full, option to be on the waitlist". Solo se llama cuando el miembro elige explícitamente "Join the waitlist" tras un `confirm_booking` vacío — inserta `'waitlisted'`, que no ocupa plaza (`booking_occupies_seat`; la waitlist no reserva inventario real) |
| `lib/lounge-profile.ts` | `fetchAvailability(supabase, lounge, startIso, endIso)` — generaliza `fetchWeeklyAvailability` (Epic 3, que ahora es el caso particular de 7 días) a un rango arbitrario, para traer un mes completo de una vez |
| `lib/booking.ts` | `monthCalendar`/`monthDayStatus`/`slotsFor` dejan de calcular sobre el mock (`Lounge` + hash): ahora son puras y agregan `AvailabilityCell[]` ya resueltas por `fetchAvailability`. `confirmBooking`/`joinWaitlist` llaman a los RPC de arriba. `bookingReferenceFromId(id)` sustituye a `bookingReference(loungeId, date, time)` para la pantalla de confirmación (la referencia ahora sale del `id` real de la reserva, no de un hash de lounge/fecha/hora) — `errorReference` se queda como estaba, la usa solo el camino de pago simulado, que no tiene reserva real todavía |
| `components/booking/booking-context.tsx` | `lounge` pasa de `Lounge` (mock) a `LoungeProfile` (real); `BookingDraft` suma `bookingId`/`bookingStatus`, rellenados tras `confirm_booking`/`join_waitlist` |
| `app/lounges/[id]/book/layout.tsx` | Pasa a `RequireSession` + `fetchLoungeProfile`, mismo patrón que `/lounges/[id]/availability` (Epic 3), en vez de `LOUNGES.find(...)` |
| `components/booking/visit-details-form.tsx` | El date picker mensual pasa a pedir `fetchAvailability` para el mes visible en un `useEffect`, en vez de calcular las celdas en el momento |
| `app/lounges/[id]/book/summary/page.tsx` | `handleConfirm` llama a `confirmBooking` real; una respuesta vacía abre `Waitlist.dc.html`, que ahora llama a `joinWaitlist` de verdad al elegir "Join the waitlist" |
| `components/patterns/step-flow-rail.tsx`, `components/booking/{add-to-calendar-modal,waitlist-modal}.tsx`, `lib/calendar-export.ts` | Tipo de `lounge` ampliado de `Lounge` a `LoungeProfile` (o a un tipo estructural mínimo `{id, name}` en `calendar-export.ts`, que solo necesita el nombre) |
| `supabase/schemas/payments.sql` | Tabla `payments` (nace en Epic 4) — `member_id`, `booking_id` (nullable: la fila de pago se crea antes que la reserva), `stripe_checkout_session_id`, `stripe_payment_intent_id`, `amount_cents`, `currency`, `status` (`pending/succeeded/failed`). RLS: solo `select` de las propias filas — sin policies de insert/update de cliente, solo la escriben las Edge Functions/el webhook (rol de servicio) |
| `supabase/schemas/profiles.sql` | Columna `stripe_customer_id` (Epic 1, cruce con Epic 4: el Customer de Stripe es 1:1 con el miembro, no con la reserva — ver `docs/DATA-MODEL-MAP.md`) |
| `supabase/functions/stripe-create-checkout-session`, `stripe-charge-saved-method`, `stripe-payment-methods`, `stripe-webhook` | Edge Functions (Deno) — crean la Checkout Session (tarjeta nueva), cobran directo con `PaymentIntent` (tarjeta guardada), listan/eliminan métodos guardados, y procesan el webhook de Stripe (única fuente de verdad del `status` real de `payments`). Ninguna vive en `src/app/api/` — mismo patrón que `send-email` de Epic 1 |
| `lib/stripe-client.ts`, `lib/stripe-payments.ts` | `getStripe()` (singleton `loadStripe()`), y los wrappers `createCheckoutSession`/`chargeSavedPaymentMethod`/`listSavedPaymentMethods`/`removeSavedPaymentMethod` sobre `supabase.functions.invoke` |
| `components/booking/stripe-checkout-bridge.tsx` | **Nuevo componente**, vive en `app/lounges/[id]/book/layout.tsx` por encima de los tres pasos — monta `<CheckoutElementsProvider>`/`<PaymentElement>` de Stripe una sola vez para todo el flujo. Ver desviación de abajo sobre por qué no es un simple componente de paso 2 |
| `components/booking/payment-method-form.tsx` | `PayableBody` trae las tarjetas guardadas reales, dispara `createCheckoutSession` al elegir "Use a new card", y reserva un hueco vacío (`<div ref={setPaymentElementHost}>`) donde el bridge posiciona el `<PaymentElement>` real — no lo renderiza directamente (ver desviación) |
| `app/lounges/[id]/book/summary/page.tsx` | `handleConfirm` cobra primero (`checkout.confirm()` para tarjeta nueva vía `useCheckoutElements()`, o `chargeSavedPaymentMethod` para tarjeta guardada) y solo si el cobro tiene éxito llama a `confirmBooking` — igual que la Story 4.1 ya hacía con el chequeo simulado, ahora con el cargo real |
| `components/booking/payment-error-modal.tsx` | El mensaje de error deja de ser copy fijo ("tarjeta rechazada") y pasa a mostrar el `message` real que devuelve Stripe |
| `components/ui/card-brand-badge.tsx` | `brand` amplía de `"visa"\|"mastercard"` a `string` — una tarjeta de prueba real puede volver con cualquier marca que Stripe reconozca (Amex, Discover…), no solo las dos del mock |
| `components/booking/stripe-checkout-bridge.tsx`, `booking-context.tsx` | El contenedor `position: fixed` del `<PaymentElement>` ya no fuerza su propia altura a la del hueco (eso desbordaba el formulario real por encima del checkbox "Save this card" cuando la pestaña "Card" muestra más campos de los que caben en 360px) — ahora mide su contenido real con un segundo `ResizeObserver` y publica ese alto en `paymentElementHeight` (contexto), que `payment-method-form.tsx` aplica como `min-height` de su hueco para que el layout normal reserve el espacio real |
| `components/booking/stripe-checkout-bridge.tsx`, `booking-context.tsx`, `payment-method-form.tsx`, `summary/page.tsx` | Ticket 001 — el provider de Stripe es **hermano** de `children` (antes los envolvía al llegar la sesión, y ese cambio de padre remontaba `/book/payment`). La sesión la pide `requestCheckoutSession` del contexto, idempotente por borrador + "Save this card"; `summary` confirma con `checkoutElementsRef` (lo publica el bridge desde dentro del provider). El `rect` va atado al host que lo midió, se recalcula también ante cambios de `document.body`, y el `<PaymentElement>` no se monta hasta tener sitio real |
| `supabase/schemas/booking_receipts.sql` | Trigger `AFTER INSERT` en `bookings` (solo `status = 'confirmed'`) — **primer Database Webhook del proyecto**, vía `pg_net`, hacia `send-booking-receipt`. URL y secreto compartido en Supabase Vault (`booking_receipt_webhook_url`/`_secret`), no en el schema — ver `CLAUDE.md` §Email de recibo de reserva |
| `supabase/functions/send-booking-receipt` | Edge Function — resuelve miembro/lounge/pago del `booking_id` recibido, arma el HTML del recibo (mismo contenido que `Receipt.dc.html`) y lo despacha vía Brevo. Reintenta unos segundos (`findSettledPayment`) si el pago de una tarjeta nueva sigue `pending` (webhook de Stripe asíncrono) |
| `supabase/functions/_shared/brevo.ts` | Envío por Brevo factorizado — antes solo lo usaba `send-email` (Epic 1), ahora también `send-booking-receipt` |

Desviaciones conscientes de esta parte:

- **El cobro real (Story 4.2) se confirma *antes* de tocar Supabase, no
  después.** Si `confirm_booking` corriera primero y la tarjeta se
  rechazara después, quedaría una reserva real confirmada con su plaza ya
  consumida y ningún cargo real detrás. `handleConfirm` en
  `summary/page.tsx` cobra primero (Stripe) y solo llama a `confirmBooking`
  si el cobro tuvo éxito — el diseño que la Story 4.1 ya anticipaba para
  cuando Stripe se conectara de verdad.
- **El webhook, no el cliente, decide el `status` real de `payments`.** El
  cliente nunca marca un pago como exitoso tras el submit — mismo criterio
  que Auth decide el resultado real del signup en Epic 1. `handleConfirm`
  solo avanza a `confirm_booking` cuando Stripe confirma el cobro en el
  propio tap (`checkout.confirm()`/`chargeSavedPaymentMethod` resuelven de
  forma síncrona para el caso feliz); el webhook es la fuente de verdad
  para reconciliar pagos asíncronos o casos borde, no para el camino feliz.
- **Bug real encontrado con Playwright, no detectable con jsdom (mismo tipo
  que los del mapa de Epic 2): mover el `<PaymentElement>` de padre en el
  DOM recarga su iframe y borra lo que el miembro ya escribió.** El primer
  intento montaba `<PaymentElement>` dentro de `payment-method-form.tsx`
  (paso 2) y lo portaba con `createPortal` a un contenedor del paso 3 al
  navegar — React no lo desmonta lógicamente, pero el navegador sí recarga
  el iframe al cambiar su padre real, y `checkout.confirm()` fallaba con
  "Your card number is incomplete." aunque se hubiera rellenado bien.
  Arreglo: `stripe-checkout-bridge.tsx` vive en el layout (nunca se
  desmonta) y el `<PaymentElement>` **nunca cambia de padre en el DOM** —
  se queda en un contenedor `position: fixed` cuya posición/tamaño se
  sincroniza (`ResizeObserver` + scroll/resize) con el hueco vacío que
  `payment-method-form.tsx` reserva en el paso 2. jsdom nunca hubiera
  detectado esto (no reproduce el reflow del iframe); se confirmó con el
  script de Playwright `scripts/playwright/scripts/booking/stripe-payment-flow-verification.js`.
- **Ticket 001 — aviso de error al crear la Checkout Session, sin artboard.**
  `Payment.dc.html` no dibuja qué pasa si `stripe-create-checkout-session`
  falla; antes la pantalla se quedaba en "Loading…" para siempre. Se
  reutiliza `Notice` (`tone="attention"`, `role="alert"`) dentro del mismo
  hueco del formulario, con un `Button` `outline`/`md` "Try again" — piezas
  existentes, sin geometría nueva.
- **Ticket 001 — marcar "Save this card" con tarjeta nueva abre otra
  Checkout Session y recarga el formulario de Stripe.** `setup_future_usage`
  se fija al crear la sesión; la alternativa sin recrearla
  (`saved_payment_method_options.payment_method_save` + `confirm({
  savePaymentMethod })`) obliga a Stripe a pintar su propio checkbox de
  guardado dentro del Payment Element, duplicado con el del artboard.
  Decidido con el usuario (12 oct 2026): fidelidad al artboard a cambio de
  perder lo escrito en la tarjeta si se cambia la casilla después.
- **Apple Pay/Google Pay quedan fuera de esta conexión real** — el Payment
  Element los ofrece automáticamente, pero exigen dominio verificado que no
  funciona en `localhost` ni sin el rollout de Vercel (ver
  `docs/PENDIENTES.md` §4.4). No es una desviación del artboard: es un gap
  de infraestructura pendiente, documentado explícitamente en `CLAUDE.md`.
- **`Waitlist.dc.html` ya no se alcanza por el umbral artificial
  `WAITLIST_THRESHOLD_SEATS` (retirado).** Se alcanza cuando `confirm_booking`
  devuelve de verdad cero filas — en la práctica, solo con una condición de
  carrera real (dos confirmaciones casi simultáneas sobre el último asiento)
  o eligiendo a propósito una fecha/franja ya agotada. Verificado con un test
  de integración que fuerza el slot a 0 plazas antes de confirmar.
- **La referencia de reserva (`LP-######`) ya no depende de lounge/fecha/hora.**
  `bookingReferenceFromId` deriva del `id` real devuelto por el RPC. La
  antigua `bookingReference(loungeId, date, time)` se retiró (nada la llama
  ya); `errorReference` conserva su propia fórmula porque el camino de pago
  declinado no tiene todavía una reserva real de la que derivar.
- **No hay pantalla de "reserva en lista de espera" propia.** Ningún artboard
  la dibuja — tras `joinWaitlist`, el modal simplemente se cierra y el
  miembro se queda en `/book/summary`, igual que hacía el mock.
- **`Receipt.dc.html` ya envía un correo real** (Story 4.2/5.1, Database
  Webhook, ver `CLAUDE.md` §Email de recibo de reserva) — `/book/receipt`
  sigue siendo su espejo dentro de la app, con `SAMPLE_MEMBER` (el nombre/
  email de muestra que usa el resto del shell sin conectar, no solo esta
  pantalla); el correo real, en cambio, sí usa el nombre/email reales del
  miembro. Dos bugs reales encontrados verificando con Playwright el flujo
  completo (no con curl/psql sueltos, que no reproducen la carrera de
  timing): el timeout de `net.http_post` (5s por defecto) cortaba la
  llamada a mitad de los reintentos por un pago todavía `pending` — subido
  a 15s; y `.single()` sobre `profiles` fallaba entero si el miembro no
  tenía perfil (lo destapó un fixture de test) — cambiado a `.maybeSingle()`
  con el email como nombre de respaldo.

---

## Backend real (Supabase local) — Epic 5 (Stories 5.1, 5.2, 5.3)

Quinto epic con backend real. No nace tabla propia — extiende `bookings`
(dueño Epic 4) y `profiles` (dueño Epic 1), tal como ya anticipaba
`docs/DATA-MODEL-MAP.md`. Decisiones tomadas con el usuario antes de
implementar (ver hilo de la conversación): Story 5.2 usa un RPC "de kiosco"
sin login de personal (la decisión de rol staff/partner se deja para Epic 7,
como ya fijaba `docs/DATA-MODEL-MAP.md`), y Story 5.3 sí se conecta con
`pg_cron` real en vez de quedarse como mockup.

| Módulo | Qué resuelve |
|---|---|
| `supabase/schemas/bookings.sql` — `booking_reference(uuid)` + columna generada `confirmation_code` | AC "Unique confirmation number generated for each booking LP#". No es una columna insertada aparte: replica en SQL el mismo hash que `bookingReferenceFromId` (TS) y su réplica en `send-booking-receipt`, indexada para que `/reception` busque por LP# sin escanear toda la tabla |
| `supabase/schemas/bookings.sql` — `checked_in_at`, `no_show` | Story 5.2 — "Check-in confirmation", "No-show tracking". `no_show` es una columna aparte, no un valor de `status` (ese dominio no tiene `'no_show'`, ver comentario de la tabla) |
| `supabase/schemas/bookings.sql` — `reception_lookup_booking`/`reception_checkin_booking`/`reception_report_no_show`/`reception_today_summary` (RPC, `SECURITY DEFINER`, solo `authenticated`) | Story 5.2 — buscan por LP# de hoy en el lounge (`p_lounge_id` + `p_date` + `p_confirmation_code`) y solo responden en los lounges del partner de quien llama (`partner_lounge_ids()`). Hasta SEC-01 (`docs/audit/seguridad-y-datos.md`) eran RPC "de kiosco" concedidas a `anon`. `p_date` es siempre `TODAY` (`src/lib/availability.ts`, el "hoy" de mockup del proyecto), no `current_date` — ver desviación abajo |
| `supabase/schemas/profiles.sql` — `emergency_contact_name`/`_relation`/`_phone` | Story 5.2 — "Emergency contact information accessible to staff". Gap anticipado en `docs/DATA-MODEL-MAP.md`: la Story 1.1 no lo pide en el alta, nace nullable. `/profile/privacy` (Story 6.3, ya conectada) lee el dato real; el botón "Edit" para capturarlo sigue inerte — sin artboard propio, ver "Backend real — Epic 6" |
| `supabase/schemas/booking_reminders.sql` | Story 5.3 — primer job programado del proyecto: `pg_cron` corre `dispatch_booking_reminders()` cada 30 min, que llama (`pg_net`, mismo mecanismo que `booking_receipts.sql`) a `send-booking-reminder` por cada reserva `confirmed` cuya llegada cae en la ventana "ahora + 24h" y sin recordatorio ya mandado (`reminder_sent_at`). A diferencia de las funciones de recepción, aquí `now()` sí es el reloj real — ver desviación abajo |
| `supabase/functions/send-booking-reminder` | Edge Function — mismo patrón que `send-booking-receipt`: resuelve miembro/lounge del `booking_id` recibido y despacha el email (contenido de `Reminder.dc.html`) vía Brevo (`_shared/brevo.ts`) |
| `lib/passes.ts` | `fetchDigitalPass`/`fetchUpcomingBookings`/`fetchPastBookings` reemplazan los arrays estáticos — RLS ya limita a las reservas del miembro con sesión. `AINSWORTH_PASS` se queda como fixture pura para tests de componente (`digital-pass-card.test.tsx`), no toca Supabase. `cancelBooking` (RPC `cancel_booking`) se sumó con Epic 6 — ver "Backend real — Epic 6". `VISITS_THIS_MONTH`/`BOOKING_RECORD_SUMMARY` (Story 9.1, sin conectar) se quedan como datos de muestra a propósito |
| `lib/reception.ts` | **Nuevo módulo**, separado de `passes.ts` porque sus RPC son de personal del lounge (sesión de partner), muy distintas de las consultas con sesión de miembro: `lookupReceptionBooking`/`checkInReceptionBooking`/`reportReceptionNoShow`/`fetchReceptionTodaySummary`. `RECEPTION_CLOSE_MATCHES` sigue siendo dato de muestra — ninguna AC de la Story 5.2 pide una búsqueda difusa por nombre/email |
| `app/my-pass/page.tsx`, `app/my-pass/[reference]/page.tsx`, `app/my-pass/[reference]/reminder/page.tsx` | Pasan a `RequireSession` (mismo patrón que `/explore`, `/lounges/[id]`) y a `fetchUpcomingBookings`/`fetchPastBookings`/`fetchDigitalPass` en vez de los arrays estáticos. El "Member" mostrado ya no es el literal `"Alexandra Rivas"`: sale de `pass.memberName` (perfil real, con fallback al email si no hay `profiles.full_name`) |
| `app/reception/page.tsx` | Envuelta en `RequirePartnerSession` (sin sesión de partner manda a `/partner/login`) y trabaja sobre el lounge elegido en el contexto del partner (Story 10.6), ya no sobre `THE_AINSWORTH` fijo — SEC-01 |

Desviaciones conscientes de esta parte:

- **Bug real encontrado y corregido: el hash de `bookingReferenceFromId` (Story 4.2/5.1) colisionaba con relativamente pocas reservas.** El algoritmo original (`31 * suma de códigos ASCII`) es conmutativo — dos UUID que son anagramas entre sí (o que simplemente suman igual) producen el mismo LP#. Mientras el LP# era solo copy decorativo de un recibo (Epic 4), una colisión era de bajo impacto; en cuanto Epic 5 lo convierte en clave real de búsqueda (`reception_checkin_booking`, `fetchDigitalPass`), una colisión es un bug funcional — reproducido de verdad corriendo la suite de tests localmente (dos reservas de un mismo día con el mismo `confirmation_code`, `reception_checkin_booking` fallaba con "query returned more than one row"). Corregido a un hash posicional (`hash*31 + code`, `% 900000` en cada paso, sin perder precisión en JS) en las tres implementaciones a la vez (`src/lib/booking.ts`, `send-booking-receipt/index.ts`, `booking_reference()` en `bookings.sql`) — verificado que las tres producen el mismo LP# para el mismo `id`.
- **Las funciones de recepción reciben `p_date` en vez de usar `current_date`.** Todo el proyecto trabaja sobre un "hoy" de mockup fijo (`TODAY = "2025-09-09"`, `src/lib/availability.ts`) — las fechas de reserva reales que la app permite elegir salen siempre de ese calendario ficticio, nunca del reloj real. Usar `current_date` en Postgres habría dejado `/reception` buscando reservas en una fecha (la real) distinta del "hoy" que el resto de la app entiende.
- **El cron de recordatorios (Story 5.3) no se puede ejercitar de punta a punta en este entorno.** `dispatch_booking_reminders()` sí usa el reloj real (`now()`) a propósito — "24 horas antes" es un intervalo de verdad, no el "hoy" de mockup — y aunque la disponibilidad ya se calcula en vivo para cualquier fecha, el calendario de reserva parte del `TODAY` fijo de la app (2025-09-09), así que ninguna reserva hecha desde la UI cae dentro de "ahora + 24h" del reloj real. El mecanismo es correcto (mismo patrón que `booking_receipts.sql`, ya probado) pero queda sin poder probarse end-to-end mientras el "hoy" de la app sea esa fecha fija — ver `docs/PENDIENTES.md`.
- **"Booking expires automatically after booking window" (Story 5.1) sigue siendo una desviación visual — ya lo era antes de conectar este módulo.** No hay cron que mueva una reserva vencida a `completed`/`no_show=true` solo por el paso del tiempo (esa automatización es Epic 6, sin construir); los cuatro estados del pase (`upcoming`/`today`/`checked-in`/`expired`) se siguen alcanzando por `?state=` en `/my-pass/[reference]`. La diferencia con antes es que ahora cada estado pinta datos reales de la reserva encontrada, no la reserva de muestra fija.
- **Un `PastBooking` con outcome `"completed"` (visita atendida, sin no-show) no es alcanzable todavía por ningún camino real.** Las únicas transiciones reales que existen son `reception_checkin_booking` (→ `in_progress`) y `reception_report_no_show` (→ `completed` + `no_show=true`) — no hay ninguna función que cierre una visita ya iniciada como `completed` sin no-show (eso exigiría el mismo cron de expiración automática de la Story 5.1, Epic 6). `fetchPastBookings` ya sabe formatear ese caso (probado con datos construidos a mano), pero hoy no puede ocurrir de verdad end-to-end.
- ~~Cancelar/dejar la lista de espera desde `/my-pass` sigue sin escribir en Supabase~~ | **Resuelto** (21 sept 2026, Epic 6): RPC `cancel_booking` — ver "Backend real — Epic 6".
- **`directionsMinutes` y `checkedInBy` se retiraron de `DigitalPass`.** No hay geolocalización en este flujo (`directionsMinutes` era un número inventado) ni identidad real de quién hizo el check-in en el patrón de kiosco sin login de personal (`checkedInBy` también lo era) — mostrar un dato fabricado junto a una reserva real habría sido peor que no mostrarlo. `TodayBody` (`/my-pass/[reference]`) muestra la dirección real en su lugar; `ExpiredBody`/`DigitalPassCard` ya no mencionan quién recibió al miembro.

---

## Backend real (Supabase local) — Epic 6 (Stories 6.1, 6.2, 6.3)

Sexto epic con backend real. Las tres pantallas de `/profile` y `/notifications`
ya existían como mockup desde el 4 sept 2026 (patrón 13/14) — esta conexión no
crea pantallas nuevas, sustituye sus datos de muestra por Supabase. `notifications`
y `member_favorite_lounges` nacen aquí (dueño Epic 6, ver `docs/DATA-MODEL-MAP.md`);
el resto extiende `bookings` (Epic 4) y `profiles` (Epic 1). Decisiones tomadas
con el usuario antes de implementar: de los seis tipos de notificación solo
"booking confirmation" (evento real) y el aviso de las 6 AM (pg_cron) se
conectan de verdad — los otros cuatro se siembran como muestra real al crear
el perfil; el fee de no-show/cancelación tardía se registra sin cobrar; el
borrado de cuenta es un soft-delete con gracia de 30 días (el artboard lo
promete reversible) y el borrado físico real es un cron aparte, mismo patrón
que Story 5.3; `membership_status` es un stub mínimo en `profiles` para no
bloquear Epic 6 en Epic 9.

| Módulo | Qué resuelve |
|---|---|
| `supabase/schemas/notifications.sql` | Tabla `notifications` (nace aquí) + RLS. Trigger `booking_confirmed_notify_in_app` (AFTER INSERT en `bookings`, real, sin `pg_net` — es un INSERT en la misma base) para "Booking confirmation notification". `dispatch_morning_notifications()` (pg_cron, cada 15 min) para el aviso de las 6 AM, mismo `booking_arrival_at` que `booking_reminders.sql` (Story 5.3) — mismo gap conocido: no ejercitable de punta a punta en este entorno (ver abajo). `seed_sample_notifications()` (trigger AFTER INSERT en `profiles`) siembra los otros cuatro tipos como notificaciones de muestra reales, una vez por miembro |
| `supabase/schemas/bookings.sql` — `cancel_booking(uuid, date)` (RPC) | Story 6.1 — "Modification options: Cancel", "24-hour advance notice requirement", "No show policy enforcement - flat fee". Solo el dueño de la reserva (`auth.uid()`, no un RPC de kiosco); cobra el fee de $35.00 (registrado en `cancellation_fee_cents`, nunca cargado de verdad) si quedan menos de 24h. `reception_report_no_show` (Story 5.2) también registra el mismo fee ahora |
| `supabase/schemas/bookings.sql` — `morning_notification_sent_at`, `cancellation_fee_cents`, `cancelled_at` | Columnas nuevas de apoyo a lo de arriba |
| `supabase/schemas/member_favorite_lounges.sql` | Tabla puente `member_favorite_lounges` (nace aquí) — un miembro, varias lounges favoritas. RLS propia (select/insert/delete own) |
| `supabase/schemas/profiles.sql` — `membership_status`, `preferred_amenities`, `privacy_*` (4), `deleted_at` | Story 6.3. `membership_status` es un stub mínimo (Active/Inactive) — el resto de `MEMBERSHIP_SUMMARY` sigue siendo Epic 9. `deleted_at` es el soft-delete de "Account deletion" |
| `supabase/schemas/account_deletion.sql` — `request_account_deletion()` (RPC) | Marca `deleted_at`, cancela las reservas futuras del miembro (mismo cálculo de fee que `cancel_booking`) — fiel a lo que el propio `DeleteAccountModal` ya declaraba |
| `supabase/schemas/account_deletion.sql` — `dispatch_account_deletions()` (pg_cron, diario) | Pasados los 30 días de gracia, llama (`pg_net` + Vault, mismo mecanismo que `booking_receipts.sql`) a `delete-account`. Sin poder ejercitarse de punta a punta en 30 días reales en este entorno — mismo gap que el recordatorio de Story 5.3 |
| `supabase/functions/delete-account` | Edge Function — primera vez que el proyecto usa `auth.admin.deleteUser`. Re-verifica los 30 días del lado de la function (defensa en profundidad), no solo confía en el filtro SQL del cron |
| `lib/notifications.ts` | `fetchNotifications`/`markNotificationRead`/`markAllNotificationsRead` reemplazan el array `NOTIFICATIONS`. `NOTIFICATION_CHANNEL_SETTINGS`/`QUIET_HOURS*` siguen siendo dato de muestra — ningún AC de la Story 6.2 pide persistir preferencias de canal |
| `lib/profile.ts` | Reescrito: `fetchProfile`/`updateProfile`, `fetchMembershipStatus`, `referralCodeFor` (determinista por miembro), `fetch/add/removeFavoriteLounge`/`isFavoriteLounge`, `fetch/updatePreferredAmenities`, `fetch/updateInterests` (reutiliza `profiles.interests`, ya real desde la Story 1.1), `fetch/updatePrivacySettings`, `fetchEmergencyContact`, `exportMemberData`, `request/reactivateAccountIfDeleted`. `MEMBERSHIP_SUMMARY`, `REFERRAL_CODE` y `referralCodeFor` se retiraron al conectar Epic 9 (ver "Backend real — Epic 9") |
| `app/profile/page.tsx` | `RequireSession`. "Save changes" ahora persiste de verdad (incluida la foto, mismo bucket `profile-photos` que `/onboarding/professional`) |
| `app/profile/preferences/page.tsx` | `RequireSession`. Favoritos/amenities/intereses autoguardan cada cambio (`SavedIndicatorChip`) |
| `app/profile/privacy/page.tsx` | `RequireSession`. Los 4 switches autoguardan; "Request export"/"Download" disparan descargas reales (`downloadTextFile`); "Delete account" llama a `request_account_deletion` |
| `app/notifications/page.tsx`, `components/account/notification-bell-menu.tsx` | `RequireSession` (el centro completo) / fetch real (la campana, en toda pantalla de miembro). `extraItems`/`notificationExtras` (Story 9.2, "friend sign-up") se anteponen a las reales sin escribir en `notifications` — siguen siendo de muestra |
| `app/lounges/[id]/page.tsx` — botón de favorito | AC "Favorite lounges list" necesita un lugar donde *añadir* un favorito. Sin artboard propio (`Main.dc.html` de la Fase 4 nunca lo dibujó) — decisión tomada con el usuario: se reutiliza el mismo botón de acción rápida que Call/Directions/Share (`QUICK_ACTION_CLASS`), sin CSS nuevo |
| `app/login/page.tsx` | Tras un login exitoso, llama a `reactivateAccountIfDeleted` — "sign in before then and everything comes back" (`DeleteAccount.dc.html`) |

Desviaciones conscientes de esta parte:

- **Solo 2 de los 6 tipos de notificación tienen un disparador real.** "Booking confirmation" (trigger `AFTER INSERT`) y el aviso de las 6 AM (`pg_cron`) tienen evento real detrás; "New lounge partner announcements", "Membership renewal reminders", "Special offers and promotions" y "Birthday month promotion" dependen de datos que Epic 7/9 todavía no modelan de verdad, así que se siembran como notificaciones de muestra reales (filas de verdad en la tabla, contenido fijo) al crear el perfil, no sintetizadas en el cliente.
- **El aviso de las 6 AM no se puede ejercitar de punta a punta en este entorno**, mismo motivo que el recordatorio de 24h de la Story 5.3: el calendario de reserva parte del `TODAY` fijo de la app (2025-09-09), así que ninguna reserva hecha desde la UI cae en el `current_date` real que el cron usa a propósito.
- **El fee de $35.00 (cancelación tardía y no-show) se registra, nunca se cobra de verdad.** Decisión tomada con el usuario: no reutilizar el `stripe_customer_id` guardado para un cargo off-session fuera de lo que Story 4.2 dejó construido.
- **El borrado de cuenta es un soft-delete reversible, no un borrado inmediato.** El artboard (`DeleteAccount.dc.html`) promete "erased after 30 days... sign in before then and everything comes back" — confirmar el modal marca `profiles.deleted_at` y cancela las reservas futuras, nunca llama a `auth.admin.deleteUser` directamente. El borrado físico real es un `pg_cron` diario que, pasados los 30 días, despacha a la Edge Function `delete-account` — mismo patrón de Database Webhook por secreto compartido que el resto del proyecto, sin poder ejercitarse de punta a punta en 30 días reales aquí.
- **El botón "Edit" del contacto de emergencia (`/profile/privacy`) sigue inerte.** El dato ya es real (Story 5.2), pero no hay artboard para el formulario de edición — capturarlo/editarlo queda pendiente de que exista uno.
- **`membership_status` era un stub mínimo, no el modelo completo de membresía.** Resuelto con Epic 9 (23 sept 2026): pasa a ser un espejo de `memberships` y un miembro nace "inactive" hasta elegir plan — ver "Backend real — Epic 9".
- **`referralCodeFor` era determinista por miembro, sin tabla `referrals` propia.** Resuelto con Epic 9: el código se persiste en `profiles.referral_code` (único) y `referralCodeFor` se retiró.
- **`phoneVerified` es siempre `true`.** La Story 1.1 nunca construyó verificación de teléfono (solo de email) — se mantiene el badge "Verified" del artboard por fidelidad visual, documentado aquí como el hueco real que es.
- **"Export personal data" entrega el archivo al instante, no por email en 48h.** El artboard promete un link emailado con 7 días de validez; se implementó como descarga real inmediata en el navegador (`downloadTextFile`, misma capacidad que el `.ics` de la Story 4.3) — decisión consciente: entregar más rápido no rompe ninguna promesa de seguridad (a diferencia del borrado de cuenta), solo mejora el tiempo de espera.
- **Los ajustes de canal (`NOTIFICATION_CHANNEL_SETTINGS`/horas de silencio, `/profile/notifications`) y la unidad de distancia (`/profile/preferences`) siguen siendo mockup.** Ningún AC de la Story 6.2/6.3 pide persistir preferencia de canal ni de unidad — se documentan aquí en vez de conectarse sin motivo en el contrato.
- **"Booking expires automatically after booking window" (Story 5.1) sigue sin cron que lo dispare.** Epic 6 conectó notificaciones y cancelación, pero no construyó la automatización que mueve una reserva vencida a `completed`/`no_show` por el paso del tiempo — los cuatro estados del pase se siguen alcanzando por `?state=`, ver "Backend real — Epic 5".

---

## Backend real (Supabase local) — Epic 7 (Stories 7.1, 7.2, 7.3)

Séptimo epic con backend real. Las pantallas de `/partner/**` ya existían
como mockup navegable desde el 5 sept 2026 (patrón 15-19) — esta conexión no
crea pantallas nuevas (salvo los emails de Story 7.2, que se quedan como
preview fija, ver más abajo), sustituye sus datos de muestra por Supabase.
`user_roles` y `partners`/`partner_lounges` nacen aquí — decisión de
arquitectura tomada con el usuario antes de implementar (pospuesta a
propósito hasta este momento, ver `docs/DATA-MODEL-MAP.md`): tabla
`user_roles` (no un custom claim ni esquemas separados) para el rol
member/partner/admin, y `partner_lounges` como tabla puente many-to-many (un
partner puede gestionar varios lounges, no una FK directa
`lounges.partner_id`). El resto extiende `bookings` (Epic 4) y `lounges`
(Epic 2).

| Módulo | Qué resuelve |
|---|---|
| `supabase/schemas/user_roles.sql` | Tabla `user_roles` (nace aquí) + `has_role(text)` — sin fila = miembro corriente, solo se registran roles elevados (partner aquí; admin cuando arranque Epic 8) |
| `supabase/schemas/partners.sql` | Epic 10 (1 oct 2026): `partners` (organización) + `partner_members` (usuarios, representante) + `lounges.partner_id`; `partner_lounge_ids()` sigue siendo el helper de las policies/RPC de abajo. Sustituye a `partner_lounges`/`lounge_partner_invites` |
| `supabase/schemas/bookings.sql` — policy `select own or managed bookings`, `no_show_reason` | Story 7.1 — un partner ve (y recibe por Realtime) las reservas de los lounges que gestiona, fusionada en una sola policy con "select own bookings" (evita el warning de "multiple permissive policies" de `supabase db advisors`) |
| `supabase/schemas/bookings.sql` — `partner_guest_list`/`partner_checkin_booking`/`partner_report_no_show` (RPC) | Story 7.1 — "Today's guest list", check-in y no-show reporting, autenticados de verdad (a diferencia de las RPC "de kiosco" de recepción, Epic 5) y autorizados contra `partner_lounge_ids()`. Contacto (email/teléfono/emergencia) solo si la reserva no está cancelada — "Contact details are shown while the booking is open" (DESIGN-SYSTEM.md §6 Fase 2) |
| `supabase/schemas/partner_notifications.sql` | Story 7.2 — dos triggers (`booking_confirmed_notify_partner`/`booking_cancelled_notify_partner`, Database Webhook vía `pg_net`, mismo mecanismo que `booking_receipts.sql`) para "new booking"/"cancellation" al partner, y `dispatch_partner_morning_digest()` (pg_cron, 6:30 AM) para el digest matutino — mismo gap conocido que Story 5.3/6.2 (ver abajo) |
| `supabase/functions/send-partner-booking-event` | Edge Function — una sola function para "new booking" y "cancellation" (distinguidos por `type` en el payload), comparten destinatario y casi todo el render |
| `supabase/functions/send-partner-digest` | Edge Function del digest matutino. Story 10.7: uno por usuario activo del partner, con sus lounges agrupados (`partner_digest_batches`) |
| `supabase/functions/_shared/partner-emails.ts` | Story 10.7 — plantillas de reserva nueva, cancelación y digest (nombre del partner y del lounge), sin Deno para testearlas con Vitest |
| `supabase/schemas/partner_analytics.sql` | Story 7.3 — `partner_analytics_summary`/`partner_bookings_by_day`/`partner_repeat_guests`, agregando sobre `bookings` real de todos los lounges del partner (sin selector de venue, ver el propio archivo) |
| `lib/partner.ts` | `mapGuestRow`/`bookedAgoLabel` (Story 7.1); `revenueBreakdownFor`/`totalRevenueAttributed`/`bookingsByWeekday` (Story 7.3, sustituyen a `ANALYTICS_SUMMARY`/`ARRIVALS_BY_WEEKDAY`, ya eliminados); `mapRepeatGuestRow`/`repeatGuestsSummary` (Story 7.3). `PARTNER_VENUE`/`PARTNER_GUESTS`/`LIVE_BOOKING`/`PARTNER_ACTIVITY` y el resto de la narrativa de muestra se quedan — siguen alimentando las pantallas de email fijas y el bloque de cuenta del shell, ver desviaciones abajo |
| `components/partner/require-partner-session.tsx` | Gemelo de `RequireSession` para `/partner/**` (salvo `/partner/login`): exige sesión real y `has_role('partner')` — una cuenta de miembro sin ese rol se trata igual que si no hubiera sesión |
| `app/partner/login/page.tsx` | Supabase Auth real + `has_role('partner')`; ya no valida contra `PARTNER_ACCOUNT` en el cliente |
| `components/partner/today-dashboard.tsx` (`/partner`) — Story 10.6: el lounge de la cabecera; sin lounges, el estado vacío de PartnerNoLounges (16) | Story 7.1/7.2 real: `partner_guest_list` + suscripción de Supabase Realtime (`postgres_changes` sobre `bookings`) reemplazan la simulación de temporizadores; check-in/no-show llaman a las RPC reales |
| `app/partner/analytics/page.tsx`, `app/partner/guests/page.tsx`, `app/partner/reports/page.tsx` | `RequirePartnerSession` + RPC reales de `partner_analytics.sql`. "Downloaded recently" (`RECENT_DOWNLOADS`) se queda como metadato de muestra — ningún AC pide un historial real de descargas |
| `scripts/seed-partners.mjs` | Epic 10 — partners de muestra en local (The Ainsworth Collection, Halcyon Hotels, Aurelia House Group activos; Solenne Spa en draft) con sus lounges y usuarios; sustituye a `seed-partner-account.mjs` |
| `lib/partner-lounges.ts` | Story 10.6 — `loadPartnerContext` (partner, usuario, lounges y elección validada, de `partner_context()`), `selectPartnerLounge` (se guarda en la cuenta; null = "All lounges") y `analyticsLoungeId` |
| `components/partner/partner-context.tsx` | Story 10.6 — `PartnerContextProvider`/`usePartnerContext`: el contexto del partner para todo /partner, montado por `RequirePartnerSession` |
| `components/partner/lounge-switcher.tsx` | Story 10.6 — `LoungeSwitcher` (Fase 10 · 13–15): partner como texto fijo y el lounge como botón con su menú; "All lounges" solo con `allowAll` (Analytics, Guests, Reports) |

Desviaciones conscientes de esta parte:

- **Las tres pantallas de email de Story 7.2 (`/partner/emails/digest`, `/new-booking`, `/cancellation`) se quedan como preview fija de la narrativa de muestra, sin conectar.** El AC es "recibir un email" (ya real, ver Edge Functions arriba) — ninguna historia pide que esas tres pantallas *muestren* el envío real más reciente; son documentación visual de qué aspecto tiene el email, igual criterio que "Settings → Notifications" (sin diseñar todavía).
- **La promoción automática de la waitlist ("waitlist promotion alerts", nodo del flow) no tiene mecanismo real detrás en ningún epic.** `join_waitlist` (Epic 4) aparca la reserva en `status='waitlisted'`, pero ningún epic conectado hasta ahora implementa una promoción automática al liberarse un hueco — construirla sería expandir el alcance del Epic 4 (dueño real de `bookings`/reservas), no del 7. Se documenta aquí como hueco real, no se simula.
- **El panel de actividad (`ActivityPanel`, `/partner`) es puramente de sesión, no un historial persistido.** No hay tabla `partner_activity`: arranca vacío y se llena con lo que ocurre real de verdad mientras el dashboard está abierto (nueva reserva/cancelación por Realtime, check-in/no-show hechos desde ahí) — recargar la pantalla la vacía de nuevo.
- **"Day pass" vs. "visita de membresía" se deriva de si la reserva tiene un pago real cobrado (Epic 4), no de un campo de tipo de visita.** No existe ese campo en `profiles`/`bookings` (Epic 9, planes de membresía, sigue sin conectar) — con pago `succeeded` ligado es day pass, sin pago es membresía. Mismo criterio en `partner_guest_list.is_day_pass` y en `partner_analytics_summary`/`partner_repeat_guests`.
- **La ventana de admisión ("Until 8:30 PM") ya no distingue "Window closed".** El mock lo comparaba contra un reloj de demo en vivo; sin un reloj real que tenga sentido comparar contra el "hoy" de mockup (`TODAY`), se simplifica a informativo siempre (`admissionWindowLabelFor` en `lib/partner.ts`).
- **Resuelto en la Story 10.6: el bloque de cuenta muestra el usuario real y su partner.** ~~El bloque de cuenta del shell (`PartnerShell`, inicial + nombre del venue + "Dana O. · Front of house") sigue mostrando `PARTNER_VENUE`, no la sesión real.~~ Las vistas previas de email (`/partner/emails/*`) siguen con `PARTNER_VENUE`. Ninguna historia pide que ese bloque decorativo refleje `partners.business_name`/`contact_email` en vivo — es chrome de navegación, igual categoría que "Settings" (inerte).
- **Resuelto en la Story 10.6 (selector de lounge en la cabecera).** ~~Sin selector de venue para un partner que gestione varios lounges.~~ La decisión de 1 partner : N lounges (`partner_lounges`) ya generaliza el modelo, pero ningún artboard de esta fase diseña un selector — las tres RPC de `partner_analytics.sql` agregan sobre *todos* los lounges del partner autenticado a propósito, para no bloquear el caso multi-lounge sin inventar una pantalla.
- **`send-partner-booking-event`/`send-partner-digest` sí se verificaron de punta a punta contra el edge runtime local** (`curl` directo con el secreto compartido real, ambas responden `200`), tras un `supabase stop && supabase start` que resolvió una caída puntual de `supabase_edge_runtime` — ver `docs/PENDIENTES.md` §4.5.
- **El digest matutino (`dispatch_partner_morning_digest`, pg_cron 6:30 AM) tiene el mismo gap conocido que Story 5.3/6.2**: el calendario de reserva parte del `TODAY` fijo de la app (2025-09-09), así que el `current_date` real que este cron usa a propósito no tiene reservas hechas desde la UI — no ejercitable de punta a punta desde la app todavía.

---

## Backend real (Supabase local) — Epic 8 (Stories 8.1, 8.2, 8.3)

Octavo epic con backend real, y el último en conectarse (22 sept 2026). Las
11 pantallas de `/admin/**` ya existían como mockup navegable (Fase 8) —
esta conexión no crea pantallas nuevas salvo `/admin/login` (sin artboard
propio, decisión confirmada con el usuario: reutiliza el layout de
`/partner/login`), sustituye sus datos de muestra por Supabase. `user_roles`
ya existía desde Epic 7 (rol `admin`, sin fila nueva que crear en esa
tabla); `support_tickets`/`support_ticket_messages` y
`lounge_content_submissions` nacen en este epic; `scheduled_reports`
también. El CRUD de contenido (Story 8.3) extiende `lounges`/`lounge_images`
(Epic 2/3), y la analítica/exportación (Story 8.2) agrega sobre
`bookings`/`payments`/`profiles` ya reales de epics anteriores.

Dos decisiones de alcance se tomaron con el usuario antes de implementar,
revirtiendo la nota original de `docs/DATA-MODEL-MAP.md` (válida solo hasta
que este epic se conectara): el reembolso (Story 8.1) es real vía Stripe, y
los reportes programados (Story 8.2) son reales vía `pg_cron` + Brevo —
mismo nivel de realismo que el resto del proyecto a esta altura.

| Módulo | Qué resuelve |
|---|---|
| `supabase/schemas/support_tickets.sql` | Story 8.1 — `support_tickets`/`support_ticket_messages` (nacen aquí, solo `has_role('admin')`); trigger `booking_no_show_opens_ticket` (un no-show reportado por un partner abre un caso automáticamente); RPC `admin_search_members`/`admin_member_profile`/`admin_member_bookings`/`admin_member_payments`/`admin_list_support_tickets`/`admin_ticket_counts`/`admin_get_ticket`; `admin_reschedule_booking`/`admin_cancel_booking` (modificación de reserva con override explícito) y `admin_waive_booking_fee` (la mitad "waive" de un reembolso cuando la tarifa nunca se cobró de verdad) |
| `supabase/functions/stripe-refund-payment` | Story 8.1 — reembolso real vía Stripe (`stripe.refunds.create`) para un cargo `succeeded`; actualiza `payments` de forma optimista, el webhook (`charge.refunded`, ampliado en `stripe-webhook`) es la defensa en profundidad |
| `app/admin/login/page.tsx` + `components/admin/require-admin-session.tsx` | Sin artboard propio (la Fase 8 nunca dibujó el nodo "Admin login" del flow) — mismo patrón que `/partner/login`: Supabase Auth real + `has_role('admin')` |
| `components/admin/booking-override-drawer.tsx` | Reescrito sobre los 5 horarios reales del dominio de `bookings.slot_time` (`SLOT_DEFS`, `lib/booking.ts`, ahora exportado) — el artboard dibuja horas ficticias ajenas a ese dominio; plazas consultadas en vivo (`lounge_availability_range`) para la fecha elegida. `admin_reschedule_booking` sin override comprueba la franja destino con el mismo `pg_advisory_xact_lock` que `confirm_booking`; ni él ni `admin_cancel_booking` devuelven plazas a mano — se liberan solas al cambiar la reserva |
| `components/admin/refund-modal.tsx` | Ahora solo cubre un cargo real de Stripe — la tarifa registrada (nunca cobrada) se "waives" directamente desde `CaseDetailPage`, sin pasar por este modal |
| `supabase/schemas/admin_reports.sql` | Story 8.2 — `admin_network_summary`/`admin_bookings_by_day`/`admin_revenue_by_partner`/`admin_lounge_popularity`/`admin_amenity_demand`/`admin_city_demand` (agregan sobre TODA la red, nunca un lounge elegido); `admin_export_bookings`/`admin_export_members`/`admin_export_no_shows_cancellations`; tabla `scheduled_reports` + `dispatch_scheduled_reports()` (pg_cron cada 15 min, tercer uso de este mecanismo tras Story 5.3/6.2 y Story 7.2) + `admin_generate_report_csv` |
| `supabase/functions/send-admin-report` | Story 8.2 — Edge Function del reporte programado, adjunto CSV real vía Brevo (`sendBrevoEmailWithAttachment`, nueva en `_shared/brevo.ts`); también atiende "Email it to me" (mismo mecanismo, sin pasar por el cron) |
| `lib/admin-analytics.ts` | Reescrito: `dateRangeForPeriod`/`dateRangeForPreset` (relativos a `TODAY`, nunca al reloj real — mismo criterio que el resto del dominio de reservas), `buildExportCsv` (columna a columna según lo marcado, anonimizado por defecto) |
| `supabase/schemas/admin_content.sql` | Story 8.3 — `lounges.content_status` (live/draft/archived, ortogonal a si hay un cambio pendiente de aprobar) + policy `select lounges` actualizada (un miembro solo ve `content_status='live'`); tabla `lounge_content_submissions` (nace aquí); `admin_lounge_list`/`admin_lounge_detail`; `admin_submit_lounge_content_change`/`admin_approve_lounge_submission`/`admin_reject_lounge_submission` ("Content approval workflow" real y genérico, no solo para The Vestry como el mock); `admin_archive_lounges` (el único botón real de la barra de acción masiva) |
| Bucket de Storage `lounge-images` (público) | Story 8.3 — "Upload and manage lounge images" real (`uploadLoungeImage`, `lib/admin-content.ts`); solo un admin puede escribir, cualquiera puede leer (a diferencia de `profile-photos`, que es privado por usuario) |
| `lib/admin-content.ts` — `diffLoungeChanges` | Diff genérico caso por caso (amenities/horario/capacidad/restricciones/fotos/publicación) para la cola de aprobación — generaliza el `VESTRY_PENDING_CHANGES` literal del mock a cualquier lounge real |
| `support_tickets.sql` — `admin_bookings_on(p_date)` | Story 8.4 — el día entero de la red (solo `has_role('admin')`), con índice `bookings_date_idx`; lounge, estado y búsqueda filtran en cliente. Aforo por franja = `lounges.capacity` frente a las reservas no canceladas (misma regla que `booking_occupies_seat`) |
| `support_tickets.sql` — `admin_set_booking_status` | Story 8.4 — el admin corrige el status (confirmed / checked-in / no-show). Decisiones del 13 oct 2026: un no-show del admin no registra fee ni abre caso (el trigger `booking_no_show_opens_ticket` ahora exige fee); salir de no-show o de cancelada borra el fee; volver de cancelada comprueba plaza salvo override |
| `scripts/seed-admin-account.mjs` | Alta operativa (no self-service) de la cuenta de muestra de Priya Raghunathan en Supabase local — mismo patrón que `seed-partner-account.mjs` |

Desviaciones conscientes de esta parte:

- **"Refund processing interface" cubre dos caminos reales distintos, no uno.** Un cargo real de Stripe (`succeeded`) se reembolsa de verdad vía `stripe-refund-payment`; una tarifa de no-show/cancelación tardía (Story 6.1) nunca se cobró de verdad, así que "waive" solo limpia `bookings.cancellation_fee_cents` — no hay nada que reversar en Stripe para esa. El `RefundModal` (lenguaje de "cargo"/"tarjeta") solo aparece en el primer caso.
- **"Escalation to manager functionality" sigue sin una bandeja de manager real.** `DUTY_MANAGER` (Dana Mbeki) sigue siendo un dato de muestra fijo — escalar cambia `status` en `support_tickets` de verdad, pero no hay notificación real a nadie; mismo criterio que la campana de notificaciones del admin (inerte desde la Fase 8).
- **"Every action logged" (chip de la topbar) sigue sin un registro de auditoría real detrás.** Ninguna historia de Epic 8 lo pide como AC propio (es un chip de la topbar del patrón 21, no un criterio de aceptación) — queda como texto fijo.
- **El rail "Opened by you today" de `MemberSearch.dc.html` se retira.** Dependía de horas propias de sesión sin contraparte real sencilla; ninguna historia lo exige y el buscador ya cubre el AC de "member search" sin él.
- **El rail "Membership" de la ficha de miembro se simplifica a lo que `profiles.membership_status` (Story 6.3) sí modela de verdad (Active/Inactive/Account deleted).** El mock mostraba plan, fecha de renovación, visitas del mes y referidos — todo eso depende de un plan de membresía real que Epic 9 todavía no conecta; inventar esos números habría sido una regresión de realismo, no un avance.
- **"Revenue by partner"/"Net revenue" ya no restan una "atribución a partners" inventada.** El mock narraba una facturación de membresía completa ($336,250.00 brutos, $53,913.00 atribuidos); real solo existen cargos succeeded de Stripe (day passes) — el panel muestra el ingreso bruto real de esos cargos, sin la resta ficticia.
- **Las columnas de export ya no son una lista plana única.** Cada dataset (`bookings`/`members`/`revenue-by-partner`/`no-shows-cancellations`) trae su propio catálogo de columnas (`EXPORT_COLUMNS` pasa a ser un `Record<ExportDataset, ExportColumn[]>`) — el dataset "Revenue by partner", por ejemplo, no tiene ninguna columna personal que anonimizar.
- **"Delivery history"/"Delivered in the last 24 hours" (`ScheduledReports.dc.html`) se retira.** No hay tabla de historial de entregas real — `scheduled_reports.last_run_at` es lo único que hay, y ya se muestra en la propia fila del reporte.
- **El catálogo de amenities del editor de lounge es el de `lib/amenities.ts` (Story 2.2, 6 amenities), no la lista propia del mock.** El mock incluía "Showers" como protagonista de The Vestry, pero esa amenity nunca existió en el catálogo real compartido con Epic 2/3 — usar un catálogo aparte solo para Epic 8 habría duplicado la fuente de verdad de amenities del proyecto.
- **"Image optimization and resizing" no es real.** La subida a Storage sí lo es (bucket `lounge-images`); el redimensionado a 1600/800/400 px que el artboard anuncia sigue sin tener nada detrás — no hay librería de procesamiento de imágenes en el stack ni precedente de transformación de imágenes en este proyecto.
- **De la barra de acción masiva, solo "Archive" es real.** "Update hours", "Add an amenity" y "Set closure dates" siguen inertes — ningún artboard dibuja su modal de edición masiva, mismo criterio que "New case" en Story 8.1.
- **"Add lounge" lleva a `/admin/lounges/new` (25 sept 2026).** Artboards nuevos `LoungeNew.dc.html` (14) y `PhotoCaption.dc.html` (15), diseñados con el usuario. Componentes: `components/admin/lounge-draft-form.tsx` (el formulario, también para editar un borrador — `/admin/lounges/[id]` lo usa cuando `content_status = 'draft'`), `components/admin/photo-caption-dialog.tsx` (popup de cada foto: área = `lounge_images.caption`, detalle = `detail`, "Main photo") y `components/admin/address-autocomplete.tsx` (Google Places `AutocompleteSuggestion` + mini-mapa con pin arrastrable). Lógica pura en `lib/lounge-draft.ts`. RPC: `admin_create_lounge`/`admin_update_draft_lounge`/`admin_set_draft_lounge_photos`/`admin_publish_lounge` (`admin_content.sql`). Decisiones: un lounge nuevo se publica directo, sin la cola de aprobación (hoy cualquier admin se aprueba a sí mismo); la dirección solo se edita mientras es borrador; la foto principal es la de `position = 0` (una sola, elegir otra la mueve al principio) — abre el carrusel del perfil, Explore no muestra fotos. Desviaciones respecto al artboard (ajustadas con el usuario): el horario es una fila por día con interruptor abierto/cerrado y dos desplegables de hora cada 30 min, en vez de las 7 fichas de texto del artboard, y nace todo cerrado; "Same hours every day" pasa a llamarse "Copy Monday to every day"; el mini-mapa mide 430×218 (`aspect-ratio`, encoge con el ancho) a la derecha del campo de dirección, y pasa debajo en pantallas estrechas; el nombre por defecto de cada foto es el del archivo sin extensión ni guiones.
- **El lounge nace con su partner (29 sept 2026).** Artboards `LoungeNewPartner.dc.html` (Epic 8 · 16) y `EmailInvite`/`SetPassword`/`InviteExpired.dc.html` (Epic 7 · 13–15). `lounge-draft-form.tsx` suma la tarjeta "Partner account" (nombre, apellido, email de trabajo, móvil opcional) y el ítem de la checklist (`isPartnerComplete`). El borrador guarda al partner en `lounge_partner_invites` (vía `admin_apply_lounge_draft`); **publicar** ya no es la RPC directa sino la Edge Function `admin-publish-lounge`: crea el usuario invitado con `generateLink` (no envía nada), rol + `partners` + `partner_lounges`, publica con `admin_publish_lounge` como el admin (la RPC exige ya ese partner, así que no hay atajo) y solo entonces manda el email por Brevo con el enlace `/partner/welcome?token_hash=…&type=invite`. Si algo falla antes del email borra el usuario y el lounge sigue en borrador. Un email que ya tiene cuenta se rechaza antes de crear nada (`email_exists`). `partners` gana `first_name`/`last_name`/`photo_path` (foto en `profile-photos`) y una policy de update propia; el trigger `partners_guard_issued_fields` impide al partner cambiar email, negocio o usuario.
- **Los partners salen del lounge (Epic 10 · Story 10.1, 1 oct 2026).** `LivePartnersCard`/`DraftPartnersCard` (artboards 16, 17, 19–23) se retiraron junto con invitar al publicar: los usuarios partner viven en su partner y se gestionarán en `/admin/partners` (Stories 10.3–10.4), y el lounge mostrará su partner en solo lectura (10.5). Hasta entonces la vista live y el borrador no muestran partners. La nota del borrador usa la copy de `LoungeDraftPartner.dc.html` (Fase 10 · 12).
- **Editar un lounge live y sus partners (29 sept 2026).** Artboards `LoungeLive` (17), `LoungeEditConfirm` (18), `LoungeDraftPartners` (19), `PartnerAdd` (20), `PartnerSuspend` (21) y `PartnerDelete` (22), diseñados con el usuario. **Sustituyen a `LoungeEdit.dc.html` (12) y `Approval.dc.html` (13): la cola de aprobación de la Story 8.3 ("Content approval workflow") se retira** — decisión del usuario, cualquier admin publica sin revisión; se anota como desviación, el spec no se toca. Un lounge live se ve entero en solo lectura ("Locked while live"), ubicación y mapa incluidos (`LoungeLocationPreview`), y "Edit lounge" lo devuelve a borrador (`admin_unpublish_lounge`) tras confirmar; el borrador es el mismo `LoungeDraftForm` del alta, que gana las restricciones de reserva y varios partners. Las fotos del editor anterior nunca pintaban la imagen (solo un degradado con el nombre): `LoungeLiveView` usa `<img>` con la URL real. Partners: `admin_lounge_partners` da la lista con estado (`on_publish`/`invited`/`active`/`suspended`); la Edge Function `admin-lounge-partners` añade (invita al momento; desde el 1 oct 2026 un email ya en uso se rechaza), reenvía la invitación (solo sin contraseña), suspende (reversible: `partners.suspended_at` + ban en Auth, todos sus lounges), reactiva y elimina (borra la cuenta). Un lounge live nunca se queda sin partner no suspendido. La policy de `lounges` deja ver un borrador a sus partners y a quien tiene reserva allí; `fetchLounges` filtra por `live` para que no aparezca en Explore.
- **Ajustes del detalle de lounge (1 oct 2026).** Artboards `LoungePartnersMain` (23), `LoungeDraftSaved` (24), `LoungePublished` (25) y `LoungePhotoViewer` (26). Un partner gestiona **un solo lounge**: el "simply added" del popup 20 queda sustituido por el rechazo "already in use" (ver ARCHITECTURE). Los partners del alta y del borrador pasan a la columna principal. Guardar o publicar ya no navega a la tabla: avisa (24/25) y deja al admin en el lounge — desde el alta, al cerrar el aviso va al detalle del lounge recién creado. Las fotos del lounge live miden 144px (antes 96) y abren el visor. Desviaciones: el error "already in use" sale como alerta de la pantalla al guardar, no bajo el campo como en el 23 (solo el servidor sabe si otro lounge usa el email); la tarjeta de partners del lounge **live** sigue en la columna derecha (no tiene formulario, se añade con el popup 20); las fotos del borrador siguen a 86px, porque viven en la columna derecha y a 129px quedarían verticales, y al hacer clic abren el popup de nombre (15), no el visor.
- **Más ajustes del detalle de lounge (1 oct 2026).** Sin el botón "Preview as a member" de los artboards 17/18: ninguna historia del Epic 8 lo pide. El horario del alta y del borrador empieza el lunes (los datos siguen domingo primero en `weekly_hours`). La ubicación va en una columna: el campo de dirección arriba y el mapa debajo, a todo el ancho (280px de alto), también en el lounge live. Partners del alta/borrador: el formulario guarda con "Save partner" y se cierra; "Add partner" abre uno nuevo (con un "Cancel" si ya hay partners). Los artboards 17–26 se regeneraron con estos cambios (sin "Preview as a member", ubicación en una columna, fotos live a 144px, "Save partner", partners del borrador en la columna principal); `LoungeNew` (14) y `LoungeNewPartner` (16) quedan como históricos, sustituidos por 19 y 23.
- **El reembolso real, los reportes programados reales y el CRUD de contenido se verificaron de punta a punta contra el entorno local**: `stripe-refund-payment` con un cargo real de la sandbox de Stripe (tarjeta guardada, `pm_card_visa`); `dispatch_scheduled_reports` disparado a mano (`select public.dispatch_scheduled_reports();`) con un reporte de prueba, confirmando `200` en `net._http_response` tras el envío real por Brevo; `admin_approve_lounge_submission`/`admin_submit_lounge_content_change` con una llamada real a las RPC desde un cliente autenticado como admin.

## Backend real (Supabase local) — Epic 9 (Stories 9.1, 9.2)

Noveno y último epic del alcance original en conectarse (23 sept 2026). Las
tres pantallas de `/profile/membership/**` ya existían como mockup navegable
(Fase 9) — esta conexión sustituye sus datos de muestra (Alexandra/Naomi,
`?plan=`/`?state=`) por Supabase y Stripe reales, y añade `/join/[code]`
(sin UI). `memberships`, `referrals` y `referral_shares` nacen en este epic;
`profiles` gana `referral_code`, y `payments` gana `membership_plan`.

Decisiones de producto tomadas con el usuario antes de implementar (ninguna
historia ni artboard las resolvía):

- **Un miembro nace sin membresía (inactiva) hasta elegir plan.** Elegir
  plan reutiliza `Plans.dc.html` (ninguna card lleva "Your plan", las dos
  ofrecen "Choose …") y el modal de `Upgrade.dc.html` sin la línea de
  prorrateo — sin artboard propio, aceptado explícitamente.
- **Alta y subida mensual → anual son un cobro puntual real de Stripe**
  (modo test) por el importe de `membership_change_quote` — no Stripe
  Billing. Con tarjeta guardada se usa esa; sin ella, `<PaymentElement>`
  embebido en el modal (Checkout Session `ui_mode: "elements"`, mismo
  mecanismo que `/book/payment`).
- **El premio de referido queda "pending" al registrarse el amigo y pasa a
  "credited" con su primer pago real liquidado** (`payments.status =
  'succeeded'`, lo decide el webhook de Stripe) — Terms §3.
- **El amigo entra por `/join/[code]` → `/signup?ref=CODE`**; el código
  viaja en los metadatos de Auth, sin campo visible nuevo en el signup.

| Módulo | Qué resuelve |
|---|---|
| `supabase/schemas/memberships.sql` | Story 9.1 — tabla `memberships` (1:1 con `profiles`, solo lectura propia por RLS); espejo en `profiles.membership_status` (`sync_profile_membership_status`, Epic 6/8 ya lo leen); `membership_change_quote` (alta a precio completo o subida con crédito por días no usados; rechaza repetir plan o bajar de anual a mensual); trigger `apply_membership_payment` sobre `payments` (el pago liquidado activa o cambia el plan, venga de tarjeta guardada o del webhook); `set_membership_auto_renew` (apagarla cancela sin tarifa las reservas posteriores al término, como promete `AutoRenew.dc.html`, y descarta un cambio de plan programado); `schedule_membership_plan_change`/`cancel_membership_plan_change` (anual → mensual al final del término, `pending_plan`); `membership_visits_in_month`; `dispatch_membership_renewals()` (pg_cron diario: vence los términos sin auto-renovación, **cobra las renovaciones vencidas** y avisa un mes antes a los anuales — vía Vault/`pg_net`). El trigger de `payments` abre el término siguiente desde el fin del anterior cuando el pago es una renovación |
| `supabase/schemas/referrals.sql` | Story 9.2 — `profiles.referral_code` único (`generate_referral_code`, formato "AR-SOLEIL-24"); `guard_profile_managed_columns` (el miembro no puede escribir `referral_code`/`membership_status`/`stripe_customer_id` aunque "update own profile" le deje tocar su fila); `my_referral_code()` (código perezoso para perfiles anteriores a Epic 9); tabla `referrals` (referidor y referido ven su fila); `create_referral_from_signup` (trigger al crear el perfil: lee el código de los metadatos de Auth y notifica al referidor "… joined"); `credit_referral_on_first_payment` (trigger sobre `payments`: acredita y notifica "Your referral day pass is ready"); tabla `referral_shares` ("Invitations sent") |
| `supabase/functions/stripe-membership-checkout` | Story 9.1 — `charge_saved` (PaymentIntent con tarjeta guardada) y `create_session` (Checkout Session para `<PaymentElement>`); importe desde `membership_change_quote` con el JWT del propio miembro, fila de `payments` con `membership_plan` — no escribe `memberships` (lo hace el trigger) |
| `supabase/functions/membership-renewal` | Story 9.1 — llamada por `dispatch_membership_renewals` (secreto compartido `MEMBERSHIP_RENEWAL_WEBHOOK_SECRET` + Vault, mismo patrón que `send-booking-reminder`). `type: "notice"`: email del aviso un mes antes vía Brevo. `type: "charge"`: cobra off-session la tarjeta guardada por `pending_plan ?? plan` (409 si no toca renovar); sin tarjeta o con el cobro rechazado, vence la membresía y avisa en la app |
| `components/membership/schedule-monthly-modal.tsx` | Story 9.1 — "Confirm your new plan" para anual → mensual: "Due today $0.00", el mensual empieza al acabar el término anual. Anatomía de `Upgrade.dc.html` (sin artboard propio, ver desviaciones) |
| `app/join/[code]/page.tsx` | Story 9.2 — redirige a `/signup?ref=CODE` (código normalizado) o a `/signup` si no tiene forma de código |
| `app/signup/page.tsx` | Story 1.1 + 9.2 — lee `?ref=` y lo manda como `referral_code` en los metadatos de `supabase.auth.signUp` |
| `app/profile/page.tsx` (Epic 6) | El rail "Membership" y "Member since" salen de `memberships`; el código de referido, de `profiles.referral_code` (sustituye a `referralCodeFor`, retirado); "Share your code" lleva a `/profile/membership/referrals` |
| `app/my-pass/page.tsx` + `components/passes/cancel-booking-modal.tsx` (Epic 5/6) | "Visits this month" y "Since you joined in" reales (`fetchVisitsThisMonth`/`fetchMembership`) en vez de `VISITS_THIS_MONTH`/`MEMBERSHIP_SUMMARY` (retirado de `lib/profile.ts`) |
| `supabase/schemas/booking_coverage.sql` + `supabase/schemas/bookings.sql` (`confirm_booking`) | Epic 9 × Epic 4 — tabla `day_pass_redemptions` (qué day pass de regalo pagó qué reserva; cancelar la reserva lo devuelve); `booking_coverage_for`/`booking_coverage` (day pass de regalo → visita incluida → pagar); `confirm_booking` exige cobertura real sin pago, y con pago lo valida (del propio miembro, de un day pass, sin reserva ya ligada). `membership_visits_in_month` deja de contar las visitas pagadas con un day pass de regalo |
| `components/booking/booking-context.tsx` + `app/lounges/[id]/book/layout.tsx` | `coverage` (y el atajo `covered`) sale de `booking_coverage` para la fecha elegida, se congela en cuanto la reserva existe y `refreshCoverage` lo recalcula si `confirm_booking` la rechaza. `?covered=1` retirado |
| `scripts/sql/epic9-backfill-membership-status.sql` | Opción A decidida con el usuario: las cuentas anteriores a Epic 9 (con `membership_status = 'active'` sin plan) pasan a "sin plan". Corrección de datos a ejecutar a mano una vez por proyecto remoto — no es una migración |
| `lib/testing/membership-fixture.ts` | Solo tests — `grantTestMembership` (siembra un plan con el service role; `memberships` no admite escrituras de cliente), `settleTestPayment` (simula lo que hace el webhook), `insertSucceededTestPayment`, `giveTestMemberSavedCard` (Customer real de Stripe con `pm_card_visa`) |

Desviaciones conscientes de esta parte:

- **Estado "Inactive" y elección de plan sin artboard propio.** `PlanSummaryCard` pinta "Inactive" / "No active plan" / "From $249.00" con la misma anatomía de la card; `/profile/membership/plans` quita el chip "Your plan" y ofrece "Choose monthly"/"Choose annual"; el modal de `Upgrade.dc.html` sirve al alta sin la línea de crédito. Confirmado con el usuario antes de implementar.
- **La renovación automática cobra sin Stripe Billing.** Decisión revisada con el usuario el mismo día ("por algo es renovación automática"): el cron diario cobra off-session la tarjeta guardada al vencer el término (PaymentIntent, como el resto del proyecto) en vez de suscripciones de Stripe. Sin reintentos ni periodo de gracia: un cobro rechazado vence la membresía — ver `docs/PENDIENTES.md` §2.12.
- **Anual → mensual tiene confirmación propia sin artboard.** `ScheduleMonthlyModal` reutiliza la anatomía de `Upgrade.dc.html` ("Due today $0.00") y aplica la regla que ya fija `Plans.dc.html` ("Moving to monthly waits until your current term ends"); en `/profile/membership/plans` la card mensual pasa a "Switch scheduled" con "Keep annual" debajo, y el rail de renovación dice "Switching to monthly on …".
- **"Invitations sent" cuenta veces compartidas, no destinatarios.** `Share.dc.html` comparte por apps del sistema sin pedir el email del amigo, así que no hay invitación a una persona concreta que registrar: `referral_shares` guarda cada uso de un destino (o "Copy"). En consecuencia, la tabla lista amigos que ya se registraron (columna "Joined" en vez de "Sent") y los estados "Invited"/"Invite expired" del artboard no llegan a darse — la regla de 60 días de los términos no tiene nada que expirar.
- **"Reward pending" dice "After their first payment", no "Clears in 48 h".** El premio se acredita en cuanto el primer pago del amigo liquida (dentro de las 48 h que prometen los términos, en realidad al instante); no hay una espera de 48 h que contar hacia atrás.
- **Quién paga una reserva lo decide el servidor, no `?covered=1`.** Decidido con el usuario al conectar la membresía: con plan activo, primero se gasta un day pass de regalo (Terms §4: "used before those included visits" — el de cumpleaños antes que el de referido), luego una de las 8 visitas incluidas del mes de la reserva, y si no queda nada se paga el day pass; sin plan, siempre se paga (tampoco se usan day passes de regalo: "valid for as long as your membership is active"). `booking_coverage` pinta el flujo y `confirm_booking` lo hace cumplir — antes aceptaba cualquier reserva sin pago (hueco de seguridad real, cerrado aquí) y cualquier `payment_id` sin comprobar de quién era ni si ya pagaba otra reserva. `MembershipCovered.dc.html` sale ahora con los datos reales del miembro (plan, renovación, visitas, tarjeta de Stripe); cuando paga un day pass de regalo, la misma anatomía lo dice ("A complimentary day pass from a referral covers this booking…") — el artboard solo dibuja la visita incluida. Si al confirmar la visita ya no está cubierta (p. ej. visitas agotadas en otra pestaña), se reutiliza el modal de error de pago. El límite de 10 day passes por año (Terms §5) no se aplica.
- **El enlace compartido es `/join/[code]` de la propia app**, no el literal `luxepass.co/join/…` del artboard — `app.luxepass.co` vs. este repo sigue sin resolverse (ver `CLAUDE.md`).
- **El email del aviso de renovación no tiene artboard.** Solo existe la promesa en pantalla ("We email you on October 3"); el cuerpo sigue el mismo esqueleto sobrio que `send-booking-reminder`.
- **La columna/rail "Membership" de `/admin/members` y `/admin/members/[id]` muestra el plan real de `memberships`** (Annual member / Monthly member / Expired / No plan / Account deleted), resuelto el 25 sept 2026. Status sigue siendo si la cuenta puede usar la app (Active/Inactive/Deleted). Renovación y visitas del mes siguen fuera de la ficha.
- **Verificado de punta a punta en local**: cobro real de Stripe con tarjeta guardada (`pm_card_visa`) activando y subiendo el plan desde la pantalla; `settleTestPayment` + trigger para la ruta de tarjeta nueva; `dispatch_membership_renewals()` llamado con el service role (aviso único y vencimiento). El `<PaymentElement>` dentro del modal no se puede montar en jsdom — misma limitación que `/book/payment`.

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
`BulkActionBar` — ver Capa 1; `ApprovalDiff` se retiró con la cola de aprobación el 29 sept 2026). Tile de métrica (claro), Barra
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
Comparación live/propuesto con la Story 8.3 (retirada el 29 sept 2026 junto con la cola de aprobación) —
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

- **Epic 10 · Ajustes del 2 oct 2026 sobre los artboards de la Fase 10.** (1) En el alta y el borrador de lounge, la tarjeta **Partner** va arriba del todo, antes de "Name and contact" (`LoungeDraftPartner`, 12, la dibuja al final). (2) El status se cambia con `StatusSelect` en la cabecera del lounge y del partner, en vez de los botones "Suspend lounge", "Activate/Suspend/Reactivate partner" (6, 7, 8, 10, 11) y del botón "Activate partner" del rail (2, 3). "Edit lounge" y "Publish lounge" se mantienen.
- **Epic 10 · Activar solo desde el detalle.** `PartnerNew` (2) dibuja *Activate partner* deshabilitado en el rail del alta; en código el alta no lo muestra: se activa desde el detalle, una vez guardado el draft.
- **Epic 10 · Story 10.8 sin artboard propio.** El nombre del partner se añadió a pantallas de las Fases 3, 4 y 6 sin redibujar sus artboards: en la ficha (`/lounges/[id]`) una línea "at {partner}" bajo el nombre; en las tarjetas de `/explore`, el callout y la tarjeta de resultado, delante del barrio ("Halcyon Hotels · Midtown East · …"); en el rail de reserva, la confirmación, el recibo, el pase y "Upcoming" de `/my-pass`, delante de la dirección. Misma tipografía y color que la línea en la que entra. Sin partner, todo se ve como antes.
- **Epic 10 · El selector no ofrece partners suspendidos.** `LoungeDraftPartner` (12) solo muestra activos y draft; un partner suspendido no se puede asignar a un lounge nuevo hasta reactivarlo.
- **Epic 10 · Suspended sin rojo.** `Partners.dc.html` y los demás artboards de la Fase 10 pintan *Suspended* en `#D9826B`/`#E39A85`, pero el design system no admite verde ni rojo (§5 "Estados") y `globals.css` no tiene ese token. `PartnerStatusChip` usa el chip de "no disponible" (`StatusChip available={false}`). Si se quiere el rojo, hay que añadirlo antes a DESIGN-SYSTEM.md §2.

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
| El date picker de `/lounges/[id]/book` es mensual (día a día) y distinto del calendario semanal (franjas) de la Story 3.2 | Son dos widgets del design system con geometría propia (§4 "Date picker mensual" vs. "Calendario de disponibilidad"). Ambos leen la misma fuente real, `fetchAvailability` de `lib/lounge-profile.ts` (Epic 4 conectado) — no hay dos modelos de disponibilidad, solo dos vistas |
| Los cinco slots de llegada (`Main.dc.html`) reparten las plazas de su franja del catálogo, en vez de traer su propio número | El catálogo solo modela franjas (morning/afternoon/evening), no horas sueltas. `slotsFor` en `lib/booking.ts` divide `seatsLeft` de la franja entre sus slots, así que la suma nunca supera lo que ya declara `weeklyAvailability` |
| El modelo de negocio de precio (8 visitas/mes incluidas, day pass de $75 a partir de la 9.ª) es una decisión de producto asumida, no confirmada | Así lo advierte ya `DESIGN-SYSTEM.md` §6 (Fase 5): es la lectura que cubre a la vez "subscription pricing" e "individual day-pass pricing" de la Story 4.2. Ver `docs/PENDIENTES.md` |
| El rail del paso 1 (`Main.dc.html`) también desglosa "Day pass: Included" / "Estimated tax: $0.00" cuando `covered=true`, aunque ese artboard no dibuja esa variante | `Main.dc.html` no tiene un par "MembershipCovered" propio — solo `Payment.dc.html` lo tiene. Mostrar $81.66 en el paso 1 y saltar a $0.00 en el paso 2 sería más engañoso que extender la vocabulary visual que `MembershipCovered.dc.html` ya fija un paso después |
| La cuenta atrás "Slot held for M:SS" arranca en 10 minutos al entrar en `/lounges/[id]/book` y es continua entre los pasos 2 y 3 | El artboard no fija la duración exacta ("decisión de producto a confirmar", §6 Fase 5); 10 minutos es un valor de muestra razonable. Vive en `BookingContext`, no por pantalla, para que no se reinicie al pasar de Payment a Summary |
| El chequeo final de disponibilidad y el rechazo de pago son disparadores de muestra, no aleatorios | `isAtRiskOfWaitlist` ofrece la waitlist cuando el slot elegido tiene ≤2 plazas; `paymentWillDecline` falla solo con la tarjeta de muestra Mastercard·8801. Ambos son deterministas para que el estado se pueda alcanzar y probar, igual que el email duplicado de la Story 1.1 |
| Las tres alternativas de `Waitlist.dc.html` no navegan a nada al elegirlas | El criterio de la Story 4.1 es "ofrecer" la waitlist, no definir qué pasa al escoger cada alternativa (el flow tampoco lo especifica). Se muestran como opciones seleccionables; los botones fijos del pie ("Change date" / "Join waitlist") son los que actúan |
| La tercera alternativa de la waitlist ("The Vestry · 1.8 mi") es texto literal del artboard, no un lounge real ni un cálculo de cercanía | No existe en el catálogo ni hay lógica de "lounge más cercano a otro lounge" en ningún epic (Story 2.1 calcula distancia a la ubicación buscada, no lounge-a-lounge). Inventar ese modelo de datos está fuera del alcance de esta historia |
| `MembershipCovered.dc.html` aparece cuando la visita la cubre la membresía real | Superada con Epic 9: antes se alcanzaba con `?covered=1` (sin backend de membresía). Ahora `BookingProvider` pregunta a `booking_coverage` para el mes de la fecha elegida; la prop `covered` queda solo como fixture de tests de componente |
| `SAMPLE_MEMBER` gana un campo `email` (`lib/member.ts`) | Los artboards de la Fase 5 citan el correo de Alexandra Rivas en tres pantallas distintas (Confirmed, Payment, Receipt); antes solo vivía como texto literal repetido |
| `/lounges/[id]/book/confirmed` añade el enlace "view the email receipt" | Ningún artboard de la Fase 5 enlaza `Confirmed.dc.html` con `Receipt.dc.html`, pero sin él la pantalla del recibo (criterio de la Story 4.2) quedaría implementada y sin ruta para llegar a ella navegando |
| El recibo por email (`/lounges/[id]/book/receipt`) es la pantalla del estado, no un envío real | "Payment confirmation email receipt" (Story 4.2) exige backend real (SMTP). Se implementa visualmente la pantalla del email tal como llegaría, con los mismos datos de la reserva — la desviación que ya fija la cabecera de este documento |
| El `.ics` y la URL de Google Calendar de `AddToCalendarModal` son reales, no simulados | A diferencia del resto del Epic 4, generar un archivo de calendario y abrir Google Calendar son capacidades del navegador, no llamadas a un servicio de LuxePass — no hay ninguna regla que lo prohíba |
| `/my-pass/[reference]` alcanza los cuatro estados del pase (`Main`/`ArrivalDay`/`CheckedIn`/`Expired`) por `?state=`, no por el paso del tiempo | Sigue así tras conectar Epic 5 (21 sept 2026): no hay cron que dispare "hoy llegó" o "la ventana cerró" (esa automatización es Epic 6), así que el estado se elige por query param en vez de inventar un timer que nadie pidió — la diferencia es que ahora cada estado pinta la reserva real encontrada, no una fija |
| `/reception` es una ruta suelta, sin App shell ni pantalla de login | El patrón 12 es "solo el momento del check-in de un invitado" (`DESIGN-SYSTEM.md` §6 Fase 6); la lista diaria de invitados y el acceso del partner son el Epic 7 (`/partner`), una consola aparte. Se llega tecleando la URL, no desde la navegación del miembro ni desde `/partner` — el backend real de Epic 5 (RPC "de kiosco" concedidas a `anon`) mantiene la misma decisión a propósito, ver `docs/PENDIENTES.md` §2.7 |
| El código QR es el mismo SVG decorativo de 25×25 módulos del artboard, no una librería real | `DESIGN-SYSTEM.md` §6 (Fase 6) ya lo deja como pendiente ("al implementar se genera con una librería real sobre el LP#"); añadir una dependencia de generación de QR no cambia ningún criterio de aceptación (el check-in real de Epic 5 funciona tecleando el LP#, no fotografiando el QR), así que se queda para cuando haga falta que el código sea escaneable de verdad |
| El botón "Check in {firstName}" de `/reception` deshabilita y cambia de texto en vez de navegar a algún sitio | Ningún artboard dibuja el estado posterior de la consola de recepción; el efecto en el lado del miembro ya es la pantalla `CheckedIn` de `/my-pass/[reference]?state=checked-in`, alcanzable por separado. `firstName` sale del nombre real del miembro (Epic 5) — ya no es el literal "Alexandra" |
| `Main.dc.html`/`History.dc.html` de la Fase 7 sustituyen a `MyBookings.dc.html`/`NoShow.dc.html` de la Fase 6 en `/my-pass` | Son el mismo ítem de nav y la misma ruta rediseñados un epic después, con los cuatro estados de reserva y el flujo de cancelación que pide la Story 6.1. Se implementa el artboard vigente (el más nuevo), no los dos a la vez; la tarjeta con QR de la próxima visita que traía la Fase 6 se retira de la lista — sigue viva en `/my-pass/[reference]`, que no cambia |
| Las amenities preferidas de `/profile/preferences` son las 6 de `lib/amenities.ts`, no las 8 propias de `Preferences.dc.html` | Misma regla que ya fija este mapa para el perfil de lounge (Fase 4): una sola fuente de datos entre el filtro de Explore y aquí, para que una amenity preferida nunca sea una que el filtro no reconoce |
| Los lounges favoritos de `Preferences.dc.html` (The Ainsworth, The Vestry, Bergdorf Lounge) son datos literales en `lib/profile.ts`, no derivados del catálogo | Solo The Ainsworth está en las 12 lounges de `lib/lounges.ts`; The Vestry y Bergdorf Lounge son nombres de muestra que no están en el catálogo real — mismo criterio que ya fijaba `lib/passes.ts` antes de conectarse a Epic 5 (sept 2026), que ahora usa lounges reales |
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
| La topbar del admin (patrón 21) no lleva la campana de notificaciones | El patrón la dibuja con un badge, pero ningún artboard de la Fase 8 dibuja su panel; quedaba inerte. Decisión del 5 oct 2026 (ticket 002): no se usará, se quita junto con `AdminNotificationsButton` |
| El bloque de usuario de Partner y Admin lleva el icono `LogOut` en vez del `ChevronDown` | Los artboards (patrones 15 y 21) dibujan un chevron sin menú. Decisión del 5 oct 2026 (ticket 002): clic directo para cerrar sesión, con el mismo icono que el shell del miembro (`LogoutButton`) |
| Toda la fila de las tablas oscuras abre el detalle, con hover | Los artboards solo dibujan la flecha. Ticket 002: `TableRow` hace clicable la fila entera (salvo sus controles internos) y la flecha es un botón "View <nombre>" |
| "New case", "Filters" (`/admin/support`), "Modify booking"/"Open case" cuando no hay reserva próxima y "Move to another lounge" (`BookingOverrideDrawer`) no llevan a ningún sitio propio | Ningún artboard dibuja un formulario de caso nuevo, un panel de filtros de casos, ni una segunda pantalla para elegir lounge de destino — quedan inertes en vez de inventar una pantalla |
| Las tres sugerencias de "Not the person you are looking for?" (`/admin/members`) son leyenda, no botones con destino propio | Las tres capacidades que describen (buscar por referencia, por cargo de Stripe, listar cuentas cerradas) ya las resuelve el mismo cuadro de búsqueda de la pantalla — un botón que solo repitiera esa acción no aportaría nada nuevo |
| `/admin/members` lista todos los miembros (más recientes primero) con el buscador vacío, y el avatar muestra la foto de perfil cuando existe | El artboard solo muestra resultados tras buscar y pinta siempre iniciales. Pedido explícito del cliente interno (25 sept 2026): una pestaña Members vacía no tenía sentido. La foto la firma el admin gracias a la policy `admin select profile photos` (`supabase/schemas/storage.sql`); sin foto se mantienen las iniciales |
| La tabla de `MemberSearch.dc.html` reparte sus columnas con fracciones (`2fr 1.1fr 0.9fr 1fr 0.9fr`) en vez de los píxeles fijos del artboard | Los píxeles literales del artboard (`1fr 152px 128px 122px 112px 30px`) dejan la columna de miembro en ~94px una vez restados el rail de 344px y el resto de columnas — friable para un nombre real. Las fracciones reparten el mismo ancho total de forma proporcional en vez de fija |
| El segmented "14 days / Month / Quarter" de `/admin/analytics` solo cambia su propia selección, no los datos | `lib/admin-analytics.ts` solo modela la quincena del 1 al 14 de septiembre que fija `DESIGN-SYSTEM.md` §6 (Fase 8); no hay otro dataset que enseñar, igual que el rango fijo "Sep 1 – Sep 14" del Epic 7 |
| Los enlaces "Revenue by partner (CSV)" y "Open the acquisition report" (`/admin/analytics`) navegan a `/admin/reports?dataset=` con el dataset ya elegido | `Export.dc.html` no fija cómo se llega con un dataset preseleccionado, pero sin ese enlace el criterio "revenue reporting by partner" quedaría implementado y sin una ruta coherente para alcanzarlo desde donde se menciona |
| Las fechas rápidas de `/admin/reports` ("Last 7 days", "Last month", "Quarter to date") cambian la etiqueta del rango a un texto de muestra, no recalculan un calendario real | No hay reloj de negocio ni motor de fechas detrás; los tres textos son los mismos que citaría un cálculo real para el 14 de septiembre, fijados a mano como en el resto del proyecto sin backend |
| Marcar una columna personal en `/admin/reports` exige escribir un motivo antes de poder descargar | `DESIGN-SYSTEM.md` §6 (Fase 8) fija la regla ("marcar una de esas tres columnas exige un motivo que queda registrado"); se implementa como una validación real del formulario, no solo como el texto que la anuncia |
| "Email it to me" (`/admin/reports`) queda deshabilitado — visible, con subtítulo "Coming soon", pero no seleccionable | `send-admin-report` solo autentica por `x-webhook-secret` (el mismo secreto de Vault del cron `dispatch_scheduled_reports`), y ese secreto no puede vivir en el bundle del cliente sin dejar de ser un secreto. Mismo criterio que Apple Pay/Google Pay en `Payment.dc.html`: botón real, presente, inerte hasta decidir una vía de invocación segura para el admin autenticado (p. ej. una RPC `SECURITY DEFINER` que verifique `has_role('admin')` y dispare el mismo webhook por su cuenta). Ver `docs/PENDIENTES.md` §4.7 |
| "New report" (`/admin/reports/scheduled`) enlaza a `/admin/reports?delivery=schedule` en vez de abrir un formulario propio | El propio artboard lo dice: "every scheduled report is one of the exports on the previous screen, saved with its filters and columns" — no hay una segunda pantalla de creación que inventar |
| "Delivery history" (`/admin/reports/scheduled`) y "Add a filter"/"Select all" cuando incluye columnas personales sin motivo ya puesto no llevan a ningún sitio | Ningún artboard dibuja el historial de entregas completo ni un selector de filtros propio — quedan inertes, igual que "New case" en el Epic 8.1 |
| La selección de la barra de acción masiva (`/admin/lounges`) empieza vacía, no con "3 lounges selected" como fija el artboard | El artboard congela un estado intermedio de la interacción; una casilla que arranca marcada sin que nadie la haya pulsado sería el estado real equivocado. Se implementa interactiva desde cero, como el resto de checkboxes del proyecto |
| Los botones "Update hours", "Add an amenity" y "Set closure dates" de la barra de acción masiva no llevan a ningún sitio | Ningún artboard dibuja el modal de edición masiva — quedan inertes, igual que el resto de botones sin destino de la Fase 8. "Search lounges", el filtro de ciudad, Live/Draft (1 oct 2026, artboards 27–28) y "Archive" sí son reales |
| La lista de `/admin/lounges` va del más nuevo al más antiguo (`created_at desc`), no con los cambios pendientes primero | Decisión del 1 oct 2026: el admin busca primero lo que acaba de dar de alta. El chip "N to approve" sigue marcando la fila |
| El horario de `/admin/lounges/new` y del borrador es editable por días (interruptor + desplegables), no la rejilla de 7 celdas de 19/23 | Se conserva el editor de horario de 8.3 (`LoungeNew`, 14); los artboards solo resumen el horario. La semana empieza el lunes en los dos |
| Sin cola de aprobación: un lounge live se edita pasándolo a borrador y se vuelve a publicar directo (artboards 17–19 en vez de 12–13) | Decisión del usuario (29 sept 2026) — cualquier admin publica. Deja sin implementar el criterio "Content approval workflow" de la Story 8.3; las tablas/RPC de la cola (`lounge_content_submissions`, `admin_submit_*`/`admin_approve_*`/`admin_reject_*`) siguen en la base sin uso, ver `docs/PENDIENTES.md` §4.12 |
| `LoungeLive` no muestra la tarjeta "Live since" del artboard (fecha de publicación, reservas por delante) | No hay columna con la fecha de publicación ni el recuento en `admin_lounge_detail`; queda fuera hasta que se pida |
| El pie del panel de marca de `/partner/welcome` dice "Invited by En Soleil", no "Invited by Priya Raghunathan · En Soleil" | Mostrar quién invitó exigiría exponer el nombre del admin al partner (otra lectura con RLS propia); el email sí lo nombra. Lo mismo el pie de `InviteExpired` ("Partner accounts are issued by En Soleil" en vez de "The Larkspur · invited by En Soleil"): con el enlace caducado no hay sesión para saber de qué lounge se trata |
| Los botones de 44px sin fondo dorado (`Assign to me`, `Escalate`, `Keep the fee and reply`, `Preview as a member`, `Send back to Theo`, `Approve one by one`, `Open the lounge editor`, `Send back with a note`, `Cancel`) llevan `normal-case` | El primitivo `Button` pone mayúsculas siempre (§4 solo la fija para el botón de 52px dorado); los artboards de la Fase 8 no llevan `text-transform:uppercase` en estos botones fantasma — mismo ajuste que ya documentó la Fase 7 para sus botones de fila |
| "Update hours" no sube a primitivo compartido con "Set closure dates" pese a tener la misma geometría | Ambos son `BulkActionButton` sin lógica propia — no hace falta una segunda variante, solo texto distinto |
| `MEMBERSHIP_SUMMARY.memberSince` (Epic 6) pasa de "March 2026" a "November 2025" | `Profile.dc.html` decía a la vez "Member since March 2026" y "Renews November 3, 2026", que no forman un término de doce meses. `DESIGN-SYSTEM.md` §6 (Fase 9) exige elegir uno de los dos al implementar: se conserva la renovación (citada en varios artboards de la Fase 9) y se corrige el alta — mismo criterio que el corazón de favorito que la Fase 7 dejó pendiente para que lo resolviera la Fase 4 |
| `AutoRenewModal` (`AutoRenew.dc.html`) solo se abre para el plan anual | El plan mensual no tiene artboard propio del mismo diálogo con sus cifras — "Manage renewal" y el `Switch` quedan inertes con un plan mensual activo, igual que otros controles sin destino documentados aquí. Sigue igual tras conectar Epic 9 |
| "Switch to monthly" (`/profile/membership/plans`, cuando el actual es el anual) abre `ScheduleMonthlyModal`, una confirmación sin artboard propio | Superada: antes quedaba inerte. Desde Epic 9 (petición explícita del usuario) programa el paso a mensual para el final del término, sin cobro hoy — misma anatomía de `Upgrade.dc.html`, ver "Backend real — Epic 9" |
| `UpgradeConfirmModal` (`Upgrade.dc.html`) se reutiliza en tres puntos de entrada | "Switch to annual" de `/profile/membership` y de `/profile/membership/plans` (con plan mensual) abren el mismo modal; desde Epic 9 también "Choose monthly"/"Choose annual" de `/profile/membership/plans` sin membresía — el alta, sin artboard propio, reutiliza la misma anatomía sin la línea de crédito ("Pay … and join"). Decisión de producto confirmada con el usuario (23 sept 2026) |
| Las filas de la tabla de invitaciones, "Send again" en la fila expirada, "Use a day pass", "Update" y "Invoices and receipts" de la card de facturación y "Change" en el modal de plan no llevan a ningún sitio | Ningún artboard de la Fase 9 dibuja su pantalla de destino (el perfil de un amigo referido, un formulario de reenvío, un selector de day pass, un formulario de tarjeta, una lista de facturas) — quedan inertes, igual que el resto de botones sin destino ya documentados en este mapa. "View" del aviso de day passes sí lleva ya a `/profile/membership/referrals`, donde se listan |
| El botón "Open referrals" del rail de Referrals no aparece mientras la cuenta no haya compartido su código | `MonthlyPlan.dc.html` termina en la caja del código sin invitaciones que resumir ("None sent"). `ReferralSummaryRailCard` lo omite cuando `referralsSentCount` es 0; desde Epic 9, `/profile` ofrece además "Share your code", que lleva a `/profile/membership/referrals` para compartir por primera vez |
| El resaltado de `RewardCredited.dc.html` (tile "Day passes earned", card de day passes y fila) aparece cuando un premio se acreditó en las últimas 48 h | Superada con Epic 9: antes se alcanzaba por `?state=credited`; ahora lo decide el evento real (primer pago liquidado del amigo, `referrals.credited_at`). Las dos notificaciones del artboard ("… joined" y "Your referral day pass is ready") son filas reales de `notifications`, así que `NotificationBellMenu` ya no necesita la prop `extraItems` (retirada) |
| La rejilla de `ReferralInvitationsTable` no usa los píxeles literales de `.rrow` (`minmax(0, 1fr) 148px 196px 128px`, `gap:14px`) | Medido en un navegador real a 1440×900 — el propio `Referrals.dc.html`, sin tocar nada de nuestro código — esas cifras ya exceden el ancho de la columna principal (512px menos el rail de 344px y el subnav de 232px deja ~470px de contenido; 148+196+128+3×14=514 no cabe), así que la columna "Friend" queda a 0px y el resto se solapa: un defecto del propio artboard, no de la implementación. Se reparte con `minmax(96px,1fr) 74px 146px 100px` y `gap:10px` — mismo criterio que ya aplicó `MemberSearch.dc.html` (columnas por fracción en vez de píxeles fijos) |
| El bloque de usuario de la sidebar (`AppShell`) muestra el miembro con sesión y su plan en las tres vistas de Membership | `DESIGN-SYSTEM.md` §6 Fase 9 lo pide ("el bloque de usuario de la sidebar lo dice"). `AppShell`/`AccountShell` tienen una prop opcional `member` (por defecto `SAMPLE_MEMBER`); desde Epic 9 las vistas de Membership le pasan el nombre real y "Annual member"/"Monthly member"/"Member" según `memberships` — el resto de la app sigue con `SAMPLE_MEMBER` |
| Las secciones de temporadas y cierres se editan sobre la vista del lounge live y cada alta, edición o borrado se guarda al momento; no hay modo "Editing" con Cancel / Save changes en la cabecera | Los artboards 17–21 dibujan la cabecera en modo edición y SeasonalEdit dice "Saved with the lounge when you press Save changes", pero el propio canvas (rail "Stays live", SeasonalFilled) y el criterio 8 de la Story 10.9 piden que el lounge siga live; en esta app "Edit lounge" lo pasa a borrador. El texto de ayuda dice "Saved straight onto the lounge — it stays live" |
| "Why it can't be added" del rail de SeasonalOverlap no se pinta | Los dos motivos ya salen bajo cada fecha ("Overlaps …", "Ends before it starts") y el botón queda deshabilitado; la tarjeta del rail repetía lo mismo |
| El aviso de reservas de un cierre muestra miembro, día y hora, sin número de invitados | `bookings` no guarda invitados; los artboards (21) los inventan |
| Las fechas usan `<input type="date">` nativo | El artboard dibuja el valor formateado ("Jun 1, 2026"); el control nativo da el calendario y teclado accesibles sin primitivo nuevo |
| En un lounge nuevo, temporadas y cierres se guardan en el formulario y se escriben con el primer guardado | Cada temporada/cierre cuelga de `lounges.id`, que no existe hasta entonces (`useLoungeSchedule(null)` + `persistLoungeSchedule`); en un borrador ya guardado o en un lounge live se escriben al momento |
| La miniatura que sube dice "Uploading" sin porcentaje ni "Queued · next" | PhotoUploading (25) dibuja el progreso (64 %, 198 de 310 KB); `supabase-js` no expone el progreso de una subida a Storage. Las fotos en cola esperan en el editor, que se abre para la siguiente al confirmar la anterior |
| Si una subida falla, la miniatura desaparece y se muestra el error; no hay "Retry" | La nota de PhotoUploading propone Retry en la miniatura; sin progreso real el reintento es volver a elegir el archivo |
| Se guarda el original de cada foto (no solo el recorte) | Los artboards 23–25 decían "the original stays on your computer", pero PhotoRecrop (26) reencuadra sobre "Original · kept". Decisión del 2 oct 2026: se guarda (`lounge_images.original_url` + `crop`) y la copy del pie dice "The original is kept so you can adjust the crop later" |
| "Adjust crop" es un icono sobre la miniatura y "Details" es la propia miniatura | PhotoRecrop dibuja dos botones con texto bajo la foto; en las miniaturas de 86 px de la columna derecha no caben. Una foto sin original (sembrada o subida antes del editor) se reencuadra sobre sí misma, que pasa a ser su original |
| La columna Checklist del detalle del partner cuenta 4 puntos, no 6 | Los artboards 28–34 dibujan "6 of 6" (con fotos), pero publicar exige contacto, dirección, horario y plazas (más el partner activo, que es del partner): `lounge_checklist_missing`, la misma función que usa `admin_publish_lounge` |
| Partner details y Partner users no se pliegan en el detalle del partner | Los artboards de la 10.11 los dibujan plegados solo para que la tarjeta Lounges quepa en 900 px; la página ya hace scroll |
| La confirmación (33) se usa para las cuatro acciones con el mismo esquema | El artboard solo dibuja la de status; las de horario, temporada y cierre listan los lounges que cambian y los que se saltan, igual |
| Sin "Logged as one bulk change by …" en el resultado | No hay registro de auditoría de acciones masivas; cada lounge se cambia con su RPC de siempre |
| En el aviso de temporada que choca no hay "Open Brooklyn Heights" ni "Remove it from the selection"; en el cierre, sin "See them in Bookings" | El lounge que choca se salta solo y sale en la confirmación; los enlaces no llevan a ninguna pantalla que filtre por esas reservas |
| La reapertura del cierre masivo propone el día siguiente al fin a las 10:00 AM | En el cierre de un solo lounge (10.9) se calcula con su horario; con varios lounges cada uno abre a una hora distinta. El admin la cambia en el modal |
| "Set hours" sustituye el horario de lounges live sin pasarlos a borrador | Lo pide la historia (mismo horario para varios lounges, cualquier status); temporadas y cierres no se tocan (`admin_set_lounge_hours`) |
| Story 8.4 (`/admin/bookings`): bajo el nombre dice "Membership"/"Day pass", no el plan ni los acompañantes del artboard | `bookings` no guarda acompañantes; "Day pass" sale de un pago `succeeded` ligado a la reserva, igual que en `partner_guest_list` |
| Story 8.4: tarjeta "Seats by band" y estado vacío "No bookings match…" sin artboard propio | La tarjeta solo aparece con un lounge elegido (criterio de la historia) y el artboard dibuja "All lounges"; ambas reutilizan la tarjeta del rail y la tabla de la misma pantalla |
| Story 8.4: filtro por partner, lounge escribible, calendario al pulsar la fecha y "Change the status" en el drawer | Pedidos por el usuario tras ver la pantalla (13 oct 2026), sin artboard propio: reutilizan `Select`, las filas de `CityFilterPopover`, `MonthCalendar` (§4) y `PaymentOptionRow`. Los filtros pasan a dos filas en 1440px. El botón "Previous month" del calendario conserva el fondo claro de la Fase 5 |
