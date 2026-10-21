import { createClient as createAdminClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { grantTestMembership } from "./testing/membership-fixture";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * PAY-02 (docs/audit/pagos-y-logica-de-negocio.md): si el cobro de la
 * renovación no llega a resolverse (error de red, de Stripe, de Vault…), la
 * membresía no puede quedarse `active` para siempre. Pasado el periodo de
 * gracia, el cron la vence aunque tenga la auto-renovación puesta.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const DAY = 24 * 60 * 60 * 1000;

async function stuckMembership(label: string, daysOverdue: number) {
  const user = await signUpConfirmedMemberAndSignIn(
    isolatedClient(),
    `renewal-stuck-${label}-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  const periodEnd = new Date(Date.now() - daysOverdue * DAY);
  await grantTestMembership(user.id, "monthly", { periodStart: new Date(periodEnd.getTime() - 30 * DAY), periodEnd });
  await admin.from("memberships").update({ renewal_attempted_at: periodEnd.toISOString() }).eq("member_id", user.id);
  return user.id;
}

async function statusOf(memberId: string) {
  const { data } = await admin.from("memberships").select("status").eq("member_id", memberId).single();
  return data!.status as string;
}

describe("cron de renovación con un cobro que nunca se resolvió", () => {
  it("vence la membresía pasado el periodo de gracia", async () => {
    const memberId = await stuckMembership("expired", 5);

    await admin.rpc("dispatch_membership_renewals");

    expect(await statusOf(memberId)).toBe("expired");
  });

  it("la deja activa dentro del periodo de gracia", async () => {
    const memberId = await stuckMembership("grace", 1);

    await admin.rpc("dispatch_membership_renewals");

    expect(await statusOf(memberId)).toBe("active");
  });
});
