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
sesión real — no hay sesión que cerrar, es solo el diseño del enlace.

**Se resuelve:** el resto queda como está — cerrar sesión de verdad exige
backend, fuera de alcance de este repo.

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

**Se resuelve:** si una historia futura pide explícitamente que la recepción
viva detrás del login de partner (p. ej. `/partner/reception`), no antes —
ese mismo momento es el que debería endurecer las RPC de kiosco a exigir
sesión de staff en vez de `anon`.

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

### 2.10 `lounge_availability` (Epic 3) es un seed estático, no una agenda que un partner pueda alimentar

Señalado por el usuario al revisar Epic 3 (17 sept 2026): las filas de
`lounge_availability` (`seats_left` por lounge/fecha/franja) no se calculan
solas — son un seed escrito una vez por
`supabase/migrations/..._seed_lounge_profiles_story_3.sql`, con una ventana
fija de 18 semanas desde `TODAY` (ver `docs/design/COMPONENT-MAP.md`
"Backend real — Epic 3"). Es real en el sentido de que la app la consulta
de verdad contra Supabase (no está hardcodeada en el frontend), pero el
*contenido* es una foto fija: nada la mantiene creciendo hacia el futuro, y
un partner que diera de alta un lounge nuevo (Epic 7/8.3) no tendría forma
de generar sus propias filas sin, en la práctica, correr otra migración.

Se planteó reemplazarla por un cálculo al vuelo desde la plantilla
recurrente que ya vive en `lounges` (`bands`/`closed_weekdays`/`capacity`) +
`lounge_closures` — sin tabla de filas por fecha, disponibilidad real
"hoy" para cualquier lounge que exista, alta o viejo. **Se decidió
conscientemente no hacerlo ahora** (17 sept 2026): se deja como deuda
explícita en vez de tocar otra vez el schema recién mergeado de Epic 3.

**Desbloquea:** antes de que Epic 7/8.3 permita dar de alta un lounge con
sus propios días, resolver esto — o el rediseño de arriba, o esperar a que
Epic 4 (`bookings`) exista y derivar de ahí las plazas en vivo (ver
`docs/DATA-MODEL-MAP.md` §Epic 7).

Misma ventana fija explica por qué el cron de recordatorios de la Story 5.3
(`dispatch_booking_reminders()`, ver `docs/design/COMPONENT-MAP.md`
"Backend real — Epic 5") no se puede ejercitar de punta a punta en este
entorno: usa el reloj real (`now()`) para "24 horas antes", pero ninguna
reserva real posible hoy cae en esa ventana mientras `lounge_availability`
siga anclada a 2025-09-09. Resolver esto también desbloquea eso.

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
| 5.1 | Booking expires automatically after booking window | **Sigue igual tras conectar Epic 5 (21 sept 2026).** No hay cron que mueva una reserva vencida a completed/no-show por el paso del tiempo (Epic 6, sin construir): los cuatro estados del pase se siguen eligiendo por `?state=` en `/my-pass/[reference]`, ahora sobre datos reales, ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 5" |
| 5.2 | Emergency contact information accessible to staff | **El mecanismo de acceso ya es real** (`reception_lookup_booking` lee `profiles.emergency_contact_*`) — lo que sigue sin ser real es el registro de "cada acceso queda registrado" (solo texto) y la propia captura del dato (editarlo desde `/profile/privacy` sigue siendo Story 6.3, sin conectar, así que casi ningún miembro de prueba lo tiene relleno) |
| 6.1 | 24-hour advance notice requirement for cancellation | El umbral (`isFreeCancellation`) ya compara contra `hoursUntilArrival` calculado de verdad (fecha real de la reserva vs. `TODAY`, ver `fromUpcomingRow` en `lib/passes.ts`) desde que Epic 5 conectó `/my-pass` — lo que sigue sin ser real es la propia cancelación: `CancelBookingModal` solo quita la fila del estado local, no escribe en Supabase (Story 6.1 no está conectada) |
| 6.1 | No show policy enforcement - flat fee | El cargo de $35.00 en `CancelBookingModal` es visual: no hay tarjeta ni pasarela que cobre nada |
| 6.1 | Email for each booking with a confirmation number | El número de confirmación ya vive en cada reserva de muestra; "Email receipt" en el historial no envía ningún correo |
| 6.1 | Support contact for booking issues - Admin | Las filas "Something wrong with a booking?" / "Disagree with a fee or a no-show?" no abren ninguna conversación — la consola de soporte es el Epic 8 |
| 6.2 | Booking confirmation notification / 6am notification / New lounge partner announcements / Membership renewal reminders / Special offers and promotions / Birthday month promotion | Los seis tipos son entradas de muestra en `NOTIFICATIONS` (`src/lib/notifications.ts`); no hay un disparador real (push, cron de las 6 AM, evento de socio nuevo) que los genere |
| 6.2 | Ajustes de canal (push/email/sms) | Los switches de `NotificationSettingsPage` cambian solo el estado local del componente; no hay servicio de push ni de SMS que suscribir o dar de baja |
| 6.3 | Referral code sharing functionality | "Share your code" no abre ninguna hoja de compartir (a diferencia de `ShareDialog` del Epic 3); solo "Copy" usa `navigator.clipboard`, de verdad |
| 6.3 | Export personal data option (GDPR compliance) | "Request export" en `/profile/privacy` no dispara ningún email ni genera ningún archivo; el plazo de 48 h y los 7 días de validez son solo el texto que los declara |
| 6.3 | Account deletion option with confirmation | `DeleteAccountModal` exige la casilla y escribir DELETE, pero "Delete my account" no borra nada ni cierra sesión — solo navega a `/login`, igual que el resto de la app sin backend |

