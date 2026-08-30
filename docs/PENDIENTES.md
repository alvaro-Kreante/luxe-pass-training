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

### 2.1 La ruta `/` es un índice de pantallas

`src/app/page.tsx` es una lista navegable de las pantallas implementadas, hecha
para poder recorrerlas sin escribir URLs. **No sale de ningún artboard.**

**Se sustituye:** con el Epic 2, por el Home del área de miembro dentro del App
shell (patrón 3), cuyo artboard es `docs/design/epic-1-onboarding/Home.dc.html`.

### 2.2 Enlace "I have verified my email"

En `/verify-email` hay un enlace que avanza al alta manualmente. Sin backend, el
enlace del correo de verificación no puede devolver al usuario a la app, y sin él
el flujo quedaría cortado.

**Se sustituye:** por la ruta `/verify-email/[token]` cuando exista la API de
verificación.

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

Los enlaces de las tiendas de `/welcome` apuntan a `#`: no existen todavía las
fichas de App Store ni Google Play.

---

## 4. Decisiones abiertas

*(ninguna por ahora)*

---

## Resueltos

| Qué | Cuándo | Cómo |
|---|---|---|
| `tailwind.config.ts` no se leía: ninguna utilidad del tema existía | 30 ago 2026 | Tema migrado a `@theme inline` en `globals.css`; config muerto eliminado |
| `next build` corrompía el dev server en marcha (500 / 404 falsos) | 30 ago 2026 | `distDir` separado: `.next-build` para producción, `.next` para dev |
| `public/sw.js` y `workbox-*.js` reaparecían modificados tras cada build | 30 ago 2026 | Fuera del índice e ignorados; se regeneran solos |
| 10 archivos de scaffolding sin usar en `public/`, incluido un `public/public/` duplicado | 30 ago 2026 | Eliminados |
| Las 5 pantallas de la Story 1.1 repetían la frase de marca de `Main` | 30 ago 2026 | Cada pantalla usa la de su propio artboard |
