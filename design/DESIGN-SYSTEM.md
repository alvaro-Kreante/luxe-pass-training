# LuxePass — Sistema de diseño

Referencia canónica para diseñar cualquier epic. Los valores de aquí son la **pauta
fijada en la Fase 1** y no se reinventan por epic: se extienden.

Origen: los mockups `login.jpg` / `registration.jpg` del cliente (en `docs/`, no versionado)
adaptados a desktop. No son inspiración — son la pauta principal.

---

## 1. Decisiones transversales

| Decisión | Valor |
|---|---|
| Idioma de la UI | **Inglés** (toda la copy de pantalla). La documentación va en español. |
| Formato base | Desktop 1440×900 por artboard |
| Enfoque | Rediseño libre (no se replica la app en producción `app.luxepass.co`) |
| Tema | **Híbrido**: claro/boutique para el miembro, oscuro/moderno para el Partner Dashboard |
| Marca | Logo oficial En Soleil en `assets/brand/logo.png` (300×318, 54 KB) |
| Iconografía | SVG inline, stroke 1.6–1.8, grid 24, `stroke-linecap/linejoin: round`. **Nunca emoji.** |

El tema oscuro **comparte el mismo ADN**: mismos dorados, misma tipografía, mismos radios y
alturas de control. Cambia el fondo (`--panel-black` como base) y la jerarquía de tinta, no el sistema.

---

## 2. Tokens

Se declaran como custom properties en `<helmet><style>` de cada artboard. Copiar el bloque tal cual:

```css
:root {
  --bg-blush-1: #F8EAE1;   /* fondo base claro */
  --bg-blush-2: #FCF4EE;   /* fondo claro superior del degradado */
  --ink-900:    #221A14;   /* texto principal */
  --ink-700:    #55483D;   /* texto secundario */
  --ink-400:    #9C8D80;   /* texto terciario, iconos inactivos, hints */
  --gold-500:   #C9A876;   /* acento principal, botones, estados activos */
  --gold-600:   #AD8A5C;   /* hover de acento, links */
  --gold-100:   #F1E3D0;   /* fondo de acento suave, chips, nav activo */
  --border:     #E7D9C9;   /* bordes de inputs y separadores */
  --white:      #FFFFFF;   /* superficie de tarjetas */
  --panel-black:#15110D;   /* panel oscuro / base del tema dark */
}
```

Grises del tema oscuro ya usados: `#F1E3D0` (texto sobre negro), `#C9BDAF` (secundario),
`#8A7C6C` (terciario), `#3A322A` (borde sobre negro).

## 3. Tipografía

