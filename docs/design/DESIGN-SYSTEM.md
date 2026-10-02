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
`#8A7C6C` (terciario), `#3A322A` (borde sobre negro). Superficie elevada sobre el negro:
`#1E1813` (fijada en la Fase 6, para las cards de la consola de recepción). Cuando un artboard
usa el tema oscuro, estos grises se declaran también como custom properties
(`--dark-ink-100/300/500`, `--dark-border`) para no repetir hexadecimales sueltos.

La Fase 2 (Partner Dashboard) nombra las dos superficies que faltaban y las añade al bloque de
tokens de cualquier artboard oscuro:

```css
--dark-ink-100: #F1E3D0; --dark-ink-300: #C9BDAF; --dark-ink-500: #8A7C6C;
--dark-border:  #3A322A; --dark-card:    #1E1813; --dark-hover:   #241D17;
```

`--dark-card` es la superficie de card sobre el negro y `--dark-hover` el hover de una fila o
un botón fantasma. El fondo de un artboard oscuro es siempre
`radial-gradient(circle at 30% 0%, #2c241c, #15110d 62%)` con el patrón de puntos dorados a 18px
por encima; los campos y las cajas *dentro* de una card van sobre `--panel-black`, no sobre
`--dark-card`, para que el hueco se lea más profundo que la superficie.

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
| Código QR del pase | Fijado en la Fase 6. SVG dibujado a mano de 25×25 módulos (`viewBox="0 0 25 25"`, `shape-rendering: crispEdges`, `fill: #221A14`) sobre caja blanca de `border-radius: 16px` y padding 16px. Tamaños en uso: 190–212px en el pase, 118px en el email, 102px en la preview de la lista. **Codifica el mismo LP#**, nunca un dato distinto; siempre acompañado del número en texto |
| Sello de expirado | Banda rotada `-8deg` centrada sobre la tarjeta: `padding: 9px 26px`, `border: 2px solid #8A7C6C`, `border-radius: 8px`, fondo `rgba(21,17,13,.72)`, texto 16px/800 uppercase `letter-spacing: .22em` en `#C9BDAF`. El QR bajo él pasa a `opacity: .22` sobre `#E6DED4` |
| Fila de historial | Card de contenido en `display: flex; align-items: center; gap: 16px`, thumbnail de 56px, título en Bodoni 19px, meta de 12.5px `--ink-400`, chip de resultado y botón de 38px. Chip: atendido = `--gold-100` con punto `--gold-500`; no-show = `border: 1px dashed var(--ink-400)` con punto y texto `--ink-400` |
| Chip de estado de reserva | Fijado en la Fase 7. Píldora de `padding: 6px 13px`, `border-radius: 20px`, texto 11.5px/700, con punto de 6px a la izquierda. Cinco estados, sin colores semánticos: **Confirmed** fondo `--gold-100` + punto `--gold-500` · **In progress** fondo blanco, `border: 1.5px solid var(--gold-500)` y punto `--gold-500` con halo `0 0 0 3px rgba(201,168,118,.28)` · **Completed** blanco con `border: 1px solid var(--border)`, punto `--ink-400` y texto `--ink-700` · **Cancelled** blanco con `border: 1px dashed var(--ink-400)`, sin punto, texto `--ink-400` · **No-show** `border: 1px dashed var(--ink-400)` con punto y texto `--ink-400`. La card de una reserva cancelada va sobre `--bg-blush-1` con borde discontinuo y el thumbnail a `opacity: .45` |
| Switch de ajuste | Fijado en la Fase 7. Píldora de 44×26, `border-radius: 13px`, `padding: 3px`, con manija de 20px blanca y `box-shadow: 0 1px 3px rgba(34,26,20,.28)`. Activo: fondo `--gold-500`, manija a la derecha. Inactivo: fondo `--border`, manija a la izquierda. Cuando un canal no se puede desactivar, en su lugar va un chip `--gold-100` de 11px que dice "Always" |
| Fila de ajuste por canal | Fijado en la Fase 7. `display: flex; gap: 16px; padding: 14px 0` con `border-bottom: 1px solid var(--border)`: título 14px/700, subtítulo 12px `--ink-400` y tres columnas fijas de 72px centradas (Push · Email · SMS) con el switch o el chip "Always". La cabecera repite esas tres columnas en eyebrow de 11px |
| Campana de notificaciones | Fijado en la Fase 7. Botón de 40×40, `border-radius: 11px`, icono de 18px `--gold-600`. Inactiva: fondo blanco + `border: 1.5px solid var(--border)`. Activa: fondo `--gold-100` + `border: 1.5px solid var(--gold-500)`. El badge es una píldora de 19px de alto en `--gold-500` con `border: 2px solid var(--white)` en la esquina superior derecha. Vive en la topbar del App shell, a la derecha |
| Fila de notificación | Fijado en la Fase 7. Card de contenido en `display: flex; gap: 14px` con icono en cuadro de 38px. **Sin leer**: fondo blanco, `border: 1px solid var(--border)`, sombra de card e icono sobre `--gold-100`; el título lleva delante un punto de 8px `--gold-500` y el cuerpo se indenta 17px para alinearse con él. **Leída**: fondo `--bg-blush-2`, sin sombra, icono sobre blanco con borde y textos en `--ink-400`. La hora va a la derecha del título en 12px `--ink-400` |
| Código de referido | Fijado en la Fase 7. Caja de 50px con `border: 1.5px dashed var(--gold-500)`, `border-radius: 12px` y fondo `--bg-blush-2`: el código en 15px/800 `letter-spacing: .1em` y un botón "Copy" de 36px a la derecha |
| Campo de lookup (oscuro) | Alto 64px, fondo `--panel-black`, `border-radius: 14px`, icono de 22px a la izquierda y el LP# en 18px/700 `letter-spacing: .08em`. Activo: `border: 1.5px solid var(--gold-500)` + el halo dorado de focus. Sin resultado: `border: 1.5px dashed #8A7C6C` y chip "Not recognised" |
| Input / búsqueda (oscuro) | Fijado en la Fase 2. Alto **44px** (50px en formularios como el login), fondo `--panel-black`, `border: 1px solid var(--dark-border)`, `border-radius: 11px` (12px a 50px), icono de 17px `--dark-ink-500` a 15px del borde, texto 13.5px `--dark-ink-100` y placeholder `--dark-ink-500`. Activo: `border: 1.5px solid var(--gold-500)` + el mismo halo `0 0 0 3px rgba(201,168,118,.15)` del tema claro |
| Botón fantasma (oscuro) | Fijado en la Fase 2. Alto 40–44px (52px en un footer de modal), fondo transparente, `border: 1.5px solid var(--dark-border)`, `border-radius: 11px` (12px a 52px), texto 12.5px/700 `letter-spacing: .06em` en `--dark-ink-300`, icono de 16px `--gold-500`. Hover: fondo `--dark-hover` y borde `--gold-500`. Su variante "activa" (el botón cuyo panel está abierto) usa fondo `rgba(201,168,118,.16)`, `border: 1.5px solid var(--gold-500)` y texto `--dark-ink-100` |
| Casilla de asistencia | Fijada en la Fase 2. Caja de 20px, `border-radius: 5px`, en la primera columna de la lista del día. **Llegó**: fondo `--gold-500` con check blanco stroke 3. **Pendiente**: `border: 1.5px solid var(--dark-border)`, vacía. **No-show**: `border: 1.5px dashed var(--dark-ink-500)` con una × de 11px `--dark-ink-500`. Es el gesto completo del check-in: marcarla llega a la app del miembro en el momento |
| Chip de asistencia (oscuro) | Fijado en la Fase 2. Traducción al negro del chip de estado de reserva, misma geometría (`padding: 6px 13px`, `border-radius: 20px`, texto 11.5px/700, punto de 6px). **Arrived** fondo `rgba(201,168,118,.18)` + `border: 1px solid var(--gold-500)`, punto `--gold-500`, texto `--dark-ink-100` · **New booking** transparente con `border: 1.5px solid var(--gold-500)` y halo `0 0 0 3px rgba(201,168,118,.28)` · **Pending** transparente con `border: 1px solid var(--dark-border)`, punto `--dark-ink-500`, texto `--dark-ink-300` · **No-show** `border: 1px dashed var(--dark-ink-500)`, punto y texto `--dark-ink-500` · **Cancelled** igual pero sin punto. Sirve también para los chips de resumen del día y para los tres niveles de lealtad (Regular / Returning / First visit) |
| Fila de datos (oscura) | Fijada en la Fase 2. Alto **54px**, `padding: 0 22px`, `border-bottom: 1px solid rgba(58,50,42,.6)`, hover `--dark-hover`. Dentro: avatar de 32px, título 13.5px/700 `--dark-ink-100` con subtítulo 11.5px `--dark-ink-500`, y un chevron de 17px `--dark-ink-500` al final. La fila resaltada (una reserva recién llegada) va sobre `rgba(201,168,118,.09)` con `box-shadow: inset 3px 0 0 var(--gold-500)`. La fila plegada ("↑ 2 earlier arrivals") mide 34px y va en 12px/600 `--dark-ink-500` |
| Tile de métrica (oscuro) | Fijado en la Fase 2. Card de `--dark-card`, `border-radius: 16px`, `padding: 16px 18px`: eyebrow de 11px, la cifra en **Bodoni 30px** `--dark-ink-100` y una nota de 11.5px `--dark-ink-500` debajo. Se usan en fila de cuatro con `gap: 14px` |
| Segmented (oscuro) | Fijado en la Fase 2. Contenedor `--panel-black` con `border: 1px solid var(--dark-border)`, `border-radius: 12px`, `padding: 5px`, `gap: 5px`; cada opción alto 36px, `border-radius: 9px`, texto 12px/700. Activa: fondo `--gold-500` + texto blanco. Inactiva: transparente + `--dark-ink-300` |
| Barra de volumen | Fijada en la Fase 2. Barra vertical de `border-radius: 6px 6px 3px 3px` en `--gold-500`, con la cifra encima en 11px/700 y la etiqueta del día debajo en 10.5px, ambas `--dark-ink-500`. El día en curso se dibuja **abierto** (`background: transparent` + `border: 1.5px dashed var(--gold-500)`) y sus dos etiquetas pasan a `--gold-500`. La versión horizontal (distribución por día de la semana) es un carril de 9px sobre `--panel-black` con el relleno en `--gold-500` |
| Toast (oscuro) | Fijado en la Fase 2. Card de 396px en `--dark-card` con `border: 1px solid var(--gold-500)`, `border-left: 4px solid var(--gold-500)`, `border-radius: 14px` y `box-shadow: 0 24px 50px -18px rgba(0,0,0,.7)`, anclada a `bottom: 26px; right: 32px`. Icono en cuadro de 38px sobre `rgba(201,168,118,.16)`, título 13px/700, cuerpo 12.5px y dos acciones de 12px/700 (la principal `--gold-600`, la de descartar `--dark-ink-500`) |

