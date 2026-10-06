# 002 — Interacciones de tablas y del shell en Admin y Partner

- **Estado:** Hecho (salvo `/partner/guests`, ver `docs/PENDIENTES.md` §2.8b)
- **Tipo:** fix / feat
- **Rama sugerida:** `fix/admin-partner-shell-interactions` (desde `staging`). 
- **Epics relacionados:** Epic 7 (Partner Dashboard, Fase 2) y Epic 8 (Admin & Support, Fase 8)
- **Creado:** 2026-10-05

## Contexto

Cinco detalles de interacción: cuatro en los paneles oscuros de Admin y Partner y uno en el shell del miembro:

1. Las filas de las tablas no reaccionan al pasar el ratón por encima.
2. La flecha (`ChevronRight`) de la derecha de cada fila, que lleva al detalle, no cambia el cursor.
3. La campana de notificaciones de la topbar de Admin no hace nada al pulsarla. **Decisión (2026-10-05): no se usará; se oculta.**
4. La flecha (`ChevronDown`) junto al nombre del usuario, abajo a la izquierda en Admin y Partner, no hace nada. Debe servir para cerrar sesión. **Decisión (2026-10-05): clic directo, con el mismo icono `LogOut` del shell del miembro.**
5. El logout del shell del miembro no cierra la sesión: solo navega a `/login`.

## Hallazgos

### 1 y 2 — Filas y flecha de detalle

Las "tablas" son grids de `div`/`button`, no `<table>`, y no comparten un
componente de fila: cada página pinta la suya. Por eso el hover y el cursor no
están unificados.

| Ubicación | Cómo se abre el detalle hoy |
|---|---|
| `src/app/admin/lounges/page.tsx:248` | `<button>` solo en la flecha, sin `cursor-pointer` |
| `src/app/admin/members/page.tsx` | La fila entera es un `<button>`; la flecha es decorativa |
| `src/app/admin/partners/page.tsx:175` | Flecha dentro de un control, sin `cursor-pointer` |
| `src/app/admin/support/page.tsx:173` | Flecha decorativa (`aria-hidden`) |
| `src/app/partner/guests/page.tsx:177` | Flecha en un `<span>`: no es clicable |
| `src/components/partner/guest-list-table.tsx:93` | `<button>` con `cursor-pointer` (es la referencia que sí funciona) |

Lo primero es hacer el inventario completo de las tablas de `/admin/**` y `/partner/**`,
porque puede haber más que las de esta lista.

Nota: en Tailwind 4, `<button>` ya no lleva `cursor: pointer` por defecto, así
que cada botón tiene que declararlo.

### 3 — Campana de Admin

`AdminNotificationsButton` (`src/components/patterns/admin-shell.tsx:201`) es
inerte a propósito (ningún artboard de la Fase 8 dibuja el panel), con un badge
"3" fijo. **Decisión:** no se usará → se quita de la topbar (`admin-shell.tsx:183`)
junto con el componente, que no tiene otros usos. Anotar en `COMPONENT-MAP.md`
la desviación respecto al patrón 21, que sí dibuja la campana.

### 4 — Cerrar sesión

- Admin: `admin-shell.tsx:172`. Partner: `partner-shell.tsx:143`. En los dos
  es un `ChevronDown` decorativo (`aria-hidden`), sin control.
- Precedente en el shell del miembro (`app-shell.tsx:156`): un `LogOut`
  envuelto en `<Link href="/login">`. **Ese enlace tampoco llama a
  `supabase.auth.signOut()`**, así que la sesión sigue viva (ver punto 5).
- `signOut()` ya se usa en `admin/login`, `partner/login` y
  `require-partner-session.tsx`.
- **Decisión:** clic directo, sin menú. Se sustituye el `ChevronDown` por el
  mismo icono que usa el shell del miembro: `LogOut` de lucide-react,
  `size={17} strokeWidth={1.6}`, `text-fg-subtle`. Anotar en `COMPONENT-MAP.md`
  la desviación respecto a los artboards (que dibujan un chevron).

### 5 — Logout del miembro