| Rol | Familia | Uso |
|---|---|---|
| Display | **Bodoni Moda** (serif) | `h1`, `h2`, `h3`, frases de marca, iniciales de avatar. `font-weight: 500` |
| Texto | **Manrope** (sans) | todo lo demás: labels, inputs, botones, párrafos |

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;1,6..96,500&family=Manrope:wght@400;500;600;700;800&display=swap">
```

Fallbacks: `Bodoni Moda, Georgia, 'Times New Roman', serif` · `Manrope, 'Segoe UI', sans-serif`.

Escala en uso: h1 pantalla completa 40px · h1 de card 27–30px · h2 22px · cuerpo 14–15px ·
label 13px/600 · hint 12–12.5px · eyebrow 12px/700 uppercase `letter-spacing: .1em`.

## 4. Componentes

| Elemento | Especificación |
|---|---|
| Input / select | alto **50px**, `border-radius: 12px`, `border: 1px solid var(--border)`, padding izq. 46px cuando lleva icono (icono 18px a 16px del borde), focus: borde `--gold-500` + `box-shadow: 0 0 0 3px rgba(201,168,118,.15)` |
| Botón primario | alto **52px**, fondo `--gold-500`, texto blanco, `border-radius: 12px`, 13px/700 uppercase `letter-spacing: .12em`, hover `--gold-600`. Deshabilitado: `opacity: .5` |
| Botón secundario | mismo alto, fondo blanco, `border: 1.5px solid var(--border)`, texto `--ink-700` |
| Botón outline de acento | fondo transparente, `border: 1.5px solid var(--gold-500)`, texto `--gold-600` |
| Botón "atrás" | cuadrado 52×52 con chevron, a la izquierda del primario, `gap: 12px` |
| Card / panel | fondo blanco, `border-radius: 24px`, `box-shadow: 0 30px 60px -20px rgba(34,26,20,.18)`, padding 44px |
| Card de contenido | `border-radius: 18px`, `box-shadow: 0 10px 30px -14px rgba(34,26,20,.14)`, hover `0 24px 50px -18px rgba(34,26,20,.22)` |
| Checkbox | 18×18, `border-radius: 5px`. Vacío: `border: 1.5px solid var(--border)`. Marcado: fondo `--gold-500` + check SVG blanco stroke 2.4 |
| Chip seleccionable | `padding: 8px 16px`, `border-radius: 20px`. Activo: fondo `--gold-500` + texto blanco. Inactivo: `border: 1px solid var(--border)` + texto `--ink-700` |
| Chip removible | `padding: 6px 8px 6px 14px`, fondo `--gold-100`, con "×" de 13px |
| Progress de pasos | N barras `flex: 1`, alto 4px, `border-radius: 2px`; completadas `--gold-500`, pendientes `--border`; encima el eyebrow "Step N of M · Nombre" |
| Date picker mensual | Fijado en la Fase 5. Cabecera con mes en Bodoni 18px entre dos botones cuadrados de 32px (el de "mes anterior" deshabilitado cuando el mes actual es el de hoy), fila de días en 11px/700 `--ink-400`, y grid `repeat(7, minmax(0,1fr))` con `gap: 4px`. Celda de 38px, `border-radius: 10px`, 13px/600. Estados: disponible `--gold-100` · seleccionado `--gold-500` + texto blanco · hoy blanco con `border: 1.5px solid var(--gold-500)` · completo blanco con `border: 1px solid var(--border)` y texto `--ink-400` · cerrado `--bg-blush-1` con `border: 1px dashed var(--border)` · pasado `--bg-blush-1` sin borde, sin hover ni cursor |
| Slot de hora | `border-radius: 12px`, `padding: 10px 8px`, centrado, con la hora en 13.5px/700 y las plazas en 11.5px debajo. Libre: blanco + `border: 1px solid var(--border)`. Seleccionado: fondo y borde `--gold-500`, texto blanco. Completo: `--bg-blush-1` + `border: 1px dashed var(--border)`, texto `--ink-400`, sin cursor |
| Fila de opción / método de pago | `border-radius: 14px`, `padding: 14px 16px`, `display: flex; gap: 13px`; radio de 22px (borde `--border`; activo borde `--gold-500` con punto interior de 11px). Inactiva: blanco + `border: 1px solid var(--border)`. Activa: `border: 1.5px solid var(--gold-500)` + `box-shadow: 0 0 0 3px rgba(201,168,118,.15)` (el mismo halo del focus de input). Sirve también para las alternativas de una lista de decisión |
| Marca de tarjeta | Rectángulo 44×30, `border-radius: 7px`, texto 10.5px/800 `letter-spacing: .06em`. Activa: fondo `--gold-100` y texto `--ink-900`; el resto `--bg-blush-1` y texto `--ink-400`. Las marcas aceptadas se listan como badges de 10.5px con `border: 1px solid var(--border)` |
| Item de nav | `padding: 12px 14px`, `border-radius: 10px`; activo: fondo `--gold-100` + texto `--ink-900`/700; inactivo: icono `--ink-400` + texto `--ink-700`/600 |

Links: siempre definir `a` (`--gold-600`) y `a:hover` (`--ink-900`) en el `<helmet>`.
Transiciones: `.15s ease`.

## 5. Patrones de pantalla

Cuatro plantillas fijadas en la Fase 1. Reutilizarlas antes de inventar una nueva:

1. **Split-screen de autenticación** — panel izquierdo 600px fijo (`radial-gradient` sobre
   `--panel-black`, patrón de puntos dorados `radial-gradient(rgba(201,168,118,.16) 1px, transparent 1.5px)`
   a 18px, logo 170px, una frase en Bodoni de 22px) + panel derecho con degradado blush y card
   blanca de 440–460px centrada. Sirve para: sign up, log in, reset password, verificación, pasos de perfil.
2. **Full-bleed de confirmación** — fondo negro radial a pantalla completa, medallón dorado de 96px
   con check, h1 de 40px en blanco. Sirve para: welcome y cualquier estado de éxito terminal.
3. **App shell** — sidebar blanca de 248px (logo 52px, items de nav, bloque de usuario abajo con
   avatar de 36px) + área de contenido con `padding: 52px 56px`. **Fija la navegación del área de
   miembro para los Epics 2–6.** Nav actual: Home · Explore · My Pass · Profile.
4. **Modal sobre pantalla** — la pantalla de fondo con `filter: blur(3px)`, scrim
   `rgba(21,17,13,.55)`, card de 640px con header + cuerpo scrolleable + footer separado por
   `border-top`. Usado en la aceptación de términos y en los diálogos de ubicación (520–540px).
5. **Explore (mapa + resultados)** — fijado en la Fase 3 dentro del App shell. Columna de contenido
   sin padding: topbar de 88px (search de 376px, botón Filters con badge, toggle de unidades mi/km,
   segmented Map/List de 50px) + fila de 52px con los chips de filtro activos y "Clear all" +
   cuerpo con panel de resultados de 372px a la izquierda y mapa a la derecha. El panel y el mapa
   comparten la misma lista, y la selección se marca con borde `--gold-500` en la card y marker grande.
6. **Drawer lateral** — variante del modal para formularios largos: scrim `rgba(21,17,13,.35)` y
   panel de 436px pegado a la derecha, con la misma anatomía header / cuerpo scrolleable / footer.
   Usado en el panel de filtros.
7. **Perfil de lounge (detalle)** — fijado en la Fase 4 dentro del App shell. Columna de contenido
   sin padding: topbar de 64px con "Back to results" a la izquierda y las quick actions
   (Call · Directions · Share, botones outline de 40px) a la derecha + hero carousel de 268px
   (grid `1fr 348px`: imagen principal con flechas de 40px, contador "1 / 6", dots y caption;
   a la derecha dos miniaturas, la inferior con overlay "View all N photos") + fila de detalle con
   columna principal (h1 30px, meta, amenities en grid de 2 columnas con icono en cuadro
   `--gold-100` de 36px, horarios con el día de hoy sobre `--gold-100`, contacto) y card lateral
   de 344px con el estado de disponibilidad, los slots, el botón primario y las restricciones.
8. **Sub-vista de lounge** — misma columna sin hero: topbar de 64px + header de 84px (thumbnail de
   52px, nombre en Bodoni 22px, barrio y dirección, y a la derecha el sello "Updated … · refreshes
   every 5 min") + cuerpo de dos columnas. Usado en disponibilidad semanal y en reviews.
9. **Flujo por pasos con rail de resumen** — fijado en la Fase 5 sobre la sub-vista de lounge:
   topbar de 64px con "Back to …" a la izquierda, header de 84px del lounge (a la derecha, el chip
   del estado o el contador "Slot held for M:SS") y cuerpo `display: flex; gap: 28px;
   padding: 24px 32px 28px`. La columna izquierda abre siempre con el progress de pasos y contiene
   el formulario; la derecha es un rail fijo de 344px (card de contenido, `height: fit-content`)
   con el resumen, el desglose de precio, el botón primario de 52px a ancho completo y una línea de
   11.5px en `--ink-400` bajo él. Usado en los tres pasos de la reserva.
10. **Tarjeta de confirmación oscura** — card de 344px, `border-radius: 24px`, cuerpo con el radial
   sobre `--panel-black` y el patrón de puntos dorados a 18px: logo de 40px y eyebrow arriba, el
   número de reserva en Bodoni 32px `#F1E3D0`, separador `#3A322A` y filas etiqueta/valor
   (`#8A7C6C` / `#F1E3D0`). Cierra con una franja blanca de 16px con la nota de captura de pantalla.