| Chip de estado de caso (oscuro) | Fijado en la Fase 8. Misma geometría que el chip de asistencia. **New** transparente con `border: 1.5px solid var(--gold-500)` y halo `0 0 0 3px rgba(201,168,118,.28)`, punto dorado · **Open** fondo `rgba(201,168,118,.18)` + `border: 1px solid var(--gold-500)`, punto dorado · **Waiting** transparente con `border: 1px dashed var(--dark-ink-500)` · **Escalated** igual que Open pero con un doble chevron hacia arriba de 11px en lugar del punto · **Resolved** transparente con `border: 1px solid var(--dark-border)`, punto y texto `--dark-ink-300`. Los mismos estados sirven para el estado de un lounge (Live / N to approve / Draft) |
| Badge de nav (oscuro) | Fijado en la Fase 8. Píldora de 20px al final de un item de la sidebar con el recuento pendiente en 11px/800. En el item activo: fondo `--gold-500` con texto `--panel-black`; en uno inactivo: fondo `rgba(201,168,118,.18)` con `border: 1px solid var(--gold-600)` y texto `--dark-ink-300` |
| Barra de acción masiva | Fijada en la Fase 8. Franja de 52px sobre la lista, `background: rgba(201,168,118,.16)`, `border: 1.5px solid var(--gold-500)`, `border-radius: 14px`, `padding: 0 20px`: casilla de 20px en estado indeterminado (barra blanca), el recuento en 13.5px/700 y, a la derecha, los botones de acción de 36px con `border: 1.5px solid var(--gold-600)` más un "Clear" en `--gold-600`. La acción destructiva va con borde discontinuo `--dark-ink-500` |
| Entrada de log de comunicación | Fijada en la Fase 8. `display: flex; gap: 14px; padding: 16px 0` con `border-bottom: 1px solid rgba(58,50,42,.6)`: a la izquierda un cuadro de 36px (avatar circular para una persona, cuadrado `--panel-black` con `border: 1px solid var(--dark-border)` para el sistema o un email automático), y a la derecha el autor en 13px/700, la hora a la derecha en 11.5px `--dark-ink-500` y el cuerpo en 12.5px. El mensaje del miembro va dentro de una caja `--panel-black` con `border: 1px solid var(--gold-600)` y `border-radius: 14px`; una nota interna lleva el chip discontinuo "Internal note · not sent to the member" |
| Diff de aprobación | Fijado en la Fase 8. Una línea por cambio: el valor anterior en 12px `--dark-ink-500` con `text-decoration: line-through`, una flecha de 14px `--gold-500` y el valor nuevo en 12px/700 `--dark-ink-100`, con una nota de 11px debajo cuando el cambio arrastra otra cosa |
| Tile de métrica (claro) | Fijado en la Fase 9, gemelo claro del tile oscuro de la Fase 2. Card de contenido con `border-radius: 16px` y `padding: 16px 18px`: eyebrow de 11px/700 uppercase `--ink-400` (no dorado, para que no compita con el de sección), la cifra en **Bodoni 30px** `--ink-900` y una nota de 11.5px `--ink-400` debajo. En fila de tres con `gap: 14px`. El tile que acaba de cambiar se resalta con `border: 1.5px solid var(--gold-500)` + el halo `0 0 0 3px rgba(201,168,118,.15)` y su eyebrow pasa a `--gold-600` |
| Barra de consumo | Fijada en la Fase 9, gemela clara de la barra horizontal de volumen de la Fase 2. Carril de 9px, `border-radius: 5px`, fondo `--bg-blush-1`, con el relleno en `--gold-500` y el mismo radio. Encima, la cifra en Bodoni 30px y la unidad en 14px `--ink-700` ("3 · of 8 included visits used"); a la derecha del eyebrow, cuándo se reinicia |
| Fila de datos (clara) | Fijada en la Fase 9, gemela clara de la fila oscura de la Fase 2. Alto **58px**, `padding: 0 20px`, `border-top: 1px solid var(--border)`, hover `--bg-blush-2`. Dentro: avatar de 32px (círculo `--gold-100` con la inicial en Bodoni 12.5px `--gold-600`; `--bg-blush-1` con inicial `--ink-400` cuando la fila está inactiva), título 13.5px/700 con subtítulo 11.5px `--ink-400`, y el resto de columnas en 12.5px. La fila recién cambiada va sobre `rgba(201,168,118,.09)` con `box-shadow: inset 3px 0 0 var(--gold-500)`; la agotada, sobre `--bg-blush-1` con los textos en `--ink-400` |
| Chip de estado de referido | Fijado en la Fase 9. Es el chip de estado de reserva de la Fase 7 sin cambiar geometría: **Day pass credited** = Confirmed · **Reward pending** = In progress · **Invited** = Completed (punto y texto `--ink-400`) · **Invite expired** = Cancelled (borde discontinuo, sin punto). No se inventa una paleta de estados nueva |
| Tabla comparativa | Fijada en la Fase 9. Card de contenido con `overflow: hidden`: cabecera de 14px 18px sobre `--bg-blush-1` con las etiquetas en eyebrow, y filas de `padding: 13px 18px` separadas por `border-top`, todas en el mismo grid `minmax(0,1fr) 168px 168px`. La etiqueta en 12.5px `--ink-700` a la izquierda y los valores centrados en 12.5px/700 `--ink-900`; lo que un plan no tiene es una raya `—` en `--ink-400`, nunca una cruz. La fila del total va sobre `--bg-blush-2` con la etiqueta en 700 y la cifra ganadora en `--gold-600` |

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
   miembro para los Epics 2–6.** Nav actual: Home · Explore · My Pass · Profile. Desde la Fase 7 la
   topbar de cualquier vista del área de miembro lleva la campana de notificaciones a la derecha,
   antes o después del botón de acción de la vista.
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
11. **Pase digital (rail de 380px)** — fijado en la Fase 6, extiende el patrón 10. Dentro del App
   shell: topbar de 64px con la miga "My Pass › LP-…" y las quick actions, columna izquierda con el
   detalle de la visita y los pasos de recepción, y a la derecha la tarjeta oscura de **380px**
   (no 344) con el LP# en Bodoni 40px, el QR sobre caja blanca, el separador `#3A322A` y las filas
   etiqueta/valor. Cierra con la franja blanca de la nota de captura. Cuatro estados de la misma
   tarjeta: próxima (neutra), del día (`border: 2px solid var(--gold-500)` + halo
   `0 0 0 6px rgba(201,168,118,.18)`, QR primero y LP# debajo), con check-in hecho (el QR se
   sustituye por el medallón dorado de 96px) y expirada (grises, sello y QR atenuado).
