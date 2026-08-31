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
así la dibujan todos los artboards de las Fases 1 y 3. Pero solo `/` existe:
**`/explore`, `/my-pass` y `/profile` dan 404**, y lo mismo la ficha
`/lounges/[id]` a la que apunta cada "View details".

Ninguna es deuda: son las pantallas de los epics siguientes. Se listan aquí para
que nadie las tome por un enlace roto al recorrer el mockup.

**Se resuelve:** `/explore` con el resto del Epic 2 · `/lounges/[id]` con el
Epic 3 · `/my-pass` con el Epic 5 · `/profile` con el Epic 6.

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

Los dos query params **no salen de ningún artboard**: son la única manera de
alcanzar esos estados sin añadir a la interfaz un botón de simulación que el
diseño no contempla.

**Al conectar la lógica real hay que quitar las tres simulaciones**, no dejarlas
conviviendo con ella: los query params desaparecen, y con ellos la rama
`startsWithMapError` de `src/app/explore/page.tsx`.

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

### 4.2 Sin tests e2e

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
