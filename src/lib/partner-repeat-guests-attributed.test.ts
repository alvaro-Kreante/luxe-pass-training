import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { today } from "./availability";
import { confirmBooking } from "./booking";
import { signUpConfirmedMemberAndSignIn, signUpConfirmedPartnerAndSignIn } from "./testing/confirmed-user";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 7.3 — "Repeat guest identification". La columna "Attributed" de
 * `/partner/guests` es lo que el miembro pagó de verdad (pagos
 * `succeeded`), no una tarifa fija por visita.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const LOUNGE = "the-ainsworth";
const staff = isolatedClient();

beforeAll(async () => {
  await signUpConfirmedPartnerAndSignIn(staff, `attributed-staff-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026", {
    businessName: "Ainsworth Hospitality",
    loungeIds: [LOUNGE],
  });
});

async function bookedMember(label: string, payment?: { amountCents: number; status: "succeeded" | "pending" | "refunded" }) {
  const supabase = isolatedClient();
  const email = `attributed-${label}-${Date.now()}@ensoleil-test.example`;
  const user = await signUpConfirmedMemberAndSignIn(supabase, email, "EnSoleil!2026", { membership: "annual" });
  const booking = await confirmBooking(supabase, {
    loungeId: LOUNGE,
    dateIso: today(),
    band: "morning",
    time: "8:00 AM",
    specialRequests: "",
  });
  if (payment) {
    const { error } = await admin.from("payments").insert({
      member_id: user.id,
      booking_id: booking!.id,
      amount_cents: payment.amountCents,
      status: payment.status,
    });
    if (error) throw error;
  }
  return email;
}

async function attributedFor(email: string) {
  const { data } = await staff.rpc("partner_repeat_guests", { p_lounge_id: LOUNGE });
  const row = (data as { member_email: string; attributed: number }[]).find((r) => r.member_email === email)!;
  return Number(row.attributed);
}

describe("partner_repeat_guests — attributed es el importe cobrado", () => {
  it("un day pass pagado suma lo que se cobró", async () => {
    const email = await bookedMember("paid", { amountCents: 8166, status: "succeeded" });

    expect(await attributedFor(email)).toBe(81.66);
  });

  it("una visita de membresía sin cobro suma 0", async () => {
    const email = await bookedMember("membership");

    expect(await attributedFor(email)).toBe(0);
  });

  it("un pago aún pendiente no cuenta como cobrado", async () => {
    const email = await bookedMember("pending", { amountCents: 8166, status: "pending" });

    expect(await attributedFor(email)).toBe(0);
  });
});

describe("partner_analytics_summary — ingresos cobrados", () => {
  it("suma el importe real de los day passes del periodo", async () => {
    const range = { p_from: today(), p_to: today(), p_lounge_id: LOUNGE };
    const before = await staff.rpc("partner_analytics_summary", range);
    const cents = (before.data as { day_pass_revenue_cents: number }[])[0].day_pass_revenue_cents;

    await bookedMember("analytics", { amountCents: 8166, status: "succeeded" });

    const { data } = await staff.rpc("partner_analytics_summary", range);
    expect((data as { day_pass_revenue_cents: number }[])[0].day_pass_revenue_cents).toBe(cents + 8166);
  });
});