11. **Email de marca** — artboard sin app shell: fondo blush a pantalla completa y una card de 660px
   centrada con cabecera de cliente de correo (avatar de 36px, remitente, destinatario y asunto en
   15px/700), banda oscura con el logo y el dato principal en Bodoni, cuerpo con los detalles sobre
   `--bg-blush-2`, los botones de acción y el desglose de importes, y un pie centrado de 11.5px con
   la dirección postal y los enlaces de gestión.

### Mapa

El mapa es un SVG dibujado a mano (viewBox `0 0 820 760`, coordenadas 1:1 con el área disponible),
no un tile real: calles blancas sobre `--map-land`, manzanas `--map-block`, parque `--map-park`,
agua `--map-water`. Tokens añadidos en la Fase 3:

```css
--map-land: #EFE7DE; --map-street: #FFFFFF; --map-block: #E6DCD0;
--map-park: #E3E8D6; --map-water: #DCE6E6;
```

Marker de lounge = "gota" de 36×36 (`border-radius: 50% 50% 50% 6px` + `rotate(-45deg)`) en
`--gold-500` con borde blanco de 2px y el sol de En Soleil dentro; el seleccionado mide 46px, va en
`--gold-600` y lleva anillo `box-shadow: 0 0 0 7px rgba(201,168,118,.30)`. Ubicación actual = punto
de 18px `--ink-900` con borde blanco y halo dorado. En modo offline los markers pasan a `--ink-400`
y el mapa lleva `filter: grayscale(.55) opacity(.8)`.

