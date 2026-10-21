import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { renderPartnerBookingEvent, renderPartnerDigest } from "../../supabase/functions/_shared/partner-emails";

/**
 * Story 10.7 — las notificaciones del partner llegan a todos sus usuarios
 * activos y dicen de qué partner y de qué lounge hablan. Los destinatarios
 * los decide la base (`partner_notifications.sql`); el contenido, las
 * plantillas de `supabase/functions/_shared/partner-emails.ts`.
 */

const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const DIGEST_DATE = "2031-03-14";
const partnerIds: string[] = [];
const loungeIds: string[] = [];
const userIds: string[] = [];
let halcyon: string;
let towerA: string;
let towerB: string;

async function account(email: string) {
  const { data, error } = await service.auth.admin.createUser({ email, password: "Halcyon2026!", email_confirm: true });
  if (error) throw error;
  userIds.push(data.user.id);
  return data.user.id;
}

async function member(partnerId: string, first: string, options: { account?: boolean; suspended?: boolean } = {}) {
  const email = `${first.toLowerCase()}-${stamp}@halcyon-test.example`;
  await service.from("partner_members").insert({ partner_id: partnerId, first_name: first, last_name: "Duarte", email });
  if (options.account !== false) {
    const userId = await account(email);
    await service
      .from("partner_members")
      .update({ user_id: userId, suspended_at: options.suspended ? new Date().toISOString() : null })
      .eq("email", email);
  }
  return email;
}

async function lounge(partnerId: string, label: string) {
  const id = `test-lounge-notify-${label}-${stamp}`;
  await service.from("lounges").insert({ id, name: `Tower ${label}`, neighborhood: "Midtown", city: "New York", city_id: "new-york", lat: 0, lng: 0, hours: "Open", partner_id: partnerId });
  loungeIds.push(id);
  return id;
}

