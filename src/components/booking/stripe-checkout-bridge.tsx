"use client";

import * as React from "react";
import { CheckoutElementsProvider, PaymentElement } from "@stripe/react-stripe-js/checkout";

import { useBooking } from "./booking-context";
import { getStripe } from "@/lib/stripe-client";

/**
 * Story 4.2 — vive en `BookLayout`, por encima de los tres pasos, para que
 * `useCheckoutElements()` siga funcionando al navegar de `/book/payment`
 * (paso 2, donde el miembro entra la tarjeta) a `/book/summary` (paso 3,
 * donde se confirma y cobra de verdad).
 *
 * Que el `<CheckoutElementsProvider>` sobreviva a la navegación no basta:
 * `<PaymentElement>` renderiza un `<iframe>`, y **mover un iframe de padre
 * en el DOM lo recarga** (lo pierde todo lo escrito), incluso si React no
 * lo desmonta lógicamente — verificado con Playwright real intentando un
 * `createPortal` hacia el contenedor de `payment-method-form.tsx`: el
 * número de tarjeta llegaba vacío a `checkout.confirm()` en el paso 3
 * aunque se hubiera rellenado en el paso 2. jsdom nunca lo habría
 * detectado, igual que el bug del callout del mapa de Epic 2.
 *
 * Arreglo: el `<PaymentElement>` **nunca cambia de padre**. Vive siempre
 * aquí, en un contenedor `position: fixed` que se sincroniza (tamaño y
 * posición) con el hueco vacío que `payment-method-form.tsx` reserva en el
 * paso 2 — mismo patrón que un reproductor que sigue sonando entre rutas de
 * una SPA. Fuera del paso 2 (o sin tarjeta nueva elegida), el contenedor
 * simplemente se oculta con CSS, sin tocar el DOM del iframe.
 *
 * La sincronización es de ida y vuelta, no solo posición. El hueco de
 * `payment-method-form.tsx` empieza en `min-h-[360px]`, pero el
 * `<PaymentElement>` real crece cuando se abre la pestaña "Card" (número,
 * caducidad, CVC, país, ZIP) — más alto que esos 360px. Si el contenedor
 * fijo se clampara a la altura *del hueco* (como hacía antes), el iframe se
 * desbordaba de esa caja y, al ser `position: fixed`, flotaba por encima de
 * todo lo de abajo (tapaba el checkbox "Save this card") en vez de empujarlo
 * — el bug reportado al probar el flujo real. Ahora es al revés: el
 * contenedor fijo no fuerza altura (crece con su contenido, como el iframe
 * de Stripe ya hace solo) y un segundo `ResizeObserver`, sobre ese
 * contenido real, publica esa altura en `BookingProvider`
 * (`paymentElementHeight`); `payment-method-form.tsx` la aplica como
 * `min-height` de su hueco — así el layout normal reserva el espacio real y
 * el checkbox se corre hacia abajo en vez de quedar tapado.
 */
const PLACEHOLDER_MIN_HEIGHT_PX = 360;

export function StripeCheckoutBridge({ children }: { children: React.ReactNode }) {
  const { checkoutSession, paymentElementHost, setPaymentElementHeight } = useBooking();
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!paymentElementHost) return;

    // El primer resize-observation entry llega en una microtarea, ya
    // después del layout: no hace falta (ni se debe) llamar setRect aquí
    // de forma síncrona.
    const sync = () => setRect(paymentElementHost.getBoundingClientRect());

    const observer = new ResizeObserver(sync);
    observer.observe(paymentElementHost);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [paymentElementHost]);

  React.useEffect(() => {
    const content = contentRef.current;
    if (!content || !checkoutSession) return;

    const observer = new ResizeObserver(() => {
      setPaymentElementHeight(Math.max(content.offsetHeight, PLACEHOLDER_MIN_HEIGHT_PX));
    });
    observer.observe(content);

    return () => {
      observer.disconnect();
      setPaymentElementHeight(null);
    };
  }, [checkoutSession, setPaymentElementHeight]);

  if (!checkoutSession) return <>{children}</>;

  const visible = paymentElementHost !== null && rect !== null;

  return (
    <CheckoutElementsProvider
      stripe={getStripe()}
      options={{ clientSecret: checkoutSession.clientSecret }}
    >
      {children}
      <div
        ref={contentRef}
        aria-hidden={!visible}
        style={
          visible && rect
            ? {
                position: "fixed",
                top: rect.top,
                left: rect.left,
                width: rect.width,
                zIndex: 1,
              }
            : {
                position: "fixed",
                top: 0,
                left: "-9999px",
                width: "1px",
                height: "1px",
                overflow: "hidden",
              }
        }
      >
        <PaymentElement />
      </div>
    </CheckoutElementsProvider>
  );
}