### Calendario de disponibilidad

Fijado en la Fase 4. Grid de `84px repeat(7, minmax(0,1fr))` con `gap: 8px`: columna de etiquetas
con las franjas horarias (Morning 8–12 · Afternoon 12–5 · Evening 5–9 · Late 9–11) y 7 columnas de
día. La cabecera del día lleva el nombre en eyebrow y el número; el día de hoy va sobre `--gold-100`.
Cada celda mide 104px de alto, `border-radius: 12px`, y muestra el número de plazas más una etiqueta:

| Estado | Estilo de celda |
|---|---|
| Disponible | fondo `--gold-100`, sin borde |
| Seleccionado | fondo blanco, `border: 1.5px solid var(--gold-500)` |
| Completo | fondo blanco, `border: 1px solid var(--border)`, texto `--ink-400` |
| Cerrado | fondo `--bg-blush-1`, `border: 1px dashed var(--border)`, texto `--ink-400` |
| Pasado | fondo `--bg-blush-1`, sin borde, texto `--ink-400` |

Debajo, leyenda con muestras de 16px. El sello de frescura (`Updated N min ago · refreshes every
5 min`, icono de refresh de 14px en `--ink-400`) acompaña siempre a cualquier dato de disponibilidad.

### Estados

- **Disponibilidad**: disponible = chip `--gold-100` con punto `--gold-500`; no disponible = chip con
  `border: 1px solid var(--border)` y punto/texto `--ink-400`. No se introducen colores semánticos
  (verde/rojo) — la paleta cálida es el único sistema.
- **Carga**: skeletons `.skeleton` con degradado y `@keyframes shimmer` (1.4s), misma geometría que la
  card real; spinner `.spinner` de 18px stroke `--gold-500` para el infinite scroll.
- **Vacío / error**: card blanca de 440–660px con medallón `--gold-100` de 72px, h2 de 27px, párrafo
  y dos botones (secundario + primario). En "no results" las sugerencias son filas clicables que
  dicen cuántos lounges devolvería cada cambio.

## 6. Fases

| Fase | Alcance | Estado |
|---|---|---|
| 1 | Epic 1 — Onboarding & Authentication (tema claro) | ✅ Completa — 10 artboards |
| 2 | Epic 7 — Partner Dashboard (tema oscuro) | Pendiente |
| 3 | Epic 2 — Location Discovery & Search (tema claro) | ✅ Completa — 9 artboards |
| 4 | Epic 3 — Lounge Profiles & Details (tema claro) | ✅ Completa — 9 artboards |
| 5 | Epic 4 — Booking System (tema claro) | ✅ Completa — 9 artboards |
| 6+ | Epics 5, 6, 8, 9 | Pendiente |