12. **Consola de recepción (tema oscuro)** — fijado en la Fase 6. Artboard completo sobre el radial
   de `--panel-black` con el patrón de puntos: topbar de 72px (`rgba(21,17,13,.72)`, logo de 34px,
   nombre del lounge en Bodoni 19px, fecha y hora, contador del día y el usuario del staff) y cuerpo
   centrado en una columna de **900px**: campo de lookup de 64px + card de resultado de `#1E1813`
   con `border-radius: 20px` (cabecera con avatar de 56px y chip de validez, grid de 4 datos,
   peticiones especiales y contacto de emergencia lado a lado, y la fila de acciones de 52px).
   El bloque de contacto de emergencia va sobre `--panel-black` con `border: 1px dashed var(--gold-600)`
   y declara siempre que el acceso queda registrado.
13. **Sección de cuenta con sub-nav** — fijado en la Fase 7 dentro del App shell, para la sección
   **Profile**. La columna de contenido no lleva padding: topbar de 64px con la miga
   "Account › Nombre de la vista" a la izquierda y, a la derecha, el chip "Saved as you change them"
   (o el botón primario "Save changes" cuando la vista tiene formulario) más la campana; debajo, una
   fila con un sub-nav blanco de **232px** (`border-right`, eyebrow "Account" y los items de nav del
   sistema: Profile details · Preferences · Notifications · Privacy and data · Membership, con una
   nota de 11.5px abajo) y el cuerpo con `padding: 30px 40px 28px`. El cuerpo va a ancho completo o
   con el rail de 344px del patrón 9 cuando hay datos de solo lectura que acompañan al formulario.
14. **Panel de notificaciones** — fijado en la Fase 7. Desplegable de 380px anclado a la campana
   (`position: absolute; right: 32px; top: 74px`), card blanca de `border-radius: 18px` con
   `box-shadow: 0 30px 60px -20px rgba(34,26,20,.32)`: cabecera de 16px con el título y
   "Mark all as read", tres filas de notificación separadas por `border-top`, y un pie centrado sobre
   `--bg-blush-2` con "See all notifications". La lista completa vive en su propia pantalla.
15. **App shell del partner (oscuro)** — fijado en la Fase 2, es el gemelo oscuro del patrón 3 y
   fija la navegación del Partner Dashboard. Sidebar de **248px** sobre `--panel-black` con
   `border-right: 1px solid var(--dark-border)` y `padding: 30px 18px`: logo de 46px, eyebrow
   "Partner dashboard", los items de nav (**Today · Guests · Analytics · Reports · Settings**,
   `padding: 12px 14px`, `border-radius: 10px`; activo sobre `rgba(201,168,118,.16)` con icono
   `--gold-500` y texto `--dark-ink-100`/700) y abajo, tras un `border-top`, el bloque del local:
   cuadro de 36px `border-radius: 10px` sobre `rgba(201,168,118,.14)` con `border: 1px solid
   var(--gold-600)` y la inicial en Bodoni dorada, el nombre del lounge y la persona de turno, más
   un chevron que implica el cambio de local. El área de contenido lleva el radial de
   `--panel-black` con el patrón de puntos y una topbar de **64px** (`rgba(21,17,13,.72)`,
   `border-bottom: 1px solid var(--dark-border)`, `padding: 0 40px`) con la miga a la izquierda y,
   a la derecha, el chip "Live · updated …" (punto dorado con halo), la campana y el botón de
   refrescar. Cuerpo con `padding: 26px 40px 24px`.
16. **Lista de datos oscura** — fijada en la Fase 2. Card de `--dark-card`, `border: 1px solid
   var(--dark-border)`, `border-radius: 20px` y `overflow: hidden`, con una cabecera de 42px
   (`padding: 0 22px`, `border-bottom: 1px solid var(--dark-border)`, etiquetas en eyebrow de 11px)
   y las filas de datos de 54px descritas en la sección 4. El grid se declara una sola vez y lo
   comparten cabecera y filas. Encima de la card van el h1 de 34px en Bodoni con su eyebrow y, a la
   derecha de esa misma fila, los controles (búsqueda, fecha, acciones); debajo del h1, la fila de
   chips con el resumen. Bajo la card, una línea de 12px `--dark-ink-500` con icono de info que
   explica el gesto de la pantalla.
17. **Panel de actividad (oscuro)** — fijado en la Fase 2, gemelo del patrón 14. Desplegable de
   400px anclado a la campana (`position: absolute; right: 32px; top: 74px`) en `--dark-card` con
   `border-radius: 18px` y `box-shadow: 0 30px 60px -20px rgba(0,0,0,.7)`: cabecera con el título y
   "Mark all as read", filas de 15px de padding separadas por `border-top`, y pie centrado sobre
   `--panel-black`. Fila sin leer: icono en cuadro de 36px sobre `rgba(201,168,118,.16)` con
   `border: 1px solid var(--gold-600)` y punto dorado de 8px antes del título, con el cuerpo
   indentado 16px. Leída: `opacity: .72`, icono sobre `--panel-black`.
