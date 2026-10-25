# LuxePass — Pendientes

Registro vivo de lo que queda abierto en el proyecto: lo que falta, lo que es
provisional y lo que hay que decidir. **Al terminar una historia, revisar este
archivo**: añadir lo que quede abierto y borrar lo que se haya resuelto (el
historial queda en git).

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

### 2.5 Reseñas: lo que queda abierto

Las reseñas son reales desde el 23 oct 2026 (`reviews`, una por visita con
check-in). Abierto:

- **El Home sigue con notas inventadas:** sus tarjetas destacadas leen el
  catálogo de muestra `src/lib/lounges.ts` (4.9, 4.8…), no `lounges`.
- **Sin moderación ni respuesta del partner:** el admin no puede ocultar una
  reseña y el miembro no puede editarla ni borrarla.
- **Sin aviso para reseñar:** el pase con check-in promete "We will ask how
  it went", pero nadie lo pide; se reseña entrando al detalle de la reserva
  en My Pass.
- **Al subir a `staging`/`main`,** la migración `reset_seeded_lounge_ratings`
  deja a 0 la nota y el recuento de todos los lounges remotos (decisión del
  usuario: nada de cifras sembradas).

**Se resuelve:** con una historia de moderación o de recordatorio de reseña,
y conectando el Home al catálogo real.

### 2.6 El QR del pase es decorativo

`QrCode` (`src/components/ui/qr-code.tsx`) dibuja el mismo SVG de 25×25 módulos
que ya fijaban los artboards de la Fase 6: no codifica de verdad el LP# que
recibe por prop, así que un lector real no obtendría nada útil de él.
`DESIGN-SYSTEM.md` §6 (Fase 6) ya avisaba de esto al diseñar la pantalla.

**Se resuelve:** añadiendo una librería de generación de QR cuando el pase
tenga que ser escaneable de verdad, no solo mostrarse.

### 2.7b El bloqueo tras 5 intentos de login en remoto solo lo aplica `/login`

SEC-03 (`docs/audit/seguridad-y-datos.md`). El bloqueo de la Story 1.2 ya
lo aplica Supabase Auth: `hook_password_verification_attempt`
(`supabase/schemas/login_attempts.sql`) cuenta cada fallo de contraseña,
bloquea al quinto y rechaza cualquier login mientras dura el bloqueo,
también el que llama a `/auth/v1/token` directamente. En local está activo
(`[auth.hook.password_verification_attempt]` de `config.toml`).

Sigue abierto, por decisión de coste:

- **Activarlo en remoto:** el hook "Password Verification Attempt" es del
  plan Team. Al subir `luxepass-dev`/`luxepass-prod` de plan, activarlo en
  Authentication → Hooks → Postgres → `public.hook_password_verification_attempt`
  (la función ya llega con las migraciones). Hasta entonces, en remoto el
  bloqueo solo lo aplica `/login` vía `record_failed_login` y la defensa de
  servidor es el rate limit de sign-in por IP de Auth (dashboard →
  Authentication → Rate Limits; el `sign_in_sign_ups = 200` de
  `config.toml` es solo local).
- **Bloquear la cuenta de otro adrede** (5 fallos con su email) sigue siendo
  posible, ahora también vía Auth. Es el trade-off ya documentado en
  `supabase/schemas/login_attempts.sql`; CAPTCHA (Turnstile/hCaptcha,
  verificado por Auth en cualquier plan) lo mitigaría.

**Se resuelve:** pasando a plan Team y activando el hook.

### 2.8 "Settings" del Partner Dashboard no tiene pantalla propia

El sidebar de `/partner` (patrón 15) fija la nav completa — Today · Guests ·
Analytics · Reports · Settings — porque así la declara `Main.dc.html`. Las
cuatro primeras ya tienen ruta; **"Settings" queda inerte** (sin `href`). Los tres emails del
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
  (`booking_coverage.sql`), pero no hay tope anual.
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

### 2.14 Vista de reservas: lo que queda tras la Story 8.4 (13 oct 2026)

`/admin/bookings` (Story 8.4, historia propuesta por el equipo, no del
cliente) ya es real. Abierto:

- **"Undo check-in" / "Undo no-show" del partner, solo hoy** (decidido con el
  usuario, 13 oct 2026, `partner_undo_booking_status`). Sin zona horaria en
  `lounges`, el servidor acepta ayer/hoy/mañana de su reloj y la pantalla lo
  limita a hoy; si `lounges` gana zona horaria, ajustar la ventana.