Cada fase vive en `design/epic-N-slug/` con sus `.dc.html`, su `canvas.json` y una copia de
`logo.png`, y se publica como un canvas propio.

### Fase 1 — `design/epic-1-onboarding/`

Canvas: https://claude.ai/code/artifact/71aab0fb-20ec-4db3-9a59-ca64198efd8e

10 artboards en 4 filas: `Main` (sign up) → `Terms` → `Verification` → `ProfileBasic` →
`ProfilePersonal` → `ProfileProfessional` → `Welcome` → `Login` → `ForgotPassword` → `Home`.

`Terms.dc.html` cubre el criterio de US 1.1 "Terms of service and privacy policy acceptance
required": checkbox vacío por defecto en el registro, modal con ambos documentos y una casilla
por documento, y registro de la aceptación con fecha y versión.

Pendiente conocido: el texto legal del modal es de relleno estructural, a reemplazar por el
documento real de En Soleil.

### Fase 3 — `design/epic-2-location-discovery-search/`

Canvas: https://claude.ai/code/artifact/0093d9c1-26ed-4fa0-90b4-bede98995503

9 artboards en 3 filas, dentro de la sección **Explore** del App shell:

| Fila | Artboards | Historia |
|---|---|---|
| 1 | `LocationPermission` → `ManualLocation` → `Main` (map view) | 2.1 |
| 2 | `Filters` → `ListView` → `ListLoading` | 2.2 / 2.3 |
| 3 | `NoResults` → `MapError` → `Offline` | 2.2 / 2.1 |

Cobertura de criterios: permiso de ubicación y fallback manual, mapa interactivo con markers de
marca y distancias en mi/km según el ajuste del teléfono, zoom/pan/recentrar, filtros de amenities
+ distancia + calendario de disponibilidad + búsqueda por texto, chips removibles y "clear all",
lista ordenada por distancia con thumbnails e iconos de amenities, infinite scroll, estado de
carga, estado sin resultados con sugerencias, error de carga del mapa (>3 s) con reintento o
cambio a lista, y modo offline con lounges cacheados.

Pendientes conocidos: el mapa es un SVG ilustrativo (al implementar se sustituye por el proveedor
real conservando el estilo de markers y controles), y los nombres de lounges, barrios y distancias
son datos de muestra.

### Fase 4 — `design/epic-3-lounge-profiles-details/`

Canvas: https://claude.ai/code/artifact/f1d95df8-0c67-43a4-9c06-b6f1266496a8

9 artboards en 3 filas, entrando desde "View details" de la lista/mapa de la Fase 3:

| Fila | Artboards | Historia |
|---|---|---|
| 1 | `Main` (perfil) → `Gallery` → `Share` | 3.1 |
| 2 | `Availability` → `NotAvailable` → `Closure` | 3.2 |
| 3 | `Reviews` → `NoRatings` → `Loading` | 3.1 / 3.2 |

Cobertura de criterios: carousel de 6 imágenes con flechas, contador y dots más lightbox con tira
de miniaturas; nombre, dirección y contacto (teléfono, email, web); horarios con el día de hoy
destacado; 6 amenities con icono y descripción; rating 4.9 con recuento de reviews, distribución
por estrellas y menciones frecuentes; quick actions Call / Directions (URL de Google Maps) / Share
persistentes en la topbar; hoja de compartir con destinos de mensajería y social y copia de link;
estado en tiempo real Available / Not available; calendario semanal por franjas con restricciones
(tier de membresía, antelación mínima, admisión para uno); aviso de cierre por festivo con los días
marcados y aviso de reapertura; sello "Updated N min ago · refreshes every 5 min" en toda vista de
disponibilidad; estado sin ratings y skeleton de carga del perfil.