| 7.1 | Real-time updates when new bookings are made | La reserva de Naomi Feldstein llega por un `setTimeout` determinista al entrar en `/partner` (`applyLiveBooking`), no por un canal en vivo contra un backend |
| 7.1 | Check-in status tracking / no-show reporting | El estado de cada invitado vive en `useState` de `TodayDashboard`; no hay "app del miembro" real que reciba el check-in al marcar la casilla, solo el aviso de que lo haría |
| 7.2 | Email notification for each new booking / morning digest / cancellation notifications | Las tres son pantallas del email tal como llegaría (`/partner/emails/*`), igual que `Receipt.dc.html`/`Reminder.dc.html`; no se envía ningún correo ni se programa el digest de las 6:30 AM |
| 7.2 | Waitlist promotion alerts | La promoción de Victor Almeida es el mismo `setTimeout` determinista que la cancelación de Harriet Osei (`applyCancellationAndPromotion`), no una cola de espera real |
| 7.3 | Weekly/monthly booking volume reports / revenue attribution / repeat guest identification | `lib/partner.ts` fija cifras de muestra que cuadran entre sí (187 reservas, $8,616.50, 412 miembros); no hay un almacén de reservas real del que agregarlas |
| 7.3 | Downloadable reports in CSV | Las descargas de `/partner/guests`, `/partner/analytics` y `/partner/reports` son CSV reales generados en el cliente (`downloadTextFile`); los "informes descargados recientemente" de `Reports.dc.html` son metadatos de muestra, no un historial real |

| 8.1 | Communication log with customer / booking modification / refund processing | El composer de `/admin/support/[id]` añade la entrada al log en memoria (`useState`); "Reply to member" no envía ningún email de verdad, y "Waive and refund" no llama a Stripe — solo escribe una entrada de sistema y marca el caso resuelto |
| 8.1 | Escalation to manager functionality | "Escalate" cambia el estado a `escalated` y muestra el aviso; Dana Mbeki no recibe ninguna notificación real, no hay bandeja de manager |
| 8.1 | Every action logged (audit trail) | El chip "Every action logged" de la topbar es constante; no existe ningún registro de auditoría real detrás de reembolsos, cambios de reserva o respuestas |
| 8.2 | Data export in CSV format / scheduled email delivery of reports | "Download CSV" en `/admin/reports` sí genera y descarga un archivo real (`downloadTextFile`), pero "Email it to me" y "Save as a scheduled report" no envían ningún correo ni crean un job real; `/admin/reports/scheduled` es una lista de muestra que no recibe reportes nuevos |
| 8.2 | Automated daily/weekly report generation | Los seis reportes de `SCHEDULED_REPORTS` (`lib/admin-analytics.ts`) son de muestra con sus próximas/últimas ejecuciones fijas; nada los dispara realmente a las horas que anuncian |
| 8.3 | Add/edit/remove lounge profiles | "Add lounge" en `/admin/lounges` no abre ningún formulario; no hay alta, edición de campo a campo ni borrado real de un lounge, solo la lista y el editor de contenido de The Vestry |
| 8.3 | Upload and manage lounge images / image optimization and resizing | Las fotos de `LoungeEdit.dc.html` son bloques de marca decorativos; no hay subida de archivo real ni redimensionado — el texto "Resized to 1600, 800 and 400 px" solo lo anuncia |
| 8.3 | Content approval workflow | "Approve and publish"/"Send back with a note" cambian el estado local (`useState`) de la sesión; no hay cola de aprobación real ni notificación a Theo Baptiste |

| 9.1 | Renewal date and auto-renewal settings — aviso por email un mes antes | El texto "We email you on October 3" en `Main.dc.html` es solo la promesa en pantalla; ningún correo se programa ni se envía |
| 9.1 | Upgrade options to monthly subscribers and pricing | "Pay $2,217.40 and switch" (`UpgradeConfirmModal`) no llama a Stripe ni cambia el plan de verdad — el modal cierra sin dejar rastro, igual que `WaitlistModal` en el Epic 4 |
| 9.2 | Reward crediting for successful referrals (pending) | El paso de "Reward pending" a "Day pass credited" (Daniel Okonjo) se alcanza por `?state=credited` en `/profile/membership/referrals`, no por el primer pago de un amigo liquidando de verdad |
| 9.2 | Friend's sign up confirmation notification | Las dos notificaciones de `RewardCredited.dc.html` solo existen cuando se abre esa misma URL con `?state=credited` (`extraItems` de `NotificationBellMenu`); no hay evento real de alta que las dispare |

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

---

## 5. Decisiones abiertas

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
