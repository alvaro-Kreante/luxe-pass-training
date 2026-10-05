# 001 — Formulario de tarjeta nueva en blanco en el paso de pago

- **Estado:** Abierto
- **Tipo:** fix
- **Rama sugerida:** `fix/booking-new-card-payment-element` (desde `staging`)
- **Historia relacionada:** Story 4.2 (`docs/specs/epic-4-booking-system/`), artboard `Payment.dc.html`
- **Creado:** 2026-10-05

## Síntoma

En `/lounges/[id]/book/payment`, al elegir **"Use a new card"**:

1. **Miembro sin tarjetas guardadas:** el hueco del formulario se despliega,
   pero el `<PaymentElement>` de Stripe no llega a pintarse y se queda en blanco.
2. **Miembro con una tarjeta guardada que quiere añadir otra:** el hueco ni
   siquiera se expande.

## Piezas involucradas

| Archivo | Rol |
|---|---|
| `src/components/booking/payment-method-form.tsx` | Reserva el hueco (`setPaymentElementHost`, `min-h-[360px]`) y llama a `createCheckoutSession` |
| `src/components/booking/stripe-checkout-bridge.tsx` | Monta el `<PaymentElement>` real en un `div` `position: fixed` y lo sitúa sobre el hueco |
| `src/components/booking/booking-context.tsx` | Estado compartido: `checkoutSession`, `paymentElementHost`, `paymentElementHeight` |
| `src/app/lounges/[id]/book/summary/page.tsx` | Usa `useCheckoutElements()` para confirmar el pago |
| `supabase/functions/stripe-create-checkout-session/index.ts` | Crea la Checkout Session y una fila `payments` en `pending` |

## Causas probables (sin confirmar)

1. **El bridge remonta toda la página de pago cuando llega la sesión**
   (`stripe-checkout-bridge.tsx:88-97`). Sin sesión devuelve
   `<>{children}</>`; con sesión, `<CheckoutElementsProvider>{children}…`. Como
   cambia el padre, React desmonta y remonta `/book/payment`, y eso trae tres
   efectos:
   - `PayableBody` vuelve a montarse con `paymentMethodId === "new-card"` y
     crea **una segunda Checkout Session**, con su segunda fila `payments`
     en `pending`.
   - El `clientSecret` del provider cambia, pero no es una prop mutable: el
     `PaymentElement` se queda con la sesión vieja o sin inicializar.
   - `summary` confirma con el `paymentId` de la segunda sesión, mientras que
     Stripe opera sobre la primera.
2. **El iframe arranca en un contenedor de 1px fuera de pantalla**
   (`left: -9999px; width: 1px`) mientras no hay `rect`. Ese ancho puede
   quedarse fijado en su layout.
3. **Nadie captura el error de `createCheckoutSession`**
   (`payment-method-form.tsx:203`): si la Edge Function falla, la pantalla se
   queda en "Loading…" o vacía, sin avisar.
4. **Caso con tarjeta guardada:** el código no lo explica solo. Hay tres
   candidatos:
   - el remontaje de la causa 1 junto con la preselección del método por defecto;
   - el `div` fijo del bridge (`zIndex: 1`) con un `rect` obsoleto, porque
     no se pone a `null` cuando el host desaparece, que intercepta los clics;
   - un error de render.

   Hay que confirmarlo reproduciendo.

## Plan de trabajo

Skills: `systematic-debugging` y luego `test-driven-development`.

1. **Reproducir con Playwright** (`scripts/playwright/`), con una cuenta sin
   tarjetas y otra con una guardada.
   - Capturar la consola: avisos de Stripe como "Unsupported prop change" u
     `options.clientSecret`.
   - Capturar las llamadas a `stripe-create-checkout-session` por clic.
   - Contar las filas `payments` en `pending` que deja cada intento.
   - En el caso con tarjeta guardada, comprobar si el clic llega a la fila.
   - Antes de nada, confirmar que el dev server sirve `main-app.js` (CLAUDE.md).
2. **Test rojo en Vitest** a partir de los criterios de aceptación de este
   ticket (no del artboard).
3. **Bridge con padre estable:** `children` tiene siempre el mismo padre,
   aparezca o no la sesión. Mantener `useCheckoutElements()` disponible en
   `summary`.
4. **Sesión idempotente:** una sola Checkout Session por borrador. Para el
   cambio de `saveNewCard`, remontar el provider con `key={clientSecret}` o
   decidir `setup_future_usage` sin recrear la sesión.
5. **Montaje del iframe:** no montar el `PaymentElement` hasta tener un
   `rect` real, y poner `rect` a `null` cuando el host desaparece.
6. **Errores visibles:** `.catch` en `createCheckoutSession` con un estado de
   error, reutilizando `Notice` y anotando la desviación en `COMPONENT-MAP.md`
   si no hay artboard.
7. **Verificar** (receta paso 8 del CLAUDE.md) y probar en Playwright los dos
   casos de punta a punta.
8. **Cerrar:** actualizar `docs/PENDIENTES.md` si queda algo abierto, PR contra
   `staging` y marcar este ticket como `Hecho`.

## Criterios de aceptación

- [ ] Un miembro **sin tarjetas guardadas** que elige "Use a new card" ve el
      formulario de Stripe completo (número, caducidad, CVC, país/ZIP), con
      sus campos editables.
- [ ] Un miembro **con tarjetas guardadas** que elige "Use a new card" ve
      cómo se expande el hueco y aparece el mismo formulario de Stripe completo.
- [ ] Al volver de "Use a new card" a una tarjeta guardada, el formulario se
      oculta y no tapa ni bloquea ningún elemento de la pantalla. Al volver a
      elegir "Use a new card", aparece otra vez.
- [ ] Elegir "Use a new card" crea **una sola** Checkout Session y **una
      sola** fila `payments` en `pending` por intento: sin duplicados por
      remontaje ni por StrictMode.
- [ ] Marcar o desmarcar "Save this card for future bookings" no deja el
      formulario en blanco ni con una sesión distinta de la que se confirma.
- [ ] El formulario empuja hacia abajo el checkbox "Save this card" y el
      aviso de Stripe; no los tapa.
- [ ] Si la creación de la sesión falla, el miembro ve un mensaje de error en
      lugar de un "Loading…" infinito o un hueco vacío.
- [ ] Los datos de tarjeta escritos en el paso 2 llegan intactos al paso 3:
      pagar con `4242 4242 4242 4242` desde `/book/summary` termina en
      `/book/confirmed`, y el webhook deja **esa** fila `payments` en
      `succeeded`.
- [ ] La consola del navegador no muestra avisos de Stripe por cambio de
      `clientSecret` ni errores de montaje del Payment Element.
- [ ] El pago con tarjeta guardada y la visita cubierta por la membresía
      siguen funcionando igual (sin regresión).
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build` en
      verde, con un test que reproduce el fallo y queda de guardia.