async function guestBooking(loungeId: string, name: string, slot: string) {
  const userId = await account(`${name.toLowerCase().replace(/\s+/g, "-")}-${stamp}@ensoleil-test.example`);
  await service.from("profiles").insert({ id: userId, full_name: name, phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
  const { error } = await service.from("bookings").insert({ member_id: userId, lounge_id: loungeId, date: DIGEST_DATE, band: "morning", slot_time: slot, status: "confirmed", special_requests: "" });
  if (error) throw error;
}

let camille: string;
let julian: string;
let ines: string;
let pending: string;

beforeAll(async () => {
  const { data } = await service.from("partners").insert({ name: `Halcyon Hotels ${stamp}`, status: "active" }).select("id").single();
  halcyon = data!.id;
  partnerIds.push(halcyon);
  towerA = await lounge(halcyon, "A");
  towerB = await lounge(halcyon, "B");
  camille = await member(halcyon, "Camille");
  julian = await member(halcyon, "Julian");
  ines = await member(halcyon, "Ines", { suspended: true });
  pending = await member(halcyon, "Noor", { account: false });
  await guestBooking(towerA, "Alpha Guest", "10:30 AM");
  await guestBooking(towerB, "Beta Guest", "3:30 PM");
  await guestBooking(towerB, "Gamma Guest", "8:00 AM");
});

afterAll(async () => {
  await service.from("lounges").delete().in("id", loungeIds);
  await service.from("partners").delete().in("id", partnerIds);
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("a quién le llegan", () => {
  it("a todos los usuarios con cuenta del partner del lounge, menos los suspendidos", async () => {
    const { data, error } = await service.rpc("partner_notification_recipients", { p_lounge_id: towerA });
    if (error) throw error;

    const emails = (data as { email: string }[]).map((row) => row.email).sort();
    expect(emails).toEqual([camille, julian].sort());
    expect(emails).not.toContain(ines);
    expect(emails).not.toContain(pending);
  });

  it("con el partner suspendido no le llegan a nadie", async () => {
    const { data: other } = await service.from("partners").insert({ name: `Suspended ${stamp}`, status: "active" }).select("id").single();
    partnerIds.push(other!.id);
    const loungeId = await lounge(other!.id, "S");
    await member(other!.id, "Rafael");
    await service.from("partners").update({ status: "suspended" }).eq("id", other!.id);

    const { data } = await service.rpc("partner_notification_recipients", { p_lounge_id: loungeId });

    expect(data).toEqual([]);
  });

  it("llevan el nombre del partner y el del lounge", async () => {
    const { data } = await service.rpc("partner_notification_recipients", { p_lounge_id: towerA });

    expect(data[0]).toMatchObject({ partner_name: `Halcyon Hotels ${stamp}`, lounge_name: "Tower A" });
  });
});

describe("el resumen de la mañana", () => {
  it("es uno por usuario, con todos los lounges del partner agrupados", async () => {
    const { data, error } = await service.rpc("partner_digest_batches", { p_date: DIGEST_DATE });
    if (error) throw error;

    const forCamille = (data as { email: string; partner_name: string; lounges: { lounge_name: string; guest_count: number; guests: { name: string }[] }[] }[]).filter(
      (row) => row.email === camille,
    );
    expect(forCamille).toHaveLength(1);
    expect(forCamille[0].lounges.map((l) => [l.lounge_name, l.guest_count])).toEqual([
      ["Tower A", 1],
      ["Tower B", 2],
    ]);
    expect(forCamille[0].lounges[1].guests.map((g) => g.name)).toEqual(["Gamma Guest", "Beta Guest"]);
  });
});

describe("las plantillas", () => {
  it("una reserva nueva dice el partner, el lounge y el invitado", () => {
    const email = renderPartnerBookingEvent({
      type: "new_booking",
      partnerName: "Halcyon Hotels",
      loungeName: "Tower A",
      guestName: "Alpha Guest",
      dateIso: "2025-09-09",
      time: "10:30 AM",
      reference: "LP-840107",
    });

    expect(email.subject).toBe("New booking · 10:30 AM · Tower A");
    expect(email.html).toContain("Halcyon Hotels");
    expect(email.html).toContain("Tower A");
    expect(email.html).toContain("Alpha Guest");
    expect(email.html).toContain("LP-840107");
  });

  it("una cancelación trae el nuevo recuento del día", () => {
    const email = renderPartnerBookingEvent({
      type: "cancellation",
      partnerName: "Halcyon Hotels",
      loungeName: "Tower A",
      guestName: "Alpha Guest",
      dateIso: "2025-09-09",
      time: "10:30 AM",
      reference: "LP-840107",
      updatedGuestCount: 13,
    });

    expect(email.subject).toBe("Cancellation · 10:30 AM · Tower A");
    expect(email.html).toContain("is now 13");
  });

  it("el resumen de un partner con un lounge habla de ese lounge", () => {
    const email = renderPartnerDigest({
      partnerName: "The Ainsworth Collection",
      dateIso: "2025-09-09",
      lounges: [{ loungeName: "The Ainsworth", guestCount: 1, guests: [{ name: "Alpha Guest", slotTime: "10:30 AM" }] }],
    });

    expect(email.subject).toBe("Today at The Ainsworth · 1 guest expected");
    expect(email.html).toContain("The Ainsworth Collection");
  });

  it("el resumen de varios lounges los separa, con el total en el asunto", () => {
    const email = renderPartnerDigest({
      partnerName: "Halcyon Hotels",
      dateIso: "2025-09-09",
      lounges: [
        { loungeName: "Tower A", guestCount: 1, guests: [{ name: "Alpha Guest", slotTime: "10:30 AM" }] },
        { loungeName: "Tower B", guestCount: 0, guests: [] },
      ],
    });

    expect(email.subject).toBe("Today at Halcyon Hotels · 1 guest across 2 lounges");
    expect(email.html.indexOf("Tower A")).toBeLessThan(email.html.indexOf("Tower B"));
    expect(email.html).toContain("No guests expected today.");
  });

  it("escapa lo que viene de los datos", () => {
    const email = renderPartnerBookingEvent({
      type: "new_booking",
      partnerName: "Halcyon <Hotels>",
      loungeName: "Tower A",
      guestName: "<script>",
      dateIso: "2025-09-09",
      time: "10:30 AM",
      reference: "LP-1",
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});
