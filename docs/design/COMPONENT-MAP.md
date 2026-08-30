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
| `Checkbox` | `checkbox.tsx` | §4 Checkbox 18×18 | `align`: start(texto multilínea)·center(etiqueta de una línea) | E1 |
| `Card` | `card.tsx` | §4 Card/panel · Card de contenido | `variant`: panel(24px)·content(18px)·flat · `interactive` · `padded` | E1 |
| `Eyebrow` | `eyebrow.tsx` | §3 eyebrow 12px/700 uppercase | `muted` (cabeceras de tabla, tile de métrica claro) | E1 |
| `StepProgress` | `step-progress.tsx` | §4 Progress de pasos | `current` / `total` / `label` | E1 |
| `SelectableChip` | `chip.tsx` | §4 Chip seleccionable | `selected` | E1 |
| `AddChip` | `chip.tsx` | §4 (variante "Other", borde discontinuo) | — | E1 |
| `RemovableChip` | `chip.tsx` | §4 Chip removible | — | E1 |
| `Notice` | `notice.tsx` | **Derivado** — §4 geometría de "Fila de opción" + borde discontinuo de §5 Estados | `tone`: muted·attention | E1 |

## Capa 2 — Patrones (`src/components/patterns/`)

| Patrón | Archivo | DESIGN-SYSTEM | Notas |
|---|---|---|---|
| Split-screen de autenticación | `auth-split.tsx` | §5 patrón **1** | `cardWidth` 440/460 · `centered`. Sirve a sign up, log in, reset password, verificación y pasos de perfil |
| Full-bleed de confirmación | `full-bleed-success.tsx` | §5 patrón **2** | Lleva `data-theme="dark"` incorporado |
| Modal sobre pantalla | `modal.tsx` | §5 patrón **4** | Radix Dialog. `width` 640 por defecto. El patrón **18** (modal oscuro) es este mismo dentro de `data-theme="dark"` |

### Utilidades de superficie (`globals.css`)

| Clase | DESIGN-SYSTEM | Usada por los patrones |
|---|---|---|
| `.surface-night` | §2 radial de artboard oscuro | 12, 15, 21 |
| `.surface-night-panel` | §5 patrón 1 (panel de marca) | 1, 2 |
| `.surface-blush` | §5 patrón 1 (área de contenido) | 1 |
| `.dot-pattern` | §2 puntos dorados a 18px | 1, 2, 10, 12, 15, 21 |
| `.skeleton` | §5 Estados (carga) | — |

## Capa 3 — Pantallas

| Ruta | Artboard | Story |
|---|---|---|
| `/signup` | `Main.dc.html` + `Terms.dc.html` | 1.1 |
| `/verify-email` | `Verification.dc.html` | 1.1 |
| `/onboarding/basics` | `ProfileBasic.dc.html` | 1.1 |
| `/onboarding/personal` | `ProfilePersonal.dc.html` | 1.1 |
| `/onboarding/professional` | `ProfileProfessional.dc.html` | 1.1 |
| `/welcome` | `Welcome.dc.html` | 1.1 |
| `/login` | `Login.dc.html` | 1.2 |
| `/forgot-password` | `ForgotPassword.dc.html` | 1.2 |
| `/` | — | Índice provisional; lo sustituye el Home del patrón 3 |

### Lógica de epic (`src/components/onboarding/`, `src/lib/`)

| Módulo | Qué resuelve |
|---|---|
| `onboarding/terms-modal.tsx` | Story 1.1 — aceptación de TOS + Privacy con fecha y versión |
| `onboarding/profile-context.tsx` | Borrador de perfil compartido por los 3 pasos (Context, sin persistencia) |
| `lib/registration.ts` | Validación de email, contraseña (8+ y 1 especial) y email duplicado |
| `lib/authentication.ts` | Story 1.2 — credenciales de muestra y las constantes de los criterios (5 intentos, 15 min, 30 días) |

---

## Pendiente de implementar

Lo que el design system especifica y **todavía no existe en código**. Antes de escribirlo,
comprobar si un componente de arriba ya lo cubre con una variante.

### Primitivos de §4 sin implementar

