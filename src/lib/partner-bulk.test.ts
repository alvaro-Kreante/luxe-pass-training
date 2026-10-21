import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getAdminPartner } from "@/lib/admin-partners";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import { planStatusChange, setLoungeHours, type BulkLounge } from "./partner-bulk";

/**
 * Story 10.11 — acciones masivas sobre los lounges de un partner. Las mismas
 * reglas que lounge por lounge; lo que no admite el cambio se salta con su
 * motivo y el resto se aplica.
 */

function lounge(overrides: Partial<BulkLounge>): BulkLounge {
  return { id: "x", name: "X", contentStatus: "draft", suspendedBy: null, checklistMissing: [], ...overrides };
}

describe("cambiar el status de varios lounges", () => {
  const tribeca = lounge({ id: "tribeca", name: "Ainsworth Tribeca" });
  const soho = lounge({ id: "soho", name: "Ainsworth SoHo", checklistMissing: ["Seats per time slot"] });
  const ainsworth = lounge({ id: "ainsworth", name: "The Ainsworth", contentStatus: "live" });
  const hudson = lounge({ id: "hudson", name: "Ainsworth Hudson Yards", contentStatus: "suspended", suspendedBy: "admin" });

  it("publicar exige partner activo y checklist completo; el resto se salta con su motivo", () => {
    const plan = planStatusChange([tribeca, soho, ainsworth, hudson], "live", "active");
    expect(plan.apply.map((item) => item.id)).toEqual(["tribeca"]);
    expect(plan.skip).toEqual([
      { lounge: soho, reason: "Won't publish: checklist incomplete · Seats per time slot" },
      { lounge: ainsworth, reason: "Already live" },
      { lounge: hudson, reason: "Suspended — reactivate it as a draft first" },
    ]);
  });

  it("con el partner sin activar no se publica ninguno", () => {
    const plan = planStatusChange([tribeca], "live", "draft");
    expect(plan.apply).toEqual([]);
    expect(plan.skip).toEqual([{ lounge: tribeca, reason: "Won't publish: the partner isn't active" }]);
  });

  it("a borrador van los live y los suspendidos (reactivar los devuelve a borrador)", () => {
    const plan = planStatusChange([tribeca, ainsworth, hudson], "draft", "active");
    expect(plan.apply.map((item) => item.id)).toEqual(["ainsworth", "hudson"]);
    expect(plan.skip).toEqual([{ lounge: tribeca, reason: "Already a draft" }]);
  });

  it("solo un lounge live se puede suspender", () => {
    const plan = planStatusChange([tribeca, ainsworth, hudson], "suspended", "active");
    expect(plan.apply.map((item) => item.id)).toEqual(["ainsworth"]);
    expect(plan.skip).toEqual([
      { lounge: tribeca, reason: "Only a live lounge can be suspended" },
      { lounge: hudson, reason: "Already suspended" },
    ]);
  });
});

const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
const admin = createClient();
let partnerId = "";

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(admin, `bulk-admin-${stamp}@ensoleil-test.example`, "SupportDesk!24");
  const { data, error } = await service.from("partners").insert({ name: `Bulk Partner ${stamp}`, status: "active" }).select("id").single();
  if (error) throw error;
  partnerId = data.id;
  const base = { neighborhood: "Tribeca", city: "New York", city_id: "new-york", lat: 0, lng: 0, hours: "Open", partner_id: partnerId };
  const { error: loungeError } = await service.from("lounges").insert([
    { ...base, id: `test-lounge-bulk-${stamp}-ready`, name: `Ready ${stamp}`, phone: "+1 212 555 0100", email: "a@ainsworth-test.example", address: "1 Main St", capacity: 20, weekly_hours: Array(7).fill("8 AM – 9 PM"), content_status: "draft" },
    { ...base, id: `test-lounge-bulk-${stamp}-bare`, name: `Bare ${stamp}`, phone: "", email: "", address: "", capacity: 0, weekly_hours: Array(7).fill("Closed"), content_status: "live" },
  ]);
  if (loungeError) throw loungeError;
});

afterAll(async () => {
  await service.from("lounges").delete().like("id", `test-lounge-bulk-${stamp}-%`);
  await service.from("partners").delete().eq("id", partnerId);
});

describe("el detalle del partner trae el checklist de cada lounge", () => {
  it("lo que le falta para publicarse, con las mismas reglas que publicar", async () => {
    const partner = await getAdminPartner(admin, partnerId);
    const byName = Object.fromEntries((partner?.lounges ?? []).map((item) => [item.name, item]));
    expect(byName[`Ready ${stamp}`].checklistMissing).toEqual([]);
    expect(byName[`Bare ${stamp}`].checklistMissing).toEqual(["Name and contact", "Address on the map", "Operating hours", "Seats per time slot"]);
  });
});

describe("el mismo horario para varios lounges", () => {
  it("sustituye la semana habitual, también de un lounge live, y deriva los días cerrados", async () => {
    const week = ["Closed", "7:00 AM – 10:00 PM", "7:00 AM – 10:00 PM", "7:00 AM – 10:00 PM", "7:00 AM – 10:00 PM", "7:00 AM – 11:00 PM", "9:00 AM – 11:00 PM"];
    await setLoungeHours(admin, `test-lounge-bulk-${stamp}-bare`, week);

    const { data } = await service.from("lounges").select("weekly_hours, closed_weekdays, hours, content_status").eq("id", `test-lounge-bulk-${stamp}-bare`).single();
    expect(data).toEqual({ weekly_hours: week, closed_weekdays: [0], hours: "Open until 10:00 PM", content_status: "live" });
  });

  it("un miembro no puede cambiar el horario", async () => {
    const member = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await signUpConfirmedMemberAndSignIn(member, `bulk-member-${stamp}@ensoleil-test.example`, "LoungeTime!24");
    await expect(setLoungeHours(member, `test-lounge-bulk-${stamp}-ready`, Array(7).fill("Closed"))).rejects.toThrow(/not authorized/i);
  });
});
