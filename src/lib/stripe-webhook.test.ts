import { createHmac } from "node:crypto";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createMembershipCheckoutSession, fetchMembership } from "./membership";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 4.2 / QA-01 — `stripe-webhook` es la única fuente de verdad de
 * `payments.status`. Se prueba la function servida de verdad, con eventos
 * firmados como los firma Stripe (`t=<ts>,v1=HMAC-SHA256(secret, "<ts>.<body>")`)
 * con el mismo `STRIPE_WEBHOOK_SECRET` que lee la function.
 */

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-webhook`;
const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function sign(body: string, secret = process.env.STRIPE_WEBHOOK_SECRET!) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function checkoutEvent(type: string, sessionId: string, eventId = `evt_test_${Date.now()}_${Math.random()}`) {
  return JSON.stringify({
    id: eventId,
    object: "event",
    type,
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        payment_status: type === "checkout.session.completed" ? "paid" : "unpaid",
        payment_intent: type === "checkout.session.completed" ? `pi_test_${Date.now()}` : null,
      },
    },
  });
}

function deliver(body: string, signature: string | null = sign(body)) {
  return fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json", ...(signature ? { "stripe-signature": signature } : {}) },
    body,
  });
}

/** Un miembro con una Checkout Session real de membresía, aún sin pagar. */
async function memberWithPendingMembership(prefix: string) {
  const member = isolatedClient();
  await signUpConfirmedMemberAndSignIn(member, `${prefix}-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026");
  const session = await createMembershipCheckoutSession(member, { plan: "annual", saveCard: false });
  const { data } = await admin
    .from("payments")
    .select("stripe_checkout_session_id")
    .eq("id", session.paymentId)
    .single();
  return { member, paymentId: session.paymentId, sessionId: data!.stripe_checkout_session_id as string };
}

async function paymentStatus(paymentId: string) {
  const { data } = await admin.from("payments").select("status").eq("id", paymentId).single();
  return data?.status;
}

describe("firma", () => {
  it("rechaza un evento sin firma y no toca el pago", async () => {
    const { paymentId, sessionId } = await memberWithPendingMembership("webhook-unsigned");

    const res = await deliver(checkoutEvent("checkout.session.completed", sessionId), null);

    expect(res.status).toBe(400);
    expect(await paymentStatus(paymentId)).toBe("pending");
  });

  it("rechaza un evento firmado con otro secreto y no toca el pago", async () => {
    const { paymentId, sessionId } = await memberWithPendingMembership("webhook-forged");
    const body = checkoutEvent("checkout.session.completed", sessionId);

    const res = await deliver(body, sign(body, "whsec_forged"));

    expect(res.status).toBe(401);
    expect(await paymentStatus(paymentId)).toBe("pending");
  });
});

describe("liquidación", () => {
  it("una sesión pagada marca el pago succeeded y activa la membresía", async () => {
    const { member, paymentId, sessionId } = await memberWithPendingMembership("webhook-paid");

    const res = await deliver(checkoutEvent("checkout.session.completed", sessionId));

    expect(res.status).toBe(200);
    expect(await paymentStatus(paymentId)).toBe("succeeded");
    const membership = await fetchMembership(member);
    expect(membership.status).toBe("active");
    expect(membership.plan).toBe("annual");
  });

  it("una sesión caducada sin pagar marca el pago failed y no activa nada", async () => {
    const { member, paymentId, sessionId } = await memberWithPendingMembership("webhook-expired");

    const res = await deliver(checkoutEvent("checkout.session.expired", sessionId));

    expect(res.status).toBe(200);
    expect(await paymentStatus(paymentId)).toBe("failed");
    expect((await fetchMembership(member)).status).toBe("inactive");
  });
});

describe("idempotencia", () => {
  it("la reentrega del mismo evento no extiende la membresía ni cambia el pago", async () => {
    const { member, paymentId, sessionId } = await memberWithPendingMembership("webhook-redelivery");
    const body = checkoutEvent("checkout.session.completed", sessionId);
    await deliver(body);
    const first = await fetchMembership(member);

    const res = await deliver(body);

    expect(res.status).toBe(200);
    expect(await paymentStatus(paymentId)).toBe("succeeded");
    const second = await fetchMembership(member);
    expect(second.currentPeriodEnd).toBe(first.currentPeriodEnd);
  });

  it("un fallo que llega después del cobro no deshace el pago", async () => {
    const { paymentId, sessionId } = await memberWithPendingMembership("webhook-late-failure");
    await deliver(checkoutEvent("checkout.session.completed", sessionId));

    const res = await deliver(checkoutEvent("checkout.session.async_payment_failed", sessionId));

    expect(res.status).toBe(200);
    expect(await paymentStatus(paymentId)).toBe("succeeded");
  });
});
