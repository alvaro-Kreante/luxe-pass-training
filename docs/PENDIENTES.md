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

### 2.1b El sub-nav de Account tiene un ítem "Membership" sin pantalla propia

`AccountShell` (patrón 13) fija el sub-nav completo — Profile details ·
Preferences · Notifications · Privacy and data · Membership — porque así lo
declaran los artboards de la Fase 7 (`Profile.dc.html` y el resto repiten las
cinco filas). Las cuatro primeras ya tienen ruta; **"Membership" queda inerte**
(sin `href`, no navega), igual que "Write a review" en el Epic 3.

**Se resuelve:** con el Epic 9 (`Main.dc.html` de Membership), que ya deja dicho
en `DESIGN-SYSTEM.md` §6 (Fase 9) que esa vista "no añade una entrada nueva al
sub-nav": el hueco ya está aquí, solo falta la pantalla.

### 2.2 Enlace "I have verified my email"

En `/verify-email` hay un enlace que avanza al alta manualmente. Sin backend, el
enlace del correo de verificación no puede devolver al usuario a la app, y sin él
el flujo quedaría cortado.

**Se sustituye:** por la ruta `/verify-email/[token]` cuando exista la API de
verificación.

### 2.2 El permiso de ubicación y los estados de borde de `/explore` están simulados

La Story 2.1 tiene tres criterios que dependen del sistema o de la red. Como el
repo es solo diseño, la pantalla **llega a mostrar cada estado** sin que nada lo
provoque de verdad:

| Qué | Cómo está ahora | Qué lo sustituye |
|---|---|---|
| Permiso de ubicación | Diálogo propio y un `useState` con tres pasos (`asking` · `manual` · `located`). No se llama a `navigator.geolocation` | La API de geolocalización del navegador, conservando la rama manual para cuando la deniegan |
| Error de carga del mapa | `\/explore?map=error`. "Retry" limpia el estado y el mapa aparece: no hay un segundo intento que pueda fallar | Un tiempo de espera real contra el proveedor de mapas, con el umbral de 3 s del criterio |
| Modo offline | `\/explore?offline=1`, con los seis lounges más cercanos como "cacheados" | `navigator.onLine` + lo que el service worker tenga guardado de verdad |
| Carga de la lista | `\/explore?list=loading` deja la lista en skeletons para siempre: no hay nada que esperar | El estado de carga real mientras se piden los lounges |

Los tres query params **no salen de ningún artboard**: son la única manera de
alcanzar esos estados sin añadir a la interfaz un botón de simulación que el
diseño no contempla.

**Al conectar la lógica real hay que quitar las tres simulaciones**, no dejarlas
conviviendo con ella: los query params desaparecen, y con ellos la rama
`startsWithMapError` y `listLoading` de `src/app/explore/page.tsx`.

**Desbloquea:** que el proyecto deje de ser solo diseño — es decir, la app de
`app.luxepass.co`, no este repo.

### 2.3 El plano de `\/explore` es el SVG del artboard

`src/components/explore/city-map-base.tsx` es el dibujo de `Main.dc.html`
portado a JSX: calles, manzanas, parque y río de una ciudad inventada. El zoom,
el desplazamiento y los markers sí son reales, pero se mueven sobre un plano que
no es Nueva York.

`DESIGN-SYSTEM.md` §6 (Fase 3) ya lo anticipaba: "al implementar se sustituye por
el proveedor real conservando el estilo de markers y controles". Lo que se
conserva entonces es `CityMap` — markers, controles, callout, escala —; lo que
se tira es `city-map-base.tsx`.

**Desbloquea:** decidir proveedor (Mapbox, MapLibre, Google) y dónde vive su
clave. Nada de eso cabe en este repositorio.

### 2.4 El perfil de lounge no tiene datos de detalle propios para 16 de los 17 lounges

`src/lib/lounge-profile.ts` deriva contacto (dirección, teléfono, email, web),
reseñas y menciones frecuentes a partir del id del lounge cuando no hay un
valor literal. Solo **The Ainsworth** (todos los artboards de la Fase 4) y
**Belmont Terrace** (`NoRatings.dc.html`) tienen los datos exactos del mockup;
el resto del catálogo recibe contacto plausible pero inventado y las mismas
dos reseñas de muestra genéricas.

**Se resuelve:** cuando exista un catálogo de lounges real, con estos campos
por lounge en vez de derivados.

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

### 2.7 `/reception` no tiene pantalla de acceso propia, y su URL no está bajo un namespace de partner

