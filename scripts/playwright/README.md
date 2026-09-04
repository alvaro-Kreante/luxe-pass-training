# Playwright — Verificación Visual

Playwright está disponible para **verificación visual puntual** de pantallas. No es una suite e2e masiva — se usa solo cuando necesitamos ver cómo se renderiza algo en un navegador real.

## Estructura

```
scripts/playwright/
  scripts/          Scripts de verificación visual
    auth/           Pantallas de autenticación (login, signup, etc)
    explore/        Mapa y búsqueda
    lounges/        Detalle de lounge
    booking/        Flujo de reserva
  screenshots/      Capturas generadas (gitignored)
    auth/
    explore/
    lounges/
    booking/
  utils/            Código compartido
    browser.js      Funciones helper (launchBrowser, navigateTo, takeScreenshot)
    template.js     Plantilla para nuevos scripts
```

## Cómo usarlo

### 1. Arrancar el dev server
```bash
npm run dev
```
Debe estar corriendo en `http://localhost:3000`.

### 2. Crear un script de verificación

Copiar `utils/template.js` a `scripts/<feature>/<nombre>.js`:

```bash
cp scripts/playwright/utils/template.js scripts/playwright/scripts/auth/login-verification.js
```

Editar y reemplazar:
- `route` → la URL que quieres probar (`/login`, `/explore`, etc)
- Agregar interacciones si es necesario (clicks, rellenar formularios)
- Cambiar `<feature>` y `<nombre>` en la ruta del screenshot

### 3. Ejecutar
```bash
node scripts/playwright/scripts/auth/login-verification.js
```

El screenshot se guarda en `screenshots/auth/<timestamp>-login-verification.png`.

### 4. Revisar
La ruta del archivo está en el output del script. Ábrela en el navegador o editor de imágenes.

## Funciones disponibles (browser.js)

```javascript
const { launchBrowser, navigateTo, takeScreenshot, waitForServer } = require('../utils/browser');

await waitForServer();  // Espera a que localhost:3000 esté listo
const browser = await launchBrowser();
const page = await browser.newPage();
await navigateTo(page, '/ruta');  // Navega a localhost:3000/ruta
await takeScreenshot(page, '/ruta/al/archivo.png');
await browser.close();
```

## Cuándo usar

✅ **Úsalo cuando:**
- Acabas de implementar una pantalla y quieres verificar que se ve bien
- Hay un visual bug que no es evidente del código
- Necesitas confirmar que los estilos coinciden con el diseño
- Un cambio en CSS puede haber roto algo en responsive

❌ **No lo uses para:**
- Cada cambio minúsculo (eso es overkill)
- Reemplazar tests (Vitest + Testing Library siguen siendo lo principal)
- Validar HTML o accesibilidad (eso es para `tsc` y herramientas de a11y)

## Gitignore

Los screenshots **no se versionan**. Ya están en `.gitignore` bajo `scripts/playwright/screenshots/`.

## Notas

- Los scripts usan `headless: true` — no abren ventana del navegador
- El `timeout` por defecto es 10s para navegar, ajustable en `browser.js`
- Las screenshots son PNG completo (`fullPage: true`)
