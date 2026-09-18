import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Story 4.2 — un único `loadStripe()` para toda la app (recomendación de
 * Stripe: evita recargar Stripe.js en cada montaje de `<CheckoutElementsProvider>`).
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