`src/components/patterns/app-shell.tsx:156` es un `<Link href="/login">` con el
icono `LogOut`: navega al login pero no llama a `supabase.auth.signOut()`, así
que la sesión sigue activa y el miembro puede volver a cualquier ruta protegida.
Se arregla con el mismo patrón que el punto 4 (lo ideal es un único botón de
logout compartido por los tres shells). Revisar también la barra inferior de
móvil del mismo shell, por si tiene su propio logout.

## Plan de trabajo

Skills: `test-driven-development` (puntos 2 y 4, que tienen comportamiento) y
`frontend-design`.

1. Hacer el inventario de todas las filas con detalle en `/admin/**` y `/partner/**`.
2. Unificar la fila clicable en una variante de capa 1/2 (`cva`) con
   `hover:bg-surface-hover` y `cursor-pointer`, y que **toda la fila**
   navegue al detalle (no solo la flecha), con `next/link` o `useRouter`. Si se
   crea un componente nuevo, anotarlo en `COMPONENT-MAP.md`.
3. Hacer que las flechas que hoy son `<span>` o decorativas pertenezcan al
   control clicable y tengan nombre accesible.
4. **Punto 3:** quitar `AdminNotificationsButton` de la topbar y borrar el componente.
5. **Punto 4:** sustituir el `ChevronDown` por un botón con el icono `LogOut` que, con un clic, llama a
   `supabase.auth.signOut()` y redirija a `/admin/login` o `/partner/login`.
   Test: tras cerrar sesión no hay sesión activa y se navega al login.
6. **Punto 5:** el logout del miembro usa el mismo botón y llama a
   `signOut()` antes de ir a `/login`. Test: tras el clic no hay sesión activa.
7. Revisión visual con Playwright en los tres shells.
8. Verificar (receta paso 8) y actualizar `docs/PENDIENTES.md` y
   `COMPONENT-MAP.md` (desviaciones).

## Criterios de aceptación

### 1. Hover en filas
- [ ] Todas las filas de las tablas de Admin y Partner cambian de fondo al pasar
      el ratón, con una transición de 150 ms ease y usando un token semántico (no
      `#hex` en la página).
- [ ] La cabecera de la tabla no tiene hover.
- [ ] Las filas seleccionadas (checkbox o acción masiva) mantienen un estado
      distinguible del hover.

### 2. Flecha y acceso al detalle
- [ ] Al pasar el ratón sobre la flecha, el cursor es `pointer`.
- [ ] Toda fila que tenga flecha lleva a su detalle; no hay flechas que se vean
      clicables y no hagan nada (p. ej. `partner/guests`).
- [ ] Toda la fila tiene cursor `pointer` y abre el detalle, salvo los controles
      que tiene dentro (checkbox, "Remove"…), que mantienen su propia acción y
      no abren el detalle.
- [ ] La fila o la flecha se pueden usar con el teclado (Tab + Enter) y tienen un
      nombre accesible ("View <nombre>").

### 3. Notificaciones de Admin
- [ ] La topbar de Admin ya no muestra la campana de notificaciones ni su badge.
- [ ] El resto de la topbar (chip "Every action logged", Refresh) sigue igual,
      sin huecos ni descuadres.

### 4. Cerrar sesión
- [ ] En Admin y Partner, la flecha junto al nombre del usuario se sustituye por
      el mismo icono `LogOut` del shell del miembro (mismo tamaño, trazo y color).
- [ ] Un solo clic en ese icono cierra sesión, sin menú intermedio. Tiene
      cursor `pointer`, hover visible y nombre accesible ("Log out").
- [ ] Al cerrar sesión se llama a `supabase.auth.signOut()`. Después, volver a
      una ruta protegida redirige al login correspondiente (`/admin/login`,
      `/partner/login`).
- [ ] Tras cerrar sesión el usuario aterriza en su pantalla de login.

### 5. Logout del miembro
- [ ] Al pulsar logout en el shell del miembro se llama a
      `supabase.auth.signOut()` y se aterriza en `/login`.
- [ ] Después de salir, volver a una ruta protegida (p. ej. `/my-pass`)
      redirige al login en vez de mostrar la página.
- [ ] El icono y la posición del logout del miembro no cambian.

### General
- [ ] Sin regresiones en las suites de `/admin/**` y `/partner/**`.
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build` en verde.