Pendientes conocidos: las fotos son bloques de marca (degradado oscuro + patrón de puntos dorados)
a sustituir por fotografía real; nombres, direcciones, teléfonos (rango 555) y textos de reviews
son datos de muestra; la política de cancelación citada en las restricciones debe confirmarse con
En Soleil.

### Fase 5 — `design/epic-4-booking-system/`

Canvas: https://claude.ai/code/artifact/22900e36-6b9d-485b-9353-797794e4cc47

9 artboards en 3 filas, entrando desde "Book now" de la card de disponibilidad de la Fase 4:

| Fila | Artboards | Historia |
|---|---|---|
| 1 | `Main` (visit details) → `Payment` → `Summary` (review & confirm) | 4.1 / 4.2 |
| 2 | `MembershipCovered` → `Waitlist` → `PaymentError` | 4.2 / 4.1 |
| 3 | `Confirmed` → `Calendar` → `Receipt` | 4.1 / 4.3 |

Cobertura de criterios: date picker mensual que arranca en el día de hoy y llega a 60 días, con los
días pasados, completos y cerrados diferenciados; slots de llegada con plazas restantes; admisión
para uno declarada y sin opción de invitados; campo de peticiones especiales con contador de 100
caracteres; resumen de la reserva antes de confirmar con enlaces de edición por dato; términos y
política de cancelación con casilla de aceptación; confirmación de un solo toque que revalida la
disponibilidad; pantalla de confirmación inmediata con el número LP; waitlist cuando el slot se
llena en el chequeo final, con posición en la cola y alternativas de hora, día y lounge cercano;
Stripe con Apple Pay y Google Pay, tarjetas guardadas, tarjeta nueva, guardado del método, marcas
aceptadas y nota de PCI DSS; precio de la suscripción y del day pass con impuesto desglosado;
variante sin cargo cuando la visita está incluida en la membresía, con el consumo del mes; recibo
por email; error de pago con reintento, otro método, otra hora y contacto con soporte; y hoja "Add
to calendar" con iOS, Google y `.ics` de Outlook sobre un evento pre-poblado con dirección, enlace
de direcciones, número de reserva y recordatorio de 15 minutos.

Decisión de producto asumida (a confirmar con En Soleil): la membresía anual incluye 8 visitas al
mes y las visitas extra se cobran como day pass de $75 más impuesto. Es la lectura que permite
cubrir a la vez "subscription pricing display" e "individual booking pricing for day passes" de la
Story 4.2; si el modelo real es otro, cambian los importes de `Main`, `Payment`, `Summary`,
`MembershipCovered` y `Receipt`, no la estructura.

El pago se sitúa entre el detalle de la visita y el resumen con términos, siguiendo la nota de
`specs/flows/flow-complete-booking-journey.md` sobre el hueco de la Story 4.2 en el diagrama
original. El paso 2 **solo selecciona el método de pago** — no cobra, y así lo declara en pantalla;
**el cargo ocurre en el paso 3**, con el botón "Confirm and pay $81.66" que es el "one-tap booking
confirmation" de la Story 4.1, y la pantalla de confirmación lo acredita con "Paid $81.66 · Visa
4242" antes del recibo por email.

Pendientes conocidos: los importes, impuestos, números de reserva (LP-842193), referencias de
recibo y últimos dígitos de tarjeta son datos de muestra; los botones de Apple Pay y Google Pay
usan iconografía propia como marcador, no los assets de marca oficiales, que deben sustituirse al
implementar; el texto de la política de cancelación (24 h gratis, 50 % después, no-show sin
reembolso) es una propuesta a validar; y la ventana de retención del slot durante el checkout
("Slot held for M:SS") es una decisión de producto que debe confirmarse.

## 7. Cómo regenerar y publicar un canvas

Los `.dc.html` del folder son la fuente de verdad. Tras editarlos, se re-genera el HTML
publicable con el helper del skill `/design` (`seed-canvas.mjs --template ... --artboard ... --image logo.png --canvas canvas.json`)
y se republica con la herramienta Artifact al mismo `file_path` para conservar el link.

Si alguien guardó cambios desde el visor, primero se lee el artifact publicado y se extrae
(`--extract`) para no pisar ese trabajo.
