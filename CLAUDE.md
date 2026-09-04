# LuxePass — Aplicación Next.js + Specs & Diseño

## Qué es este repositorio

Repositorio integral del proyecto **LuxePass** (plataforma de membresía de lujo para el cliente En Soleil, desarrollada por la agencia Kreante). Contiene:

1. **Código de la aplicación** — Next.js 15 + TypeScript + Tailwind 4
2. **Especificaciones** — Historias de usuario y flujos en `docs/specs`
3. **Diseño** — Mockups y sistema de diseño en `docs/design`

---

## ⚠️ Alcance: esto es SOLO frontend

**Este repo implementa el diseño en Next.js. No hay backend, no hay base de datos, no hay lógica de negocio real.**

La app en producción vive en `app.luxepass.co` y es un proyecto aparte: este repositorio **no se conecta a ella** ni a ningún servicio.

**No hacer, salvo que se pida explícitamente:**

- ❌ Instalar ORM o cliente de base de datos (Prisma, Drizzle, Supabase…)
- ❌ Crear route handlers en `src/app/api/`
- ❌ Añadir autenticación real (NextAuth, sesiones, JWT, middleware de auth)
- ❌ Server Actions que escriban en algún sitio
- ❌ `fetch` a servicios externos, pasarelas de pago, envío de emails
- ❌ Tests e2e con navegador masivos — Playwright existe para verificación visual (uso puntual, ver §Verificación)
- ❌ Persistir estado (`localStorage`, `sessionStorage`, cookies). Recargar puede empezar de cero: es un mockup navegable, no una app con sesión

**Sí hacer:**

- ✅ Datos de muestra en módulos de `src/lib/` o constantes del propio componente
- ✅ Estado de UI con `useState` / Context — lo justo para que la pantalla muestre sus estados
- ✅ Validación **de cliente**, cuya finalidad es que la pantalla pueda mostrar sus estados (error, botón deshabilitado, campo inválido) — no es seguridad
- ✅ Navegación entre pantallas con `next/link` y `useRouter`
- ✅ Tests con Vitest + Testing Library, escritos **antes** del código — ver "Metodología de test"

**Criterios de aceptación que exigirían backend** (enviar un email, cobrar, verificar un token, comprobar duplicados contra la base) se cubren **visualmente**: se implementa la pantalla del estado y se simula el disparador con datos de muestra. La desviación se anota en la última sección de `docs/design/COMPONENT-MAP.md`.

Ejemplos ya hechos: la comprobación de email duplicado consulta una lista de dos correos en `src/lib/registration.ts`; el bloqueo tras 5 intentos de `/login` es un contador en `useState` que se limpia al recargar. **La regla es que la pantalla llegue a mostrar el estado, no que el estado sea real.**

---

## Estado de implementación

**Diseño: los 9 epics están diseñados** (Fase 9 cerrada). Cualquier trabajo de diseño nuevo es revisión o corrección.

**Código: 13 de 24 historias implementadas** — los Epics 1, 2, 3, 4 y 5 están completos.

| Epic | Historias | Estado |
|---|---|---|
| 1 · User Onboarding & Authentication | 1.1 User registration | ✅ **Implementada** |
| | 1.2 User login & authentication | ✅ **Implementada** |
| 2 · Location Discovery & Search | 2.1 Map-based lounge discovery | ✅ **Implementada** |
| | 2.2 Lounge filtering & search | ✅ **Implementada** |
| | 2.3 List view alternative | ✅ **Implementada** |
| 3 · Lounge Profiles & Details | 3.1 Detailed lounge information | ✅ **Implementada** |
| | 3.2 Availability | ✅ **Implementada** |
| 4 · Booking System | 4.1 Seamless booking flow | ✅ **Implementada** |
| | 4.2 Payment processing | ✅ **Implementada** |
| | 4.3 Calendar integration | ✅ **Implementada** |
| 5 · QR Code & Check-in | 5.1 Digital pass generation | ✅ **Implementada** |
| | 5.2 Lounge check-in process | ✅ **Implementada** |
| | 5.3 Booking reminder notification | ✅ **Implementada** |
| 6 · Member Experience & Notifications | 6.1 · 6.2 · 6.3 | ⬜ Pendiente |
| 7 · Partner Dashboard | 7.1 · 7.2 · 7.3 | ⬜ Pendiente |
| 8 · Admin & Support | 8.1 · 8.2 · 8.3 | ⬜ Pendiente |
| 9 · Membership & Referrals | 9.1 · 9.2 | ⬜ Pendiente |

### Rutas existentes

