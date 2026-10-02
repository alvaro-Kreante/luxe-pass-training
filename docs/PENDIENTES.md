# LuxePass — Pendientes

Registro vivo de lo que queda abierto en el proyecto: lo que falta, lo que es
provisional y lo que hay que decidir. **Al terminar una historia, revisar este
archivo**: añadir lo que quede abierto y cerrar lo que se haya resuelto.

Aquí no van las tareas normales de implementación —para eso está el estado por
epic en `CLAUDE.md`— ni las decisiones ya tomadas, que viven como desviaciones en
`docs/design/COMPONENT-MAP.md`. Aquí va lo que **sigue sin resolver**.

Formato de cada entrada: qué falta · por qué está abierto · qué lo desbloquea.

---

## 1. Bloqueado por contenido o assets del cliente

### 1.1 Iconos de la PWA

`public/manifest.json` referencia **seis imágenes que no existen** en el repo:

```
icons        /icons/icon-192.png · /icons/icon-512.png
             /icons/icon-192-maskable.png · /icons/icon-512-maskable.png
screenshots  /icons/screenshot-1.png · /icons/screenshot-2.png
```

No hay carpeta `public/icons/`. La consecuencia: al instalar la PWA, el sistema
operativo cae en un icono genérico y la ficha de instalación va sin capturas.

Se pueden derivar de `assets/brand/logo.png` (300×318), pero los **maskable**
necesitan su propia zona de seguridad: el sistema los recorta en círculo o
"squircle" según la plataforma, y el logo a sangre perdería los bordes. Es una
decisión de diseño, no un redimensionado.

**Desbloquea:** que el diseñador entregue el icono con su zona de seguridad, o
que se acuerde generar una versión provisional desde el logo.

### 1.2 Texto legal de Términos y Privacidad

El contenido de `src/components/onboarding/terms-modal.tsx` es **relleno
estructural**: tiene la forma y la extensión de un documento real para que el
modal se pueda diseñar y probar, pero no es el texto legal de En Soleil.

Ya venía advertido en `DESIGN-SYSTEM.md` §6 (Fase 1) para el artboard; ahora
aplica igual al código.

**Desbloquea:** el documento real del cliente. Al sustituirlo, subir también
`DOCUMENT_VERSION` en ese mismo archivo, porque la pantalla registra la
aceptación con fecha y versión.

---

## 2. Provisional — cae solo al avanzar los epics

### 2.1 La nav del App shell apunta a pantallas que aún no existen

El App shell (patrón 3) fija la navegación completa del área de miembro
— Home · Explore · My Pass · Profile — porque así la declara el design system y
así la dibujan todos los artboards de las Fases 1 y 3. Las cuatro ya existen
desde el Epic 6.

El link "Log out" del App shell sigue apuntando a `/login` en vez de cerrar una
sesión real — nota desactualizada: Supabase Auth es real desde Epic 1, así
que sí hay una sesión que cerrar (`supabase.auth.signOut()`, ya usado por el
flujo de borrado de cuenta de la Story 6.3), simplemente nadie ha
conectado todavía este link concreto.

**Se resuelve:** ningún AC de ninguna historia pide "Log out" explícitamente
(es un elemento fijo del App shell, patrón 3, no de una historia), así que
queda fuera de esta rama por alcance — candidato obvio para la próxima vez
que se toque el App shell.

### 2.2 Enlace "I have verified my email"

En `/verify-email` hay un enlace que avanza al alta manualmente. Sin backend, el
enlace del correo de verificación no puede devolver al usuario a la app, y sin él
el flujo quedaría cortado.

**Se sustituye:** por la ruta `/verify-email/[token]` cuando exista la API de
verificación.

### 2.2 El proveedor de mapa real y sus dos estados de borde — resuelto

**Resuelto** (sept 2026): Google Maps real (`@vis.gl/react-google-maps`),
decisión tomada con el usuario. Los cuatro criterios de sistema/red de la
Story 2.1 ya tienen su condición real:

| Qué | Cómo está ahora |
|---|---|
| Permiso de ubicación | `lib/geolocation.ts` llama a `navigator.geolocation` de verdad |
| Error de carga del mapa | `useMapLoadStatus` — timeout real de 3s + `onError` del `APIProvider`, ya no `?map=error` |
| Modo offline | `useOnlineStatus` — `navigator.onLine` real + eventos `online`/`offline`, ya no `?offline=1`. El service worker real (qué queda "cacheado" de verdad) sigue sin construirse |
| Carga de la lista | `LoungeList` recibe un `loading` real de `fetchLounges` |

### 2.3 El plano de `\/explore` — resuelto

**Resuelto** (sept 2026): `city-map-base.tsx` (el SVG de `Main.dc.html`) se
sustituyó por Google Maps real, conservando `CityMap` — markers, controles,
callout, escala — tal como anticipaba `DESIGN-SYSTEM.md` §6 (Fase 3). Detalle
en `docs/design/COMPONENT-MAP.md` "Backend real — Epic 2".

### 2.4 El perfil de lounge no tiene datos de detalle propios para 16 de los 17 lounges — resuelto

**Resuelto** (sept 2026, Epic 3 conectado a Supabase local): contacto,
horario, capacidad y restricciones son columnas reales de `public.lounges`
para los 17 lounges — ver `docs/design/COMPONENT-MAP.md` "Backend real —
Epic 3". Solo **The Ainsworth** (artboards de la Fase 4) y **Belmont
Terrace** (`NoRatings.dc.html`) siguen con contacto literal citado del
mockup; el resto recibe contacto plausible sembrado con la misma fórmula
de antes — ya no derivado en cada carga, sembrado una vez en la migración.

**Sigue sin resolver, a propósito:** el contenido de cada reseña individual
(nombre, texto), el desglose por estrellas y "what members mention" siguen
siendo datos de muestra — ninguna historia permite dejar una reseña, así
que no hay tabla `reviews` (ver `docs/DATA-MODEL-MAP.md`).

### 2.5 "Write a review" no hace nada

El botón de `RatingSummary` no tiene una pantalla de destino: ninguna historia
de los 9 epics cubre redactar una reseña, solo leerlas (Story 3.1).

**Se resuelve:** cuando una historia futura defina esa pantalla.

### 2.6 El QR del pase es decorativo

`QrCode` (`src/components/ui/qr-code.tsx`) dibuja el mismo SVG de 25×25 módulos
que ya fijaban los artboards de la Fase 6: no codifica de verdad el LP# que
recibe por prop, así que un lector real no obtendría nada útil de él.
`DESIGN-SYSTEM.md` §6 (Fase 6) ya avisaba de esto al diseñar la pantalla.

**Se resuelve:** añadiendo una librería de generación de QR cuando el pase
tenga que ser escaneable de verdad, no solo mostrarse.

### 2.7 `/reception` sigue sin login propio ni vivir bajo `/partner`

El Epic 7 ya trae su `Login.dc.html` y su shell (`/partner/login`, `/partner`),
pero `/reception` (patrón 12, Epic 5) sigue siendo una URL suelta sin
verificación de que quien la abre sea personal del lounge. Ninguna de las tres
historias del Epic 7 pide mover la consola de recepción ni fusionarla con el
dashboard — son artboards distintos (un kiosco de check-in vs. un back-office)
— así que se deja como estaba, documentado como desviación consciente en
`docs/design/COMPONENT-MAP.md`.

Al conectar Epic 5 a Supabase (21 sept 2026, decisión tomada con el usuario)
esta misma falta de login se trasladó **a propósito** al backend: las
funciones `reception_*` (`supabase/schemas/bookings.sql`) son RPC "de
kiosco" concedidas a `anon`, autorizadas solo por LP# + lounge + fecha — no
se esperó a que Epic 7 resolviera el rol de staff, tal como
`docs/DATA-MODEL-MAP.md` ya anticipaba que esa decisión era "al empezar
Epic 7, no antes".

**Rol de partner ya resuelto** (22 sept 2026, al conectar Epic 7 — tabla
`user_roles`, ver `docs/DATA-MODEL-MAP.md` §Epic 7), pero `/reception`
**sigue sin moverse detrás de ese login a propósito**: ninguna de las tres
historias del Epic 7 lo pide (siguen siendo artboards distintos, kiosco vs.
back-office).

**Se resuelve:** si una historia futura pide explícitamente que la recepción
viva detrás del login de partner (p. ej. `/partner/reception`), no antes —
ese mismo momento es el que debería endurecer las RPC de kiosco a exigir
`has_role('partner')` en vez de `anon`.

### 2.8 "Settings" del Partner Dashboard no tiene pantalla propia

El sidebar de `/partner` (patrón 15) fija la nav completa — Today · Guests ·
Analytics · Reports · Settings — porque así la declara `Main.dc.html`. Las
cuatro primeras ya tienen ruta; **"Settings" queda inerte** (sin `href`), igual
que "Membership" en el sub-nav de cuenta (ver 2.1b). Los tres emails del
Epic 7 mencionan "Settings → Notifications" para elegir quién del equipo
recibe cada aviso, pero esa vista no está diseñada — `DESIGN-SYSTEM.md` §6
(Fase 2) ya la deja fuera de las tres historias.

**Se resuelve:** cuando una historia futura diseñe esa pantalla.

### 2.9 Mini-mapa embebido en el perfil de lounge sigue sin construirse

Con Google Maps ya real en `/explore` (§2.3, resuelto) y Epic 3 ya conectado
a Supabase (`lounges.lat`/`lng` reales, disponibles también en el perfil),
sigue fuera de alcance añadir un mapa embebido en `/lounges/[id]` (Story 3.1)
junto a los botones Call/Directions — el único motivo que queda es que no
existe ningún artboard con un hueco de mapa en esa pantalla.

**Desbloquea:** que una historia futura diseñe ese hueco en el artboard.

### 2.10 `lounge_availability` (Epic 3) era un seed estático — **resuelto (25 sept 2026)**

Señalado por el usuario al revisar Epic 3 (17 sept 2026): las plazas por
lounge/fecha/franja eran un seed escrito una vez por
`supabase/migrations/..._seed_lounge_profiles_story_3.sql` (18 semanas
desde `TODAY`), así que un lounge dado de alta después no tendría
disponibilidad sin otra migración. Se dejó como deuda consciente hasta que
el alta de lounges (Story 8.3) lo necesitó.

