# LuxePass — Aplicación Next.js + Specs & Diseño

## Qué es este repositorio

Repositorio integral del proyecto **LuxePass** (plataforma de membresía de lujo para el cliente En Soleil, desarrollada por la agencia Kreante). Contiene:

1. **Código de la aplicación** — Next.js 15 + TypeScript + Tailwind 4
2. **Especificaciones** — Historias de usuario y flujos en `docs/specs`
3. **Diseño** — Mockups y sistema de diseño en `docs/design`

---

## ⚠️ Alcance: mockup navegable + backend real parcial (Supabase)

**Este repo empezó como un mockup navegable sin backend — eso ya no es así del todo.** Desde sept 2026, varias historias tienen lógica real conectada a Supabase: Epic 1 completo (Story 1.1 User Registration, Story 1.2 Login & Authentication), Epic 2 completo (Story 2.1 Map-Based Lounge Discovery, Story 2.2 Lounge Filtering & Search, Story 2.3 List View Alternative — catálogo real en `public.lounges`) y Epic 3 completo (Story 3.1 Lounge Profile Details, Story 3.2 Availability Calendar — ver `docs/design/COMPONENT-MAP.md` §Backend real — Epic 2 / Epic 3). Epic 4 (Booking System) está completo: Story 4.1 (Seamless Booking Flow), Story 4.2 (Payment Processing, **Stripe real** en modo test) y Story 4.3 (Calendar Integration, ya real desde el mockup) — tablas `bookings`/`payments`, RPC `confirm_booking`/`join_waitlist`, y el email real de recibo de reserva (ver más abajo "Email de recibo de reserva real") — ver `docs/design/COMPONENT-MAP.md` §Backend real — Epic 4. Epic 5 (QR Code & Check-in) está completo: Story 5.1 (Digital Pass Generation), Story 5.2 (Lounge Check-In Process, RPC "de kiosco" sin login de personal) y Story 5.3 (Booking Reminder, **pg_cron real**) — `bookings` gana `confirmation_code`/`checked_in_at`/`no_show`, `profiles` gana `emergency_contact_*` (ver más abajo "Check-in de recepción real" y "Recordatorio de reserva real") — ver `docs/design/COMPONENT-MAP.md` §Backend real — Epic 5. Epic 6 (Member Experience & Notifications) está completo: Story 6.1 (Booking Management — RPC `cancel_booking`), Story 6.2 (In-app Notifications — tabla `notifications`, **nace aquí**, con dos de los seis tipos disparados de verdad: confirmación de reserva por trigger y aviso de las 6 AM por **pg_cron**; los otros cuatro se siembran como muestra real al crear el perfil) y Story 6.3 (Member Profile & Preferences — perfil/favoritos/preferencias/privacidad reales, borrado de cuenta como soft-delete reversible con **pg_cron** para el borrado físico a los 30 días) — ver más abajo "Notificaciones en la app reales" y "Borrado de cuenta real" — ver `docs/design/COMPONENT-MAP.md` §Backend real — Epic 6. Epic 7 (Partner Dashboard) está completo: Story 7.1 (Daily Guest Management — `partner_guest_list`/`partner_checkin_booking`/`partner_report_no_show`, RPC autenticadas, más **Supabase Realtime** en `/partner` para las actualizaciones en vivo, primer uso del proyecto), Story 7.2 (Booking Notifications for Partners — dos Database Webhooks + un **pg_cron** hacia dos Edge Functions nuevas) y Story 7.3 (Partner Analytics — `partner_analytics_summary`/`partner_bookings_by_day`/`partner_repeat_guests`) — nace la tabla `user_roles` (rol member/partner/admin, decisión de arquitectura pospuesta a propósito hasta este epic) y `partners`/`partner_lounges` (ver más abajo "Rol de partner real" y "Notificaciones al partner reales") — ver `docs/design/COMPONENT-MAP.md` §Backend real — Epic 7. Epic 8 (Admin & Support) está completo: Story 8.1 (Customer Support Dashboard — `support_tickets`/`support_ticket_messages`, **nacen aquí**; reembolso real vía Stripe para un cargo succeeded, ver "Reembolso real" más abajo), Story 8.2 (Data Export & Analytics — analítica real sobre toda la red, export por dataset, y reportes programados reales vía **pg_cron** + Brevo, ver "Reportes programados reales") y Story 8.3 (Content Management — `lounges` gana `content_status`, `lounge_content_submissions` **nace aquí** para un "Content approval workflow" real y genérico, bucket de Storage real `lounge-images`, ver "Gestión de contenido real") — reutiliza `user_roles` (rol admin) nacida en Epic 7, `/admin/login` sin artboard propio (decisión confirmada con el usuario, reutiliza el layout de `/partner/login`) — ver `docs/design/COMPONENT-MAP.md` §Backend real — Epic 8. Los 9 epics del alcance original ya están conectados a Supabase real; trabajo a partir de aquí es bugfix, refactor o una historia adicional fuera de ese alcance.

La app en producción de En Soleil vive en `app.luxepass.co`; si este repo la reemplaza o sigue siendo un proyecto aparte no está resuelto en este documento — no asumir ninguna de las dos sin confirmar.

**Infraestructura real ya montada:** 2 proyectos Supabase remotos (`luxepass-dev`, `luxepass-prod`) con sus migraciones aplicadas vía CI/CD (`.github/workflows/deploy.yml`), y 2 proyectos Vercel (`luxepass-dev`/`luxepass-prod`, deploy real probado de punta a punta). Detalle completo, incluyendo qué falta (env vars de Google Maps/Stripe en Vercel y en `deploy.yml`, protección de ramas), en `docs/ci-cd/RESUMEN.md`.

**No hacer, salvo que se pida explícitamente:**

- ❌ Instalar ORM o cliente de base de datos (Prisma, Drizzle) **excepto** Supabase
- ❌ Enlazar (`supabase link`) un proyecto remoto de Supabase a mano, desde tu máquina — eso es exclusivo del pipeline de CI, ver "Supabase Local Development" §Excepción de CI
- ❌ Crear route handlers en `src/app/api/` salvo que la historia que se implementa lo requiera de verdad
- ❌ Añadir autenticación fuera de Supabase Auth (NextAuth, JWT propio, sesiones caseras)
- ❌ Server Actions o `fetch` que escriban en servicios externos (pasarelas de pago, envío de emails) para historias que **no** están conectadas a Supabase — ver regla de abajo
- ❌ Tests e2e con navegador masivos — Playwright existe para verificación visual (uso puntual, ver §Verificación)
- ❌ Persistir estado del lado del cliente (`localStorage`, `sessionStorage`, cookies propias) en historias sin backend — para las que sí tienen Supabase, la sesión la maneja Supabase Auth, no un estado casero
- ❌ Implementar un mapa nuevo con SVG propio o un proveedor de tiles distinto a Google Maps — ver regla de mapas justo abajo

**Sí hacer:**

- ✅ Para historias **sin backend conectado**: datos de muestra en módulos de `src/lib/` o constantes del propio componente; estado de UI con `useState`/Context
- ✅ Para historias **con backend conectado**: Supabase real (local en desarrollo, remoto vía CI en `staging`/`main`) — ver "Supabase Local Development"
- ✅ Para **cualquier mapa** de la app (el de `/explore`, el mini-mapa aún sin construir de `/lounges/[id]`, o cualquier otro que salga en un epic futuro): Google Maps real (`@vis.gl/react-google-maps`, con `@googlemaps/markerclusterer` si agrupa markers) — proveedor único fijado al migrar Epic 2 (sept 2026), nunca un SVG propio ni otro proveedor de tiles. Detalle en `docs/design/COMPONENT-MAP.md` §Backend real — Epic 2
- ✅ Validación **de cliente**, cuya finalidad es que la pantalla pueda mostrar sus estados (error, botón deshabilitado, campo inválido) — no sustituye RLS/validación del lado del servidor en lo que sí toca Supabase
- ✅ Navegación entre pantallas con `next/link` y `useRouter`
- ✅ Tests con Vitest + Testing Library, escritos **antes** del código — ver "Metodología de test"

**Para una historia sin backend conectado todavía**, los criterios de aceptación que exigirían uno (enviar un email, cobrar, verificar un token, comprobar duplicados contra la base) se cubren **visualmente**: se implementa la pantalla del estado y se simula el disparador con datos de muestra. La desviación se anota en la última sección de `docs/design/COMPONENT-MAP.md`.