| Ruta | Artboard | Story |
|---|---|---|
| `/` | `Home.dc.html` | Home del área de miembro, dentro del App shell |
| `/signup` | `Main.dc.html` + `Terms.dc.html` | 1.1 |
| `/verify-email` | `Verification.dc.html` | 1.1 |
| `/onboarding/basics` | `ProfileBasic.dc.html` | 1.1 |
| `/onboarding/personal` | `ProfilePersonal.dc.html` | 1.1 |
| `/onboarding/professional` | `ProfileProfessional.dc.html` | 1.1 |
| `/welcome` | `Welcome.dc.html` | 1.1 |
| `/login` | `Login.dc.html` | 1.2 |
| `/forgot-password` | `ForgotPassword.dc.html` | 1.2 |
| `/explore` | Los 9 artboards de la Fase 3 | 2.1 · 2.2 · 2.3 |
| `/lounges/[id]` | `Main.dc.html` + `Gallery.dc.html` + `Share.dc.html` + `NotAvailable.dc.html` + `Loading.dc.html` | 3.1 · 3.2 |
| `/lounges/[id]/availability` | `Availability.dc.html` + `Closure.dc.html` | 3.2 |
| `/lounges/[id]/reviews` | `Reviews.dc.html` + `NoRatings.dc.html` | 3.1 |
| `/lounges/[id]/book` | `Main.dc.html` (+ `MembershipCovered.dc.html` sobre `?covered=1`) | 4.1 |
| `/lounges/[id]/book/payment` | `Payment.dc.html` + `MembershipCovered.dc.html` | 4.2 |
| `/lounges/[id]/book/summary` | `Summary.dc.html` + `Waitlist.dc.html` + `PaymentError.dc.html` | 4.1 |
| `/lounges/[id]/book/confirmed` | `Confirmed.dc.html` + `Calendar.dc.html` | 4.1 · 4.3 |
| `/lounges/[id]/book/receipt` | `Receipt.dc.html` | 4.2 |
| `/my-pass` | `MyBookings.dc.html` (Upcoming) + `NoShow.dc.html` (Past) | 5.1 · 5.2 |
| `/my-pass/[reference]` | `Main.dc.html` + `ArrivalDay.dc.html` + `CheckedIn.dc.html` + `Expired.dc.html` (sobre `?state=`) | 5.1 |
| `/my-pass/[reference]/reminder` | `Reminder.dc.html` | 5.3 |
| `/reception` | `Reception.dc.html` + `CheckInError.dc.html` | 5.2 |

#### Estados de `/explore`

Siete de los nueve artboards de la Fase 3 son estados de la misma pantalla. Tres
dependen del sistema o de la red, que aquí no existen, así que **se alcanzan por
query param** — no salen de ningún artboard y desaparecen cuando haya lógica real
(`docs/PENDIENTES.md` §2.2):

| URL | Artboard | Qué enseña |
|---|---|---|
| `/explore` | `LocationPermission` → `Main` | Permiso, y tras concederlo el mapa |
| `/explore` → "Enter a location instead" | `ManualLocation` | Entrada manual de ciudad |
| `/explore` → botón **Filters** | `Filters` | Drawer de filtros (patrón 6) |
| `/explore` → filtrar hasta cero | `NoResults` | Vacío con sugerencias |
| `/explore` → segmented **List** | `ListView` | Lista con scroll infinito |
| **`/explore?map=error`** | `MapError` | El mapa no carga: reintentar o pasar a lista |
| **`/explore?offline=1`** | `Offline` | Lounges cacheados, búsqueda deshabilitada |
| **`/explore?list=loading`** | `ListLoading` | Skeletons de la lista |

Para llegar a `NoResults` como lo dibuja el artboard: Filters → WiFi → Co-working
→ `< 2 mi` → día **14** → **2–6 PM**.

#### Estados de `/my-pass/[reference]`

`Main`, `ArrivalDay`, `CheckedIn` y `Expired.dc.html` son cuatro estados de la
**misma tarjeta de pase** (design system §5 patrón 11) para la misma reserva de
muestra, LP-842193. Sin un reloj real que los dispare, se alcanzan por query
param — igual que `?covered=1` o `?map=error`:

| URL | Artboard | Qué enseña |
|---|---|---|
| `/my-pass/LP-842193` | `Main` | Pase próximo, neutro |
| `/my-pass/LP-842193?state=today` | `ArrivalDay` | El día de la reserva, cuenta atrás de check-in |
| `/my-pass/LP-842193?state=checked-in` | `CheckedIn` | Con el check-in ya hecho |
| `/my-pass/LP-842193?state=expired` | `Expired` | Tras cerrarse la ventana de la reserva |