18. **Modal y drawer oscuros** — fijados en la Fase 2. Misma anatomía que los patrones 4 y 6 con la
   pantalla de fondo en `filter: blur(3px)`, pero el scrim es `rgba(10,8,6,.55)` y la card va en
   `--dark-card` con `border: 1px solid var(--dark-border)` y `box-shadow: 0 40px 80px -30px
   rgba(0,0,0,.75)`. Modal centrado de 620px; drawer de **472px** pegado a la derecha con
   `border-left` y `box-shadow: -40px 0 80px -30px rgba(0,0,0,.7)`. Header con eyebrow + h2,
   cuerpo, y footer separado por `border-top` con el primario dorado de 52px y el fantasma al lado.
19. **Vista de analítica** — fijada en la Fase 2 sobre el patrón 15. Bajo el h1, una fila de cuatro
   tiles de métrica; debajo, `display: flex; gap: 16px` con la columna principal (las cards de
   gráfico) y el rail de **344px** del patrón 9 con el desglose de importes, el total sobre
   `--panel-black` con `border: 1px solid var(--gold-600)`, la nota que remite al acuerdo de partner
   y el botón de descarga. Toda cifra agregada debe cuadrar con las series que la componen.
20. **Email de marca** — artboard sin app shell: fondo blush a pantalla completa y una card de 660px
   centrada con cabecera de cliente de correo (avatar de 36px, remitente, destinatario y asunto en
   15px/700), banda oscura con el logo y el dato principal en Bodoni, cuerpo con los detalles sobre
   `--bg-blush-2`, los botones de acción y el desglose de importes, y un pie centrado de 11.5px con
   la dirección postal y los enlaces de gestión.
21. **App shell del admin (oscuro)** — fijado en la Fase 8. Misma anatomía que el patrón 15 con
   otra navegación: eyebrow "Admin console" y los items **Support · Members · Bookings · Lounges ·
   Analytics · Reports**, donde Support y Lounges pueden llevar el badge de nav con lo pendiente.
   Abajo, el bloque de la persona (no del local): cuadro de 36px con la inicial en Bodoni dorada,
   nombre y rol (`Support lead · En Soleil`) y chevron. La topbar de 64px lleva la miga a la
   izquierda y, a la derecha, el chip **"Every action logged"** (punto dorado con halo, en lugar
   del "Live · updated …" del partner), la campana y el botón de refrescar.
22. **Ficha de miembro (360)** — fijada en la Fase 8 sobre el patrón 21. Header con avatar de 56px,
   el nombre en Bodoni 30px y el chip de membresía, la línea de contacto en 13px `--dark-ink-500` y
   las acciones a la derecha; debajo, una fila de cuatro tiles de métrica; y luego `display: flex;
   gap: 16px` con la lista de datos oscura del historial a la izquierda y el rail de 344px a la
   derecha con las cards de membresía y de pagos, cerrando con el aviso de que los datos de tarjeta
   viven en Stripe.
23. **Caso con log de comunicación** — fijado en la Fase 8. Cabecera con el eyebrow del caso
   (número, hora de apertura, miembro y reserva), el h1 de 30px, el chip de estado y las tres
   acciones (asignar, escalar, resolver); cuerpo con la columna del log — card de `--dark-card` con
   las entradas de comunicación y, debajo, el composer: segmented "Reply to member / Internal note",
   caja de texto de 76px y la fila de acciones con el primario a la derecha — y el rail de 344px con
   la card de resolución (motivo, nota, primario de 52px), la de escalado y el aviso.
24. **Comparación live / propuesto** — fijada en la Fase 8. Dos previews del lado miembro **en tema
   claro** lado a lado dentro del shell oscuro: cada una es una caja de `border-radius: 20px` con el
   degradado blush y la card blanca del lounge dentro. La de "Live now" va a `opacity: .72` con un
   punto `--dark-ink-500` en su eyebrow; la de "Proposed" lleva `border: 1.5px solid var(--gold-500)`
   con el halo dorado y marca cada valor cambiado en `--gold-600`. Debajo, la card de impacto con
   tres datos y la fila de acciones. Es la única pantalla donde conviven las dos mitades del tema, y
   esa es exactamente su función: enseñar lo que verá el miembro.
25. **Lista de datos clara** — fijada en la Fase 9, gemela clara del patrón 16. Card de contenido
   con `overflow: hidden`: cabecera de **42px** sobre `--bg-blush-1` con las etiquetas en eyebrow de
   11px `--ink-700`, y debajo las filas de datos claras de 58px descritas en la sección 4. El grid se
   declara una sola vez y lo comparten cabecera y filas. Bajo la card, una línea de 11.5px
   `--ink-400` que explica la regla que gobierna la lista (cuánto dura una invitación, por qué se ven
   esos datos). Es la versión de miembro de la lista que el partner y el admin ven en negro.
26. **Comparación de planes** — fijada en la Fase 9 dentro del patrón 13, con la columna a ancho
   completo (sin rail). Topbar con la miga de tres niveles, h1 de 34px precedido de un botón "atrás"
   cuadrado de 34px, y debajo dos cards de plan en `repeat(2, minmax(0,1fr))` con `gap: 18px`: cada
   una con su eyebrow, el precio en **Bodoni 34px** con la periodicidad al lado, la equivalencia
   anual en 12.5px `--ink-400`, un separador, una frase de una línea y el botón a ancho completo con
   una nota de 11.5px centrada bajo él. La card del plan contratado lleva `border: 1.5px solid
   var(--gold-500)` + halo, el chip "Your plan" y un botón inerte sobre `--bg-blush-1`. Debajo, la
   tabla comparativa de la sección 4 y la línea que dice cuándo surte efecto cada cambio.

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
| 2 | Epic 7 — Partner Dashboard (tema oscuro) | ✅ Completa — 12 artboards |
| 3 | Epic 2 — Location Discovery & Search (tema claro) | ✅ Completa — 9 artboards |
| 4 | Epic 3 — Lounge Profiles & Details (tema claro) | ✅ Completa — 9 artboards |
| 5 | Epic 4 — Booking System (tema claro) | ✅ Completa — 9 artboards |
| 6 | Epic 5 — QR Code & Check-in (claro + primeras pantallas oscuras) | ✅ Completa — 9 artboards |
| 7 | Epic 6 — Member Experience & Notifications (tema claro) | ✅ Completa — 11 artboards |
| 8 | Epic 8 — Admin & Support (tema oscuro) | ✅ Completa — 13 artboards |
| 9 | Epic 9 — Membership & Referrals (tema claro) | ✅ Completa — 9 artboards |
| 10 | Epic 10 — Partner Organizations (tema oscuro, admin y partner) | ✅ Completa — 22 artboards (10.2–10.6, 10.9) |

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

### Fase 2 — `design/epic-7-partner-dashboard/`

Canvas: https://claude.ai/code/artifact/3e9a51ea-3155-4763-941f-26c11c88adf0

Diseñada después de la Fase 7, aunque conserva el número 2 que tenía reservado. Es la primera fase
**íntegramente oscura** y la que fija el App shell del partner (patrón 15) y el resto de la mitad
oscura del sistema. 12 artboards en 4 filas:

| Fila | Artboards | Historia |
|---|---|---|
| 1 | `Login` → `Main` (lista del día) → `GuestDetail` | 7.1 |
| 2 | `LiveUpdate` → `NoShow` → `Export` | 7.1 |
| 3 | `EmailDigest` → `EmailNewBooking` → `EmailCancellation` | 7.2 |
| 4 | `Analytics` → `RepeatGuests` → `Reports` | 7.3 |