La consola de recepción es la vista del **partner** (personal de The Ainsworth,
no del miembro), pero hoy vive en `/reception`, una URL suelta al mismo nivel
que las rutas de miembro. No hay login ni verificación de que quien la abre sea
personal del lounge. El acceso de partner con cuenta propia es la Story 7.1,
todavía sin implementar.

**Se resuelve:** cuando el Epic 7 (Partner Dashboard) traiga su `Login.dc.html`
y su propio shell, la consola debería moverse a una URL bajo ese namespace
(p. ej. `/partner/reception` o similar) y vivir detrás de ese login, en vez de
quedar suelta en la raíz.

---

## 3. Criterios de aceptación cubiertos solo de forma declarativa

Criterios que exigen backend y que, siendo este repo solo diseño, se resuelven
enunciándolos en pantalla en lugar de implementarlos. **No son deuda a corregir
aquí** — se listan para que quede constancia de que la pantalla los menciona pero
nada los hace cumplir.

| Historia | Criterio | Cómo está |
|---|---|---|
| 1.1 | Email verification required before activation | Pantalla `/verify-email`; no se envía ni valida ningún token |
| 1.1 | Welcome email with app download links | Pantalla `/welcome` con los botones de tienda; no se envía correo |
| 1.1 | Duplicate email addresses prevented | Lista de dos correos de muestra en `src/lib/registration.ts` |
| 1.2 | Password reset via email with secure token | Acuse en `/forgot-password`; no se genera token ni se envía correo |
| 1.2 | Account lockout after 5 failed attempts (15min) | Contador en `useState`; se alcanza el estado bloqueado, la espera de 15 min se enuncia, no se cuenta |
| 1.2 | Automatic logout after 30 days of inactivity | Solo declarado en la nota bajo "Remember me". No hay sesión |
| 2.1 | Current location detection with permission request | Diálogo propio; no se consulta `navigator.geolocation` — ver 2.2 |
| 2.1 | Map loads within 3 seconds on good connection | No hay carga que medir: el plano es un SVG del propio bundle. El estado de fallo se alcanza por query param |
| 2.1 | Offline mode shows cached nearby locations | Los "cacheados" son los seis primeros del catálogo; el service worker no interviene |
| 2.1 | Distance display in miles/km based on user preference | El toggle de la topbar hace la conversión de verdad, pero el ajuste no se lee del teléfono ni se recuerda |
| 2.3 | Loading states while fetching data | No hay petición que esperar: el estado se alcanza por query param — ver 2.2 |
| 3.1 | Call and Directions quick action buttons (google maps url) | Enlaces reales (`tel:` y Google Maps con la dirección de muestra); no hay verificación de que el teléfono o la dirección existan |
| 3.1 | Share lounge option via social/messaging apps | Los destinos (Messages, WhatsApp, Instagram…) son botones sin integración; solo "Copy" usa una API real del navegador (`navigator.clipboard`) |
| 3.2 | Real-time availability status | `lounge.slotsToday` del catálogo de la Story 2.2, no un estado que cambie solo |
| 3.2 | Automatic refresh every 5 minutes | Contador local en `useState` (`FreshnessNote`) que vuelve a "just now" cada 5 minutos; no hay red que consultar, así que no refresca ningún dato, solo el sello |
| 3.2 | Weekly availability calendar view | Las plazas son un hash determinista por lounge + fecha + franja, no una agenda real. Se explica en `src/lib/lounge-profile.ts` |
| 4.1 | Final availability check before one-tap confirmation | `isAtRiskOfWaitlist` en `src/lib/booking.ts`: un slot con ≤2 plazas siempre ofrece la waitlist al confirmar, no una comprobación contra un sistema de reservas real |
| 4.1 | Error handling: network issues, booking conflicts, system unavailability | `PaymentError.dc.html` se alcanza solo eligiendo la tarjeta de muestra Mastercard·8801 (`paymentWillDecline`), no un fallo real de red o de Stripe |
| 4.2 | Stripe integration for secure payment processing | No hay SDK de Stripe ni llamada de red; los métodos de pago son datos de muestra en `SAMPLE_PAYMENT_METHODS` y el "cargo" es una comprobación local |
| 4.2 | Apple Pay and Google Pay integration | Botones decorativos en `payment-method-form.tsx`, sin el SDK de Apple/Google Pay |
| 4.2 | Payment method storage for future use | "Save this card" y "Remove" cambian solo el estado local del componente; no hay biblioteca de tarjetas del socio |
| 4.2 | Payment confirmation email receipt | Pantalla `/lounges/[id]/book/receipt` con el email tal como llegaría; no se envía ningún correo |
| 4.2 | PCI DSS compliance for data security | Solo el texto que lo declara en pantalla; no hay formulario de tarjeta real que cumplir |
| 4.3 | Booking reference number in event description | El número de reserva es determinista por lounge+fecha+hora (`bookingReference`), no lo emite un sistema de reservas |
| 5.1 | Booking expires automatically after booking window | No hay reloj real: los cuatro estados del pase (próximo/del día/check-in/expirado) se eligen por `?state=` en `/my-pass/[reference]`, no los dispara el paso del tiempo |
| 5.1 | Email with booking info (confirmation) | El pase vive en `/my-pass`; no se envía ningún correo — el criterio de la Story 5.1 es en realidad sobre la app, no sobre un email |
| 5.2 | Instant verification of booking validity | `findReceptionBooking` en `src/lib/passes.ts` compara contra una única reserva de muestra, no contra un sistema de reservas real |
| 5.2 | Check-in confirmation to member's app | No hay canal entre `/reception` y `/my-pass`: cada uno muestra su propio estado de check-in por separado, no uno que actualice al otro en vivo |
| 5.2 | Emergency contact information accessible to staff | Contacto de muestra fijo en `RECEPTION_VALID_BOOKING`; el aviso de "cada acceso queda registrado" es solo texto, no hay registro real |
| 5.3 | Reminder email 24 hrs before booking | Pantalla `/my-pass/[reference]/reminder` con el email tal como llegaría, igual que `Receipt.dc.html`; no se envía ningún correo ni se programa nada a las 24 h |
| 6.1 | 24-hour advance notice requirement for cancellation | `isFreeCancellation` compara contra `hoursUntilArrival`, un número de muestra fijo por reserva en `UPCOMING_BOOKINGS` — no hay reloj real que lo recalcule |
| 6.1 | No show policy enforcement - flat fee | El cargo de $35.00 en `CancelBookingModal` es visual: no hay tarjeta ni pasarela que cobre nada |
| 6.1 | Email for each booking with a confirmation number | El número de confirmación ya vive en cada reserva de muestra; "Email receipt" en el historial no envía ningún correo |
| 6.1 | Support contact for booking issues - Admin | Las filas "Something wrong with a booking?" / "Disagree with a fee or a no-show?" no abren ninguna conversación — la consola de soporte es el Epic 8 |
| 6.2 | Booking confirmation notification / 6am notification / New lounge partner announcements / Membership renewal reminders / Special offers and promotions / Birthday month promotion | Los seis tipos son entradas de muestra en `NOTIFICATIONS` (`src/lib/notifications.ts`); no hay un disparador real (push, cron de las 6 AM, evento de socio nuevo) que los genere |
| 6.2 | Ajustes de canal (push/email/sms) | Los switches de `NotificationSettingsPage` cambian solo el estado local del componente; no hay servicio de push ni de SMS que suscribir o dar de baja |
| 6.3 | Referral code sharing functionality | "Share your code" no abre ninguna hoja de compartir (a diferencia de `ShareDialog` del Epic 3); solo "Copy" usa `navigator.clipboard`, de verdad |
| 6.3 | Export personal data option (GDPR compliance) | "Request export" en `/profile/privacy` no dispara ningún email ni genera ningún archivo; el plazo de 48 h y los 7 días de validez son solo el texto que los declara |
| 6.3 | Account deletion option with confirmation | `DeleteAccountModal` exige la casilla y escribir DELETE, pero "Delete my account" no borra nada ni cierra sesión — solo navega a `/login`, igual que el resto de la app sin backend |