Los 10 artboards de la Fase 1, los 9 de la Fase 3, los 9 de la Fase 4, los 9 de
la Fase 5 y los 9 de la Fase 6 están cubiertos. `/explore` reúne siete de los nueve de la Fase 3 como
estados de una misma pantalla: solo el permiso de ubicación y la entrada manual
son diálogos aparte. `/lounges/[id]` hace lo mismo con cinco de los nueve de la
Fase 4 (`Main` · `Gallery` · `Share` · `NotAvailable` · `Loading`); los otros
cuatro (`Availability` · `Closure` · `Reviews` · `NoRatings`) son estados de las
dos sub-vistas. Los tres pasos de `/lounges/[id]/book` reúnen a su vez seis de
los nueve artboards de la Fase 5 (`Main` · `Payment` · `Summary` ·
`MembershipCovered` · `Waitlist` · `PaymentError`); los otros tres
(`Confirmed` · `Calendar` · `Receipt`) tienen su propia ruta. De la Fase 6,
`/my-pass` reúne `MyBookings` y `NoShow` como sus pestañas Upcoming/Past, y
`/my-pass/[reference]` reúne `Main`/`ArrivalDay`/`CheckedIn`/`Expired` como se
explica arriba; `Reminder` tiene su propia ruta y `Reception`/`CheckInError`
son la misma consola de recepción (`/reception`), alcanzados tecleando el
número en vez de por query param porque sí son una interacción real de la
pantalla.

Lo construido que ya sirve al resto: 21 primitivos, 10 patrones de pantalla y la
capa de tokens completa. El **App shell (patrón 3)** fija la navegación de los
Epics 2–6, el **drawer lateral (patrón 6)** es el que reutiliza el Partner
Dashboard en oscuro, la **sub-vista de lounge (patrón 8)** es la base de las
pantallas de disponibilidad y reseñas, y el **flujo por pasos con rail (patrón 9)**
es la base de los tres pasos de reserva. El **pase digital (patrón 11)** extiende
la tarjeta de confirmación oscura del patrón 10 sin reescribirla, y la
**consola de recepción (patrón 12)** es la primera pantalla íntegramente oscura
fuera del Partner Dashboard. Ver `docs/design/COMPONENT-MAP.md`.

**Cada artboard tiene su propia frase de marca** en el panel izquierdo del patrón 1 (`Join a community of discerning travelers.`, `Your next moment of calm is waiting.`, `Tell us who you are.`…). No reutilizar la de otra pantalla: extraerla del `.dc.html` correspondiente.

---

## Cómo implementar la siguiente historia

### Ramas

| Rama | Para qué |
|---|---|
| `main` | Rama principal. No se trabaja directamente sobre ella |
| `design/screens` | **Las pantallas implementadas en Next.js.** Aquí va todo el código |
| `docs/design` | Mockups `.dc.html` y canvas de los epics (`docs/design/`) |

Las dos ramas `design/*` son el mismo trabajo en dos formatos: el canvas estático y
las pantallas navegables. No se llama "frontend" a propósito — esto es el diseño
llevado a código, no una aplicación con backend.

Para trabajo puntual que no es una historia entera, se sale de `design/screens` con
un prefijo y se vuelve a ella:

| Prefijo | Cuándo |
|---|---|
| `feat/` | Pantalla o funcionalidad nueva |
| `fix/` | Corrección de un fallo |
| `refactor/` | Reestructurar sin cambiar comportamiento |
| `test/` | Solo añadir o actualizar tests |
| `chore/` | Tooling, dependencias, configuración |
| `docs/` | Solo documentación |

Formato: `<prefijo>/<descripción-en-kebab>` — minúsculas, guiones, sin más barras
que la del prefijo (`feat/lounge-search`, `fix/login-lockout-plural`).

**Una rama = un propósito.** Si aparece trabajo no relacionado a mitad de tarea, va
en otra rama. Los mensajes de commit siguen Conventional Commits (`feat:`, `fix:`,
`docs:`, `chore:`…), como los que ya hay en el historial.


Receta completa. Seguirla en orden evita duplicar componentes que ya existen.

**1. Leer la historia** — `docs/specs/epic-N-slug/story-N.M-slug.md`. Sus `## Acceptance Criteria` son el contrato.

**2. Leer el flujo** que la historia enlaza en `## Related Flow`, en `docs/specs/flows/`. La tabla "Story Segments" dice qué nodos del diagrama le corresponden.