Cobertura de criterios: acceso de partner con cuenta emitida por En Soleil y la separación
explícita respecto al login de miembro; lista del día con nombre, hora de llegada, número LP,
estado, email y teléfono de cada invitado; casilla de asistencia por invitado como gesto único del
check-in, con el aviso de que llega a la app del miembro en el momento; actualización en vivo
cuando entra una reserva nueva (toast, fila resaltada, contador del día y panel de actividad) sin
recargar nada; ficha de invitado con los datos de la reserva, el contacto para comunicarse,
las peticiones especiales y el contacto de emergencia con aviso de registro de accesos; reporte de
no-show con motivo, nota y la declaración de lo que provoca en el lado del miembro; búsqueda por
nombre o número y filtro por fecha con chips removibles; exportación a CSV y hoja imprimible que
siguen los filtros de pantalla, con selección de columnas y aviso de tratamiento de datos;
digest matinal de las 6:30 AM con la lista completa; email por cada reserva nueva con el contador
actualizado; email de cancelación con el recuento corregido y la promoción desde la waitlist que
rellenó el hueco; volumen de reservas por día y por día de la semana con vista semanal/mensual;
atribución de ingresos desglosada; identificación de invitados recurrentes con niveles de lealtad;
y un centro de reportes con seis informes descargables en CSV, entrega inmediata, por email o
programada.

Decisiones de producto de esta fase (a confirmar con En Soleil):

- **La economía del partner.** La atribución de ingresos se dibuja como day passes a $75.00 (el
  precio fijado en la Fase 5), visitas de membresía a una **tarifa de partner de $38.00** y la
  **mitad** de cada tarifa de no-show de $35.00 (la tarifa plana de la Fase 6). Ninguna historia
  fija esos números: la 7.3 solo pide "revenue attribution". Si el acuerdo real es otro, cambian
  las cifras de `Analytics`, `RepeatGuests` y `NoShow`, no la estructura.
- **Los niveles de lealtad** (Regular con 5 visitas o más, Returning con 2–4, First visit con 1) se
  cuentan **solo en ese local**. El flow habla de "loyalty trackers" sin definirlos; contarlos por
  local es lo único que el partner puede ver sin exponer el historial del miembro en otros lounges,
  y así se declara en pantalla.
- **La ventana de admisión son cuatro horas** desde la hora reservada, coherente con la Fase 6, y
  un invitado que no aparece antes de que se cierre queda disponible para reportar como no-show.
- **Los datos de contacto se muestran mientras la reserva está abierta**, no de forma permanente, y
  la exportación lo advierte. Es una propuesta legal a validar junto con la del contacto de
  emergencia que arrastran las Fases 6 y 7.
- **La promoción desde la waitlist es automática**: el hueco de una cancelación se ofrece al
  siguiente de la cola sin que el partner intervenga, y el email se lo cuenta ya resuelto.

Costuras declaradas en pantalla, no diseñadas aquí: la sección **Settings → Notifications** del
propio dashboard (quién del equipo recibe cada email) y la vista de waitlist existen en la
navegación pero quedan fuera de las tres historias; el lado del miembro de un no-show — la tarifa
plana, la entrada en el historial y la pausa por tres en doce meses — es el Epic 6; y la consola de
recepción que escanea el pase es el Epic 5.

Pendientes conocidos: nombres, emails, teléfonos (rango 555), números de reserva, importes y
recuentos son datos de muestra, pero **cuadran entre sí** y hay que mantenerlos así si se añaden
pantallas — las 187 reservas del tile de `Analytics` son la suma exacta de las catorce barras del
gráfico y de la distribución por día de la semana, y los 171 asistentes son la suma de los 53 day
passes y las 118 visitas de membresía del rail de ingresos. La línea temporal del día continúa la
del Epic 5: sábado 14 de septiembre en The Ainsworth, con el digest a las 6:30 AM (14 esperados),
el check-in de Alexandra Rivas a las 3:34 PM que ya ocurría en la consola de recepción de la
Fase 6, la reserva de Naomi Feldstein a las 3:41 PM (15), la cancelación de Harriet Osei a las
3:52 PM (14) y la promoción de Victor Almeida a las 3:54 PM (15 de nuevo).

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

### Fase 6 — `design/epic-5-qr-code-check-in/`

Canvas: https://claude.ai/code/artifact/92a731f6-999e-4903-8383-55ef1b52d0a9

9 artboards en 3 filas, continuando desde la confirmación de la Fase 5:

| Fila | Artboards | Historia |
|---|---|---|
| 1 | `MyBookings` → `Main` (pase digital) → `Expired` | 5.1 |
| 2 | `Reminder` (email 24 h) → `ArrivalDay` → `Reception` | 5.3 / 5.2 |
| 3 | `CheckedIn` → `CheckInError` → `NoShow` | 5.2 |

Cobertura de criterios: número de confirmación LP único generado con la reserva; nombre del
miembro, lounge, fecha/hora y duración en el pase; acceso desde la sección My Pass con pestañas
Upcoming/Past; diseño pensado para captura de pantalla (la tarjeta se sostiene sola, sin conexión,
con botón de guardar como imagen); expiración automática al cerrar la ventana de la reserva, con
el pase sellado y movido a Past; email de recordatorio 24 h antes con el número, la dirección y el
plazo de cancelación; verificación instantánea en recepción por escaneo o por número; contacto de
emergencia accesible al staff con aviso de registro de acceso; confirmación del check-in en la app
del miembro en el momento; error de check-in con las causas probables, las coincidencias cercanas
y el teléfono de soporte; y registro de no-show en el historial con el efecto sobre la política.

Decisiones de producto de esta fase (a confirmar con En Soleil):

- **El QR es un atajo, no el mecanismo.** Ninguna historia del Epic 5 pide un QR — la 5.1 pide el
  número LP y el flujo dice "present confirmation at reception". El pase lleva el LP# como dato
  principal y un QR que **codifica ese mismo número**, de modo que recepción puede escanear o
  teclear indistintamente. Si En Soleil quiere un check-in solo por número, se retira el QR sin
  tocar la estructura de ninguna pantalla.
- **Las dos pantallas oscuras son solo el momento del check-in de un invitado.** La lista diaria
  de invitados, las notificaciones en tiempo real y el reporte de no-show del partner son la
  Story 7.1 y se diseñan en la fase del Partner Dashboard; aquí se deja el punto de costura
  declarado en pantalla.
- **Ventana de llegada.** Se dibuja como "llegada a las 3:30 PM, admisión hasta las 5:30 PM,
  ventana cerrada a las 7:30 PM". Ni las historias ni los flujos fijan esa tolerancia.