Ejemplo ya hecho de patrón mockup (epics aún no conectados): datos de muestra en constantes de componente para simular estados de red/servidor. Ejemplo ya hecho de patrón backend real: Story 1.1/1.2 contra Supabase local/remoto (ver `src/lib/supabase/`, `src/lib/authentication.ts`, `src/lib/registration.ts`). **La regla para una historia sin backend es que la pantalla llegue a mostrar el estado, no que el estado sea real; para una historia conectada a Supabase, el estado sí es real.**

**Envío de email real (Story 1.1/1.2):** desde sept 2026, el email de confirmación/recovery ya no es un SMTP simulado — va vía Brevo, disparado por un Supabase Auth Hook (`send_email`) que invoca la Edge Function `supabase/functions/send-email`. Es la excepción viva a la regla "❌ Server Actions o fetch a servicios externos" de arriba: aplica porque Epic 1 **sí** está conectado a Supabase. Detalle completo en "Supabase Local Development" §Envío de email transaccional.

**Procesamiento de pagos real (Story 4.2):** desde el 17 sept 2026, la decisión de "Stripe fuera de alcance" que traía `docs/DATA-MODEL-MAP.md` (válida solo durante el periodo de mockup) se revierte — ahora que Epic 4 se implementa, el pago va vía **Stripe real, en modo test**, no simulado. Es la segunda excepción viva a la regla "❌ Server Actions o fetch a servicios externos" de arriba: aplica porque Epic 4 **sí** está conectado a Supabase. Misma arquitectura que Brevo — sin route handlers de Next.js, Supabase Edge Functions — y el webhook de Stripe, no el cliente, es quien decide el `status` real del pago. Apple Pay/Google Pay quedan fuera de esta conexión real (dominio no verificado, no viable en `localhost`). Detalle completo en "Supabase Local Development" §Procesamiento de pagos (Stripe).

**Email de recibo de reserva real (Story 4.2/5.1):** desde el 18 sept 2026, el recibo de reserva (`Receipt.dc.html`, alcanzable desde `/book/confirmed`) también se envía de verdad, para toda reserva `confirmed` (con o sin pago — cubre de paso "Email with booking info" de la Story 5.1). Es la tercera excepción viva a la regla "❌ Server Actions o fetch a servicios externos" de arriba. A diferencia de Brevo/Stripe (ambos disparados por un hook nativo de Supabase — Auth Hook y Stripe webhook respectivamente), este es un evento de negocio puro ("se confirmó una reserva"), sin hook nativo que lo cubra: usa un **Database Webhook** (trigger `AFTER INSERT` en `bookings`, ver `supabase/schemas/booking_receipts.sql`) sobre `pg_net`, que llama a la Edge Function `send-booking-receipt`. Detalle completo en "Supabase Local Development" §Email de recibo de reserva.

**Check-in de recepción real (Story 5.2):** desde el 21 sept 2026, `/reception` verifica y actualiza reservas de verdad contra `bookings` — decisión tomada con el usuario para no bloquear en la decisión de rol staff/partner que `docs/DATA-MODEL-MAP.md` deja explícitamente para cuando arranque Epic 7 (no antes): las cuatro funciones `reception_*` (`supabase/schemas/bookings.sql`) son RPC `SECURITY DEFINER` concedidas a `anon`, autorizadas solo por LP# + lounge + fecha, igual que un lector físico de QR en el mostrador — `/reception` sigue sin login de personal, ahora también a nivel de base de datos, no solo de UI. Detalle completo en `docs/design/COMPONENT-MAP.md` §Backend real — Epic 5 y `docs/PENDIENTES.md` §2.7.

**Recordatorio de reserva real (Story 5.3):** desde el 21 sept 2026, "receive an email 24 hrs before the booking time" ya no se simula — es la cuarta excepción viva a la regla "❌ Server Actions o fetch a servicios externos" de arriba, y la primera disparada por el **paso del tiempo**, no por un evento: **`pg_cron`** (primer job programado del proyecto) corre `dispatch_booking_reminders()` cada 30 min, que llama (`pg_net`, mismo mecanismo que el recibo de reserva) a la Edge Function `send-booking-reminder` por cada reserva `confirmed` cuya llegada cae en la ventana "ahora + 24h". Detalle completo, incluida la limitación conocida de este entorno (no se puede ejercitar de punta a punta mientras `lounge_availability` siga sembrada en una ventana fija anclada a 2025-09-09), en "Supabase Local Development" §Recordatorio de reserva (pg_cron).

**Notificaciones en la app reales (Story 6.2):** desde el 21 sept 2026, la tabla `notifications` (nace en Epic 6) es real. De los seis tipos que pide el AC, solo dos tienen un evento real detrás en este repo: "Booking confirmation" (un trigger `AFTER INSERT` en `bookings` que inserta directo en `notifications` — sin `pg_net`, es la misma base) y el aviso de las 6 AM (segundo uso de `pg_cron` en el proyecto, `dispatch_morning_notifications()` cada 15 min, mismo `booking_arrival_at` que Story 5.3 y su mismo gap: no ejercitable de punta a punta mientras `lounge_availability` siga anclada a 2025-09-09). Los otros cuatro (nuevo lounge partner, renovación de membresía, ofertas, cumpleaños) dependen de datos que Epic 7/9 todavía no modelan de verdad — se siembran como notificaciones de muestra reales (filas de verdad, no sintéticas del cliente) al crear el perfil (`seed_sample_notifications()`, trigger `AFTER INSERT` en `profiles`). Detalle completo en `docs/design/COMPONENT-MAP.md` §Backend real — Epic 6.

**Borrado de cuenta real (Story 6.3):** desde el 21 sept 2026, "Account deletion option with confirmation" conecta contra Supabase — pero no borra nada al instante: `DeleteAccount.dc.html` promete un periodo de gracia reversible ("erased after 30 days... sign in before then and everything comes back"), así que confirmar el modal solo marca `profiles.deleted_at` y cancela las reservas futuras (RPC `request_account_deletion`), fiel a esa promesa. El borrado físico real es la quinta excepción viva a la regla "❌ Server Actions o fetch a servicios externos", y la segunda disparada por el paso del tiempo: `pg_cron` corre `dispatch_account_deletions()` una vez al día y, pasados los 30 días, llama (`pg_net`, mismo mecanismo que el recibo/recordatorio) a la Edge Function `delete-account` — primer uso del proyecto de `auth.admin.deleteUser`. El login (`reactivateAccountIfDeleted`) deshace el soft-delete si el miembro vuelve a entrar antes de esos 30 días. Mismo gap conocido que Story 5.3: no ejercitable de punta a punta en 30 días reales en este entorno. Detalle completo en `docs/design/COMPONENT-MAP.md` §Backend real — Epic 6.

---

## Estado de implementación

**Diseño y código: completos.** Los 9 epics (24 historias) están implementados y
diseñados. `git log` tiene el historial por epic; `docs/specs/` lista las historias
por nombre. Trabajo a partir de aquí es bugfix, refactor o una historia adicional
fuera del alcance original — sigue "Cómo implementar una historia nueva" más abajo.

### Rutas existentes

La tabla completa ruta → artboard → story vive en `docs/design/COMPONENT-MAP.md`
(capa 3). Es la fuente única: no duplicarla aquí.

Varias pantallas reúnen varios artboards de una fase como estados de la misma
vista, alcanzados por query param cuando dependen del sistema o de una lógica
que aquí no existe (`?covered=1`, `?map=error`, `?state=today`…). El detalle de
qué estado usa qué param está en `docs/PENDIENTES.md` §2.2 (estados de
`/explore`) y en la tabla de desviaciones de `COMPONENT-MAP.md` (estados de
`/my-pass/[reference]`, de `/lounges/[id]/book`, etc.).

**Cada artboard tiene su propia frase de marca** en el panel izquierdo del patrón 1 (`Join a community of discerning travelers.`, `Your next moment of calm is waiting.`, `Tell us who you are.`…). No reutilizar la de otra pantalla: extraerla del `.dc.html` correspondiente.

---

## Cómo implementar una historia nueva

### Ramas

| Rama | Para qué |
|---|---|
| `main` | Producción. Un push aquí dispara CI/CD: migra `supabase/migrations` al Supabase remoto `luxepass-prod` (ver `.github/workflows/deploy.yml`). No se trabaja directamente sobre ella |
| `staging` | Integración de historias con backend real conectado a Supabase. Un push aquí migra `luxepass-dev`. Se promueve a `main` con un PR `staging` → `main` cuando se decide un release |
| `design/screens` | Pantallas implementadas en Next.js para historias **sin** backend conectado — mockup navegable |
| `docs/design` | Mockups `.dc.html` y canvas de los epics (`docs/design/`) |