Resuelto en `refactor/live-lounge-availability`: la tabla se eliminó y la
disponibilidad se calcula en vivo (`lounge_availability_range`, ver
`docs/design/COMPONENT-MAP.md` "Backend real — Epic 3"): `capacity` (aforo
**por franja**, confirmado por el usuario) − reservas que ocupan plaza,
con la plantilla de `lounges` (`bands`/`closed_weekdays`) +
`lounge_closures` para decidir qué franjas abren. Cualquier lounge, nuevo
o viejo, es reservable sin sembrar nada. Consecuencia visible: los estados
"Full"/"Filling fast" del demo ya no salen de valores sembrados, solo de
reservas reales (aforo sembrado: 40 por franja).

"Add lounge" (Story 8.3) ya no está bloqueado por disponibilidad; sigue
sin formulario por falta de artboard (ver §3, fila 8.3).

### 2.11 La promoción automática de la waitlist no tiene mecanismo real en ningún epic

El flow de Epic 7 (`flow-partner-experience.md`, segmento Story 7.2) termina
en "Waitlist promotion alerts", y el mockup lo simulaba (`applyCancellationAndPromotion`
en `lib/partner.ts`, ya eliminado al conectar el epic). Al conectar Story 7.2
a Supabase real (22 sept 2026) se implementó la notificación real de
cancelación (`notify_partner_cancellation`, `supabase/schemas/partner_notifications.sql`),
pero **no** una promoción automática: `join_waitlist` (Epic 4) aparca la
reserva en `status='waitlisted'` y ninguna función de ningún epic conectado
hasta ahora la sube a `confirmed` cuando se libera un hueco. Construirlo
habría expandido el alcance del Epic 4 (dueño real de `bookings`), no del 7
— se documenta aquí como hueco real en vez de simularlo o inventarlo.

**Desbloquea:** que una historia futura (probablemente una extensión de
Epic 4, "Waitlist management") defina y construya esa promoción automática.

