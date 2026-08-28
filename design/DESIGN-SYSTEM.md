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
| 4+ | Epics 3–6, 8, 9 | Pendiente |

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

## 7. Cómo regenerar y publicar un canvas

Los `.dc.html` del folder son la fuente de verdad. Tras editarlos, se re-genera el HTML
publicable con el helper del skill `/design` (`seed-canvas.mjs --template ... --artboard ... --image logo.png --canvas canvas.json`)
y se republica con la herramienta Artifact al mismo `file_path` para conservar el link.

Si alguien guardó cambios desde el visor, primero se lee el artifact publicado y se extrae
(`--extract`) para no pisar ese trabajo.