**3. Leer la fase de diseño** en `docs/design/DESIGN-SYSTEM.md` §6. **Ojo: los números de fase no coinciden con los de epic** (la Fase 2 es el Epic 7). La tabla de §6 dice qué artboards tiene cada fase y qué criterios cubren.

**4. Leer los artboards** `.dc.html` de esa carpeta. Son HTML real con los estilos inline: son la fuente de verdad de medidas y copy, no una aproximación.

**5. Leer `docs/design/COMPONENT-MAP.md`** — qué componentes existen, qué falta, y la tabla de "gemelos" que el design system ya declaró equivalentes entre tema claro y oscuro.

**6. Implementar con TDD** — red, green, refactor. Ver "Metodología de test". El
test se escribe **antes** y sale de los criterios del paso 1 y de los nodos del
paso 2, nunca del artboard del paso 4.

   Para los componentes, en este orden de preferencia:
   1. Reutilizar un componente existente tal cual
   2. Añadirle una variante (`cva`)
   3. Solo si nada encaja, crear uno nuevo — y anotarlo en el mapa

**7. Actualizar `COMPONENT-MAP.md`**: la fila de cada componente nuevo, las rutas nuevas en la capa 3, y las desviaciones respecto al artboard.

**8. Verificar antes de dar nada por hecho:**
```bash
npm test             # toda la suite en verde, sin tests omitidos
npx tsc --noEmit     # debe salir vacío
npm run lint         # debe salir sin problemas
npm run build        # debe compilar y listar las rutas nuevas
npm run dev          # y comprobar que las rutas responden 200
```

Se pueden correr a la vez: `next build` escribe en `.next-build` y `next dev` en
`.next`, así que un build no invalida el dev server (ver `next.config.ts`).

**9. Revisar `docs/PENDIENTES.md`**: añadir lo que quede abierto (algo provisional,
un asset que falte, un criterio que solo se pueda enunciar) y cerrar lo resuelto.

### Correspondencia specs ↔ diseño

Los nombres de carpeta coinciden **salvo en el Epic 1**:

| Epic | `docs/specs/` | `docs/design/` | Fase |
|---|---|---|---|
| 1 | `epic-1-user-onboarding-authentication` | `epic-1-onboarding` ⚠️ | 1 |
| 2 | `epic-2-location-discovery-search` | idem | 3 |
| 3 | `epic-3-lounge-profiles-details` | idem | 4 |
| 4 | `epic-4-booking-system` | idem | 5 |
| 5 | `epic-5-qr-code-check-in` | idem | 6 |
| 6 | `epic-6-member-experience-notifications` | idem | 7 |
| 7 | `epic-7-partner-dashboard` | idem | 2 |
| 8 | `epic-8-admin-support` | idem | 8 |
| 9 | `epic-9-membership-referrals` | idem | 9 |

### Qué NO tocar

- **Los `## Acceptance Criteria` de los specs.** Son el contrato del cliente: no marcar sus checkboxes ni reescribirlos al implementar.
- **Los artboards `.dc.html`.** Son la fuente de diseño; si algo no cuadra, se anota como desviación en el mapa, no se edita el mockup.
- **La paleta literal de `globals.css`** (§2 del design system) sin actualizar antes el design system.

### Nunca inventar un diseño

**Cada pantalla de este proyecto tiene su artboard.** Construir algo "provisional",
un "scaffold" o una maqueta propia está prohibido, también para pantallas internas.
La fase actual es convertir mockups en código, no diseñar en el editor.

Si no aparece el `.dc.html` de la pantalla que toca construir:

1. **Parar. No inventar un diseño.**
2. Preguntar dónde está el artboard, o si se acepta avanzar sin él.
3. Continuar solo con confirmación explícita.

La única excepción viva es `src/app/page.tsx` (índice provisional de pantallas), ya
anotada en `docs/PENDIENTES.md` y que desaparece con el Epic 2.

---

## Al implementar una pantalla

**Antes de crear cualquier componente, leer `docs/design/COMPONENT-MAP.md`.** Después de crear uno, añadir su fila.

Cuatro capas, de abajo arriba:

```
Capa 0  tokens        src/app/globals.css        §2 Tokens · §3 Tipografía
Capa 1  primitivos    src/components/ui/         §4 Componentes
Capa 2  patrones      src/components/patterns/   §5 Patrones de pantalla
Capa 3  pantallas     src/app/**/page.tsx        solo componen
```