Las ramas `design/*` son el mismo trabajo en dos formatos: el canvas estático y
las pantallas navegables, para historias que siguen el patrón de mockup. Las
historias con backend real conectado (ver §Alcance) integran contra `staging`
en vez de `design/screens`.

**Infraestructura de `staging`/`main`:** 2 proyectos Supabase remotos
(`luxepass-dev`, `luxepass-prod`) — uno por rama — con las migraciones
aplicadas automáticamente por CI, nunca a mano (ver "Supabase Local
Development" §Excepción de CI). Vercel (2 proyectos, mismo esquema dev/prod)
**ya está montado y probado de punta a punta** (deploy real vía
`deploy.yml`, confirmado 10-13 sept 2026) — lo que falta no es Vercel en sí,
sino dar de alta ahí las env vars más nuevas (Google Maps, Stripe) que
todavía no existían cuando se montó. Detalle completo y estado en
`docs/ci-cd/RESUMEN.md`.

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

**2.1. Si la historia toca Supabase, leer `docs/DATA-MODEL-MAP.md`** — dice qué epic es dueño de cada tabla candidata y qué cruces con otros epics ya se anticiparon, para no rediseñar una FK o duplicar una tabla que otro epic ya reclama.

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

Toda historia nueva y todo bugfix siguen **Test-Driven Development** vía la
skill `test-driven-development` (obligatoria, se invoca antes de tocar
código): red → green → refactor, ciclo estándar que la skill ya cubre. Lo
específico de este proyecto:

- **El test sale de los `## Acceptance Criteria` de la historia y de los
  nodos del flow — nunca del `.dc.html`.** Copy, medidas, colores y clases de
  Tailwind no se testean: eso lo cubren el artboard, `tsc` y la revisión
  visual. Documentación, configuración sin efecto en el comportamiento y
  ajustes puramente visuales tampoco llevan test.
- **Bugs**: se reproduce antes de arreglar. El test que falla confirma el
  diagnóstico; el mismo test en verde queda de guardia contra la regresión.
- Se consulta siempre por rol y etiqueta (`getByRole`, `getByLabelText`),
  nunca por clase ni estructura del DOM.
- `userEvent.setup({ delay: null })` siempre — sin esto la suite completa se
  va de 3,8 s a 19,8 s por la espera de un tick entre cada pulsación.
- **`next/navigation` es el único mock permitido** (el router de Next no
  existe fuera del runtime del App Router). Todo lo demás corre contra la
  implementación real. Rellenar una API del navegador que jsdom no trae
  (`vitest.setup.ts` define un `IntersectionObserver` inerte) no cuenta como
  mock: no sustituye código del proyecto, lo hace ejecutable.
- Punto de partida para una pantalla nueva: `src/app/login/page.test.tsx` y
  `src/app/signup/page.test.tsx` (este último incluye el patrón para un modal
  de Radix). Los `describe` agrupan por comportamiento, no por componente.

---

## Skills

| Skill | Cuándo se usa |
|---|---|
| `test-driven-development` | **Antes de cualquier historia o bugfix.** Red → green → refactor |
| `frontend-design` | Componer pantallas y componentes de UI |
| `design` | Crear o re-sembrar un canvas de mockups `.dc.html` |
| `systematic-debugging` | Algo falla y la causa no es evidente |
| `verification-before-completion` | Antes de dar una historia por terminada |
| `supabase` | **Antes de cualquier cambio de schema o comando de Supabase.** Ver "Supabase Local Development" |
| `ci-cd-and-automation` | Al tocar `.github/workflows/*.yml` o el pipeline de CI/CD |

---

## Estructura

Las 4 capas (`src/app/globals.css` → `components/ui/` → `components/patterns/` →
`app/**/page.tsx`) se explican en "Al implementar una pantalla". Dentro de
`components/` hay además una carpeta por epic para su lógica propia
(`onboarding/`, `explore/`, `lounges/`, `booking/`, `passes/`, `account/`,
`charts/`) y en `src/lib/` un módulo de datos de muestra por historia — para
qué historia cubre cada uno, `git log` sobre el archivo o su cabecera son más
fiables que una lista aquí, que se desactualiza con cada historia nueva.

Puntos no derivables del árbol:

- `logo.png` en cada carpeta de `docs/design/epic-N-slug/` y en `public/` son
  copias reducidas (54 KB); el original de 907 KB vive en `assets/brand/`, no
  se copia de ahí directamente.
- `sw.js` y `workbox-*.js` en `public/` se regeneran en cada build — no
  editarlos a mano.
- `scripts/playwright/` es para verificación visual puntual, no una suite e2e
  masiva — ver su `README.md`.
- `docs/PENDIENTES.md` es la lista viva de bloqueos, provisionales y
  decisiones abiertas; revisarla al cerrar cualquier historia (paso 9 de la
  receta).
- `docs/DATA-MODEL-MAP.md` es el mapa liviano de qué tabla de Supabase es
  dueña de cada epic y qué cruces hay entre epics — no lista columnas ni RLS,
  eso se decide historia por historia (paso 2.1 de la receta).

### Flujos (`docs/specs/flows/`)

Los diagramas de flujo viven como Mermaid en `docs/specs/flows/*.md`. Cada uno
cubre uno o más epics y trae una tabla "Story Segments" — qué nodos
corresponden a cada historia — porque varios diagramas abarcan más de un epic
(ej. `flow-complete-booking-journey.md` cubre Epic 3, 4, 5 y toca el 6).

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

## Stack tecnológico

- **Next.js 15.1** — App Router, PWA
- **TypeScript**
- **Tailwind CSS 4** — **No hay `tailwind.config.ts`**: v4 no lee configs JS. El tema vive en `@theme inline` dentro de `src/app/globals.css`
- **Radix UI** — primitivas accesibles (Dialog, Select, Popover, DropdownMenu, Form)
- **lucide-react** — iconos, con `strokeWidth={1.6}` para cumplir §1 del design system
- **class-variance-authority** — variantes de componente
- **Recharts** — gráficos (`components/charts/`: BarChart, LineChart), para Epic 7 y 8
- **@vis.gl/react-google-maps + @googlemaps/markerclusterer** — Google Maps real, proveedor único de mapa de la app desde la migración de Epic 2 (`/explore`, `components/explore/city-map.tsx`). Cualquier mapa nuevo (mini-mapa de lounge profile, u otro futuro) lo reutiliza — nunca SVG propio ni otro proveedor de tiles
- **@ducanh2912/next-pwa** — service worker
- **Brevo** — envío de email transaccional real (confirmación, recovery de Story 1.1/1.2), vía Supabase Auth Hook `send_email` + Edge Function `supabase/functions/send-email`. Desde Story 8.2 también manda adjuntos reales (`sendBrevoEmailWithAttachment`, `_shared/brevo.ts`) para el CSV de un reporte programado. Detalle en "Supabase Local Development" §Envío de email transaccional y §Reportes programados reales
- **Stripe** (`@stripe/stripe-js` + `@stripe/react-stripe-js`) — procesamiento de pagos real (Story 4.2), modo test en desarrollo. Checkout Sessions con `ui_mode: 'elements'` + Payment Element (no PaymentIntent crudo, no Checkout hospedado — el formulario vive embebido en la propia pantalla, como pide `Payment.dc.html`). Sin route handlers de Next.js: Supabase Edge Functions para crear la Checkout Session, para el webhook (única fuente de verdad del estado del pago) y, desde Story 8.1, para reembolsar un cargo real (`stripe-refund-payment`). Datos de tarjeta solo tocan Stripe.js/Elements en el cliente, nunca nuestro servidor (PCI DSS SAQ A). Detalle en "Supabase Local Development" §Procesamiento de pagos (Stripe) y §Reembolso real
- **pg_cron** — tres jobs programados reales: `dispatch_booking_reminders()` (Story 5.3, primero del proyecto, cada 30 min, recordatorio de 24h), `dispatch_morning_notifications()`/`dispatch_partner_morning_digest()`/`dispatch_account_deletions()` (Story 6.2/6.3/7.2) y `dispatch_scheduled_reports()` (Story 8.2, cada 15 min — la cadencia más corta, porque un reporte diario/semanal/mensual necesita revisar seguido si ya le toca). Todos vía Database Webhook (`pg_net`) hacia su Edge Function, disparados por tiempo, no por evento. Detalle en "Supabase Local Development" §Recordatorio de reserva (pg_cron) y §Reportes programados reales
- **Supabase Realtime** — canal `postgres_changes` sobre `bookings` (Story 7.1, `/partner`, primer uso del proyecto): sustituye la simulación de temporizadores del mockup para "real-time updates when new bookings are made". Detalle en "Supabase Local Development" §Rol de partner real
- **Vitest + Testing Library** — tests sobre jsdom, con `next/navigation` mockeado. jsdom no trae `WebSocket`; el que Node expone globalmente (`undici`) revienta al usarse desde `@supabase/realtime-js` dentro de jsdom — `vitest.setup.ts` lo sustituye por un stub inerte, mismo criterio que el relleno de `IntersectionObserver`
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

**Directorios de salida separados** (`distDir` en `next.config.ts`): `.next-build`
para producción, `.next` para dev, para que un build no invalide el dev server.
**Excepción en Vercel:** su builder de Next.js espera el resultado siempre en
`.next`, así que `next.config.ts` vuelve al default cuando detecta `VERCEL=1`
(seteada automáticamente por Vercel) — un `distDir` custom ahí rompe
`vercel build` con "The Next.js output directory '.next' was not found". La
separación de directorios solo aplica en local.

**Antes de dar por roto algo de una pantalla, comprobar que el dev server sirve
React**: `.next` puede quedarse sin `main-app.js`, y entonces la página **se ve
entera pero no responde a nada** (la pinta el servidor; ningún botón, modal ni
drawer funciona porque viven en portales que necesitan JS). Se parece a "falta
implementar esa pantalla" y no lo es.

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/_next/static/chunks/main-app.js   # 200 = sano
```

Si da 404: parar el dev server, `rm -rf .next`, arrancarlo otra vez y **recargar
duro en el navegador** (Ctrl+Shift+R). Detalle y causa en `docs/PENDIENTES.md` §4.2.

---

## Supabase Local Development

**REGLA CRÍTICA:** Todo lo que toque Supabase o la base de datos usa **el proyecto local** (Docker, vía Supabase CLI). Este proyecto **nunca se enlaza** (`supabase link`) a un proyecto remoto ni se ejecuta `supabase db push`/`supabase db pull` sin `--local` — esos comandos actúan sobre un proyecto remoto enlazado, no sobre el Docker local. Si en algún momento hace falta enlazar un proyecto remoto, **parar y pedir confirmación explícita** antes de correr `supabase link`.

### Excepción de CI

`.github/workflows/deploy.yml` es la única excepción a la regla anterior:
en un push a `staging` o `main`, GitHub Actions corre `supabase link
--project-ref <ref>` + `supabase db push` (sin `--local`) contra
`luxepass-dev`/`luxepass-prod` respectivamente, usando
`SUPABASE_ACCESS_TOKEN`/`SUPABASE_DEV_DB_PASSWORD`/`SUPABASE_PROD_DB_PASSWORD`
como GitHub Secrets — nunca credenciales sueltas en el repo. Esta excepción
es exclusiva del runner de CI: **ningún desarrollador enlaza un proyecto
remoto a mano en su máquina**, la regla crítica de arriba sigue rigiendo
para el trabajo local. `supabase db advisors --linked` corre después de
cada migración (no bloquea el deploy; revisar sus warnings igual). Detalle
completo en `docs/ci-cd/RESUMEN.md` y `docs/ci-cd/GUIA-PASO-A-PASO.md`.

### Verificar que usas el proyecto local

Antes de cualquier comando de Supabase, confirma:

```bash
supabase status              # "API URL" debe ser http://127.0.0.1:54331 (puerto de [api] en config.toml)
cat .env.local                # NEXT_PUBLIC_SUPABASE_URL debe apuntar a ese mismo 127.0.0.1:54331
```

Si `.env.local` o cualquier variable apunta a `*.supabase.co`, **parar inmediatamente** — no ejecutar nada hasta confirmar que se volvió a local.

`.env.local` está en `.gitignore` (vía `supabase/.gitignore` y el `.gitignore` raíz): nunca comitear claves, ni siquiera las de local.

### Schema management: Declarative Schemas obligatorio

Este proyecto usa **Declarative Schemas** (nunca migraciones escritas a mano, nunca SQL suelto vía `execute_sql`/`db query` para cambios de esquema). Ya configurado en `supabase/config.toml`:

```toml
[db.migrations]
schema_paths = ["./schemas/*.sql"]   # fuente de verdad — no volver a [] ni borrar sin confirmación
```

`supabase/schemas/` es la carpeta (ya creada, vacía hasta el primer schema) donde vive el estado **final y completo** deseado de cada tabla/vista/función — no el historial de cambios, eso lo generan las migraciones.

### Flujo de trabajo para cambios de schema

**1. Iniciar Supabase local (si no está corriendo):**
```bash
supabase start
```

**2. Editar el esquema deseado** en `supabase/schemas/*.sql` (un archivo por entidad es buena práctica, p. ej. `members.sql`). Editar **solo estos archivos** — cambios hechos a mano en Studio o vía SQL editor son invisibles para el diff.

Antes de nombrar una tabla o FK nueva, revisar `docs/DATA-MODEL-MAP.md`: dice qué epic es su dueño y qué otros epics ya la referencian, para no duplicarla ni romper un cruce ya anticipado.

```sql
-- supabase/schemas/members.sql
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

create policy "select own data" on public.members
  for select to authenticated
  using ( (select auth.uid()) = id );
```

**3. Generar la migración** comparando los schema files contra las migraciones existentes. ⚠️ **`supabase db diff --local -f <nombre>` ya no sirve para esto** (CLI v2.116+): ese comando dejó de leer `supabase/schemas/*.sql` y ahora solo compara migraciones contra la base (avisa de esto en un WARNING fácil de pasar por alto). El comando declarativo correcto es:

```bash
supabase db schema declarative sync --no-apply -f add_members_table
```

`--no-apply` genera el archivo sin tocar el Docker local todavía, para poder revisarlo primero (paso 4). Esto escribe un archivo nuevo en `supabase/migrations/` — nunca crear ni editar ese archivo a mano.

**4. Revisar el archivo generado** antes de aplicar nada:
- ✅ No hay `DROP`/`ALTER` destructivos inesperados
- ✅ RLS y policies están presentes para cada tabla nueva
- ✅ Tipos, defaults e índices son los que se querían

**5. Aplicar la migración al Docker local:**

```bash
supabase migration up      # aplica solo las migraciones pendientes
# o, en un solo paso (genera Y aplica, sin el review intermedio del paso 4):
# supabase db schema declarative sync --apply -f add_members_table
# o, si se necesita repartir desde cero (borra datos):
# supabase db reset
```

**6. Verificar y comitear:**
```bash
supabase db advisors        # revisar warnings de seguridad/performance
npm run dev                 # confirmar que la app sigue compilando
```
Comitear tanto el/los archivo(s) de `supabase/schemas/` como la migración generada en `supabase/migrations/` — ambos son código versionado, ninguno es descartable.

### Comandos básicos de Supabase local

| Comando | Qué hace |
|---|---|
| `supabase start` | Levanta Supabase local en Docker |
| `supabase stop` | Para los contenedores locales |
| `supabase status` | Estado y URLs/puertos (API 54331, DB 54332, Studio 54333) |
| `supabase db schema declarative sync --no-apply -f <nombre>` | Genera migración comparando `supabase/schemas/` contra migraciones existentes, sin aplicarla (`--apply` genera y aplica en un paso). **No usar `supabase db diff` para esto** — desde CLI v2.116 ya no lee `supabase/schemas/`, ver paso 3 arriba |
| `supabase migration up` | Aplica migraciones pendientes al Docker local |
| `supabase db reset` | Recrea el Docker local desde cero: migraciones + `seed.sql` (borra datos) |
| `supabase migration list --local` | Lista migraciones aplicadas localmente |
| `supabase db advisors` | Escanea el esquema en busca de issues de seguridad/performance |

**`supabase db push` y `supabase db pull` (sin `--local`) actúan sobre un proyecto remoto enlazado — no se usan en este proyecto.**

### Seguridad: Checklist antes de cada cambio de schema

Antes de comitear una migración nueva (usar la skill `supabase` — ver tabla de Skills — para el detalle completo):

- ✅ **RLS activado** en toda tabla nueva de `public`: `alter table ... enable row level security`
- ✅ **Policies con `TO authenticated`/`TO anon` + predicado** (`auth.uid() = user_id`), nunca solo `TO authenticated` sin filtro de fila (eso es autenticación sin autorización)
- ✅ **UPDATE con `USING` y `WITH CHECK`** — sin `WITH CHECK` un usuario puede reasignar el `user_id` de su propia fila
- ✅ Nunca `auth.role() = 'authenticated'` (deprecado y roto con anonymous sign-ins) — usar la cláusula `TO`
- ✅ **Sin `SECURITY DEFINER`** salvo necesidad real; si se usa, en schema no expuesta y con `auth.uid()` verificado en el cuerpo
- ✅ **Vistas con `security_invoker = true`** en Postgres 15+ (este proyecto usa Postgres 17, ver `major_version` en `config.toml`)
- ✅ `supabase db advisors` sin warnings sin resolver

### No tocar (esto lo controla Supabase CLI)

- ❌ No editar archivos en `supabase/migrations/` a mano — los genera `db diff`
- ❌ No comitear `supabase/.temp/` ni `supabase/.branches/` (ya en `supabase/.gitignore`)
- ❌ No correr `supabase link` ni cambiar `schema_paths`/puertos en `config.toml` sin confirmación explícita

### Envío de email transaccional (Auth Hook + Brevo)

Desde Story 1.1/1.2, el email de confirmación y de recovery no usa el SMTP
simulado de Supabase (Inbucket/Mailpit) — Auth llama al Hook `send_email`
(`[auth.hook.send_email]` en `config.toml`), que invoca la Edge Function
`supabase/functions/send-email`, la cual despacha el correo real vía Brevo.

- **Secrets de la function** — nunca commitear: `supabase/functions/.env`
  (gitignored vía el `.env` del `.gitignore` raíz), plantilla en
  `supabase/functions/.env.example`. Incluye `BREVO_API_KEY`,
  `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `SEND_EMAIL_HOOK_SECRET`,
  `APP_URL`, `APP_ENV`.
- **`APP_URL` no es `auth.site_url` ni `email_data.site_url`** del payload
  del hook — ese último campo resuelve al puerto del API de Supabase
  (`127.0.0.1:54331` en local), no al dev server de Next. `APP_URL` es su
  propio secret (`http://127.0.0.1:3000` en local); si `npm run dev` corre
  en otro puerto en tu máquina, ajustarlo ahí y reiniciar Supabase.
- **Regla del subject: prefijo de ambiente entre corchetes.** El asunto de
  cada correo lleva `[LOCAL]`, `[STAGING]` o `[PROD]` según el secret
  `APP_ENV` de esa function (`send-email/index.ts` lo antepone al subject de
  cada plantilla) — así se distingue de un vistazo de qué ambiente vino un
  correo de prueba. Nunca se pone a mano en Brevo ni en el template.
- **Staging/prod:** el hook se registra **a mano**, una vez por proyecto
  remoto, en su dashboard (`Authentication` → `Hooks` → `Send Email`) —
  nunca vía `supabase config push`, que sincroniza *todo* `config.toml`
  contra el proyecto remoto (no solo el hook) y arriesga pisar `site_url`,
  redirect URLs u otra config de Auth puesta a mano en el dashboard.
  Ya hecho para `luxepass-dev` y `luxepass-prod`; detalle del rollout
  (orden de pasos, secrets de GitHub, los 4 bugs reales que salieron en el
  camino) en `docs/ci-cd/RESUMEN.md` y `docs/PENDIENTES.md` → Resueltos.
  Wiring de CI (`supabase functions deploy` + `supabase secrets set`) en
  `.github/workflows/deploy.yml`.
- **Rate limit de Auth: también a mano, por proyecto remoto.** Un proyecto
  Supabase nuevo trae `Authentication → Rate Limits → Rate limit for
  sending emails` en 2/hora por defecto, y ese límite **aplica aunque el
  envío real vaya por el Hook a Brevo** — no es el mailer nativo el que lo
  dispara, es un límite general del endpoint de Auth. Sin subirlo, el
  signup funciona un par de veces y luego el resto de flujos (recovery,
  resend) fallan en silencio: nada en los logs de la function, el hook ni
  se invoca. Súbelo junto con el registro del hook, antes de dar por
  probado un ambiente nuevo.

### Procesamiento de pagos (Stripe)

Decisión de alcance (17 sept 2026, revierte la nota original de
`docs/DATA-MODEL-MAP.md` que era válida solo durante el periodo de mockup):
Story 4.2 se implementa contra **Stripe real, en modo test** durante
desarrollo — no se simula. Motivo completo en "Alcance" §Procesamiento de
pagos real (Story 4.2).

**Cuenta:** una sandbox de Stripe propia de este proyecto (no el test mode
compartido de una cuenta), creada el 17 sept 2026 con
`stripe sandbox create --from-git` — `account_id` `acct_1UGUm6IBtxcBzVZb`.
**Ya reclamada** (21 sept 2026, `stripe sandbox claim` + `stripe login
--complete-device`), asociada a una cuenta Stripe real — ya no expira. La
clave restringida no rotó al reclamarla (verificado con una llamada real a
la API): sigue siendo la misma en todos los lugares donde ya vivía. Claves
guardadas en `.env.local`
(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) y `supabase/functions/.env`
(`STRIPE_SECRET_KEY`, ya con prefijo `rk`/restringida, no `sk_`) — ninguno de
los dos archivos se comitea. **Vercel ya está montado** (staging/prod, ver
"Infraestructura real ya montada" más arriba) — lo pendiente es dar de alta
ahí `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (puede ser esta misma sandbox
reclamada, o una independiente por ambiente — decisión de producto, no
técnica) **y** ampliar `deploy.yml` para que despliegue las Edge Functions
de Stripe/recibo de reserva y sus secrets — hoy solo despliega `send-email`.
Ver `docs/PENDIENTES.md` §4.6.

Lo ya decidido, a seguir al implementar Story 4.2:

- **Checkout Sessions con `ui_mode: 'elements'` + Payment Element** — no un
  `PaymentIntent` crudo ni el Checkout hospedado/embebido de Stripe: el
  formulario de tarjeta vive dentro de la propia pantalla del design system
  (`Payment.dc.html`), con la sesión de Checkout gestionando el estado detrás.
- **Nunca pasar `payment_method_types`** a `checkout.sessions.create` — se
  omite para activar *dynamic payment methods* (Stripe decide qué métodos
  mostrar); Apple Pay/Google Pay simplemente no aparecerán sin dominio
  verificado (ver más abajo), no hace falta excluirlos a mano.
- **Sin route handlers de Next.js.** Mismo patrón que `send-email`: la
  lógica de servidor (crear la Checkout Session, verificar la firma del
  webhook) vive en Supabase Edge Functions, no en `src/app/api/`.
- **El webhook es la única fuente de verdad del `status` de `payments`.**
  El cliente nunca marca un pago como exitoso tras el submit. El handler
  escucha `checkout.session.completed` y `checkout.session.async_payment_succeeded`
  (fulfilment solo si `payment_status` no es `unpaid`) y
  `checkout.session.async_payment_failed` para el fallo — igual que Auth
  decide el resultado real del signup, no el formulario.
- **Instanciar `StripeClient`** (`new Stripe(secretKey)` vía SDK de Node en
  la Edge Function, import `npm:stripe` en Deno) y llamar sobre esa
  instancia — nunca el patrón global/deprecado (`stripe.api_key = …`).
- **Secrets de las functions** (mismo patrón que `BREVO_*`):
  `STRIPE_SECRET_KEY` (restringida, prefijo `rk`) y `STRIPE_WEBHOOK_SECRET`.
  La clave publicable (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) es la única que
  sí llega al cliente, para `@stripe/stripe-js`/`@stripe/react-stripe-js`.
- **Modo test en local y en `staging`**; cambiar a claves live en `main`
  solo con confirmación explícita — no asumirlo como parte de la historia.
- **Prueba local del webhook**: Stripe CLI (`stripe listen --forward-to`)
  apuntando a la Edge Function servida localmente (`supabase functions
  serve`), igual que Brevo se prueba contra Supabase local antes de tocar
  remoto.
- **Apple Pay / Google Pay quedan fuera de esta conexión real.** El Payment
  Element de Stripe los ofrece automáticamente, pero exigen un dominio
  verificado ante Stripe/Apple que no funciona en `localhost` ni sin el
  rollout de Vercel (ver `docs/PENDIENTES.md` §4.4, mismo tipo de gap de
  infraestructura). Los botones pueden quedar visualmente presentes pero
  inertes hasta ese rollout — anotarlo como desviación en
  `COMPONENT-MAP.md` al implementar, no como criterio simulado de la
  historia.
- **Tabla `payments`** (dueño Epic 4, ver `docs/DATA-MODEL-MAP.md`):
  columnas exactas, RLS y su relación con `bookings` se deciden con TDD al
  implementar Story 4.2 — este archivo no lista columnas (ver "Schema
  management" arriba).

### Email de recibo de reserva (Database Webhook)

Story 4.2/5.1 — desde el 18 sept 2026, el recibo de reserva (`Receipt.dc.html`)
se envía de verdad para toda reserva `confirmed`, con o sin pago. Motivo
completo en "Alcance" §Email de recibo de reserva real.

**Por qué no es un Auth Hook como `send-email`.** Los Auth Hooks de Supabase
solo cubren eventos de Auth (signup, recovery) — "se confirmó una reserva" es
un evento de negocio sobre una tabla cualquiera, sin hook nativo. El
mecanismo equivalente es un **Database Webhook**: un trigger `AFTER INSERT`
en `bookings` que, solo cuando `status = 'confirmed'`, llama de forma
asíncrona (extensión `pg_net`) a la Edge Function `send-booking-receipt` —
primer uso de este mecanismo en el proyecto, ver
`supabase/schemas/booking_receipts.sql`.

**Autenticación: secreto compartido en Supabase Vault, no un JWT.** Postgres
no tiene sesión de usuario que pasarle a la function, así que no hay
`verify_jwt` que aplicar (`[functions.send-booking-receipt]` en
`config.toml` lo desactiva, igual que `stripe-webhook`). El trigger lee la
URL de la function y un secreto compartido desde
`vault.decrypted_secrets` (nunca hardcodeados en el schema versionado — la
URL cambia por ambiente y el secreto no debe comitearse) y los manda en la
cabecera `x-webhook-secret`, que la function verifica contra su propio
secret `BOOKING_RECEIPT_WEBHOOK_SECRET`. Alta de los dos secretos, **una vez
por proyecto** (local/dev/prod), igual que el resto de secretos de este
epic — nunca vía `supabase config push`:
```sql
select vault.create_secret(
  'http://host.docker.internal:54331/functions/v1/send-booking-receipt', -- local; staging/prod: la URL pública del proyecto
  'booking_receipt_webhook_url', 'URL de la Edge Function send-booking-receipt'
);
select vault.create_secret(
  '<mismo valor que BOOKING_RECEIPT_WEBHOOK_SECRET en supabase/functions/.env>',
  'booking_receipt_webhook_secret', 'Secreto compartido del Database Webhook de bookings'
);
```
**Sin los dos secretos dados de alta, el trigger no hace nada** (guard
explícito en la función, `if v_url is null or v_secret is null then return
new`) — nunca falla el insert de la reserva por esto, y **no hace falta
desactivarlo a mano en CI** como sí exige el Auth Hook de Epic 1
(`ci.yml` nunca crea estos secretos de Vault, así que el trigger es un
no-op ahí sin tocar nada).

**Networking local: `host.docker.internal`, no `127.0.0.1`.** Postgres
corre en su propio contenedor Docker — `127.0.0.1` ahí apunta al contenedor
mismo, no al host. Verificado con `net.http_get`/`net.http_post` directo
contra el gateway (`supabase_kong_<project_id>`, puerto 54331) antes de dar
por buena la URL.

**Pago todavía `pending` al confirmar la reserva.** Con tarjeta nueva, el
`status` de `payments` pasa a `succeeded` cuando el webhook de Stripe lo
confirma — asíncrono, sin garantía de haber llegado ya cuando
`confirm_booking` inserta la reserva (el cliente llama a ambos casi
seguidos). `send-booking-receipt` reintenta unos segundos
(`findSettledPayment`, 3 intentos con 1s de espera) antes de componer el
email con el estado que tenga — por eso el trigger usa un timeout de 15s en
`net.http_post`, no los 5s por defecto (un timeout corto cortaba la llamada
a mitad de esa espera — bug real encontrado verificando con Playwright el
flujo completo, no con curl/psql sueltos).

**Brevo compartido con `send-email`.** El envío real (misma cuenta Brevo,
mismos secrets `BREVO_*`) se factorizó a `supabase/functions/_shared/brevo.ts`,
del que ahora dependen las dos functions — antes cada una llamaba a la API
de Brevo por su cuenta.

### Check-in de recepción (RPC de kiosco)

Story 5.2 — desde el 21 sept 2026, `/reception` verifica y actualiza
reservas de verdad. Motivo completo en "Alcance" §Check-in de recepción
real.

**Por qué RPC de kiosco y no un login de staff.** `docs/DATA-MODEL-MAP.md`
deja la decisión de rol (member/partner/admin) sobre `auth.users`
explícitamente para "en cuanto se empiece Epic 7, no antes" — construir un
login de personal solo para desbloquear Epic 5 habría adelantado esa
decisión fuera de tiempo. En su lugar, `reception_lookup_booking`/
`reception_checkin_booking`/`reception_report_no_show`/
`reception_today_summary` (`supabase/schemas/bookings.sql`) son funciones
`SECURITY DEFINER` concedidas a `anon` — autorizadas solo por conocer el
LP# de hoy en el lounge correcto, igual que un lector físico de QR en el
mostrador. `/reception` sigue sin sesión de miembro ni de personal, como ya
fijaba `docs/PENDIENTES.md` §2.7 antes de conectar este módulo.

**`p_date`, no `current_date`.** Todo el proyecto trabaja sobre el "hoy" de
mockup fijo (`TODAY` en `src/lib/availability.ts`, `2025-09-09`) — las
cuatro funciones reciben la fecha como parámetro explícito (que el cliente
manda como `TODAY`) en vez de asumir el reloj real de Postgres, mismo
criterio que `confirm_booking` recibe `p_date` en vez de asumirlo.

**Cuando llegue el login de staff de Epic 7**, ese es el momento de
endurecer estas RPC a exigir sesión en vez de `anon` — no antes, ver
`docs/PENDIENTES.md` §2.7.

### Recordatorio de reserva (pg_cron)

Story 5.3 — desde el 21 sept 2026, "receive an email 24 hrs before the
booking time" se envía de verdad. Motivo completo en "Alcance" §Recordatorio
de reserva real.

**Primer job programado del proyecto.** A diferencia de los Database
Webhooks de arriba (evento: un insert dispara la llamada), aquí no hay
ninguna escritura que lo dispare — el disparador es el propio paso del
tiempo. `pg_cron` (`supabase/schemas/booking_reminders.sql`) corre
`dispatch_booking_reminders()` cada 30 minutos, que a su vez llama
(`pg_net`, mismo mecanismo que `booking_receipts.sql`) a la Edge Function
`send-booking-reminder` por cada reserva `confirmed` cuya llegada
(`booking_arrival_at(date, slot_time)`) cae en la ventana "ahora + 24h" y
sin recordatorio ya mandado (`bookings.reminder_sent_at`, la guarda contra
reenvíos si el cron vuelve a correr dentro de esa misma ventana).

**Aquí `now()` sí es el reloj real, a propósito** — a diferencia de las
funciones de recepción de arriba: "24 horas antes de la reserva" es un
intervalo de verdad, no el "hoy" de mockup de la app.

**Autenticación y alta de secretos: mismo patrón que el recibo de
reserva** (Supabase Vault, no JWT — Postgres no tiene sesión de usuario;
`[functions.send-booking-reminder]` en `config.toml` desactiva
`verify_jwt`). Alta de los dos secretos, una vez por proyecto:
```sql
select vault.create_secret(
  'http://host.docker.internal:54331/functions/v1/send-booking-reminder', -- local; staging/prod: la URL pública del proyecto
  'booking_reminder_webhook_url', 'URL de la Edge Function send-booking-reminder'
);
select vault.create_secret(
  '<mismo valor que BOOKING_REMINDER_WEBHOOK_SECRET en supabase/functions/.env>',
  'booking_reminder_webhook_secret', 'Secreto compartido del cron de recordatorios hacia send-booking-reminder'
);
```
Sin los dos secretos dados de alta, `dispatch_booking_reminders()` no hace
nada (mismo guard que `notify_booking_confirmed`) — el cron corre igual,
simplemente no manda nada.

**Limitación conocida de este entorno: no se puede ejercitar de punta a
punta en local/CI.** `lounge_availability` está sembrada en una ventana
fija de 18 semanas desde `2025-09-09` (`docs/DATA-MODEL-MAP.md`), así que
ninguna reserva real posible hoy cae dentro de "ahora + 24h" del reloj
real. El mecanismo es correcto — mismo patrón ya probado que
`booking_receipts.sql` — pero queda sin poder probarse de punta a punta
hasta que ese seed se vuelva a anclar al `current_date` real (fuera de
alcance de Epic 5, ver `docs/PENDIENTES.md` §2.10).

**Brevo compartido con `send-email`/`send-booking-receipt`** — misma
factorización en `supabase/functions/_shared/brevo.ts`.

### Notificaciones en la app (trigger + pg_cron)

Story 6.2 — desde el 21 sept 2026, la tabla `notifications`
(`supabase/schemas/notifications.sql`, nace en Epic 6) es real. Motivo
completo en "Alcance" §Notificaciones en la app reales.

**"Booking confirmation" es un INSERT directo, no un Database Webhook.**
`notify_booking_confirmed_in_app()` (trigger `AFTER INSERT` en `bookings`,
igual disparador que `notify_booking_confirmed` de `booking_receipts.sql`)
inserta la notificación en la misma base — sin `pg_net`, sin Vault, sin
Edge Function: no hay servicio externo que llamar para escribir en una
tabla de la misma base de datos.

**El aviso de las 6 AM sí es `pg_cron`, segundo uso del proyecto** (después
de `dispatch_booking_reminders`, Story 5.3) — pero tampoco llama a ninguna
Edge Function: `dispatch_morning_notifications()`
(`supabase/schemas/notifications.sql`) corre cada 15 minutos e inserta
directo en `notifications` para cada reserva `confirmed` cuya fecha es hoy
(reloj real, `now() at time zone 'UTC'`) y cuya hora cae en la ventana
05:45–06:15 UTC, sin aviso ya mandado (`bookings.morning_notification_sent_at`).
Mismo gap conocido que Story 5.3: `lounge_availability` sigue sembrada en
una ventana fija desde `2025-09-09`, así que ninguna reserva real posible
hoy cae en el `current_date` real que este cron usa a propósito — no
ejercitable de punta a punta en local/CI.

**Los otros cuatro tipos se siembran al crear el perfil.** "New lounge
partner announcements", "Membership renewal reminders", "Special offers and
promotions" y "Birthday month promotion" dependen de datos que Epic 7/9
todavía no modelan de verdad (nuevos partners, renovación de membresía real)
— `seed_sample_notifications()` (trigger `AFTER INSERT` en `profiles`)
inserta las cuatro como notificaciones de muestra reales (contenido fijo,
filas de verdad) la primera vez que el miembro completa /onboarding.

### Borrado de cuenta (pg_cron)

Story 6.3 — desde el 21 sept 2026, "Account deletion option with
confirmation" conecta contra Supabase como un soft-delete reversible.
Motivo completo en "Alcance" §Borrado de cuenta real.

**Confirmar el modal no borra nada.** `request_account_deletion()`
(`supabase/schemas/account_deletion.sql`, RPC `SECURITY DEFINER`) marca
`profiles.deleted_at = now()` y cancela las reservas futuras del miembro
(mismo cálculo de fee que `cancel_booking`) — fiel a lo que
`DeleteAccountModal` ya declaraba ("upcoming bookings are cancelled...
charged the fee"). Reactivar es tan simple como `deleted_at = null`: el
login (`reactivateAccountIfDeleted`, `src/lib/profile.ts`) lo hace solo tras
un signInWithPassword exitoso, sin RPC propia — RLS "update own profile" ya
lo permite sobre la fila propia.

**El borrado físico real (30 días cumplidos) es `pg_cron`, tercer uso del
proyecto** — mismo patrón de Database Webhook por secreto compartido que
`booking_receipts.sql`/`booking_reminders.sql`, pero corriendo una vez al
día en vez de cada 15–30 min: `dispatch_account_deletions()`
(`supabase/schemas/account_deletion.sql`) busca `profiles` con
`deleted_at <= now() - interval '30 days'` y llama (`pg_net`) a la Edge
Function `delete-account`, primer uso del proyecto de
`auth.admin.deleteUser` — `on delete cascade` en `profiles`/`bookings`/
`payments`/`notifications`/`member_favorite_lounges` limpia el resto solo.
Alta de los dos secretos, una vez por proyecto:
```sql
select vault.create_secret(
  'http://host.docker.internal:54331/functions/v1/delete-account', -- local; staging/prod: la URL pública del proyecto
  'account_deletion_webhook_url', 'URL de la Edge Function delete-account'
);
select vault.create_secret(
  '<mismo valor que ACCOUNT_DELETION_WEBHOOK_SECRET en supabase/functions/.env>',
  'account_deletion_webhook_secret', 'Secreto compartido del cron de borrado de cuenta hacia delete-account'
);
```
Sin los dos secretos dados de alta, `dispatch_account_deletions()` no hace
nada (mismo guard que el resto de este patrón). La Edge Function además
re-verifica los 30 días por su cuenta (defensa en profundidad) antes de
llamar a `auth.admin.deleteUser` — no confía solo en el filtro SQL que la
invocó.

**Limitación conocida de este entorno: no se puede ejercitar de punta a
punta en 30 días reales aquí** — mismo tipo de gap que el recordatorio de
Story 5.3, esta vez por la duración de la ventana (30 días) en vez de por
el seed de disponibilidad.

### Rol de partner real (`user_roles`)

Epic 7 — decisión de arquitectura pospuesta a propósito hasta este epic
(ver `docs/DATA-MODEL-MAP.md`: "cómo se distingue el rol member/partner/
admin sobre `auth.users`... conviene decidirla en cuanto se empiece Epic
7, no antes"). Decidido con el usuario (22 sept 2026): tabla `user_roles`
(`user_id`, `role` — 'partner'/'admin'), no un custom claim en el JWT ni
esquemas separados — no toca `auth.users`, no exige registrar un segundo
Custom Access Token Hook por proyecto remoto, y el rol se puede cambiar
sin esperar a que el JWT del miembro se refresque. Sin fila = miembro
corriente; solo se registran roles elevados. Epic 8 (rol admin) reutiliza
la misma tabla cuando se conecte.

`partners`/`partner_lounges` (tabla puente many-to-many — un partner puede
gestionar varios lounges, decisión tomada con el usuario, no una FK directa
`lounges.partner_id`) completan el modelo. Dar de alta un partner es un
proceso operativo, nunca self-service (no hay historia de "partner
signup", solo `Login.dc.html`) — ver "Alta de un partner" en
`supabase/schemas/partners.sql` y `scripts/seed-partner-account.mjs` para
la cuenta de muestra de The Ainsworth en local.

### Notificaciones al partner reales (Database Webhook + pg_cron)

Story 7.2 — "Email notification for each new booking", "Cancellation
notifications with updated guest count" y "Morning digest email with
day's guest list" se envían de verdad. Mismo mecanismo que
`booking_receipts.sql`/`booking_reminders.sql` (secreto compartido en
Supabase Vault, `pg_net`, sin `verify_jwt` — quien llama es Postgres, no
un miembro autenticado): dos triggers en `bookings`
(`notify_partner_new_booking`/`notify_partner_cancellation`, Database
Webhook) y un `pg_cron` a las 6:30 AM (`dispatch_partner_morning_digest`),
todos en `supabase/schemas/partner_notifications.sql`, hacia dos Edge
Functions nuevas (`send-partner-booking-event`, que cubre los dos eventos
distinguidos por `type` en el payload, y `send-partner-digest`).

**Decisión consciente: no se usa la tabla `notifications` de Epic 6.** El
AC de Story 7.2 es "recibir un email", no una fila en el centro de
notificaciones del miembro — `docs/DATA-MODEL-MAP.md` ya anticipaba a
Epic 7 como posible referenciador de esa tabla, pero al conectarse de
verdad se decidió lo mismo que ya había decidido Story 5.3 (pg_cron
propio en vez de depender de `notifications`).

Alta de los 4 secretos de Vault, una vez por proyecto (local/dev/prod):
```sql
select vault.create_secret(
  'http://host.docker.internal:54331/functions/v1/send-partner-booking-event', -- local; staging/prod: la URL pública del proyecto
  'partner_notification_webhook_url', 'URL de send-partner-booking-event'
);
select vault.create_secret(
  '<mismo valor que PARTNER_NOTIFICATION_WEBHOOK_SECRET en supabase/functions/.env>',
  'partner_notification_webhook_secret', 'Secreto compartido hacia send-partner-booking-event'
);
select vault.create_secret(
  'http://host.docker.internal:54331/functions/v1/send-partner-digest',
  'partner_digest_webhook_url', 'URL de send-partner-digest'
);
select vault.create_secret(
  '<mismo valor que PARTNER_DIGEST_WEBHOOK_SECRET en supabase/functions/.env>',
  'partner_digest_webhook_secret', 'Secreto compartido hacia send-partner-digest'
);
```
Sin los 4 secretos dados de alta, ninguna de las tres funciones hace nada
(mismo guard que el resto de este patrón) — así se comporta `ci.yml` a
propósito (nunca los crea).

**Las tres pantallas de email (`/partner/emails/digest`, `/new-booking`,
`/cancellation`) se quedan como preview fija de la narrativa de muestra,
sin conectar.** El AC ya está cubierto por el envío real de arriba —
ninguna historia pide que esas pantallas *muestren* el envío más
reciente.

**La promoción automática de la waitlist no tiene mecanismo real en
ningún epic.** `join_waitlist` (Epic 4) aparca la reserva en
`status='waitlisted'`, pero ningún epic conectado hasta ahora la sube a
`confirmed` cuando se libera un hueco — construirlo expandiría el
alcance del Epic 4 (dueño real de `bookings`), no del 7. Documentado
como hueco real en `docs/PENDIENTES.md` §2.11, no simulado.

### Reembolso real (Stripe, Story 8.1)

Decisión de alcance (22 sept 2026, tomada con el usuario antes de
implementar — revierte la nota de `docs/DATA-MODEL-MAP.md` que daba esto
por fuera de alcance): "Refund processing interface" reembolsa de verdad
un cargo real de Stripe (`payments.status = 'succeeded'`) vía la Edge
Function `stripe-refund-payment` (`stripe.refunds.create`), llamada
directamente por el cliente admin (no por un cron) tras verificar
`has_role('admin')` contra el llamador. `payments` se actualiza de forma
optimista en la misma respuesta (Stripe confirma un reembolso en modo
test al instante) — el webhook (`stripe-webhook`, caso `charge.refunded`
ya añadido) es la defensa en profundidad, mismo principio que el resto de
Story 4.2.

**Una tarifa de no-show/cancelación tardía (Story 6.1) nunca se cobró de
verdad, así que no pasa por aquí.** "Waive and refund" en ese caso solo
limpia `bookings.cancellation_fee_cents`/`no_show`
(`admin_waive_booking_fee`, `supabase/schemas/support_tickets.sql`) — no
hay nada que reversar en Stripe para un cargo que nunca existió. El
`RefundModal` (lenguaje de "cargo"/tarjeta/reembolso a 5-10 días) solo se
muestra cuando el caso trae un pago real `succeeded` ligado a la reserva.

### Reportes programados reales (pg_cron, Story 8.2)

Decisión de alcance (22 sept 2026, misma fecha y mismo criterio que el
reembolso de arriba — revierte la nota de `docs/DATA-MODEL-MAP.md`):
"Automated daily/weekly report generation" + "Scheduled email delivery of
reports" son reales, mismo mecanismo de Database Webhook/`pg_cron` que
Story 5.3/6.2/7.2 (secreto compartido en Supabase Vault, `pg_net`, sin
`verify_jwt`). Tabla `scheduled_reports` (nace aquí,
`supabase/schemas/admin_reports.sql`) + `dispatch_scheduled_reports()`
(pg_cron cada 15 min — la cadencia más corta de los tres cron del
proyecto, porque un reporte "diario"/"semanal"/"mensual" necesita que el
propio cron revise seguido si ya le toca, a diferencia de un evento puntual
como el recordatorio de 24h) → Edge Function `send-admin-report`, que
manda el CSV como adjunto real de Brevo (`sendBrevoEmailWithAttachment`,
nueva en `_shared/brevo.ts`) — no en el cuerpo del email.

**El CSV se genera en SQL, no en el cliente.**
`admin_generate_report_csv(dataset, from, to)` reutiliza las mismas RPC
`admin_export_*` que usa "Download CSV" en `/admin/reports`, así que el
reporte programado y la descarga manual nunca pueden desincronizarse en
qué columnas trae cada dataset.

**Bug real encontrado y corregido con TDD**: `admin_generate_report_csv`
y las `admin_export_*` de las que depende exigían `has_role('admin')`
igual que el resto de RPC de este epic — pero el cron las llama desde
Postgres, sin sesión (`auth.uid()` es `null` ahí), así que
`dispatch_scheduled_reports()` fallaba con "Not authorized" en cada
corrida. El guard de esas funciones pasó a
`if auth.uid() is not null and not has_role('admin') then raise
exception`: sigue rechazando a un autenticado sin el rol, pero deja pasar
la llamada interna sin sesión — mismo criterio que ya usan las RPC "de
kiosco" de recepción (Epic 5) al no exigir sesión en absoluto.

"Email it to me" en `/admin/reports` usa el mismo `send-admin-report`,
llamado directamente por el cliente (sin pasar por el cron) con el email
del propio admin como único destinatario.

Alta de los 2 secretos de Vault, una vez por proyecto (local/dev/prod):
```sql
select vault.create_secret(
  'http://host.docker.internal:54331/functions/v1/send-admin-report', -- local; staging/prod: la URL pública del proyecto
  'admin_report_webhook_url', 'URL de send-admin-report'
);
select vault.create_secret(
  '<mismo valor que ADMIN_REPORT_WEBHOOK_SECRET en supabase/functions/.env>',
  'admin_report_webhook_secret', 'Secreto compartido hacia send-admin-report'
);
```
Sin los 2 secretos dados de alta, `dispatch_scheduled_reports()` no hace
nada (mismo guard que el resto de este patrón).

**Verificado de punta a punta**: `select
public.dispatch_scheduled_reports();` disparado a mano contra un reporte
de prueba, con `200` confirmado en `net._http_response` tras el envío
real por Brevo — a diferencia del recordatorio de reserva (Story 5.3) o
el aviso de las 6 AM (Story 6.2), este cron **sí** se pudo ejercitar de
punta a punta en local: la ventana de datos que reporta (`v_to` fijo en
`TODAY`, no el reloj real) no depende de que `lounge_availability` tenga
reservas en el "hoy" real, solo de que existan reservas en el "hoy" de
mockup — que sí las hay.

### Gestión de contenido real (Story 8.3)

`lounges` gana `content_status` (`live`/`draft`/`archived`) — la policy
`select lounges` (Epic 2) se actualizó para que un miembro solo vea
`content_status = 'live'`; un admin (`has_role('admin')`) sigue viendo
todo. Este estado es **ortogonal** a si el lounge tiene un cambio de
contenido pendiente de aprobar: un lounge `live` con una edición en
revisión sigue mostrando su contenido publicado a los miembros hasta que
se apruebe — "pending-approval" en la UI del admin (`LoungeStatusChip`)
sale de si existe una fila pendiente en `lounge_content_submissions`
(nace aquí, `supabase/schemas/admin_content.sql`), no de
`lounges.content_status`.

**"Content approval workflow" es real y genérico, no solo para The
Vestry como dibujaba el mock.** Un cambio (`admin_submit_lounge_content_
change`, cualquier combinación de amenities/horario/capacidad/
restricciones/fotos/publicación en un jsonb `proposed`) nunca toca
`lounges` directamente — solo se aplica al aprobarse
(`admin_approve_lounge_submission`) o se descarta sin aplicar al
rechazarse (`admin_reject_lounge_submission`). `lib/admin-content.ts`
expone `diffLoungeChanges`, un diff genérico campo por campo que
reemplaza al `VESTRY_PENDING_CHANGES` literal del mock.

**"Upload and manage lounge images" es real vía un bucket de Storage
nuevo, `lounge-images` (público a diferencia de `profile-photos`, que es
privado por usuario — una foto de lounge la ve cualquiera en `/explore`).**
Solo un admin puede escribir en él (policy `admin manages lounge images
bucket`, `has_role('admin')`); cualquiera puede leer. "Image optimization
and resizing" que el artboard anuncia **no** es real — no hay librería de
procesamiento de imágenes en el stack ni precedente de transformación de
imágenes en este proyecto.

**De la barra de acción masiva de `/admin/lounges`, solo "Archive" es
real** (`admin_archive_lounges`, directo, sin pasar por revisión — no es
contenido nuevo que aprobar, es su retiro). "Update hours", "Add an
amenity" y "Set closure dates" siguen inertes, mismo criterio que "New
case" en Story 8.1: ningún artboard dibuja su modal de edición masiva.

**"Add lounge" sigue sin llevar a ningún sitio propio.** Ningún artboard
de la Fase 8 dibuja el alta de un lounge nuevo — se paró antes de
inventarlo, ver `docs/PENDIENTES.md` §2.10.
