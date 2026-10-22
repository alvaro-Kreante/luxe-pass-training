import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { addDays, today } from "./availability";
import type { PartnerAnalyticsSummary } from "./partner";
import {
  signUpConfirmedAdminAndSignIn,
  signUpConfirmedMemberAndSignIn,
  signUpConfirmedPartnerAndSignIn,
} from "./testing/confirmed-user";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Epic 9 × Epics 7/8 — una reserva pagada con un day pass de regalo
 * (referido o cumpleaños, `day_pass_redemptions`) no tiene pago: partner y
 * admin la ven como "complimentary" con $0, no como visita de membresía ni
 * como day pass cobrado. Las visitas de membresía llevan el plan real del
 * miembro (annual / monthly), no "Annual member" para todos.
 */

const service = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const LOUNGE = "the-ainsworth";
const DATE = addDays(today(), 45);
const staff = isolatedClient();
const adminUser = isolatedClient();

beforeAll(async () => {
  await signUpConfirmedPartnerAndSignIn(staff, `comp-staff-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026", {
    businessName: "Ainsworth Hospitality",
    loungeIds: [LOUNGE],
  });
  await signUpConfirmedAdminAndSignIn(adminUser, `comp-admin-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026");
});

/** Reserva sembrada directamente (no consume plazas reales); `complimentary` la liga a un day pass gastado. */
async function seededBooking(label: string, plan: "annual" | "monthly", complimentary: boolean) {
  const user = await signUpConfirmedMemberAndSignIn(
    isolatedClient(),
    `comp-${label}-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
    { membership: plan },
  );
  const { data: booking, error } = await service
    .from("bookings")
    .insert({ member_id: user.id, lounge_id: LOUNGE, date: DATE, band: "late", slot_time: "6:00 PM", status: "confirmed" })
    .select("id")
    .single();
  if (error) throw error;
  if (complimentary) {
    const { error: redemptionError } = await service
      .from("day_pass_redemptions")
      .insert({ member_id: user.id, booking_id: booking.id, source: "referral" });
    if (redemptionError) throw redemptionError;
  }
  return booking.id as string;
}

async function summary(): Promise<PartnerAnalyticsSummary> {
  const { data, error } = await staff.rpc("partner_analytics_summary", { p_from: DATE, p_to: DATE, p_lounge_id: LOUNGE });
  if (error) throw error;
  return (data as PartnerAnalyticsSummary[])[0]!;
}

describe("tipo de visita real en partner y admin", () => {
  it("la lista de invitados distingue complimentary, annual y monthly", async () => {
    const complimentary = await seededBooking("guest-comp", "annual", true);
    const annual = await seededBooking("guest-annual", "annual", false);
    const monthly = await seededBooking("guest-monthly", "monthly", false);

    const { data, error } = await staff.rpc("partner_guest_list", { p_lounge_id: LOUNGE, p_date: DATE });
    if (error) throw error;
    const typeOf = (id: string) =>
      (data as { id: string; visit_type: string }[]).find((row) => row.id === id)?.visit_type;

    expect(typeOf(complimentary)).toBe("complimentary");
    expect(typeOf(annual)).toBe("annual");
    expect(typeOf(monthly)).toBe("monthly");
  });

  it("Analytics cuenta la visita complimentary aparte, sin ingresos", async () => {
    const before = await summary();
    await seededBooking("analytics", "annual", true);
    const after = await summary();

    expect(after.complimentary_visits - before.complimentary_visits).toBe(1);
    expect(after.membership_visits).toBe(before.membership_visits);
    expect(after.day_pass_visits).toBe(before.day_pass_visits);
    expect(after.day_pass_revenue_cents).toBe(before.day_pass_revenue_cents);
  });

  it("el informe de volumen también la separa", async () => {
    const volume = async () => {
      const { data, error } = await staff.rpc("partner_booking_volume", {
        p_from: DATE,
        p_to: DATE,
        p_grain: "month",
        p_lounge_id: LOUNGE,
      });
      if (error) throw error;
      return (data as { complimentary_visits: number; membership_visits: number }[])[0]!;
    };
    const before = await volume();
    await seededBooking("volume", "annual", true);
    const after = await volume();

    expect(after.complimentary_visits - before.complimentary_visits).toBe(1);
    expect(after.membership_visits).toBe(before.membership_visits);
  });

  it("admin Bookings la marca como complimentary con $0", async () => {
    const id = await seededBooking("admin", "annual", true);

    const { data, error } = await adminUser.rpc("admin_bookings_on", { p_date: DATE });
    if (error) throw error;
    const row = (data as { id: string; visit_type: string; amount_paid_cents: number }[]).find((r) => r.id === id)!;

    expect(row.visit_type).toBe("complimentary");
    expect(row.amount_paid_cents).toBe(0);
  });
});