Los enlaces de las tiendas de `/welcome` apuntan a `#`: no existen todavía las
fichas de App Store ni Google Play.

---

## 4. Infraestructura pendiente

### 4.1 No hay CI

Nada ejecuta `npm test`, `tsc --noEmit`, `lint` ni `build` de forma automática: las
cuatro comprobaciones del paso 8 de la receta dependen de que quien implementa se
acuerde de correrlas. Con TDD ya declarado obligatorio en `CLAUDE.md`, esa
disciplina no tiene red.

Falta un workflow de GitHub Actions que corra las cuatro en cada push y en cada PR,
y que la regla "una historia sin tests no entra" pase de convención a puerta real.

**Desbloquea:** decidir si el repo va a tener PRs de verdad o se sigue trabajando
por commits directos sobre `design/screens`. Con lo segundo, el workflow en push
sigue teniendo sentido; sin lo primero, no hay dónde bloquear un merge.

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

Los `distDir` separados no bastaron, así que la causa exacta sigue sin
identificarse — la sospecha es lanzar `npm run build` con el dev server vivo,
aunque escriban en carpetas distintas.

**Desbloquea:** dar con el disparador. Mientras tanto, la comprobación de arriba
va antes que cualquier diagnóstico de "esto no funciona en la pantalla".

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