- **"See them in Bookings" del cierre masivo** (desviación de
  `COMPONENT-MAP.md`) ya tiene pantalla de destino, pero no filtra por un
  rango de fechas: haría falta abrir `/admin/bookings` en la fecha y el lounge
  del cierre.
- **Filtro por partner, lounge escribible, calendario y "Change the status"**
  se añadieron a pedido del usuario (13 oct 2026) sin entrar en los
  `## Acceptance Criteria` de la Story 8.4. Decidir si se suman a la historia
  o quedan como mejoras fuera de contrato.
- **Cambiar el status no avisa a nadie.** Ni al miembro ni al partner: no
  hay email ni notificación in-app para una corrección del admin.

---

### 2.16 La columna "Where the money comes from" de `/partner/analytics` queda fuera de pantalla

A 1440 px, con "Month" (90 días), las 90 columnas de "Bookings a day" ensanchan
la fila y el rail de ingresos de la derecha (`w-86`) queda fuera del viewport
(visto el 21 oct 2026, igual antes y después de PERF-02). `Analytics.dc.html`
de la Fase 2 dibuja menos días: hace falta decidir cómo se resumen 90 días
(agrupar por semana, scroll horizontal propio del gráfico…) antes de tocarlo.

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
| 5.2 | Emergency contact information accessible to staff | **El mecanismo de acceso ya es real** (`reception_lookup_booking` lee `profiles.emergency_contact_*`) — lo que sigue sin ser real es el registro de "cada acceso queda registrado" (solo texto) y la propia captura del dato: `/profile/privacy` (Story 6.3, ya conectada) LEE el contacto real, pero "Edit" para escribirlo sigue inerte — sin artboard propio para ese formulario |
| 6.1 | Support contact for booking issues - Admin | Las filas "Something wrong with a booking?" / "Disagree with a fee or a no-show?" siguen sin abrir ninguna conversación — la consola de soporte (Epic 8, ya conectada) no tiene un flujo de "abrir un caso desde la reserva del miembro", solo el "New case" inerte de `/admin/support` |
| 6.2 | New lounge partner announcements / Membership renewal reminders / Special offers and promotions / Birthday month promotion | **Parcialmente resuelto tras conectar Epic 6 (21 sept 2026).** Dependen de datos que Epic 7/9 todavía no modelan de verdad, así que se siembran como notificaciones de muestra REALES (filas de verdad en `notifications`, no sintéticas del cliente) al crear el perfil — ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 6" |
| 6.2 | Ajustes de canal (push/email/sms) | Los switches de `/profile/notifications` cambian solo el estado local del componente; ningún AC de la Story 6.2 pide persistirlos, así que se quedan de muestra a propósito (decisión tomada con el usuario) |
| 8.1 | Escalation to manager functionality | **Sigue igual tras conectar Epic 8 (22 sept 2026).** "Escalate" cambia `support_tickets.status` a `escalated` de verdad, pero Dana Mbeki (`DUTY_MANAGER`) sigue siendo un dato de muestra fijo — no hay bandeja de manager real ni notificación |
| 8.1 | Every action logged (audit trail) | **Sigue igual tras conectar Epic 8.** El chip "Every action logged" de la topbar es constante; no es un AC propio de ninguna historia (es chrome del patrón 21), así que no se construyó un registro de auditoría aparte — cada acción real (reembolso, cambio de reserva, mensaje) ya queda escrita en su propia tabla, solo no hay un log unificado que las muestre juntas |
| 8.3 | Image optimization and resizing | **Resuelto a medias tras conectar Epic 8.** La subida de foto ya es real (bucket de Storage `lounge-images`); el redimensionado a 1600/800/400 px que el artboard anuncia sigue sin tener nada detrás — no hay librería de procesamiento de imágenes en el stack |

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

### 4.6 Secretos de las Edge Functions de Epic 7/8 en los remotos