Pendientes conocidos: el QR es un SVG dibujado con módulos plausibles (al implementar se genera
con una librería real sobre el LP#); nombres, direcciones, teléfonos (rango 555), horas, números
de reserva y el contacto de emergencia son datos de muestra; el consentimiento y la retención del
contacto de emergencia mostrado al staff son un asunto legal a validar antes de implementar.

### Fase 7 — `design/epic-6-member-experience-notifications/`

Canvas: https://claude.ai/code/artifact/950e79f4-011a-40be-a8fc-72366e8b64c4

11 artboards en 4 filas, continuando desde el pase de la Fase 6:

| Fila | Artboards | Historia |
|---|---|---|
| 1 | `Main` (upcoming) → `Cancel` (>24 h) → `CancelFee` (<24 h) | 6.1 |
| 2 | `History` (past) → `Notifications` → `MorningAlert` (aviso de las 6 AM) | 6.1 / 6.2 |
| 3 | `NotificationSettings` → `Profile` → `Preferences` | 6.2 / 6.3 |
| 4 | `Privacy` → `DeleteAccount` | 6.3 |

Cobertura de criterios: sección My Bookings con pestañas Upcoming/Past; los cuatro estados de una
reserva (Confirmed, In progress, Completed, Cancelled) más el waitlist sin pase; cancelar como única
modificación posible, con las dos ramas de la política de 24 h; tarifa plana por cancelación tardía
y por no-show, cobrada a la tarjeta de la membresía y anotada en el historial; historial filtrable
con el número de confirmación de cada visita y reenvío del email; contacto de soporte desde el rail
de cada vista de reservas; centro de notificaciones con los seis tipos que pide la 6.2
(confirmación de reserva, aviso de las 6 AM el día de la visita, nuevo lounge partner, renovación de
membresía, ofertas y promoción del mes de cumpleaños); panel desplegable de la campana con el aviso
recién llegado; ajustes de notificación por canal (push/email/SMS) con el email de reservas siempre
activo, el control horario del aviso matinal y las horas de silencio; edición de todos los campos
capturados en el onboarding; lounges favoritos, amenities preferidas e intereses; estado de la
membresía Active con renovación y consumo; código de referido con copiar y compartir; ajustes de
privacidad de uso de datos, contacto de emergencia con aviso de registro de accesos, exportación de
datos personales (GDPR) y descarga del historial; y borrado de cuenta con confirmación que declara
lo que cancela, lo que cobra y los 30 días de gracia, ofreciendo pausar la membresía en su lugar.

Decisiones de producto de esta fase (a confirmar con En Soleil):

- **La tarifa plana sustituye a la propuesta de la Fase 5.** La Story 6.1 dice explícitamente
  "no show policy enforcement - flat fee", así que la política que se dibuja es: gratis con más de
  24 h, **$35.00 fijos** dentro de las 24 h, los mismos $35.00 por no-show. Esto reemplaza el
  "50 % después de las 24 h" que la Fase 5 dejó como propuesta; si En Soleil valida otro importe,
  cambia el número en `Main`, `Cancel`, `CancelFee`, `History` y `DeleteAccount`, no la estructura.
- **Cancelar dentro de la ventana no devuelve la visita** al cupo del mes; cancelar a tiempo sí.
- **Tres no-shows en doce meses pausan las reservas 30 días.** Ninguna historia lo fija; se dibuja
  porque "policy enforcement" necesita una consecuencia acumulada visible.
- **El aviso de las 6 AM** se interpreta como el recordatorio del día de la visita, a las 6:00 AM
  hora local, con la hora de llegada y la dirección. La hora es un ajuste del miembro, no una regla.
- **La promoción del mes de cumpleaños** se dibuja como un day pass de cortesía válido durante todo
  el mes, encima de las visitas incluidas.
- **El corazón de favorito no existe todavía en el perfil de lounge** (Fase 4). `Preferences` lo da
  por hecho ("Tap the heart on any lounge profile to save it here"), así que al implementar hay que
  añadir ese control a la pantalla de la Fase 4.
- **La exportación de datos** se promete por email en 48 h con un enlace válido 7 días, y el borrado
  de cuenta conserva los datos 30 días antes de eliminarlos. Ambos plazos son propuestas legales a
  validar.

Costuras declaradas en pantalla, no diseñadas aquí: la conversación de soporte que abre cada fila de
"contact support" es el Epic 8; el plan, la pausa de la membresía y el seguimiento de los referidos
son el Epic 9 (por eso el sub-nav incluye "Membership" pero esa vista no se diseña en esta fase); y
el no-show visto desde el partner es la Story 7.1.

Pendientes conocidos: nombres, direcciones, teléfonos (rango 555), fechas, números de reserva
(LP-8xxxxx), el código de referido y los importes son datos de muestra; el calendario narrativo de
todos los artboards es **jueves 12 de septiembre** (visita en curso en The Vestry, reserva de mañana
viernes 13 en Bergdorf dentro de la ventana de 24 h y reserva libre del sábado 14 en The Ainsworth,
que es la misma del Epic 5) y hay que mantenerlo si se añaden pantallas — los días de la semana son
coherentes entre sí pero no corresponden al calendario real de 2026, igual que en las fases
anteriores; y el contacto de emergencia mostrado en `Privacy` arrastra el mismo asunto legal
declarado en la Fase 6.

### Fase 8 — `design/epic-8-admin-support/`

Canvas: https://claude.ai/code/artifact/ddeecc33-ddd1-476d-92a2-c13252903bc9

Segunda fase íntegramente oscura y la que fija el App shell del admin (patrón 21). 13 artboards en
4 filas:

| Fila | Artboards | Historia |
|---|---|---|
| 1 | `Main` (support desk) → `MemberSearch` → `MemberProfile` | 8.1 |
| 2 | `CaseDetail` → `BookingOverride` → `Refund` | 8.1 |
| 3 | `Analytics` → `Popularity` → `Export` → `ScheduledReports` | 8.2 |
| 4 | `Lounges` → `LoungeEdit` → `Approval` | 8.3 |

Cobertura de criterios: búsqueda de miembro por nombre, email, teléfono o número de reserva, con
desambiguación entre coincidencias parecidas; ficha con el historial completo de reservas, las
transacciones de pago (importe, tarjeta, ID de Stripe), el estado de la cuenta y el nivel de
membresía; cola de casos con estado, responsable y antigüedad, que recibe automáticamente los
reportes de no-show de los partners; caso con notas de resolución y log de comunicación completo
(evento de sistema, email automático, mensaje del miembro, nota interna y respuesta del partner) más
el composer que distingue responder de anotar; modificación de reserva con cambio de fecha/hora,
traslado de lounge o cancelación y override explícito de las restricciones del local; reembolso
total o parcial con motivo, retirada del no-show del historial y aviso de lo que se reversa al
partner; escalado a manager con el criterio que lo exige; export de reservas, miembros, ingresos y
no-shows con rango de fechas, filtros removibles y selección de columnas, anonimizado por defecto;
tasa de no-show, adquisición, retención y churn; volumen diario que cuadra con el total; ingresos por
partner y período; lounges y amenities más demandados y reparto geográfico por ciudad; reportes
automáticos diarios, semanales, mensuales y trimestrales con entrega por email y registro de
entregas; alta/edición/archivo de lounges con estados live, draft y pendiente de aprobación;
gestión de hasta 3 fotos con redimensionado declarado; amenities, horarios, cierres estacionales,
capacidad por franja y restricciones de reserva; cambios masivos sobre varios lounges; y flujo de
aprobación con la comparación entre lo publicado y lo propuesto tal como lo ve el miembro.

Decisiones de producto de esta fase (a confirmar con En Soleil):

- **La red son 12 lounges en 3 ciudades**: 8 en Nueva York (los de las Fases 3 y 4), 2 en Miami y 2
  en Los Ángeles, más un draft en Brooklyn. Ninguna historia fija el tamaño de la red; hacía falta
  para que "geographic usage patterns" tuviera algo que enseñar.
- **Un no-show reportado por un partner abre un caso automáticamente**, con la tarifa ya cobrada y
  reversible desde soporte. El flow solo dice "receive reports from partners".
- **Soporte puede saltarse las reglas del lounge** (antelación mínima, aforo de una franja) dejando
  constancia con su nombre y el número de caso, que el partner ve en su lista. El diagrama original
  dejaba esta pregunta abierta en una nota adhesiva.
- **El límite de aprobación de soporte son $100.00**; por encima, o ante un segundo waiver en doce
  meses, hace falta un manager.
- **Los exports son anónimos por defecto**: nombre, email y teléfono se sustituyen por un ID de
  miembro estable, y marcar una de esas tres columnas exige un motivo que queda registrado. La
  Story 8.2 solo pide "anonymized for privacy" para el export de usuarios; aquí se aplica a todos.
- **Todo cambio de contenido pasa por aprobación**, también los masivos, y se publican juntos para
  que el miembro no vea media modificación.

Costuras declaradas en pantalla, no diseñadas aquí: la vista del miembro de una tarifa reembolsada o
una reserva movida es el Epic 6; el mismo no-show visto desde el partner es el Epic 7; el plan, la
pausa de membresía y los referidos son el Epic 9; y los roles y permisos de la propia consola
(quién puede reembolsar, quién puede aprobar) se nombran pero quedan fuera de las tres historias.

Pendientes conocidos: nombres, emails, teléfonos (rango 555), números de caso (CS-4xxx), IDs de
Stripe, importes y recuentos son datos de muestra, pero **cuadran entre sí y con la Fase 2** — las
catorce barras de `Analytics` suman las 1,208 reservas del tile, que se reparten en 1,102 asistidas +
62 no-shows + 44 cancelaciones; el rail de ingresos suma $336,250.00 brutos menos $53,913.00 de
atribución a partners = $282,337.00 netos; las 187 reservas de The Ainsworth y sus $8,616.50 son
exactamente los que muestra el Partner Dashboard del Epic 7; y las ocho filas de `Popularity` más la
línea plegada suman el 100% de las 1,208. La línea temporal es **lunes 16 de septiembre por la
mañana**, dos días después del sábado del Epic 7: el caso central es el no-show de Camille Duforest
en The Ainsworth (LP-840388, $35.00), y el período de toda la analítica es el 1–14 de septiembre.
Los importes de membresía ($2,400.00/año) y day pass ($75.00 + impuesto) vienen de las Fases 5 y 7 y
arrastran las mismas dudas; las fotos de `LoungeEdit` siguen siendo bloques de marca a sustituir por
fotografía real.

### Fase 9 — `design/epic-9-membership-referrals/`

Canvas: https://claude.ai/code/artifact/921285c6-061d-4c6e-8dc6-2a5e5c5432a2

Cierra el área de miembro desarrollando la vista **Membership** que la Fase 7 dejó apuntada en el
sub-nav ("Plan, invoices and referral rewards are managed in Membership"). Por eso **no añade una
entrada nueva al sub-nav**: Referrals es una sub-vista de Membership, con miga de tres niveles.
9 artboards en 3 filas:

| Fila | Artboards | Historia |
|---|---|---|
| 1 | `Main` (membership) → `Plans` (comparar) → `AutoRenew` (apagar o pausar) | 9.1 |
| 2 | `MonthlyPlan` (miembro mensual) → `Upgrade` (mensual → anual) → `Referrals` | 9.1 / 9.2 |
| 3 | `Share` → `RewardCredited` → `Terms` | 9.2 |

Cobertura de criterios: estado de la membresía con el plan, el chip Active y la fecha de alta;
explicación de los beneficios en seis puntos, todos anclados a algo ya fijado en fases anteriores
(8 visitas al mes, 12 lounges en 3 ciudades, day pass de cumpleaños, day pass por referido,
cancelación gratis con 24 h, soporte desde cualquier reserva); consumo del mes con barra y el aviso
de que las visitas extra se cobran como day pass; comparación de los dos planes con el precio de cada
uno y lo que suman doce meses; opciones de subida para el suscriptor mensual, con el ahorro, el
prorrateo de los días ya pagados y la fecha del nuevo término; fecha de renovación y ajuste de
auto-renovación, con el aviso por email un mes antes que pide el flujo; apagado de la auto-renovación
que declara las tres cosas que cuesta y ofrece la pausa que el Epic 6 prometió sin diseñar; código de
referido único con copiar, enlace personal y hoja de compartir por mensajería, email y social;
seguimiento de las invitaciones con los cuatro estados; acreditación del premio con su fase
**pending**; notificación de que un amigo se ha registrado y de que el day pass ya está disponible; y
términos del programa con el importe, la condición y el plazo de pago en la cabecera.

Decisiones de producto de esta fase (a confirmar con En Soleil):

- **Existe un plan mensual de $249.00**, frente a los $2,400.00 anuales ya fijados en la Fase 5. La
  Story 9.1 exige una vía de subida "monthly → yearly", así que el plan mensual tiene que existir; el
  precio se elige para que el anual ahorre **$588.00** al año ($249 × 12 = $2,988). Si el importe real
  es otro, cambian las cifras de `Plans`, `MonthlyPlan` y `Upgrade`, no la estructura.
- **Los dos planes dan exactamente lo mismo.** Lo único que cambia es la periodicidad, el precio y
  que el anual congela la tarifa durante el término. El flujo habla de "monthly to yearly pricing",
  no de niveles de servicio, y una escalera de beneficios habría contradicho las 8 visitas de la
  Fase 5.
- **La subida es inmediata y prorratea**; la bajada espera al final del término. El ejemplo dibujado
  acredita 22 días sin usar de un ciclo de 30 ($182.60) y cobra $2,217.40.
- **El premio de referido es un day pass de cortesía para cada uno**, tal como lo dejó dicho la
  Fase 7. Vale $75.00 (la tarifa de day pass de la Fase 5), se suma a las 8 visitas incluidas y se
  gasta antes que ellas.
- **El premio queda "pending" desde que el amigo se registra hasta que su primer cobro liquida**, y
  se acredita dentro de 48 h. El diagrama original dejaba esta mecánica marcada como pregunta
  abierta; esto es lo que la resuelve.
- **Una invitación caduca a los 60 días** y se puede reenviar, y hay un **tope de 10 day passes de
  referido por año de membresía**.
- **La pausa es de hasta 3 meses**, detiene el cobro y conserva el historial, los favoritos y el
  código. Es exactamente lo que `DeleteAccount` de la Fase 7 prometía sin enseñar.

**El artboard de miembro mensual usa una segunda persona.** Alexandra Rivas es anual desde la Fase 7
y no puede serlo y no serlo a la vez, así que la rama "Monthly subscriber? → Yes" del flujo se dibuja
con **Naomi Feldstein** (mensual desde julio de 2026, código `NF-SOLEIL-26`, Mastercard 8813), la
misma invitada que reservaba en The Ainsworth en la Fase 2. Los artboards 4 y 5 son su cuenta, no la
de Alexandra: el bloque de usuario de la sidebar lo dice.

Costuras declaradas en pantalla, no diseñadas aquí: la pantalla de alta a la que llega un amigo
referido es el Epic 1; reservar con un day pass son los Epics 3 y 4; la conversación de soporte de
"contact support" es el Epic 8; y el reembolso que revierte un premio de referido se gestiona desde
la consola del Epic 8.

Pendientes conocidos: nombres, emails, importes, fechas y el código de referido son datos de muestra,
pero **cuadran entre sí y con las fases anteriores** — las 5 invitaciones de `Referrals` son 2
registrados + 2 abiertas + 1 caducada; los 2 registrados son 1 day pass acreditado + 1 pendiente, que
en `RewardCredited` pasan a 2 acreditados ($150.00) y a 3 day passes disponibles contando el de
cumpleaños de septiembre, que viene del Epic 6; el prorrateo de `Upgrade` cuadra con el precio mensual
de `MonthlyPlan`; y la línea temporal es **jueves 12 de septiembre**, el mismo día del Epic 6, con la
visita a The Vestry apareciendo como notificación leída de las 6:00 AM. Queda por resolver una
incoherencia **heredada de la Fase 7**: `Profile.dc.html` del Epic 6 dice a la vez "Member since
March 2026" y "Renews November 3, 2026", que no forman un término de doce meses. La Fase 9 conserva
ambos literales para no contradecir un canvas ya publicado y **no dibuja ninguna fecha de inicio de
término ni historial de facturas fechado** que dejaría el hueco a la vista; al implementar hay que
elegir una de las dos y corregir el artboard de la Fase 7, igual que con el corazón de favorito que
la Fase 7 dejó pendiente para la Fase 4. El texto legal de `Terms` es una propuesta estructural, a
reemplazar por el documento real de En Soleil.

### Fase 10 — `design/epic-10-partner-organizations/`

Rediseña el modelo de partner: deja de ser una persona con un lounge y pasa a ser la
**organización** (hotel, spa, club) dueña de varios lounges y con varios usuarios. Hereda sin
cambios el lenguaje del admin de la Fase 8 (sidebar, top bar, cards de `--dark-card`, chips de
estado, inputs de 44px, formulario discontinuo de partner del artboard 23). Añade la entrada
**Partners** al sidebar del admin, entre Bookings y Lounges.

| Artboard | Qué muestra | Historia |
|---|---|---|
| `Partners` | Listado: nombre + email de contacto, status, nº de lounges, representante, ciudad principal; búsqueda y filtros Active / Draft / Suspended | 10.2 |
| `PartnerNew` | Partner nuevo en draft: datos, edificio central como texto (sin mapa) y el primer usuario, que queda como representante | 10.3 |
| `PartnerDetail` | Detalle en draft: datos editables, tabla de usuarios con lápiz y "Make representative", lounges con "Open lounge", checklist para activar | 10.3 |
| `PartnerUserEdit` | Edición en línea de un usuario (email bloqueado) y aviso al intentar borrar al representante | 10.3 |
| `PartnerActivate` | Modal de activar: lista de usuarios que reciben el email de crear contraseña | 10.4 |
| `PartnerActive` | Partner activo: usuarios Active / Invited (reenviar) / Suspended, "Suspend partner" | 10.4 |
| `PartnerSuspend` | Modal de suspender el partner: lounges suspendidos, usuarios sin acceso | 10.4 |
| `PartnerSuspended` | Partner suspendido: qué pasa con cada lounge al reactivar | 10.4 |
| `LoungesWithPartner` | Artboard 11 de la Fase 8 con columna Partner y filtro Suspended | 10.5 |
| `LoungePartner` | Artboard 17 con la tarjeta de partner en solo lectura y "Suspend lounge" | 10.4 / 10.5 |
| `LoungeSuspend` | Modal de suspender un lounge suelto | 10.4 |
| `LoungeDraftPartner` | Artboard 23 con el selector de partner (incluye draft) y "An active partner" en la checklist | 10.5 |
| `PartnerToday` | `Main` de la Fase 2 con el selector partner + lounge al final de la top bar y el usuario real en el sidebar | 10.6 |
| `PartnerLoungeMenu` | Menú de lounges abierto; la elección se guarda en la cuenta | 10.6 |
| `PartnerAnalyticsAll` | `Analytics` de la Fase 2 con "All lounges" (solo en Analytics, Guests y Reports) | 10.6 |
| `PartnerNoLounges` | Estado vacío de un partner sin lounges | 10.6 |

Decisiones: el chip **Suspended** reutiliza el color de error que la Fase 8 ya usa en los
inputs (`#D9826B` / `#E39A85`); el usuario sin acceso todavía muestra **On activation**, gemelo
del **On publish** del artboard 23. Los artboards de lounge (9–12) son copias de los 11, 17 y 23
de la Fase 8 donde solo cambia lo que toca al partner; el resto sigue siendo la fuente de la
Fase 8. Reactivar un lounge suspendido lo devuelve a draft, igual que al reactivar el partner.
El selector de `/partner` (13–16) parte de `Main` y `Analytics` de la Fase 2: el partner es texto fijo y solo el lounge es botón. Las historias 10.7 (emails) y 10.8 (vista del miembro) ajustan artboards de las Fases 2, 3, 4 y 6 y no tienen artboard propio aquí.

#### 10.9 — Temporadas y cierres especiales

Dos cards nuevas en el formulario admin del lounge, **debajo de Operating hours**. Parten del
artboard 23 de la Fase 8 (ya con la tarjeta de partner de la 10.5) sobre The Ainsworth, live,
con el formulario desplazado hasta los horarios. Solo el admin escribe; el partner y el miembro
leen el resultado.

| Artboard | Qué muestra | Criterios |
|---|---|---|
| `SeasonalEmpty` | Seasonal hours y Special closures vacías, cada una con su estado vacío y su "Add"; rail con el orden de precedencia (cierre → temporada → semana habitual) y quién puede escribir | 1, 4, 7 |
| `SeasonalEdit` | Temporada nueva "Summer hours", Jun 1 – Aug 31, 2026: nombre opcional, desde/hasta y su semana con el mismo editor de Operating hours (switch por día + desde/hasta) | 1, 2 |
| `SeasonalOverlap` | "Late summer" Aug 20 → Aug 5: error bajo cada fecha (se solapa con Summer hours · termina antes de empezar), la temporada con la que choca marcada y "Add season" deshabilitado | 3 |
| `ClosureEdit` | Cierre nuevo "Private event", Fri Sep 12 – Sat Sep 13, 2025, reabre Sun Sep 14 a las 10:00 AM, con la vista previa del aviso tal como lo lee el miembro en `Closure` (Fase 4) | 4, 5 |
| `ClosureBookingsWarning` | Modal antes de guardar: "3 confirmed bookings fall in this closure", lista de las tres reservas, Cancel / Save anyway | 6 |
| `SeasonalFilled` | Guardado: 2 temporadas y 1 cierre en filas con editar/borrar, "Next 7 days" en el rail y el toast "The Ainsworth is still live" | 1, 4, 8 |

Decisiones: el editor de semana de una temporada es el de `lounge-draft-form.tsx` (filas con
switch y dos selects), no las siete casillas de solo lectura del artboard 23, que se mantienen
para la semana habitual ya guardada; en dos columnas los selects bajan a 96px y 34px de alto.
Las filas guardadas son una caja `--panel-black` de `border-radius: 14px` con icono de 36px,
título 13.5px/700, fechas en 12px y botones cuadrados de 34px (lápiz y papelera). El estado
"Upcoming" / "In 3 days" reutiliza los chips existentes; el error reutiliza `#D9826B` / `#E39A85`
de la Fase 8. El campo **Reopens** propone el siguiente día abierto a su hora de apertura (hint
del artboard 20); qué pasa con las reservas confirmadas tras "Save anyway" no lo fija la
historia: el modal solo avisa y enlaza a Bookings.

## 7. Cómo regenerar y publicar un canvas

Los `.dc.html` del folder son la fuente de verdad. Tras editarlos, se re-genera el HTML
publicable con el helper del skill `/design` (`seed-canvas.mjs --template ... --artboard ... --image logo.png --canvas canvas.json`)
y se republica con la herramienta Artifact al mismo `file_path` para conservar el link.

Si alguien guardó cambios desde el visor, primero se lee el artifact publicado y se extrae
(`--extract`) para no pisar ese trabajo.