Date picker mensual (Fase 5) · Slot de hora (Fase 5) · Fila de opción / método de pago ·
Marca de tarjeta · Item de nav · Código QR del pase (Fase 6) · Sello de expirado ·
Fila de historial · **Chip de estado de reserva** (Fase 7) · Switch de ajuste ·
Fila de ajuste por canal · Campana de notificaciones · Fila de notificación ·
Código de referido · Campo de lookup (oscuro) · Botón fantasma (oscuro) ·
Casilla de asistencia · Chip de asistencia (oscuro) · **Fila de datos** (Fase 2 + 9) ·
**Tile de métrica** (Fase 2 + 9) · Segmented (oscuro) · Barra de volumen · Toast (oscuro) ·
Chip de estado de caso · Badge de nav · Barra de acción masiva · Entrada de log ·
Diff de aprobación · Barra de consumo · Tabla comparativa

### Patrones de §5 sin implementar

3 App shell (miembro) · 5 Explore · 6 Drawer lateral · 7 Perfil de lounge · 8 Sub-vista ·
9 Flujo por pasos con rail · 10 Tarjeta de confirmación oscura · 11 Pase digital ·
12 Consola de recepción · 13 Sección de cuenta · 14 Panel de notificaciones ·
15 App shell del partner · 16 Lista de datos oscura · 17 Panel de actividad ·
18 Modal/drawer oscuros · 19 Vista de analítica · 20 Email de marca · 21 App shell admin ·
22 Ficha de miembro · 23 Caso con log · 24 Comparación live/propuesto ·
25 Lista de datos clara · 26 Comparación de planes

### Gemelos que deben compartir componente

El design system ya los declaró equivalentes. Cuando llegue el segundo de cada par, se
extiende el existente con `data-theme` o una variante — **no se crea uno nuevo**:

| Par | Epics | Cómo |
|---|---|---|
| Tile de métrica claro ↔ oscuro | E9 ↔ E7 | mismo componente, `data-theme` |
| Fila de datos clara ↔ oscura | E9 ↔ E2/E8 | mismo componente, `data-theme` + alto 54/58px |
| Lista de datos clara (25) ↔ oscura (16) | E9 ↔ E2 | mismo componente, `data-theme` |
| Chip de estado: reserva ↔ asistencia ↔ caso ↔ referido | E7 ↔ E2 ↔ E8 ↔ E9 | un `StatusChip` con mapa de estados por dominio |
| Modal/drawer claro (4/6) ↔ oscuro (18) | E1 ↔ E2 | mismo componente, `data-theme` |
| App shell miembro (3) ↔ partner (15) ↔ admin (21) | E2–6 ↔ E7 ↔ E8 | mismo shell, distinta nav y `data-theme` |
| Panel notificaciones (14) ↔ actividad (17) | E6 ↔ E2 | mismo componente, `data-theme` |
| Barra de volumen horizontal ↔ barra de consumo | E7 ↔ E9 | mismo componente, `data-theme` |

---

## Desviaciones conscientes respecto a los artboards

| Qué | Por qué |
|---|---|
| Los artboards son desktop 1440×900 fijo; los componentes son responsive | La app es una PWA. En `AuthSplit`, el panel de marca de 600px se repliega a banda superior por debajo de `lg` |
| Iconos con `lucide-react` en lugar de SVG copiados | §1 especifica *regla* (stroke 1.6–1.8, grid 24, round), no un set concreto. `lucide-react` ya estaba en `package.json` |
| El `filter: blur(3px)` del patrón 4 lo aplica la pantalla, no el modal | Un modal en portal no puede alcanzar a su hermano en el árbol. `/signup` pasa `blur-[3px]` al `AuthSplit` mientras el modal está abierto |
| `/verify-email` incluye "I have verified my email" | Sin backend, el enlace del correo no puede volver a la app. Desaparece cuando exista `/verify-email/[token]` |
| Texto legal del modal de términos | Relleno estructural, tal como ya advierte `DESIGN-SYSTEM.md` §6 (Fase 1). A reemplazar por el documento real de En Soleil |
| El acuse de "reset link sent" no tiene artboard | Se resuelve como segundo estado de `/forgot-password`, reutilizando la anatomía de `Verification.dc.html` (medallón de 76px + destinatario + reenvío), en lugar de inventar una pantalla |
| `/login` añade una nota de 11.5px bajo "Remember me" | El artboard no la trae, pero `flow-onboarding.md` fija el alcance del token ("Set remember token: 30-day auto-logout"). Decirlo evita que el miembro adivine qué activa la casilla |
| El bloqueo por intentos fallidos no persiste | Es un contador en `useState`: basta para alcanzar y ver el estado bloqueado, que es lo que el diseño tiene que mostrar. La caducidad de 15 minutos se enuncia en el aviso, no se cuenta |