- **Una pantalla no escribe un `px` ni un `#hex`.** Si necesita algo que no existe, se sube a capa 1 o 2 y se anota en el mapa.
- Los componentes consumen **tokens semánticos** (`bg-surface`, `text-fg-muted`, `border-line`), no literales (`bg-gold-500`). Los literales quedan para cuando el design system cita el valor exacto (mapa, gradientes de marca).
- **Un solo componente para los dos temas.** El shell pone `data-theme="dark"` y los tokens resuelven en la mitad oscura. Lo que el tema no resuelve son las diferencias de geometría entre gemelos (input 44 vs 50px): esas van como variante explícita.
- Los artboards son desktop 1440×900. La app es responsive; las desviaciones conscientes se documentan en la última sección del mapa.
- La lógica específica de un epic va en `src/components/<epic>/` (p. ej. `onboarding/`), no en `ui/` ni en `patterns/`.

---

## Metodología de test — TDD

Toda historia nueva y todo bugfix siguen **Test-Driven Development**. La skill
`test-driven-development` es obligatoria y se invoca **antes** de tocar código: no
se salta porque el cambio sea pequeño.

1. **Red** — escribir un test que falle y capture el comportamiento buscado.
2. **Green** — el código mínimo para que pase. Sin funcionalidad de más, sin abstracciones especulativas.
3. **Refactor** — limpiar solo con el test en verde, y mantenerlo verde.

**El orden no es una recomendación: es lo que distingue TDD de tener tests.** No se
escribe una línea de código de producción antes de que exista un test que la
reclame. Escribir el test después también da una suite verde, pero describe lo que
el código hace en vez de lo que debería hacer, y ya no puede contradecirlo.

Un test que pasa a la primera no demuestra nada: si no lo has visto fallar, no sabes
qué está comprobando. Ante la duda, rompe a propósito lo que acabas de escribir y
confirma que el test lo detecta.

### Qué no lleva test

Documentación, configuración sin efecto en el comportamiento, y ajustes puramente
visuales (un margen, un color, una clase de Tailwind). Eso lo cubren el artboard,
`tsc` y mirar la pantalla. Todo lo demás lleva test.

### Bugs: reproducir antes de arreglar

Ante un fallo, **no se empieza por arreglarlo**. Se escribe primero el test que lo
reproduce, se comprueba que falla —eso confirma el diagnóstico— y solo entonces se
corrige. El test que pasa es la prueba de que el arreglo funciona, y se queda como
guardia contra la regresión.

### De dónde sale el test

**De los `## Acceptance Criteria` de la historia y de los nodos del flow. Nunca del `.dc.html`.**

Copy, medidas, colores y clases de Tailwind **no se testean**: eso lo cubren el
artboard, `tsc` y la revisión visual. Un test que transcribe el mockup no previene
ningún fallo y se rompe cada vez que se ajusta el diseño.

Se consulta siempre por rol y etiqueta (`getByRole`, `getByLabelText`), nunca por
clase ni por estructura del DOM. Así un test solo falla cuando cambia el
comportamiento — que es justo cuando queremos que falle.

| Nivel | Qué cubre | Ejemplo |
|---|---|---|
| Lógica | `src/lib/*.ts` — validaciones, filtros, cálculos | `validateSignUp` devuelve el error de email ya registrado |
| Estados | Error de validación, botón deshabilitado, vacío, bloqueado | Tras 5 fallos, `/login` muestra el aviso y deshabilita el formulario |
| Navegación | Va a la ruta correcta · **no** navega con entrada inválida | Submit válido en `/signup` → `/verify-email?email=…` |

Que **no** navegue con entrada inválida es tan parte del criterio como que navegue
con entrada válida: es la mitad que más se rompe al refactorizar.

### Runner

`vitest` + Testing Library + `user-event` sobre jsdom. Los tests viven junto al
archivo que prueban: `registration.test.ts` al lado de `registration.ts`,
`page.test.tsx` al lado de `page.tsx`.

`userEvent.setup({ delay: null })` siempre. Sin esa opción, user-event espera un
tick del bucle de eventos entre cada pulsación y un formulario de tres campos se va
a más de un segundo: la suite entera pasó de 19,8 s a 3,8 s solo con esto. El
`delay` existe para simular a alguien tecleando, y en estas pantallas no hay nada
—debounce, autocompletado— que dependa de ese ritmo.

**`next/navigation` es el único mock permitido.** El router de Next no existe fuera
del runtime del App Router, así que es una frontera legítima. Todo lo demás se
prueba contra la implementación real: componentes de verdad, validaciones de verdad,
datos de muestra de verdad. Mockear un componente propio para que el test pase es
señal de que el test está mirando al sitio equivocado.

