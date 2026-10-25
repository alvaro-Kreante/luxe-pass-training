import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { today } from "./availability";
import { bookingReferenceFromId, confirmBooking } from "./booking";
import { signUpConfirmedMemberAndSignIn, signUpConfirmedPartnerAndSignIn } from "./testing/confirmed-user";
import { OPEN_EVERY_DAY_LOUNGE } from "./testing/lounge-fixture";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 6.3 — "Privacy settings for data usage". PRIV-01
 * (docs/audit/privacidad-y-datos-personales.md): con "Share your details
 * with the lounge" apagado el miembro "checks in by number only" — el
 * lounge ve el código de reserva, nunca su nombre, email, teléfono ni
 * contacto de emergencia.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const LOUNGE = OPEN_EVERY_DAY_LOUNGE;
const staff = isolatedClient();

beforeAll(async () => {
  await signUpConfirmedPartnerAndSignIn(staff, `privacy-staff-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026", {
    businessName: "Verandah Hospitality",
    loungeIds: [LOUNGE],
  });
});

async function bookedMember(label: string, shareWithLounge: boolean) {
  const supabase = isolatedClient();
  const email = `privacy-${label}-${Date.now()}@ensoleil-test.example`;
  const user = await signUpConfirmedMemberAndSignIn(supabase, email, "EnSoleil!2026", { membership: "annual" });
  await admin
    .from("profiles")
    .update({
      full_name: "Priya Testwood",
      phone: "+1 555 0100",
      emergency_contact_name: "Ravi Testwood",
      emergency_contact_relation: "Brother",
      emergency_contact_phone: "+1 555 0101",
      privacy_share_with_lounge: shareWithLounge,
    })
    .eq("id", user.id);
  const booking = await confirmBooking(supabase, {
    loungeId: LOUNGE,
    dateIso: today(),
    band: "morning",
    time: "8:00 AM",
    specialRequests: "",
  });
  return { email, booking: booking! };
}

describe("PRIV-01 — 'Share your details with the lounge' apagado", () => {
  it("la lista de invitados del partner solo muestra el código", async () => {
    const { booking } = await bookedMember("guestlist", false);

    const { data } = await staff.rpc("partner_guest_list", { p_lounge_id: LOUNGE, p_date: today() });
    const guest = (data as Record<string, unknown>[]).find((row) => row.id === booking.id)!;

    expect(guest.confirmation_code).toBeTruthy();
    expect(guest.member_name).toBe("Private guest");
    expect(guest.member_email).toBeNull();
    expect(guest.member_phone).toBeNull();
    expect(guest.emergency_contact).toBeNull();
  });

  it("recepción encuentra la reserva por código sin ver quién es", async () => {
    const { booking } = await bookedMember("reception", false);

    const { data } = await staff.rpc("reception_lookup_booking", {
      p_lounge_id: LOUNGE,
      p_date: today(),
      p_confirmation_code: bookingReferenceFromId(booking.id),
    });
    const found = (data as Record<string, unknown>[])[0]!;

    expect(found.id).toBe(booking.id);
    expect(found.member_name).toBe("Private guest");
    expect(found.member_email).toBeNull();
    expect(found.emergency_contact_name).toBeNull();
    expect(found.emergency_contact_phone).toBeNull();
  });

  it("los huéspedes repetidos no revelan su email", async () => {
    const { email } = await bookedMember("repeat", false);

    const { data } = await staff.rpc("partner_repeat_guests", { p_lounge_id: LOUNGE });
    const emails = (data as { member_email: string | null }[]).map((row) => row.member_email);

    expect(emails).not.toContain(email);
  });

  it("con el toggle encendido el lounge sí ve los datos", async () => {
    const { booking, email } = await bookedMember("shared", true);

    const { data } = await staff.rpc("partner_guest_list", { p_lounge_id: LOUNGE, p_date: today() });
    const guest = (data as Record<string, unknown>[]).find((row) => row.id === booking.id)!;

    expect(guest.member_name).toBe("Priya Testwood");
    expect(guest.member_email).toBe(email);
  });

  it("el resumen diario del partner no lleva su nombre", async () => {
    await bookedMember("digest", false);

    const { data } = await admin.rpc("partner_digest_batches", { p_date: today() });
    const names = (data as { lounges: { lounge_id: string; guests: { name: string }[] }[] }[])
      .flatMap((batch) => batch.lounges)
      .filter((lounge) => lounge.lounge_id === LOUNGE)
      .flatMap((lounge) => lounge.guests.map((guest) => guest.name));

    expect(names).toContain("Private guest");
  });
});