`deploy.yml` ya despliega `send-partner-booking-event`, `send-partner-digest`,
`send-admin-report` y `stripe-refund-payment` (CI-03), pero **faltan en
GitHub** `PARTNER_NOTIFICATION_WEBHOOK_SECRET`, `PARTNER_DIGEST_WEBHOOK_SECRET`
y `ADMIN_REPORT_WEBHOOK_SECRET` con sufijo `_DEV`/`_PROD`, y su par en Vault
de `luxepass-dev`/`luxepass-prod` (`docs/ci-cd/VAULT-SECRETS.md`). Sin ellos,
los avisos al partner, su digest y los reportes programados no salen en
remoto.

### 4.7 "Email it to me" de `/admin/reports` deshabilitado

Queda deshabilitado en la UI, no solo pendiente de despliegue. (El "Email receipt" de My Pass ya resolvió
este mismo problema para el miembro: RPC que valida y marca la petición +
trigger con el secreto de Vault — `resend_booking_receipt`,
`booking_receipts.sql`. Es el patrón a copiar aquí.) A diferencia del cron (que sí puede leer
el secreto de Vault desde Postgres), este botón invocaría
`send-admin-report` directamente desde el navegador del admin — y esa
function solo acepta `x-webhook-secret`, un secreto que no puede vivir en
el cliente sin dejar de ser un secreto. Se deshabilitó (`disabled` en
`PaymentOptionRow`, visible con "Coming soon") en vez de dejarlo roto en
silencio. Arreglarlo de verdad implica una segunda vía de autenticación
para `send-admin-report` (p. ej. una RPC `SECURITY DEFINER` que verifique
`has_role('admin')` sobre el llamador y dispare el mismo `pg_net` que ya
usa el cron, en vez de que el cliente invoque la Edge Function
directamente) — no solo el alta de Vault de §4.6. Ver
`docs/design/COMPONENT-MAP.md` tabla de desviaciones.

### 4.8 Epic 9: despliegue a `staging`/`main` — faltan los pasos manuales

`deploy.yml` ya despliega `stripe-membership-checkout` y
`membership-renewal` en `migrate-dev`/`migrate-prod` — mismo patrón que Epic 4–6. Faltan, a mano:

1. **Secretos de Vault** en `luxepass-dev` y `luxepass-prod` (Studio → SQL
   Editor): `membership_renewal_webhook_url` (la URL pública de
   `membership-renewal` de ese proyecto) y `membership_renewal_webhook_secret`
   (el mismo valor que el secret de GitHub de ese ambiente) — SQL en
   `CLAUDE.md` §"Membresía y referidos reales". Sin ellos, el cron no cobra
   renovaciones ni manda el aviso por email (sí vence los términos sin
   auto-renovación y avisa en la app).
2. Después del primer deploy, **`scripts/sql/epic9-backfill-membership-status.sql`**
   en cada proyecto (ver §2.12, opción A).

---

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

- **10.9 hecha** (datos, UI de admin en vista live y borrador, ficha del
  miembro con el horario de la temporada vigente). Queda abierto:
  - Las tarjetas y el filtro de fecha de `/explore` siguen con
    `lounges.hours` / `closed_weekdays` habituales; la reserva sí respeta la
    temporada porque sale de `lounge_availability_range`.
  - Las bandas (mañana/tarde/noche) son del lounge, no de la temporada.
  - "Save anyway" sobre reservas confirmadas solo avisa: no cancela ni
    notifica a esos miembros. **Decidido así** (2 oct 2026): las reservas
    siguen vigentes y nadie recibe aviso.
- **10.10 hecha** (editor con `react-easy-crop`, recorte en `<canvas>`,
  original y encuadre guardados en `lounge_images`). Abierto: sin
  porcentaje de subida ni "Retry" (ver desviaciones de COMPONENT-MAP);
  los originales ocupan Storage aunque el lounge cambie de foto, solo los
  limpia `cleanTestData` en local — en remoto no hay limpieza de huérfanos.
- **10.11 hecha** (selección, cambio de status, horario, temporada y cierre
  masivos con confirmación y resultado parcial). Abierto: sin registro de
  auditoría de la acción masiva. El cierre masivo sigue la misma decisión
  que "Save anyway": las reservas confirmadas siguen vigentes, sin aviso.
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

### 4.15 Test intermitente de la renovación automática en CI

