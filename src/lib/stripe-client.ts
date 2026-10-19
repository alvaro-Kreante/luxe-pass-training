import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";

/**
 * Story 4.2 — un único `loadStripe()` para toda la app (recomendación de
 * Stripe: evita recargar Stripe.js en cada montaje de `<CheckoutElementsProvider>`).
 *
 * PERF-11 — desde `/pure`: la entrada por defecto de `@stripe/stripe-js`
 * inyecta Stripe.js nada más importarse, así que `/book` paso 1 y `/profile`
 * lo descargaban sin llegar a cobrar. Así solo se carga al llamar a `getStripe()`.
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
