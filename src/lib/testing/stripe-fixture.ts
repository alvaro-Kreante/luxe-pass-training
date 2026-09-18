/**
 * Story 4.2 — helpers de test contra la sandbox real de Stripe (modo test).
 * `pm_card_visa` es un token de prueba documentado por Stripe pensado
 * justo para esto: adjuntarlo a un Customer real sin pasar por
 * `<PaymentElement>` (que no se puede montar en jsdom) — no es un mock,
 * es una tarjeta de prueba real de la API de Stripe.
 */
export async function attachTestCard(customerId: string): Promise<string> {
  const res = await fetch("https://api.stripe.com/v1/payment_methods/pm_card_visa/attach", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ customer: customerId }),
  });
  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (!data.id) throw new Error(data.error?.message ?? "Failed to attach test card");
  return data.id;
}

export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string,
): Promise<void> {
  const res = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "invoice_settings[default_payment_method]": paymentMethodId,
    }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: { message: string } };
    throw new Error(data.error?.message ?? "Failed to set default payment method");
  }
}