`src/lib/membership.test.ts` → "rechaza una llamada sin el secreto
compartido" (AC 'Renewal date and auto-renewal settings') supera a veces su
timeout de 30 s en CI esperando a la Edge Function de cobro de renovación.
Visto en los runs `39619948282` y `39691872297` (PR #93); al relanzar el
job pasa. No es una regresión: el test solo comprueba un 401.

**Se resuelve:** subiéndole el timeout o haciendo que no dependa del
arranque en frío de la Edge Function en CI.

### 4.16 El perfil de un lounge sin fotos rompe

`HeroCarousel` (`src/components/lounges/hero-carousel.tsx`) lee `images[0].url`
sin comprobar que haya fotos: `/lounges/[id]` de un lounge live sin
`lounge_images` falla al pintar (visto el 23 oct 2026 en un test). Publicar
desde el admin exige fotos, así que hoy solo pasa con lounges creados a mano.

### 4.17 Test de informes programados que falla en local

`src/app/admin/reports/scheduled/page.test.tsx` → "lists the automated
reports with their cadence" falla aislado con "Found multiple elements with
the text: Every day": la base local acumula informes programados que el test
no espera (visto el 23 oct 2026, con y sin la rama de reseñas). Sin
investigar.

### 4.18 Cierre automático de reservas: lo que queda

`expire_finished_bookings` (pg_cron, 23 oct 2026) cierra las reservas al
acabar la ventana en el huso de `lounges.timezone`. Abierto:

- **El alta de un lounge no pide el huso:** nace con `America/New_York`.
  Google Places no lo trae; haría falta la Time Zone API o elegirlo en el
  formulario. Hoy solo Tacna/Arequipa están en `America/Lima`.
- **La lista de espera de una fecha pasada** no se cierra: sigue en
  `waitlisted` (cancelarla avisaría al partner con
  `notify_partner_cancellation`).
- **En los remotos** el cron cerrará en su primera pasada todas las reservas
  ya vencidas de `luxepass-dev`/`luxepass-prod`.

## 5. Decisiones abiertas

### 5.00 SEO: página 404 y dominio público (25 oct 2026)

- **404 global:** artboard nuevo `docs/design/epic-1-onboarding/NotFound.dc.html` (canvas 11), pendiente de revisión. Con su aprobación se implementa `src/app/not-found.tsx` sobre el patrón 1 y se anota en `COMPONENT-MAP.md`.
- **`NEXT_PUBLIC_SITE_URL`:** dar de alta en cada proyecto de Vercel con su dominio. Sin ella, canonical, `sitemap.xml` y `robots.txt` salen con `http://localhost:3000` (se fijan en build). `public/llms.txt` usa rutas relativas por la misma razón.
- Solo `/signup` y `/login` se indexan; el resto lleva `noindex` por defecto (layout raíz) y está en `Disallow` de `robots.txt` (`src/lib/site.ts`).

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

`DESIGN-SYSTEM.md` §6 (Fase 2) ya advertía estas lecturas como asumidas, no
validadas con En Soleil. Las tarifas de partner se retiraron (21 oct 2026: se
muestra lo cobrado real); si algún día hay que mostrar la parte del lounge
según el acuerdo con En Soleil, falta ese dato. Siguen asumidas:

- **Los niveles de lealtad** (Regular ≥5 visitas, Returning 2–4, First visit 1)
  se cuentan solo en el local de The Ainsworth — el flow habla de "loyalty
  trackers" sin definirlos, y contarlos por local es lo único que el partner
  puede ver sin exponer el historial del miembro en otros lounges.
- **La ventana de admisión son 4 horas** desde la hora reservada, coherente con
  la Fase 6.

**Desbloquea:** que En Soleil confirme los niveles de lealtad y la ventana de
admisión (y, si se quiere mostrar, el reparto con el lounge).

---

### 5.4 Qué se conserva al borrar una cuenta (PRIV-02)

El borrado físico (`delete-account`, Story 6.3) ya limpia la foto de Storage
y el Customer de Stripe. Lo que queda por decidir con En Soleil es qué
registros sobreviven: hoy `payments` y `bookings` (incluidos cobros de
no-show y cancelación), `support_tickets` y el `referrals` del miembro que
invitó se borran en cascada con `auth.users`. La propuesta de la auditoría
es conservar `payments`/`bookings` anonimizados (FK `SET NULL`) por
contabilidad y antifraude, y la fila de `referrals` con `referee_id` a
`null` para que el referrer no pierda su historial. Pide definir el plazo
de retención y reflejarlo en la política de privacidad.