Distinto es **rellenar una API del navegador que jsdom no trae**: eso no sustituye
código del proyecto, lo hace ejecutable. `vitest.setup.ts` define un
`IntersectionObserver` inerte porque sin él el scroll infinito de la lista no puede
ni montarse; el test que necesita simular el centinela lo cambia por un doble con
`vi.stubGlobal` y lo deshace en `afterEach`.

Cuando llegue la capa de datos, se suma una fila de integración a la tabla de
niveles; el ciclo y la regla de dónde sale el test no cambian.

### Punto de partida para una pantalla nueva

No hay que reinventar el andamiaje. `src/app/login/page.test.tsx` y
`src/app/signup/page.test.tsx` son la referencia: el segundo incluye además el
patrón para un modal de Radix (abrirlo, marcar sus casillas, aceptar).

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MiPantalla from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockClear();
});

describe("navegación", () => {
  it("avanza cuando los datos son válidos", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MiPantalla />);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(push).toHaveBeenCalledWith("/siguiente");
  });
});
```

Los `describe` agrupan por comportamiento, no por componente: `navegación`,
`validación del formulario`, `bloqueo tras cinco intentos fallidos`. El nombre de
cada `it` describe lo que el miembro observa, no la función que se ejecuta — leídos
en fila, los tests de un archivo son la especificación de esa pantalla.

Cada test se lee entero sin saltar a un helper: se repite lo que haga falta para
que se entienda solo. Los helpers son para recorridos largos que se repiten de
verdad (rellenar el formulario, aceptar los términos), no para ahorrar tres líneas.

---

## Skills

| Skill | Cuándo se usa |
|---|---|
| `test-driven-development` | **Antes de cualquier historia o bugfix.** Red → green → refactor |
| `frontend-design` | Componer pantallas y componentes de UI |
| `design` | Crear o re-sembrar un canvas de mockups `.dc.html` |
| `systematic-debugging` | Algo falla y la causa no es evidente |
| `verification-before-completion` | Antes de dar una historia por terminada |

---

## Estructura

```
src/                      Código de la aplicación Next.js
  app/
    globals.css           Tokens: literales + semánticos + @theme inline
    **/page.tsx           Pantallas — solo componen, no definen estilo
  components/
    ui/                   Primitivos = DESIGN-SYSTEM §4 (Button, Input, Chip, Card...)
    patterns/             Layouts   = DESIGN-SYSTEM §5 (AuthSplit, Modal...)
    onboarding/           Lógica del Epic 1 (TermsModal, ProfileDraft)
    explore/              Lógica del Epic 2 (CityMap, FilterDrawer, LoungeList...)
    lounges/              Thumb/Card compartidos (E1-E3) + el perfil, disponibilidad y reseñas del Epic 3
    booking/              Lógica del Epic 4 (BookingContext, formularios de los 3 pasos, modales)
    passes/               Lógica del Epic 5 (DigitalPassCard, patrón 11)
    charts/               Gráficos Recharts (BarChart, LineChart)
  lib/
    utils.ts              Utilidades (cn() para Tailwind)
    registration.ts       Reglas de validación de alta (Story 1.1)
    authentication.ts     Credenciales, bloqueo y "remember me" (Story 1.2)
    lounges.ts            Catálogo de muestra (12 en NY, 3 Newark, 1 New Rochelle, 1 Miami)
    filters.ts            Pipeline de la Story 2.2, compartido por mapa y lista
    amenities.ts          Las seis amenities, sus etiquetas y (Story 3.1) su descripción
    availability.ts       Franjas, calendario y el "hoy" del mockup (2025-09-09)
    lounge-profile.ts     Story 3.1 / 3.2 — contacto, horario, reseñas, cierres y disponibilidad semanal
    distance.ts           Conversión mi/km y tiempo a pie
    location.ts           Ciudades de muestra y su búsqueda
    member.ts             El miembro de muestra del App shell
    booking.ts            Story 4.1 / 4.2 — date picker, slots, precio, pago y referencias de reserva
    calendar-export.ts    Story 4.3 — .ics real y URL real de Google Calendar
    passes.ts             Story 5.1 / 5.2 / 5.3 — el pase de muestra, "My Pass" y la consola de recepción

  **/*.test.ts(x)         Los tests van junto al archivo que prueban

e2e/                      Verificación visual con Playwright (puntual, no e2e masivo)
  playwright/
    scripts/              Scripts de verificación visual por feature
    screenshots/          Capturas generadas (gitignored)
    utils/                Funciones compartidas (browser.js, template.js)
    README.md             Guía de uso

docs/                     Diseño y especificaciones
  PENDIENTES.md           Lo que queda abierto: bloqueos, provisionales y decisiones
  design/
    DESIGN-SYSTEM.md      Sistema de diseño: tokens, tipografía, componentes, patrones
    COMPONENT-MAP.md      Qué componente de código implementa qué fila del design system
    epic-N-slug/          Mockups de un epic: .dc.html + luxepass-epicN.html + canvas.json + logo.png
  specs/
    epic-N-slug/          Un folder por epic (9 en total)
      story-N.M-slug.md   Una historia de usuario por archivo
    flows/
      flow-slug.md        Diagramas de flujo en Mermaid (texto)
      images/             JPGs de los flujos (referencia visual)

assets/
  brand/logo.png          Logo oficial En Soleil (907 KB)

public/
  logo.png                Copia reducida (54 KB) que consume la app
  manifest.json, sw.js    PWA (sw.js y workbox-*.js se regeneran en cada build)
```

### Epics (`docs/specs/epic-*`)

9 epics, numerados 1–9, cada uno con sus historias de usuario:

1. User Onboarding & Authentication
2. Location Discovery & Search
3. Lounge Profiles & Details
4. Booking System
5. QR Code & Check-in
6. Member Experience & Notifications
7. Partner Dashboard
8. Admin & Support
9. Membership & Referrals

### Convención de nombres

- Folders y archivos en **lowercase-kebab-case**, sin espacios ni caracteres especiales (`epic-1-user-onboarding-authentication`, `story-1.1-user-registration.md`).
- Los números de story mantienen el punto (`1.1`, `4.2`) tal cual aparecen en la numeración original del proyecto.
- Todas las historias de usuario son `.md`, no `.txt`.

### Formato de una historia de usuario

Cada `story-*.md` sigue esta estructura:

```markdown
# Story N.M: Título

## User Story
As a ... I want ... so that ...

## Acceptance Criteria
- [ ] Criterio 1
- [ ] Criterio 2

## Related Flow
(ver sección siguiente)
```

### Flujos (`docs/specs/flows/`)

Los diagramas de flujo originales (6 JPGs de FigJam) fueron transcritos a **Mermaid** en archivos `.md` para que sean legibles como texto (no requieren visión). Cada flow file cubre uno o más epics, e incluye:

- El diagrama Mermaid completo.
- Una tabla "Story Segments" que indica qué nodos del diagrama corresponden a cada historia de usuario — esto es importante porque **varios diagramas abarcan más de un epic** (ej. `flow-complete-booking-journey.md` cubre Epic 3, Epic 4, Epic 5 y toca Epic 6).
- Notas sobre huecos o inconsistencias encontradas al transcribir (ej. una historia sin nodo dedicado en ningún diagrama).

Cada historia de usuario afectada enlaza de vuelta al flow file relevante en su sección `## Related Flow`, indicando el segmento específico que le corresponde. Si una historia no tiene diagrama asociado, esto se declara explícitamente en esa sección en lugar de omitirla.

Mapeo diagrama → epics:

| Flow file | Epics que cubre |
|---|---|
| `flow-onboarding.md` | Epic 1 (+ nota sobre Story 4.2 y 9.1) |
| `flow-location-discovery-search.md` | Epic 2 |
| `flow-complete-booking-journey.md` | Epic 3, Epic 4, Epic 5, toca Epic 6 |
| `flow-partner-experience.md` | Epic 7 |
| `flow-admin-support-experience.md` | Epic 8 |
| `flow-membership-referrals.md` | Epic 9 |

## Diseño (`docs/design/`)

Mockups de las pantallas de cada epic, hechos con el skill `/design` (canvas multi-artboard).

**Antes de implementar cualquier epic, leer `docs/design/DESIGN-SYSTEM.md`.** Ahí están:
- Tokens de color exactos (Bodoni Moda + Manrope)
- Tipografía y escala
- Componentes especificados con medidas exactas (§4)
- Patrones de pantalla (§5, 26 en total)
- Qué artboards tiene cada fase y qué criterios cubren (§6)

Estos tokens están replicados en el código como **CSS custom properties** en `src/app/globals.css`, expuestas a Tailwind con `@theme inline`.

**Convenciones de diseño:**
- La copy de la UI va en **inglés**; la documentación en español.
- Tema **híbrido**: claro/boutique para miembro, oscuro/moderno para Partner Dashboard y Admin.
- El `logo.png` de cada carpeta es una copia reducida a 54 KB (no copiar desde `assets/brand/`).
- Versionamos `.dc.html` (fuente), `.html` publicable, `canvas.json`, y `logo.png`.
- Los datos de muestra **cuadran**: fecha compartida (12–14 sept), importes coherentes entre fases. Mantener esa coherencia al implementar.

**Los números de fase no son cronológicos** — Fase 2 es Epic 7, aunque se diseñó después de Fase 7.

## Al editar specs (`docs/specs/`)

- Mantener la convención de nombres en minúsculas y con guiones.
- Si se agrega una historia de usuario nueva, seguir el formato de sección `## User Story` / `## Acceptance Criteria` / `## Related Flow` de las demás.
- Si una historia no tiene flujo asociado, decirlo explícitamente en `## Related Flow` en vez de omitir la sección o inventar un enlace.
- Si se actualiza un diagrama Mermaid en `docs/specs/flows/`, revisar la tabla "Story Segments" para que siga siendo consistente.

## Stack tecnológico

- **Next.js 15.1** — App Router, PWA
- **TypeScript**
- **Tailwind CSS 4** — **No hay `tailwind.config.ts`**: v4 no lee configs JS. El tema vive en `@theme inline` dentro de `src/app/globals.css`
- **Radix UI** — primitivas accesibles (Dialog, Select, Popover, DropdownMenu, Form)
- **lucide-react** — iconos, con `strokeWidth={1.6}` para cumplir §1 del design system
- **class-variance-authority** — variantes de componente
- **Recharts** — gráficos (Epic 7 y 8, aún sin usar)
- **@ducanh2912/next-pwa** — service worker
- **Vitest + Testing Library** — tests sobre jsdom, con `next/navigation` mockeado
- **Playwright** — navegador automatizado para verificación visual (uso puntual, no suite e2e masiva)

**Convenciones de código:**
- Componentes en `src/components/` con estructura por capa (ui/, patterns/, charts/) más una carpeta por epic para su lógica
- Sin comentarios innecesarios — el código auto-documenta con nombres claros. Sí comentar de qué artboard sale una pantalla y qué fila del design system implementa un componente
- Transiciones CSS: 150ms ease
- Variantes con `class-variance-authority`, no con condicionales de string sueltos

**Comandos:**
```bash
npm run dev      # Dev server en http://localhost:3000   → escribe en .next
npm run build    # Build producción (genera SW para PWA) → escribe en .next-build
npm run start    # Sirve la build desde .next-build
npm test         # Vitest, una pasada
npm run test:watch # Vitest en watch — el ciclo rojo-verde del TDD
npm run test:ui  # El mismo watch, con panel en el navegador
npm run lint     # ESLint
npx tsc --noEmit # Comprobación de tipos
```

**Verificación visual con Playwright:**
Playwright está instalado y disponible para verificación visual puntual: cuando hagas cambios en pantallas, yo puedo navegar a las rutas con Playwright, tomar screenshots y compararlos visualmente contra el diseño para detectar errores. Se usa **solo cuando es necesario** (algo se ve raro, antes de decir "listo"), no para cada cambio. Los tests siguen siendo Vitest + Testing Library (jsdom). Playwright no sustituye la suite de tests, la complementa para verificaciones visuales que jsdom no captura.

Scripts y screenshots se guardan organizados en `scripts/playwright/`: lee `scripts/playwright/README.md` para estructura y cómo crear un script de verificación.

**Directorios de salida separados** (`distDir` en `next.config.ts`). Compartiendo
`.next`, un build lanzado mientras el dev server está vivo le reescribe los chunks
por debajo y lo deja sirviendo 500 (`__webpack_modules__[moduleId] is not a
function`) o 404 en rutas que existen — sin avisar en su log. Si alguna vez vuelve
a pasar: `rm -rf .next` y reiniciar el dev server.

**Antes de dar por roto algo de una pantalla, comprobar que el dev server sirve
React.** Ha pasado ya con los `distDir` separados: `.next` se queda sin
`main-app.js` y la página **se ve entera pero no responde a nada** — la pinta el
servidor. Ningún botón funciona y ningún modal ni drawer aparece, porque viven en
portales que necesitan JavaScript; la nav lateral sí va, porque son `<a href>` de
verdad. Se parece mucho a "falta implementar esa pantalla" y no lo es.

```bash
curl -s -o /dev/null -w '%{http_code}
'   http://localhost:3000/_next/static/chunks/main-app.js   # 200 = sano
```

Si da 404: parar el dev server, `rm -rf .next`, arrancarlo otra vez y **recargar
duro en el navegador** (Ctrl+Shift+R). Detalle en `docs/PENDIENTES.md` §4.2.