El cron de recordatorios de la Story 5.3 (`dispatch_booking_reminders()`,
ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 5") sigue sin
poder ejercitarse de punta a punta en este entorno: usa el reloj real
(`now()`) para "24 horas antes", y aunque la disponibilidad ya se calcula
en vivo para cualquier fecha, el calendario de reserva parte del `TODAY`
fijo de la app (2025-09-09, `src/lib/availability.ts`) — ninguna reserva
hecha desde la UI cae en esa ventana. Lo mismo el aviso de las 6 AM de la
Story 6.2 (`dispatch_morning_notifications()`), el digest del partner
(7.2) y los reportes programados (8.2). El único ancla que queda es ese
`TODAY` fijo.

### 2.12 Epic 9: day passes sin gastar y otros huecos reales

Conectado Epic 9 (23 sept 2026), quedan huecos conscientes — decisiones de
alcance tomadas con el usuario, no simulaciones:

- **Un cobro de renovación rechazado no se reintenta.** Si la tarjeta
  guardada falla al vencer el término, la membresía vence en el acto (y se
  avisa en la app); no hay periodo de gracia ni reintentos como haría
  Stripe Billing (Smart Retries), ni email del fallo. Tampoco se gestiona
  una tarjeta que exija autenticación 3DS off-session — cuenta como fallo.
  **Desbloquea:** decidir una política de reintentos/gracia.
- **El límite de 10 day passes de referido por año (Terms §5) no se
  aplica.** Los day passes ya se gastan de verdad al reservar
  (`booking_coverage.sql`), pero no hay tope anual. "Use a day pass" en
  `/profile/membership/referrals` sigue sin destino propio — se gastan solos
  al reservar, sin elegir cuál.
- **Un pago reembolsado no retira el premio de referido** (Terms §3: "If
  that payment fails or is refunded, the pending reward is withdrawn") —
  un pago fallido nunca lo acredita, pero un reembolso posterior (Story
  8.1) no lo deshace.
- **La ficha de miembro del admin (`/admin/members/[id]`) ya muestra el plan
  real** (25 sept 2026), pero no la fecha de renovación ni las visitas del
  mes que dibujaba el mock — enriquecerla más no es AC de Epic 9.
- **Cuentas creadas antes de Epic 9** (staging/prod) conservan
  `profiles.membership_status = 'active'` sin fila en `memberships` — el
  cambio de default a `'inactive'` solo afecta a perfiles nuevos, y una
  migración declarativa no hace backfill de datos. Decidido con el usuario
  (opción A): dejarlas sin plan — siguen usando la app y pagan cada visita
  como day pass. **Pendiente: ejecutar a mano
  `scripts/sql/epic9-backfill-membership-status.sql`** en Studio → SQL
  Editor de `luxepass-dev` y `luxepass-prod`, después de que CI aplique las
  migraciones de Epic 9 (idempotente; probado en local dentro de una
  transacción).
- **El seed de notificaciones de Epic 6 sigue sembrando "Your membership
  renews soon"** a todo perfil nuevo, aunque ahora nazca sin membresía.
  Retirarla rompe los tests de Story 6.2 que la usan como muestra; queda
  para una limpieza de Epic 6.

---

## 3. Criterios de aceptación cubiertos solo de forma declarativa

Criterios que exigen backend y que, siendo este repo solo diseño, se resuelven
enunciándolos en pantalla en lugar de implementarlos. **No son deuda a corregir
aquí** — se listan para que quede constancia de que la pantalla los menciona pero
nada los hace cumplir.

| Historia | Criterio | Cómo está |
|---|---|---|
| 1.1 | Welcome email with app download links | Pantalla `/welcome` con los botones de tienda; no se envía correo. Supabase Auth solo manda el de confirmación de forma nativa; un segundo correo exigiría Database Webhook + Edge Function — decisión tomada con el usuario de no añadirlo (ver `COMPONENT-MAP.md` §Backend real) |
| 1.2 | "Remember me" como segundo modo de sesión (persistente vs. solo-de-sesión) | Decisión tomada con el usuario: implementarlo de verdad exigiría que el middleware conociera esa elección en cada refresco de token — desproporcionado para una historia marcada como pequeña. El checkbox se queda como preferencia de UI con su nota explicativa; `inactivity_timeout` (30 días) es real pero global, no depende de si se marcó. Ver `COMPONENT-MAP.md` §Backend real |
| 2.1 | Offline mode shows cached nearby locations | Los "cacheados" son los seis más cercanos del catálogo real; `navigator.onLine` ya es real (§2.2), el service worker que guardaría datos de verdad no interviene todavía |
| 2.1 | Distance display in miles/km based on user preference | El toggle de la topbar convierte una distancia real (Haversine, ver `COMPONENT-MAP.md` §Backend real — Epic 2), pero la unidad sigue sin leerse del teléfono ni recordarse entre visitas |
| 3.1 | Call and Directions quick action buttons (google maps url) | Enlaces reales (`tel:` y Google Maps con la dirección de muestra); no hay verificación de que el teléfono o la dirección existan |
| 3.1 | Share lounge option via social/messaging apps | Los destinos (Messages, WhatsApp, Instagram…) son botones sin integración; solo "Copy" usa una API real del navegador (`navigator.clipboard`) |
| 4.2 | Apple Pay and Google Pay integration | El Payment Element de Stripe los ofrece automáticamente, pero exigen dominio verificado que no funciona en `localhost` ni sin el rollout de Vercel (`docs/PENDIENTES.md` §4.4) — pueden quedar visualmente presentes pero inertes hasta ese rollout, no es una simulación sino un gap de infraestructura |
| 5.1 | Booking expires automatically after booking window | **Sigue igual tras conectar Epic 5 y Epic 6 (21 sept 2026).** No hay cron que mueva una reserva vencida a completed/no-show por el paso del tiempo — ninguna historia de Epic 6 lo pedía como AC, así que no se construyó: los cuatro estados del pase se siguen eligiendo por `?state=` en `/my-pass/[reference]`, ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 5" |
| 5.2 | Emergency contact information accessible to staff | **El mecanismo de acceso ya es real** (`reception_lookup_booking` lee `profiles.emergency_contact_*`) — lo que sigue sin ser real es el registro de "cada acceso queda registrado" (solo texto) y la propia captura del dato: `/profile/privacy` (Story 6.3, ya conectada) LEE el contacto real, pero "Edit" para escribirlo sigue inerte — sin artboard propio para ese formulario |
| 6.1 | No show policy enforcement - flat fee | **Resuelto tras conectar Epic 6 (21 sept 2026), a medias a propósito.** El fee de $35.00 se registra de verdad (`bookings.cancellation_fee_cents`, tanto en `cancel_booking` como en `reception_report_no_show`) — decisión tomada con el usuario: no se cobra de verdad contra Stripe, solo se anota |
| 6.1 | Support contact for booking issues - Admin | Las filas "Something wrong with a booking?" / "Disagree with a fee or a no-show?" siguen sin abrir ninguna conversación — la consola de soporte (Epic 8, ya conectada) no tiene un flujo de "abrir un caso desde la reserva del miembro", solo el "New case" inerte de `/admin/support` |
| 6.2 | New lounge partner announcements / Membership renewal reminders / Special offers and promotions / Birthday month promotion | **Parcialmente resuelto tras conectar Epic 6 (21 sept 2026).** Dependen de datos que Epic 7/9 todavía no modelan de verdad, así que se siembran como notificaciones de muestra REALES (filas de verdad en `notifications`, no sintéticas del cliente) al crear el perfil — ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 6" |
| 6.2 | Ajustes de canal (push/email/sms) | Los switches de `/profile/notifications` cambian solo el estado local del componente; ningún AC de la Story 6.2 pide persistirlos, así que se quedan de muestra a propósito (decisión tomada con el usuario) |

| 7.1 | Real-time updates when new bookings are made | La reserva de Naomi Feldstein llega por un `setTimeout` determinista al entrar en `/partner` (`applyLiveBooking`), no por un canal en vivo contra un backend |
| 7.1 | Check-in status tracking / no-show reporting | El estado de cada invitado vive en `useState` de `TodayDashboard`; no hay "app del miembro" real que reciba el check-in al marcar la casilla, solo el aviso de que lo haría |
| 7.2 | Email notification for each new booking / morning digest / cancellation notifications | Las tres son pantallas del email tal como llegaría (`/partner/emails/*`), igual que `Receipt.dc.html`/`Reminder.dc.html`; no se envía ningún correo ni se programa el digest de las 6:30 AM |
| 7.2 | Waitlist promotion alerts | La promoción de Victor Almeida es el mismo `setTimeout` determinista que la cancelación de Harriet Osei (`applyCancellationAndPromotion`), no una cola de espera real |
| 7.3 | Weekly/monthly booking volume reports / revenue attribution / repeat guest identification | `lib/partner.ts` fija cifras de muestra que cuadran entre sí (187 reservas, $8,616.50, 412 miembros); no hay un almacén de reservas real del que agregarlas |
| 7.3 | Downloadable reports in CSV | Las descargas de `/partner/guests`, `/partner/analytics` y `/partner/reports` son CSV reales generados en el cliente (`downloadTextFile`); los "informes descargados recientemente" de `Reports.dc.html` son metadatos de muestra, no un historial real |

| 8.1 | Escalation to manager functionality | **Sigue igual tras conectar Epic 8 (22 sept 2026).** "Escalate" cambia `support_tickets.status` a `escalated` de verdad, pero Dana Mbeki (`DUTY_MANAGER`) sigue siendo un dato de muestra fijo — no hay bandeja de manager real ni notificación |
| 8.1 | Every action logged (audit trail) | **Sigue igual tras conectar Epic 8.** El chip "Every action logged" de la topbar es constante; no es un AC propio de ninguna historia (es chrome del patrón 21), así que no se construyó un registro de auditoría aparte — cada acción real (reembolso, cambio de reserva, mensaje) ya queda escrita en su propia tabla, solo no hay un log unificado que las muestre juntas |
| 8.3 | Add lounge profile | **Resuelto (25 sept 2026).** Alta real en `/admin/lounges/new` (artboards 14 y 15 de la Fase 8): nace borrador, se publica directo sin cola de aprobación, la dirección sale de Google Places y solo se edita mientras es borrador. Queda pendiente activar la Places API en la clave de Google (§4.11) |
| 8.3 | Image optimization and resizing | **Resuelto a medias tras conectar Epic 8.** La subida de foto ya es real (bucket de Storage `lounge-images`); el redimensionado a 1600/800/400 px que el artboard anuncia sigue sin tener nada detrás — no hay librería de procesamiento de imágenes en el stack |

| 9.1 | Renewal date and auto-renewal settings — aviso por email un mes antes | **Resuelto tras conectar Epic 9 (23 sept 2026).** `dispatch_membership_renewals()` (pg_cron diario) inserta la notificación en la app y llama a `membership-renewal` (Brevo) para los anuales con auto-renovación en su último mes. La renovación en sí también cobra de verdad (misma function, `type: "charge"`) |
| 9.1 | Upgrade options to monthly subscribers and pricing | **Resuelto tras conectar Epic 9.** "Pay … and switch" cobra de verdad con Stripe (modo test) el importe prorrateado de `membership_change_quote` y el trigger sobre `payments` sube el plan |
| 9.2 | Reward crediting for successful referrals (pending) | **Resuelto tras conectar Epic 9.** "Reward pending" desde el alta del amigo; "Day pass credited" con su primer pago real liquidado (trigger `credit_referral_on_first_payment`). Gastar el day pass sigue sin conectar — ver §2.12 |
| 9.2 | Friend's sign up confirmation notification | **Resuelto tras conectar Epic 9.** `create_referral_from_signup` inserta la notificación real "… joined" en cuanto el amigo crea su perfil con el código |

Los enlaces de las tiendas de `/welcome` apuntan a `#`: no existen todavía las
fichas de App Store ni Google Play.

---

## 4. Infraestructura pendiente

### 4.1 Protección de rama bloqueada por el plan de GitHub

`docs/ci-cd/RESUMEN.md` trae desde el 8 sept 2026 el pendiente de configurar
branch protection en `main` y `staging` (exigir que `ci.yml` pase antes de
mergear, bloquear force-push). Al intentar activarla (11-12 sept 2026), tanto
la API clásica de branch protection como la de rulesets (su reemplazo
moderno) devuelven el mismo error:

```
403 — "Upgrade to GitHub Pro or make this repository public to enable this feature."
```

El repo (`luxe-pass-training`) es **privado**, y esa función no está
disponible en el plan gratuito para repos privados — no es algo que se
arregle con configuración, hace falta una de estas dos cosas:

- Actualizar a GitHub Pro (o mover a una organización con plan Team), o
- Hacer el repo público — probablemente no aceptable, es código de un
  cliente (En Soleil).

**Desbloquea:** que se decida cuál de las dos opciones tomar. Mientras
tanto, no hay nada a nivel de GitHub que impida un push directo o un
force-push a `main`/`staging` — la disciplina de usar PRs es solo
convención, no está reforzada por la plataforma.

### 4.2 El `.next` de dev se vuelve a quedar sin `main-app.js`

Pasó el 31 de agosto de 2026, **con los `distDir` ya separados**: el dev server
servía `/explore` con un 200 impecable, pero
`\/_next\/static\/chunks\/main-app.js` y `app-pages-internals.js` daban **404 y no
existían en disco**. Sin `main-app.js` no hay React en el cliente.

El síntoma no se parece en nada a la causa, y por eso conviene tenerlo escrito:
la pantalla **se ve entera y correcta** — la pinta el servidor — pero no responde
a nada. Ningún botón funciona, ningún diálogo ni drawer aparece (viven en
portales, que necesitan JavaScript), y la navegación lateral sí va, porque son
`<a href>` de verdad. Es fácil leerlo como "faltan pantallas por implementar".

**Cómo reconocerlo en diez segundos:**

```bash
curl -s -o /dev/null -w '%{http_code}
'   http://localhost:3000/_next/static/chunks/main-app.js   # 200 = sano
```

**Arreglo:** parar el dev server, `rm -rf .next`, y volver a arrancarlo. Después,
**recarga dura en el navegador** (Ctrl+Shift+R): el HTML y los chunks rotos se
quedan cacheados.

**Causa confirmada el 18 sept 2026** (reportado por el usuario: "Book now"
rompía con 500 al entrar en `/lounges/[id]/book`, error real
`Cannot find module './vendor-chunks/prop-types.js'`): **dos `npm run dev`
corriendo a la vez** — uno en el puerto 3000, otro que Next movió solo al
3001 al encontrar el 3000 ocupado (típicamente, alguien lanza un segundo
`npm run dev` en otra terminal sin darse cuenta de que ya hay uno vivo).
Los `distDir` separados (`next.config.ts`) evitan el choque entre `dev` y
`build`, pero **no entre dos instancias de `dev` entre sí** — ambas escriben
sobre la misma carpeta `.next` sin importar el puerto, y sus compilaciones
concurrentes se pisan los vendor chunks del webpack runtime. Confirmar con
`Get-Process node` (PowerShell) o `ps aux | grep 'next dev'` si hay más de
un `next dev` vivo antes de asumir que la causa es otra.

**Desbloqueado.** Mientras tanto, la comprobación de arriba (`main-app.js`)
va antes que cualquier diagnóstico de "esto no funciona en la pantalla", y
ahora también comprobar que solo hay **un** `next dev` corriendo.

### 4.3 Sin tests e2e

La suite es Vitest + Testing Library sobre jsdom: la navegación se comprueba con
`next/navigation` mockeado, verificando que `router.push` recibe la ruta correcta.
Eso cubre el destino, no el recorrido: nadie verifica que un miembro pueda ir de
`/signup` a `/welcome` pasando por las seis pantallas reales.

Playwright se pospuso a propósito. Mientras el diseño se mueve, un e2e se rompe por
cambios de maquetación que no son fallos, y el coste de mantenerlo supera lo que
aporta.

**Desbloquea:** que el Epic 2 cierre el App shell (patrón 3) y los flujos
multi-pantalla dejen de cambiar de forma. Ahí un e2e por historia empieza a pagar.

### 4.4 La API key / Map ID de Google Maps no está dada de alta en Vercel (`staging`/`main`)

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` y `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` (Story 2.1,
`/explore` con Google Maps real — ver §2.2/§2.3, resueltas) solo existen hoy en
el `.env.local` de cada developer, sin comitear. **Corrección (18 sept 2026):
Vercel sí está montado** (2 proyectos, `luxepass-dev`/`luxepass-prod`, deploy
real probado de punta a punta desde el 10-13 sept — ver
`docs/ci-cd/RESUMEN.md`, este archivo tenía la nota vieja de "Vercel todavía
no está montado"); lo que falta es dar de alta estas dos env vars concretas
en los proyectos Vercel ya existentes, que se crearon (10 sept) antes de que
Epic 2 migrara a Google Maps real (16 sept). `staging`/`main` no sirven
`/explore` con mapa real hasta entonces.

**Desbloquea:** dar de alta `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`/
`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` como env vars de cada proyecto Vercel
existente (key/Map ID de `luxepass-dev` y de `luxepass-prod` pueden ser el
mismo par o pares distintos — decisión pendiente, no técnica) antes de
promover esta rama a `staging`.

### 4.5 `supabase_edge_runtime` puede quedarse caído tras un rato con el stack local arriba — resuelto con `supabase stop && supabase start`

Al conectar Epic 7 (22 sept 2026), un primer intento de verificar
`send-partner-booking-event`/`send-partner-digest` de punta a punta con
`supabase functions serve` falló: el contenedor `supabase_edge_runtime_Luxe_Pass`
moría nada más crearse ("dead or marked for removal" en bucle), a la vez que
`docker ps` mostraba `supabase_vector_Luxe_Pass` reiniciándose en bucle —
ninguno de los dos tiene que ver con el código de las functions (mismo
patrón exacto que las cuatro Edge Functions ya funcionando de epics
anteriores). `supabase stop` + `supabase start` (recrea los contenedores
conservando los datos, `backup: true` por defecto) lo resolvió: el edge
runtime volvió a subir solo, sin necesidad de `supabase functions serve`
aparte, y un `curl` directo contra `send-partner-digest`/
`send-partner-booking-event` respondió `200` en las dos — verificadas de
punta a punta. `supabase_vector` (un sidecar de logs) sigue reiniciándose en
bucle incluso después del restart, pero no impide que el resto del stack
(incluido el edge runtime) funcione.

**Si vuelve a pasar:** `supabase stop` seguido de `supabase start` antes de
asumir que el código de una Edge Function nueva está roto.

### 4.6 Epic 7 no tiene nada desplegado a `staging`/`main` todavía

Mismo hueco que tuvieron Epic 5/Epic 6 antes de sus PR de despliegue
dedicados (ver los dos "Resuelto" de `deploy.yml` en la tabla de abajo):
`.github/workflows/deploy.yml` no conoce `send-partner-booking-event` ni
`send-partner-digest`, y los 4 secretos de Vault
(`partner_notification_webhook_url`/`_secret`,
`partner_digest_webhook_url`/`_secret`) solo existen en el Docker local
(dados de alta a mano en esta rama, ver `supabase/schemas/partner_notifications.sql`).

**Desbloquea:** un PR aparte (mismo patrón que Epic 5/6) que amplíe
`deploy.yml` con `supabase secrets set` + `supabase functions deploy
send-partner-booking-event --no-verify-jwt` / `send-partner-digest
--no-verify-jwt` en `migrate-dev`/`migrate-prod`, más los secrets de GitHub
correspondientes y el alta manual de los 4 secretos de Vault en
`luxepass-dev`/`luxepass-prod` vía Studio.

### 4.7 Epic 8 no tiene nada desplegado a `staging`/`main` todavía

Mismo hueco que Epic 5/6/7 antes de sus PR de despliegue dedicados:
`.github/workflows/deploy.yml` no conoce `stripe-refund-payment` ni
`send-admin-report`. `stripe-refund-payment` no necesita un secreto de
Vault propio — reutiliza `STRIPE_SECRET_KEY`, ya presente en `deploy.yml`
desde Epic 4.

`send-admin-report` sí necesita 2 secretos de Vault
(`admin_report_webhook_url`/`_secret`) — ya dados de alta y verificados
de punta a punta en el Docker local de esta rama (ver CLAUDE.md
§"Reportes programados reales"). **Pendiente explícito: el alta manual
de esos mismos 2 secretos en `luxepass-dev`/`luxepass-prod` vía Studio**
— no se ha hecho todavía, y de nada sirve hasta que exista también el PR
de `deploy.yml` de abajo (sin la Edge Function desplegada, el cron sigue
sin nada que llamar). El SQL a correr en cada proyecto remoto está en
`CLAUDE.md` §"Reportes programados reales (pg_cron, Story 8.2)".

**Desbloquea (cron `dispatch_scheduled_reports`):** un PR aparte (mismo
patrón que Epic 5/6/7) que amplíe `deploy.yml` con `supabase functions
deploy stripe-refund-payment` + `supabase secrets set` + `supabase
functions deploy send-admin-report --no-verify-jwt` en
`migrate-dev`/`migrate-prod`, más el secret de GitHub
`ADMIN_REPORT_WEBHOOK_SECRET_DEV`/`_PROD` y el alta manual de los 2
secretos de Vault en `luxepass-dev`/`luxepass-prod` vía Studio.

**"Email it to me" (`/admin/reports`) queda deshabilitado en la UI, no
solo pendiente de despliegue.** A diferencia del cron (que sí puede leer
el secreto de Vault desde Postgres), este botón invocaría
`send-admin-report` directamente desde el navegador del admin — y esa
function solo acepta `x-webhook-secret`, un secreto que no puede vivir en
el cliente sin dejar de ser un secreto. Se deshabilitó (`disabled` en
`PaymentOptionRow`, visible con "Coming soon") en vez de dejarlo roto en
silencio. Arreglarlo de verdad implica una segunda vía de autenticación
para `send-admin-report` (p. ej. una RPC `SECURITY DEFINER` que verifique
`has_role('admin')` sobre el llamador y dispare el mismo `pg_net` que ya
usa el cron, en vez de que el cliente invoque la Edge Function
directamente) — no solo el alta de Vault de arriba. Ver
`docs/design/COMPONENT-MAP.md` tabla de desviaciones.

### 4.8 Epic 9 no tiene nada desplegado a `staging`/`main` todavía

Mismo hueco que Epic 5–8 antes de sus PR de despliegue dedicados:
`.github/workflows/deploy.yml` no conoce `stripe-membership-checkout` ni
`membership-renewal`. `stripe-membership-checkout` no necesita
secreto propio (reutiliza `STRIPE_SECRET_KEY`/`APP_URL`, ya presentes);
`membership-renewal` necesita `STRIPE_SECRET_KEY` (ya presente) y `MEMBERSHIP_RENEWAL_WEBHOOK_SECRET`
y los 2 secretos de Vault (`membership_renewal_webhook_url`/`_secret`),
dados de alta solo en el Docker local de esta rama.

**Desbloquea:** un PR aparte que amplíe `deploy.yml` con `supabase
functions deploy stripe-membership-checkout` + `supabase secrets set
MEMBERSHIP_RENEWAL_WEBHOOK_SECRET` + `supabase functions deploy
membership-renewal --no-verify-jwt` en
`migrate-dev`/`migrate-prod`, los secrets de GitHub
`MEMBERSHIP_RENEWAL_WEBHOOK_SECRET_DEV`/`_PROD` y el alta manual de los 2
secretos de Vault en `luxepass-dev`/`luxepass-prod` vía Studio (SQL en
`CLAUDE.md` §"Membresía y referidos reales"). Hasta entonces el cron de
renovación sí inserta la notificación en la app y vence los términos sin
auto-renovación (no depende de Vault), pero **no cobra las renovaciones**
ni manda el email — en staging/prod, un término vencido con
auto-renovación seguiría activo sin cobrar hasta completar este paso.

---

### 4.9 El test del CSV de `/admin/reports` falla con la base local acumulada

`src/app/admin/reports/page.test.tsx` → *"downloads a real CSV that includes
the ephemeral booking's reference"* falla en local (detectado el 25 sept 2026,
durante el PR #33; falla igual en `staging` sin ese PR). El CSV descargado
no contiene la referencia `LP-######` de la reserva que crea el propio test.

Hipótesis, sin confirmar: `admin_export_bookings`
(`supabase/schemas/admin_reports.sql`) ordena por `b.date, b.slot_time`
ascendente, y la base local ya acumula ~1.500 `bookings` de corridas
anteriores, muchas con fecha anterior al `TODAY` que usa el test. Si el export
se corta en las 1.000 filas de `max_rows` (`config.toml`), la reserva nueva
queda fuera. Con una base limpia (`supabase db reset`) probablemente pasa.

Opciones: que el test filtre por un rango de fechas propio, que el export no
dependa del límite de PostgREST, o limpiar los datos de prueba entre corridas.
Relacionado con la nota de recursos compartidos (Stripe). **Desde el 2 oct
2026 la suite ya no deja datos de test en la base local**: `vitest.global-setup.ts`
llama a `cleanTestData` (`src/lib/testing/clean-test-data.ts`) antes de
empezar y al terminar, y borra las cuentas de dominios de test (con sus
reservas, pagos y perfiles en cascada), los lounges `test-…` y los partners
de test. Las reservas antiguas que hacían fallar este export desaparecen con
ellas.

### 4.10 Auth local falla de forma intermitente con la suite completa en paralelo

Visto el 25 sept 2026 tras un `supabase db reset` + `supabase stop && supabase start`:
al correr los 110 archivos de `npm test` a la vez, el contenedor de Auth
falla al conectar con Postgres (`failed to connect to host=supabase_db_Luxe_Pass ...`,
timeouts de DNS/SASL) y los tests caen con `AuthRetryableFetchError: fetch failed`
en archivos distintos en cada corrida; `supabase_vector` queda en bucle de
reinicio. Los mismos archivos pasan al correrlos con menos workers
(`npx vitest run --maxWorkers=2 <archivos>`). **Causa sin confirmar.**

### 4.11 La clave de Google Maps no tiene activada la Places API (New)

El alta de lounges (`/admin/lounges/new`) busca la dirección con Google
Places (`AutocompleteSuggestion`, API nueva). Con la clave actual
(`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`), Google responde 403
`API_KEY_SERVICE_BLOCKED` (comprobado el 25 sept 2026): el campo de
dirección se ve, pero no propone nada, y sin dirección no se puede ni
guardar el borrador ni publicar.

**Qué hacer:** en Google Cloud, activar **Places API (New)** en el proyecto
de la clave y añadirla a las restricciones de API de esa clave (en local y
en las de Vercel, ver §4.4).

**Además:** las fotos se suben a Storage (`lounge-images/new-<uuid>/…`) en
cuanto se eligen, antes de que exista el lounge. Si el admin abandona el
alta sin guardar, esos archivos quedan huérfanos en el bucket — no hay
limpieza automática.

### 4.12 Invitación de partner: caducidad en los remotos y reenvío

El email de invitación (`EmailInvite.dc.html`) promete un enlace de 24 h.
En local vale porque `supabase/config.toml` fija `otp_expiry = 86400`, pero
**los remotos no leen ese archivo**: en `luxepass-dev`/`luxepass-prod` hay
que poner a mano *Authentication → Providers → Email → Email OTP
Expiration* a `86400` (hoy, por defecto, 1 h). Afecta también a los
enlaces de confirmación y recovery.

Desde el Epic 10 (1 oct 2026) la invitación la envía activar el partner,
no publicar el lounge; reenviarla vuelve con la Story 10.4.

**Además:**
- **La cola de aprobación se retiró de la UI pero no de la base.** La
  tabla `lounge_content_submissions` y las RPC `admin_submit_lounge_content_change`,
  `admin_approve_lounge_submission`, `admin_reject_lounge_submission` (y la
  columna `pending_count` de `admin_lounge_list`) siguen en
  `supabase/schemas/admin_content.sql` sin uso. Borrarlas es destructivo
  (genera `DROP`); el 1 oct 2026 el usuario decidió **dejarlas** por ahora.
- El aviso tras guardar/publicar desde `/admin/lounges/new` no tiene test
  de pantalla: guardar exige una dirección de Google Places, que no carga
  en jsdom. Lo cubren el test del detalle (`[id]/page.test.tsx`, mismo
  formulario y mismo aviso) y la verificación de Playwright.

### 4.14 Epic 10: historias 10.9–10.12

- **10.12 (búsqueda en el detalle del partner):** hecha. Falta su criterio
  "la selección de las acciones masivas se mantiene al buscar", que depende
  de la 10.11 y se prueba con ella.
- **10.9 hecha** (datos, UI de admin en vista live y borrador, ficha del
  miembro con el horario de la temporada vigente). Queda abierto:
  - Las tarjetas y el filtro de fecha de `/explore` siguen con
    `lounges.hours` / `closed_weekdays` habituales; la reserva sí respeta la
    temporada porque sale de `lounge_availability_range`.
  - Las bandas (mañana/tarde/noche) son del lounge, no de la temporada.
  - "Save anyway" sobre reservas confirmadas solo avisa: no cancela ni
    notifica a esos miembros (la historia no lo pide; decidir si hace falta).
- **10.10 y 10.11 esperan artboards** (`/design`, carpeta
  `docs/design/epic-10-partner-organizations/`): editor de fotos con
  `react-easy-crop` y selección múltiple + modales masivos en el detalle
  del partner.

### 4.13 Epic 10: el modelo de partners cambió y los remotos no lo tienen

Paso a paso para `staging` y `main`: `docs/ci-cd/EPIC-10-DESPLIEGUE.md`.

La Story 10.1 (1 oct 2026, migración `partner_organizations`) sustituye el
partner-persona por el partner-organización. Antes del primer PR a
`staging` con este cambio:

- **`partners` tiene que estar vacía en el remoto.** La migración añade
  `partners.name not null` sin default y borra `partner_lounges` y
  `lounge_partner_invites`: con filas fallará el deploy, y sin vaciarla se
  perderían igualmente los vínculos con lounges. En local ya se vació (con
  todas las cuentas salvo el admin). Hacerlo en `luxepass-dev`/`luxepass-prod`
  es una acción sobre datos remotos: pedir confirmación antes.
- **Las Edge Functions `admin-publish-lounge` y `admin-lounge-partners` se
  borraron del repo y de `deploy.yml`**, pero quitarlas de `deploy.yml` no
  las borra de los proyectos remotos donde ya estén desplegadas: hay que
  borrarlas a mano (`supabase functions delete …`, con confirmación).
- **Lounges live sin partner:** los sembrados que no están en
  `scripts/seed-partners.mjs` siguen live sin partner (la base lo admite;
  solo publicar lo exige). Para asignarles uno hay que pasarlos a draft
  ("Edit lounge"), elegir el partner y publicar.
- **El partner en el pase de un lounge que ya no está live (10.8):** el
  miembro solo puede leer el nombre del partner de un lounge publicado
  (policy "read partner of a live lounge"), así que el pase de una reserva
  en un lounge pasado a draft o suspendido se ve sin el partner.
- **Vistas previas de email de `/partner/emails/*`** siguen con el venue fijo
  de `PARTNER_VENUE` (son la vista previa del artboard, como antes); los
  emails reales ya nombran al partner y al lounge (10.7).
- **`admin_revenue_by_partner`** sigue agrupando por lounge, no por partner.
- **`admin-partners` (Story 10.4) es una Edge Function nueva:** ya está en `deploy.yml`, pero necesita `APP_URL` y `BREVO_*` en los remotos, como las demás que envían emails.
- **Suspender un usuario no invalida su token al instante** (el ban solo impide renovarlo), pero `RequirePartnerSession` y el login comprueban el acceso con `partner_context()`: el usuario sale con la sesión cerrada y el aviso "Your access… is suspended" en cuanto abre o recarga /partner.

## 5. Decisiones abiertas

### 5.0 Filtro por país en `/admin/lounges`

Pedido el 1 oct 2026 junto al filtro de ciudad. `lounges` no tiene columna de país (solo `city`/`city_id`), así que quedó fuera: hacerlo pide una columna `country` en `supabase/schemas/lounges.sql`, rellenarla para los lounges existentes y pedirla en el alta/edición (la dirección elegida en Google Places ya trae el país en `address_components`). Hasta entonces solo se filtra por ciudad (artboards 27–28).

### 5.1 El error de términos de `/signup` no se puede llegar a ver

`validateSignUp` devuelve `errors.terms`, y `src/app/signup/page.tsx` lo pinta bajo
el botón: `{errors.terms ?? "Disabled until the terms are accepted."}`. Pero ese
mismo botón está `disabled` mientras no haya aceptación, así que el submit nunca
ocurre sin ella y esa rama del mensaje es inalcanzable desde la interfaz.

La validación en sí es correcta y está cubierta por `src/lib/registration.test.ts`.
Lo inalcanzable es solo el aviso en pantalla, así que no hay nada roto: hay una
salida de código que no lleva a ningún sitio.

Dos maneras de cerrarlo, y ninguna es obviamente mejor:

- **Dejarlo.** El botón deshabilitado ya comunica el bloqueo y el texto fijo lo
  explica; `errors.terms` se queda como red por si el botón deja de deshabilitarse.
- **Habilitar el botón siempre** y que sea el submit el que muestre el error, como
  ocurre con los demás campos. Es más consistente, pero se aparta del artboard.

**Desbloquea:** decidir entre las dos, o comprobar en `Main.dc.html` si el diseño ya
tiene una respuesta y lo que falta es seguirla.

### 5.2 Modelo de precio y ventana de retención del Epic 4 sin confirmar

`DESIGN-SYSTEM.md` §6 (Fase 5) ya advertía dos decisiones de producto asumidas,
no validadas con En Soleil, que el código ahora implementa tal cual:

- **8 visitas incluidas al mes, day pass de $75 + impuesto desde la 9.ª.** Es la
  lectura que cubre a la vez "subscription pricing display" e "individual
  booking pricing" de la Story 4.2 (`MEMBERSHIP_VISITS_INCLUDED`,
  `DAY_PASS_PRICE` en `src/lib/booking.ts`). Si el modelo real es otro, cambian
  esas constantes y los importes de las pantallas, no la estructura del flujo.
- **La cuenta atrás "Slot held for M:SS" dura 10 minutos** (`SLOT_HOLD_SECONDS`).
  El artboard no fija la duración real de la retención del slot durante el
  checkout.

**Desbloquea:** que En Soleil confirme el modelo de membresía/day-pass y la
ventana de retención real.

### 5.3 Economía del partner del Epic 7 sin confirmar

`DESIGN-SYSTEM.md` §6 (Fase 2) ya advertía estas cifras como una lectura
asumida, no validada con En Soleil, que `lib/partner.ts` implementa tal cual:

- **Day pass a $75.00** (la tarifa de la Fase 5), **visita de membresía a
  $38.00 de tarifa de partner** y **la mitad de la tarifa de no-show de $35.00**
  ($17.50) para el partner (`DAY_PASS_PARTNER_RATE`,
  `MEMBERSHIP_VISIT_PARTNER_RATE`, `NO_SHOW_PARTNER_SHARE`). Ninguna historia
  fija esos números: la 7.3 solo pide "revenue attribution". Si el acuerdo real
  es otro, cambian esas constantes y los importes de `Analytics.dc.html` /
  `RepeatGuests.dc.html` / `NoShow.dc.html`, no la estructura.
- **Los niveles de lealtad** (Regular ≥5 visitas, Returning 2–4, First visit 1)
  se cuentan solo en el local de The Ainsworth — el flow habla de "loyalty
  trackers" sin definirlos, y contarlos por local es lo único que el partner
  puede ver sin exponer el historial del miembro en otros lounges.
- **La ventana de admisión son 4 horas** desde la hora reservada, coherente con
  la Fase 6.

**Desbloquea:** que En Soleil confirme la tarifa de partner real y el reparto
de la tarifa de no-show.

---

## Resueltos

| Qué | Cuándo | Cómo |
|---|---|---|
| `tailwind.config.ts` no se leía: ninguna utilidad del tema existía | 30 ago 2026 | Tema migrado a `@theme inline` en `globals.css`; config muerto eliminado |
| `next build` corrompía el dev server en marcha (500 / 404 falsos) | 30 ago 2026 | `distDir` separado: `.next-build` para producción, `.next` para dev |
| `public/sw.js` y `workbox-*.js` reaparecían modificados tras cada build | 30 ago 2026 | Fuera del índice e ignorados; se regeneran solos |
| 10 archivos de scaffolding sin usar en `public/`, incluido un `public/public/` duplicado | 30 ago 2026 | Eliminados |
| Las 5 pantallas de la Story 1.1 repetían la frase de marca de `Main` | 30 ago 2026 | Cada pantalla usa la de su propio artboard |
| `npm run lint` recorría `.next-build` y devolvía 4677 problemas tras cualquier build | 31 ago 2026 | `.next-build/**` añadido a los ignores de `eslint.config.mjs`; el ignore se quedó sin actualizar al separar los `distDir` |
| No había suite de tests, con TDD ya declarado obligatorio | 31 ago 2026 | Vitest + Testing Library sobre jsdom; 60 tests cubren la lógica, los estados y la navegación del Epic 1 |
| La ruta `/` era un índice provisional de pantallas, sin artboard | 31 ago 2026 | Sustituida por el Home del área de miembro (`Home.dc.html`) dentro del App shell del patrón 3 |
| `/lounges/[id]` daba 404 desde cada "View details" del Epic 2 | 3 sept 2026 | Implementado el Epic 3: perfil de lounge, disponibilidad semanal y reseñas |
| `/profile` daba 404 desde el ítem "Profile" del App shell | 4 sept 2026 | Implementado el Epic 6: sección de cuenta (patrón 13) con sus cuatro sub-vistas |
| No existía el Partner Dashboard (Epic 7) | 5 sept 2026 | Implementadas las Stories 7.1/7.2/7.3: `/partner` (lista del día, en vivo), tres emails, Analytics, invitados recurrentes y Reports |
| El sub-nav de Account tenía un ítem "Membership" sin pantalla propia | 6 sept 2026 | Implementado el Epic 9: `/profile/membership` (plan, beneficios, renovación), `/profile/membership/plans` (comparación) y `/profile/membership/referrals` (código, invitaciones, términos) |
| La Story 1.1 (registro) no tenía backend: email duplicado y verificación de email eran simulados | 6 sept 2026 | Conectada a Supabase local real: Auth (signup + confirmación por email vía Mailpit), tabla `profiles` con RLS, RPC `email_exists` (excepción consciente al anti-enumeración de Supabase Auth) y bucket `profile-photos`. Ver `COMPONENT-MAP.md` §Backend real (Supabase local) |
| La Story 1.2 (login) no tenía backend: credenciales, bloqueo y reset de contraseña eran simulados | 6 sept 2026 | Conectada a Supabase local real: `signInWithPassword`, tabla `login_attempts` + RPC para el bloqueo tras 5 intentos (Supabase Auth no lo tiene nativo), `resetPasswordForEmail` + `/reset-password` (pantalla nueva, sin artboard) para completar el reset de verdad. De paso se encontró y corrigió un bug real en `/auth/confirm`: en `next dev`, el origin calculado desde `request.url` podía ser "localhost" en vez del host real (127.0.0.1), perdiendo la cookie de sesión tras el redirect |
| No había CI: nada ejecutaba `lint`/`tsc`/`test`/`build` en cada PR ni push | 8 sept 2026 | `.github/workflows/ci.yml` (lint, tipos, tests contra Supabase local levantado en el runner, y build en jobs paralelos) y `.github/workflows/deploy.yml` (migra `supabase/migrations` al Supabase remoto de dev/prod tras push a `staging`/`main`, excepción acotada a CLAUDE.md §Supabase Local Development). Confirmado en verde de punta a punta en el PR de prueba. Ver `docs/ci-cd/RESUMEN.md` — Vercel sigue pendiente de crear (Fase 3-4 de la guía) |
| `npm test` fallaba en 8 archivos (login, signup, onboarding, require-session) con "URL and API key are required" | 8 sept 2026 | `.env.local` ya usaba el nombre nuevo de Supabase (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) pero `client.ts`/`server.ts`/`middleware.ts` seguían leyendo `NEXT_PUBLIC_SUPABASE_ANON_KEY` (nombre viejo, deprecado por Supabase). Los tres archivos y `env.example` renombrados a `PUBLISHABLE_KEY` |
| `npm run lint` daba 25 errores de `no-require-imports` en `scripts/playwright/**` | 8 sept 2026 | Son scripts CommonJS de verificación visual puntual (ver su `README.md`), no código de la app — añadidos a los ignores de `eslint.config.mjs` junto al resto de rutas generadas/no-fuente |
| `package-lock.json` nunca se subió al repo (estaba en `.gitignore` desde el scaffolding inicial) | 8 sept 2026 | `npm ci` fallaba en CI con "Dependencies lock file is not found" — quitado del `.gitignore` y versionado el lockfile |
| El job `build` de CI fallaba prerrenderizando `/forgot-password` ("URL and API key are required"); el job `test` parseaba `supabase status` como texto y el CLI cambió a tabla Unicode + JSON con claves nuevas | 8 sept 2026 | `build` recibe `NEXT_PUBLIC_SUPABASE_*` con un valor no vacío (no hace red en el prerender); extracción de credenciales del `test` cambiada a `supabase status -o json` con los paths correctos (`API_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY`) |
| `deploy.yml` migró `luxepass-dev` bien, pero `supabase db advisors` fallaba con ECONNREFUSED | 8 sept 2026 | Sin `--linked`, revisa la base local (que no existe en ese job) en vez del proyecto remoto recién enlazado. Con el fix, corrió contra `luxepass-dev` de verdad: 2 warnings de `SECURITY DEFINER` en `email_exists`/`check_login_lock`, ambos ya conocidos y deliberados (ver filas de Story 1.1/1.2 arriba) |
| Story 1.1/1.2 mandaban el email de confirmación/recovery por el SMTP simulado (Inbucket/Mailpit), sin entrega real | 13 sept 2026 | Auth Hook `send_email` (`config.toml`) + Edge Function `supabase/functions/send-email`, que despacha vía Brevo. Subject con prefijo de ambiente (`[LOCAL]`/`[STAGING]`/`[PROD]`, secret `APP_ENV`). Probado de punta a punta (signup + forgot-password, email real) en local, `luxepass-dev` y `luxepass-prod`. Detalle en `docs/ci-cd/RESUMEN.md` y `CLAUDE.md` §Envío de email transaccional |
| El signup en local daba `422 Failed to reach hook within maximum time of 5.000000 seconds` | 13 sept 2026 | `uri` de `[auth.hook.send_email]` tenía el puerto *default* de Supabase (`54321`, copiado literal de la doc) en vez del puerto real de este proyecto (`54331`, `[api] port`) |
| El link de confirmación del correo apuntaba a `127.0.0.1:54331` (el API de Supabase) en vez del dev server de Next | 13 sept 2026 | `email_data.site_url` del payload del hook no es `auth.site_url` — la function ahora usa su propio secret `APP_URL`, explícito por ambiente |
| El primer deploy real de `send-email` a `luxepass-dev` fallaba en `supabase db push` con `Invalid hook config: ... secrets must be formatted as v1,whsec_...` | 13 sept 2026 | El CLI valida todo `config.toml` en cualquier comando, no solo en los pasos que tocan la function — `SEND_EMAIL_HOOK_SECRET_DEV`/`_PROD` añadidos también al `env:` de cada job de `deploy.yml` (antes solo se pasaban a `supabase secrets set`, un mecanismo distinto) |
| El forgot-password no llegaba ni en `luxepass-dev` ni en `luxepass-prod`, sin nada en los logs de la function | 13 sept 2026 | `Authentication → Rate Limits → Rate limit for sending emails` viene en 2/hora por defecto y aplica aunque el envío real vaya por Brevo — subido a mano en ambos dashboards |
| Signup/login en `luxepass-prod` daban `Invalid API key` ("might be owned by another Supabase project") | 13 sept 2026 | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en el proyecto de Vercel `luxepass-prod` estaba desactualizada (no relacionado al trabajo de Brevo, ya estaba mal desde antes). Diagnosticado comparando el bundle JS de producción contra `supabase projects api-keys --project-ref` (de solo lectura). Corregida la env var en Vercel + redeploy manual (`gh workflow run deploy.yml --ref main`, necesario porque `NEXT_PUBLIC_*` se hornea en build time) |
| Migrar `/explore` a Google Maps real: el clustering de markers no aparecía nunca, a ningún zoom, y el callout de un pin cerca del borde superior del mapa se recortaba contra el contenedor — ninguno de los dos lo detectaban los tests sobre jsdom | 16 sept 2026 | Verificación con Playwright contra el SDK real de Google Maps (`scripts/playwright/`), no cubierto por el stub de jsdom. Clustering: `MIN_ZOOM` de `city-map.tsx` estaba en 12 (rango de zoom donde nunca se alcanzaba el umbral de agrupado) y un bug real de timing — los refs de `AdvancedMarker` resuelven de forma asíncrona, después de que el efecto que alimenta a `MarkerClusterer` ya había corrido — dejaba el clustering en cero marcadores siempre; se bajó `MIN_ZOOM` a 10 y se añadió un contador `markerRegistrations` para re-sincronizar el clusterer cuando los markers montan de verdad. Callout: `lounge-callout.tsx` ahora mide su posición real con `useLayoutEffect` (vía el atributo `data-map-surface` del contenedor del mapa) y voltea a `top-full` en vez de `bottom-full` cuando el borde superior lo recortaría. Ambos con test de regresión (`city-map.test.tsx`, `lounge-callout.test.tsx`) |
| El job `test` de `ci.yml` fallaba en `supabase start` con `Invalid hook config: ... secrets must be formatted as v1,whsec_...`, en todos los PR desde el 13 sept | 16 sept 2026 | El fix de `SEND_EMAIL_HOOK_SECRET_DEV`/`_PROD` de esa fecha solo tocó `deploy.yml`; `ci.yml` nunca recibió su propio secret. Añadirle uno con formato válido no bastaba — este runner no tiene `supabase/functions/.env` con Brevo real, y Auth corta `signUp`/`resetPasswordForEmail` entero si el hook falla. Decisión con el usuario: no mandar emails reales por Brevo en CI (riesgo de bounces); `ci.yml` desactiva el hook (`enabled = false`) solo en la copia efímera del checkout vía un `awk` antes de `supabase start` — Auth cae a Mailpit, que es lo que `forgot-password/page.test.tsx` ya esperaba. Detalle y verificación local en `docs/ci-cd/RESUMEN.md` |
| 5 tests fallando en local (signup, login, registration, forgot-password) con "Service currently unavailable due to hook" | 17 sept 2026 | Causa 1 (4 tests): el contenedor `supabase_edge_runtime_<project_id>` se había caído solo (exit code 255, sin error en logs) — el Auth Hook `send_email` depende de él para cualquier signup/reset con el hook activo (dev local normal). `docker start supabase_edge_runtime_Luxe_Pass` los revive; no es un bug de la app, revisar el contenedor si vuelve a pasar. Causa 2 (el 5º test, forgot-password): cierra §2.10 de arriba — el test seguía buscando el correo de recovery en Mailpit, obsoleto en local/staging/main (donde el hook está activo de verdad) desde la migración a Brevo del 13 sept; solo "pasaba" en CI porque ahí el hook está desactivado. Se quitó esa aserción, dejando el acuse en pantalla como verificación. Corregido en `fix/forgot-password-mailpit-test` |
| Story 4.2/5.1 (email de recibo de reserva, `Receipt.dc.html`) no tenía envío real: la pantalla de `/book/receipt` simulaba el email con `SAMPLE_MEMBER`, sin ningún disparador detrás | 18 sept 2026 | Database Webhook (nuevo mecanismo para este proyecto, distinto del Auth Hook de Epic 1): trigger `AFTER INSERT` en `bookings` (`supabase/schemas/booking_receipts.sql`), solo cuando `status = 'confirmed'`, que llama de forma asíncrona (`pg_net`) a la Edge Function `send-booking-receipt`, la cual despacha el correo real vía Brevo (mismo remitente que Epic 1, ahora factorizado en `supabase/functions/_shared/brevo.ts`, del que `send-email` también pasa a depender). Autenticado con un secreto compartido guardado en Supabase Vault (`booking_receipt_webhook_url`/`booking_receipt_webhook_secret`, uno por proyecto, nunca comiteado) en vez de un JWT — Postgres no tiene sesión de usuario. Sin esos dos secretos dados de alta (p. ej. un Postgres de CI recién levantado), el trigger no hace nada: **no hace falta desactivarlo a mano en CI**, a diferencia del Auth Hook de Epic 1. Encontrados y corregidos dos bugs reales al verificar de punta a punta con Playwright (no con curl/psql sueltos): (1) el timeout de `net.http_post` (5s por defecto) cortaba la llamada a mitad de camino — `findSettledPayment` en la function reintenta unos segundos si el pago de una tarjeta nueva sigue `pending` (el webhook de Stripe puede tardar en confirmar), así que se subió a 15s; (2) `.single()` al leer `profiles` fallaba entero si el miembro no tenía perfil completo (un fixture de test lo dejó en evidencia) — cambiado a `.maybeSingle()` con el email como nombre de respaldo. Ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 4" y `CLAUDE.md` §Email de recibo de reserva |
| Epic 3 (Lounge Profiles & Details) no tenía backend: contacto, horario, capacidad, restricciones, fotos y disponibilidad semanal eran derivados por hash o estáticos del mock | 17 sept 2026 | Conectado a Supabase local real: `lounges` extendida (contacto/horario/capacidad/restricciones/rating agregado), `lounge_images` (fotos, contenido sigue siendo bloques de marca), `lounge_availability` + `lounge_closures` (disponibilidad y cierres, horizonte de 18 semanas sembrado con la misma fórmula que ya usaba el mock). `lib/lounge-profile.ts` queda híbrido a propósito: las funciones síncronas viejas (`contactFor`, `weeklyAvailability`, etc.) se conservan tal cual para Epic 4 (`lib/booking.ts`, sin conectar todavía), que las sigue necesitando. Sin tabla `reviews` (ninguna historia permite dejar una reseña): rating/review_count son reales, el contenido de cada reseña sigue siendo de muestra. Ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 3" |
| "View details" del callout de un pin del mapa real (`/explore`) no navegaba nunca al perfil del lounge (bug reportado por el usuario al probar Epic 3 de punta a punta) | 17 sept 2026 | No era un bug de Epic 3: dos causas independientes en el `AdvancedMarker` de `city-map.tsx` (Epic 2) que envuelve el callout — (1) sin ningún handler interactivo, `@vis.gl/react-google-maps` le ponía `pointer-events: none` al contenido, dejando pasar el clic al mapa; (2) con eso corregido, Google Maps intercepta el foco de un hijo enfocable dentro de un `AdvancedMarker` (avisa "Focusable child elements... are not supported" en consola) y desmonta el callout a mitad del clic. Fix: `onClick={() => {}}` en el `AdvancedMarker` + `tabIndex={-1}` en el `Link` "View details" + `stopPropagation` en el callout para no burbujear hasta el `onClick` de deseleccionar del mapa. Invisible en jsdom (el stub de Google Maps no replica ninguna de las dos causas) — solo se reprodujo y verificó con Playwright real, con clics simulados de verdad, no solo comprobando el `href`. Detalle en `docs/design/COMPONENT-MAP.md` "Backend real — Epic 2", regresión en `lounge-callout.test.tsx` |
| Story 4.1 (Seamless Booking Flow) no tenía backend: el calendario/slots derivaban de un hash sobre el catálogo mock, y el chequeo final de disponibilidad era un umbral artificial (`WAITLIST_THRESHOLD_SEATS`) sin tocar ningún dato real | 17 sept 2026 | Conectado a Supabase local real: tabla `bookings` (nace aquí) + RPC `confirm_booking`/`join_waitlist` (`SECURITY DEFINER`, con `FOR UPDATE` sobre `lounge_availability` para que dos confirmaciones casi simultáneas no decrementen ambas la última plaza). `fetchAvailability` (Epic 3) se generalizó de semana fija a rango arbitrario para traer un mes completo; `monthCalendar`/`slotsFor` pasan de mock+hash a agregar esas celdas reales. `contactFor`/`LoungeContact` (Epic 3, legacy) se retiraron — las pantallas de `/lounges/[id]/book/*` ya leen `lounge.address`/`phone` reales (`weeklyAvailability`/`closureCovering` sí se quedaron, los sigue usando el test de Story 3.2 como predictor de la semilla). La referencia de reserva pasa de un hash de lounge/fecha/hora a `bookingReferenceFromId`, derivada del `id` real. Ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 4" |
| Story 4.2 (Payment Processing) simulaba el cobro: los métodos de pago eran `SAMPLE_PAYMENT_METHODS` y el "cargo" una comprobación local sin SDK ni llamada de red — decisión de alcance revertida el 17 sept 2026 (ver `CLAUDE.md` §Procesamiento de pagos real) | 18 sept 2026 | Conectado a Stripe real en modo test: tabla `payments` (nace aquí) + columna `profiles.stripe_customer_id`, y 4 Edge Functions (`stripe-create-checkout-session`, `stripe-charge-saved-method`, `stripe-payment-methods`, `stripe-webhook`) — mismo patrón sin route handlers que `send-email` de Epic 1. Tarjeta nueva: Checkout Session (`ui_mode: 'elements'`) + `<PaymentElement>`; tarjeta guardada: `PaymentIntent` directo servidor-a-servidor. El webhook es la única fuente de verdad del `status` de `payments`, nunca el cliente. `handleConfirm` en `summary/page.tsx` cobra antes de llamar a `confirmBooking`, igual que ya anticipaba la entrada de Story 4.1 de arriba. **Bug real encontrado y arreglado vía Playwright, invisible para jsdom** (mismo tipo que el del callout del mapa de Epic 2): portar `<PaymentElement>` de padre en el DOM entre el paso 2 y el paso 3 (con `createPortal`) recargaba su iframe y borraba la tarjeta ya escrita — `stripe-checkout-bridge.tsx` ahora vive en el layout y el elemento nunca cambia de padre real, solo se reposiciona con `position: fixed` sincronizado por `ResizeObserver`. Apple Pay/Google Pay quedan fuera (dominio no verificado, no viable en `localhost`) — ver fila de la tabla de desviaciones de arriba. Ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 4" |
| El CI del PR #22 (Epic 4) fallaba en el job `test` con `Invalid API Key provided: undefined` en `src/lib/stripe-payments.test.ts` | 21 sept 2026 | No era un bug del código de Epic 4: `ci.yml` nunca se amplió para servir las Edge Functions — `supabase start` las instala pero no las sirve, hace falta `supabase functions serve` aparte (mismo matiz que ya advertía el comentario de cabecera del propio archivo de test). Arreglo: nuevo paso en el job `test` que levanta `supabase functions serve` en background con un `supabase/functions/.env` armado en el runner desde el secret `STRIPE_SECRET_KEY` (dado de alta en GitHub, misma clave de test de la sandbox de Epic 4 — sin riesgo real, modo test), con una espera activa (hasta 30s) a que las functions respondan antes de `npm test`. No hizo falta darle los demás secrets de `supabase/functions/.env` (Brevo, webhooks): ninguna function que los necesite se invoca en esta suite. Ver `docs/ci-cd/RESUMEN.md`. |
| La sandbox de Stripe de Epic 4 expiraba el 24 sept 2026 si nadie la reclamaba (§4.5, ya retirada de este archivo) | 21 sept 2026 | Reclamada por el usuario con `stripe sandbox claim` + `stripe login --complete-device`, asociándola a una cuenta Stripe real — ya no expira. La CLI no ofrece forma de posponer el plazo (confirmado en `docs.stripe.com/cli/sandbox`: fijo a 7 días, solo `claim` o dejarla expirar). Verificado con una llamada real a la API tras reclamarla: la clave `rkcs_test_...` sigue siendo exactamente la misma (no rotó), así que no hizo falta tocar `.env.local`, el secret de GitHub, Supabase ni Vercel. |
| Epic 4 (Stripe + recibo de reserva) no tenía nada desplegado a `staging`/`main` — `deploy.yml` solo desplegaba `send-email` (Epic 1), sin las 5 Edge Functions nuevas ni sus secrets (§4.6, ya retirada de este archivo) | 21 sept 2026 | `deploy.yml` ampliado (jobs `migrate-dev`/`migrate-prod`) con `supabase secrets set` + `supabase functions deploy` para las 5 functions nuevas, mismo patrón que `send-email`. Decisión del usuario durante el despliegue: **3 cuentas/sandboxes de Stripe separadas, una por ambiente** (local, `luxepass-dev`, `luxepass-prod`) — no solo el webhook secret, también `STRIPE_SECRET_KEY_DEV`/`_PROD` en vez de una sola compartida (la de `ci.yml`, sin sufijo, queda aparte: es la de local, solo para tests). Los 6 secrets de ambiente cargados en GitHub (`STRIPE_SECRET_KEY_DEV`/`_PROD`, `STRIPE_WEBHOOK_SECRET_DEV`/`_PROD`, `BOOKING_RECEIPT_WEBHOOK_SECRET_DEV`/`_PROD`), y confirmados los 3 pasos manuales en `luxepass-prod` (secretos de Vault, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` en Vercel, webhook de Stripe registrado) — mismos ya hechos antes en `luxepass-dev`. Epic 4 queda listo para promoverse a `staging` y eventualmente a `main`. |
| Epic 5 (QR Code & Check-in) no tenía backend: My Pass, el pase digital y la consola de recepción eran datos de muestra fijos (`AINSWORTH_PASS`, `RECEPTION_VALID_BOOKING`) | 21 sept 2026 | Conectado a Supabase local real, decisiones tomadas con el usuario antes de implementar: Story 5.2 vía RPC "de kiosco" (`reception_*`, `SECURITY DEFINER`, concedidas a `anon` — sin esperar al login de staff de Epic 7) y Story 5.3 vía `pg_cron` real (primer job programado del proyecto) en vez de quedarse mockup. `bookings` gana `confirmation_code` (columna generada), `checked_in_at`, `no_show`, `reminder_sent_at`; `profiles` gana `emergency_contact_*`. **Bug real encontrado y corregido corriendo la suite localmente**: el hash de `bookingReferenceFromId` (Story 4.2/5.1, `31 * suma de códigos ASCII`) es conmutativo — dos UUID que son anagramas entre sí colisionan en el mismo LP#, invisible mientras era solo copy de un recibo, pero un bug funcional real en cuanto Epic 5 lo usa como clave de búsqueda (`reception_checkin_booking` fallaba con "query returned more than one row"). Corregido a un hash posicional en las tres implementaciones (TS, Deno, SQL) a la vez. Ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 5" y `docs/DATA-MODEL-MAP.md` §Epic 5. |
| `supabase db diff --local -f <nombre>` (el comando que documenta `CLAUDE.md` §Supabase Local Development) ya no lee `supabase/schemas/*.sql` — CLI v2.116.0 lo cambió a comparar solo migraciones contra la base, con un aviso a mitad de la salida fácil de pasar por alto | 21 sept 2026 | El comando declarativo correcto en esta versión del CLI es `supabase db schema declarative sync --apply -f <nombre>` (o `--no-apply` para generar sin aplicar, como pedía el paso 4 de la receta de `CLAUDE.md` antes de aplicar). Mismo flujo de ahí en adelante (revisar el SQL generado, `supabase db advisors`). `CLAUDE.md` queda desactualizado en este punto — actualizarlo la próxima vez que se toque esa sección, no se corrigió en esta rama para no mezclarlo con el trabajo de Epic 5. |
| Epic 5 (recordatorio de reserva, Story 5.3) no tenía nada desplegado a `staging`/`main` — `deploy.yml` solo desplegaba las 5 Edge Functions de Epic 4, sin `send-booking-reminder` ni sus secrets (§4.5, ya retirada de este archivo) | 22 sept 2026 | `deploy.yml` ampliado (mismo patrón que Epic 4) con `supabase secrets set BOOKING_REMINDER_WEBHOOK_SECRET` + `supabase functions deploy send-booking-reminder --no-verify-jwt` en `migrate-dev`/`migrate-prod`. Los 2 secrets de GitHub (`BOOKING_REMINDER_WEBHOOK_SECRET_DEV`/`_PROD`) dados de alta, y el usuario confirmó haber creado los 2 secretos de Vault (`booking_reminder_webhook_url`/`_secret`) en `luxepass-dev` y `luxepass-prod` a mano vía Studio. Epic 5 queda listo para promoverse a `staging` y eventualmente a `main`. |
| Epic 6 (Member Experience & Notifications) no tenía backend: perfil, preferencias, favoritos, privacidad, notificaciones y cancelación de reserva eran datos de muestra fijos, y el corazón de favorito de `Preferences.dc.html` no tenía ningún lugar desde el que guardarse | 21 sept 2026 | Conectado a Supabase local real, decisiones tomadas con el usuario antes de implementar (ver `CLAUDE.md` §Alcance): `notifications`/`member_favorite_lounges` nacen aquí; `cancel_booking` (RPC) cierra Story 6.1; de los 6 tipos de notificación solo 2 tienen evento real (confirmación de reserva, aviso de las 6 AM vía `pg_cron`), el resto se siembra como muestra real al crear el perfil; el borrado de cuenta es un soft-delete reversible con `pg_cron` para el borrado físico a los 30 días, fiel a la promesa del artboard; el botón de favorito en `/lounges/[id]` se compuso reutilizando el botón de acción rápida existente (sin artboard propio, decisión tomada con el usuario). **Bug real encontrado y corregido con TDD**: el fetch inicial de favorito (parte del mismo `Promise.all` que fotos/disponibilidad, más lento) podía resolver DESPUÉS de un click muy temprano del miembro y pisar el toggle optimista con el valor previo — un `favoriteOverriddenRef` evita que ese fetch tardío sobrescriba un cambio ya hecho por el usuario. **Segundo bug real de la misma clase, encontrado por CI** (runner más lento que local): el fetch inicial de notificaciones podía resolver después de un "mark as read" temprano, mismo fix (`mutatedRef`) en `NotificationBellMenu` y `/notifications`. Ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 6" y `docs/DATA-MODEL-MAP.md` §Epic 6. |
| Epic 6 (borrado de cuenta, Story 6.3) no tenía nada desplegado a `staging`/`main` — `deploy.yml` solo desplegaba las Edge Functions de Epic 4/5, sin `delete-account` ni sus secrets | 22 sept 2026 | `deploy.yml` ampliado (mismo patrón que Epic 4/5) con `supabase secrets set ACCOUNT_DELETION_WEBHOOK_SECRET` + `supabase functions deploy delete-account --no-verify-jwt` en `migrate-dev`/`migrate-prod`. Los 2 secrets de GitHub (`ACCOUNT_DELETION_WEBHOOK_SECRET_DEV`/`_PROD`) dados de alta, y el usuario confirmó haber creado los 2 secretos de Vault (`account_deletion_webhook_url`/`_secret`) en `luxepass-dev` y `luxepass-prod` a mano vía Studio. `delete-account` ya desplegada de verdad en `luxepass-dev` (confirmado en el run de `deploy.yml` del merge a `staging`); `luxepass-prod` la recibe en cuanto `staging` se promueva a `main`. Epic 6 queda listo para promoverse a `staging` (ya hecho) y eventualmente a `main`. |
| Epic 7 (Partner Dashboard) era mockup puro: `/partner/login` validaba credenciales en el cliente, `/partner`/`/partner/analytics`/`/partner/guests`/`/partner/reports` corrían sobre datos de muestra fijos, y la decisión de rol member/partner/admin (`docs/DATA-MODEL-MAP.md`) seguía pospuesta | 22 sept 2026 | Conectado a Supabase local real, decisiones de arquitectura tomadas con el usuario antes de implementar: tabla `user_roles` (no custom claim ni esquema separado) para el rol, `partner_lounges` como tabla puente many-to-many (no FK directa en `lounges`). Story 7.1: `partner_guest_list`/`partner_checkin_booking`/`partner_report_no_show` (RPC autenticadas, no "de kiosco") + suscripción de Supabase Realtime en `/partner` reemplazando los temporizadores deterministas. Story 7.2: dos triggers (Database Webhook) + un `pg_cron` (digest 6:30 AM), mismo mecanismo que Story 4.2/5.1/5.3 — decisión consciente de **no** usar la tabla `notifications` de Epic 6 (el AC es "recibir un email", no una fila en el centro de notificaciones del miembro). Story 7.3: `partner_analytics_summary`/`partner_bookings_by_day`/`partner_repeat_guests`, agregando sobre todos los lounges reales del partner. **Bug real encontrado y corregido corriendo la suite localmente**: `partner_bookings_by_day` devolvía `timestamp with time zone` donde la función declaraba `date` (`generate_series` sobre un rango de fechas produce timestamps, no fechas) — Postgres lo rechazaba con "structure of query does not match function result type"; corregido con un cast `::date` explícito. Las dos Edge Functions nuevas se verificaron de punta a punta con un `curl` directo contra el edge runtime local (200 en ambas) tras resolver una caída puntual del contenedor con `supabase stop && supabase start` (§4.5). Ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 7" y `docs/DATA-MODEL-MAP.md` §Epic 7. |
| Epic 8 (Admin & Support) era mockup puro: las 11 pantallas de `/admin/**` corrían sobre datos de muestra fijos (`SUPPORT_CASES`, `ADMIN_MEMBERS`, `NETWORK_METRICS`, `ADMIN_LOUNGES`...), sin login de admin ni forma de tocar Supabase | 22 sept 2026 | Conectado a Supabase local real, dos decisiones de alcance tomadas con el usuario antes de implementar que revierten la nota original de `docs/DATA-MODEL-MAP.md`: el reembolso (Story 8.1) es real vía Stripe (`stripe-refund-payment`) para un cargo `succeeded`, y los reportes programados (Story 8.2) son reales vía `pg_cron` + Brevo (`send-admin-report`, adjunto CSV real) — mismo nivel de realismo que el resto del proyecto. `/admin/login` nace sin artboard propio (la Fase 8 nunca dibujó ese nodo del flow) — decisión confirmada con el usuario: reutiliza el layout de `/partner/login`. Story 8.1: `support_tickets`/`support_ticket_messages` (nacen aquí), un no-show reportado por un partner abre un caso automáticamente; `BookingOverrideDrawer` reescrito sobre los 5 horarios reales del dominio (el artboard dibujaba horas ficticias). Story 8.2: analítica real sobre TODA la red (no un lounge elegido), export por dataset con columnas anonimizadas por defecto. Story 8.3: `lounges.content_status` (live/draft/archived) + `lounge_content_submissions` (nace aquí) generalizan el "Content approval workflow" a cualquier lounge, no solo The Vestry como el mock; bucket de Storage real `lounge-images`; de la barra de acción masiva, solo "Archive" quedó real. **Dos bugs reales encontrados y corregidos con TDD**: (1) `admin_search_members` trataba "4+ dígitos en la consulta" como rama excluyente de la búsqueda por nombre, así que un query con nombre y unos dígitos (p. ej. un email de test con timestamp) dejaba de buscar por nombre — la condición pasó a ser inclusiva (OR); (2) las RPC que reutiliza el cron de reportes (`admin_generate_report_csv` y las `admin_export_*`) rechazaban la llamada con "Not authorized" porque el guard exigía `has_role('admin')` incluso cuando el cron las llama sin sesión (`auth.uid()` nulo) — el guard pasó a `auth.uid() is not null and not has_role('admin')`, que sigue rechazando a un autenticado sin el rol pero deja pasar la llamada interna sin sesión. Verificado de punta a punta: `stripe-refund-payment` con un cargo real de la sandbox, `dispatch_scheduled_reports` disparado a mano con `200` confirmado en `net._http_response`. Ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 8" y `docs/DATA-MODEL-MAP.md` §Epic 8. |
| Epic 9 (Membership & Referrals) era mockup puro: `/profile/membership/**` corría sobre las cuentas de muestra de Alexandra/Naomi (`?plan=monthly`, `?state=credited`), el código de referido era determinista sin persistir y "Pay … and switch" solo cerraba el modal | 23 sept 2026 | Conectado a Supabase local real + Stripe en modo test, decisiones de producto tomadas con el usuario antes de implementar: un miembro nace sin membresía hasta elegir plan (elección de plan sobre `Plans.dc.html` + el modal de `Upgrade.dc.html`, sin artboard propio); alta y subida mensual→anual son un cobro puntual real (no Stripe Billing), con tarjeta guardada o `<PaymentElement>` embebido; el premio de referido se acredita con el primer pago real liquidado del amigo; el amigo entra por `/join/[code]` → `/signup?ref=` (metadatos de Auth, sin campo nuevo). Nacen `memberships`, `referrals`, `referral_shares`; `profiles.membership_status` pasa a espejo de `memberships` y el miembro ya no puede escribirlo (ni `referral_code`/`stripe_customer_id`, `guard_profile_managed_columns`). Cuarto uso de `pg_cron` (`dispatch_membership_renewals`, aviso de un mes antes + vencimientos). Ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 9" y §2.12/§4.8 de este archivo para lo que queda abierto. |
| La disponibilidad de los lounges (`lounge_availability`) era un seed estático de 18 semanas desde `TODAY`: un lounge nuevo no tenía plazas sin otra migración, y cancelar una reserva como miembro (`cancel_booking`) nunca devolvía la plaza | 25 sept 2026 | Tabla eliminada; disponibilidad en vivo con `lounge_availability_range` (`capacity` por franja − reservas `confirmed`/`in_progress`/`completed`), `confirm_booking`/`admin_reschedule_booking` serializados con `pg_advisory_xact_lock` por lounge/fecha/franja. Cancelar libera la plaza sola. Tests: `fillSlot` (`src/lib/testing/lounge-fixture.ts`) llena una franja con reservas reales y `vitest.global-setup.ts` borra las reservas de usuarios de test antes de cada corrida. Ver §2.10 y `docs/design/COMPONENT-MAP.md` "Backend real — Epic 3" |
