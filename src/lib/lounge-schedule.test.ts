import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import {
  closureBookingCount,
  deleteLoungeClosure,
  deleteLoungeSeason,
  listLoungeSchedule,
  saveLoungeClosure,
  saveLoungeSeason,
} from "./lounge-schedule";

/**
 * Story 10.9 — temporadas (`lounge_seasons`) y cierres especiales
 * (`lounge_closures`) del lounge, escritos solo por el admin, y su efecto
 * en la disponibilidad real (`lounge_availability_range`).
 */

const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
let count = 0;

/** Domingo primero, como `lounges.weekly_hours`. Cierra los domingos. */
const REGULAR = ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 6 PM"];
/** Temporada que cierra lunes y martes y abre el domingo. */
const SUMMER = ["10 AM – 4 PM", "Closed", "Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 6 PM"];

async function lounge() {
  count += 1;
  const id = `test-lounge-schedule-${stamp}-${count}`;
  const { error } = await service.from("lounges").insert({
    id,
    name: `Schedule ${stamp} ${count}`,
    neighborhood: "Midtown",
    city: "New York",
    city_id: "new-york",
    lat: 0,
    lng: 0,
    hours: "Open until 9 PM",
    bands: ["morning", "afternoon", "evening"],
    closed_weekdays: [0],
    weekly_hours: REGULAR,
    content_status: "live",
  });
  if (error) throw error;
  return id;
}

async function openDays(supabase: ReturnType<typeof createClient>, loungeId: string, from: string, to: string) {
  const { data, error } = await supabase.rpc("lounge_availability_range", { p_lounge_id: loungeId, p_from: from, p_to: to });
  if (error) throw error;
  return [...new Set((data as { date: string }[]).map((row) => row.date))];
}

const admin = createClient();

/** Un miembro con su propia sesión: `createClient()` comparte la del navegador con el admin. */
function memberClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(admin, `schedule-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

describe("temporadas", () => {
  it("el admin añade una temporada con su propio horario y la lee", async () => {
    const loungeId = await lounge();
    await saveLoungeSeason(admin, loungeId, { name: "Summer hours", startsOn: "2025-09-14", endsOn: "2025-09-20", weeklyHours: SUMMER });

    const { seasons } = await listLoungeSchedule(admin, loungeId);
    expect(seasons).toEqual([
      expect.objectContaining({ name: "Summer hours", startsOn: "2025-09-14", endsOn: "2025-09-20", weeklyHours: SUMMER }),
    ]);
  });

  it("durante la temporada, su horario reemplaza al habitual en la disponibilidad", async () => {
    const loungeId = await lounge();
    // Semana del dom 14 al sáb 20 sept 2025. Habitual: cierra el domingo 14.
    expect(await openDays(admin, loungeId, "2025-09-14", "2025-09-16")).toEqual(["2025-09-15", "2025-09-16"]);

    await saveLoungeSeason(admin, loungeId, { name: "", startsOn: "2025-09-14", endsOn: "2025-09-20", weeklyHours: SUMMER });

    // Temporada: abre el domingo, cierra lunes y martes.
    expect(await openDays(admin, loungeId, "2025-09-14", "2025-09-16")).toEqual(["2025-09-14"]);
    // Fuera de la temporada vuelve el habitual: el domingo 21 cierra, el lunes 22 abre.
    expect(await openDays(admin, loungeId, "2025-09-21", "2025-09-22")).toEqual(["2025-09-22"]);
  });

  it("dos temporadas del mismo lounge no pueden solaparse", async () => {
    const loungeId = await lounge();
    await saveLoungeSeason(admin, loungeId, { name: "Summer", startsOn: "2025-06-01", endsOn: "2025-08-31", weeklyHours: SUMMER });

    await expect(
      saveLoungeSeason(admin, loungeId, { name: "Late summer", startsOn: "2025-08-15", endsOn: "2025-09-15", weeklyHours: SUMMER }),
    ).rejects.toThrow(/overlap/i);
    // Pegada a la anterior, sin solaparse, sí.
    await saveLoungeSeason(admin, loungeId, { name: "Autumn", startsOn: "2025-09-01", endsOn: "2025-11-30", weeklyHours: SUMMER });
  });

  it("la fecha de fin no puede ser anterior a la de inicio", async () => {
    const loungeId = await lounge();
    await expect(
      saveLoungeSeason(admin, loungeId, { name: "", startsOn: "2025-09-20", endsOn: "2025-09-14", weeklyHours: SUMMER }),
    ).rejects.toThrow(/end.*start|before/i);
  });

  it("el admin edita y borra una temporada", async () => {
    const loungeId = await lounge();
    const id = await saveLoungeSeason(admin, loungeId, { name: "Summer", startsOn: "2025-06-01", endsOn: "2025-08-31", weeklyHours: SUMMER });

    await saveLoungeSeason(admin, loungeId, { id, name: "Summer 2025", startsOn: "2025-06-15", endsOn: "2025-08-31", weeklyHours: SUMMER });
    expect((await listLoungeSchedule(admin, loungeId)).seasons).toEqual([
      expect.objectContaining({ id, name: "Summer 2025", startsOn: "2025-06-15" }),
    ]);
    // Editar una temporada no choca consigo misma.

    await deleteLoungeSeason(admin, id);
    expect((await listLoungeSchedule(admin, loungeId)).seasons).toEqual([]);
  });
});

describe("cierres especiales", () => {
  it("el admin añade un cierre con motivo y reapertura, y ese día no admite reservas", async () => {
    const loungeId = await lounge();
    await saveLoungeClosure(admin, loungeId, {
      startsOn: "2025-09-16",
      endsOn: "2025-09-17",
      reason: "Private event",
      reopensLabel: "Reopens Thursday, September 18",
    });

    expect((await listLoungeSchedule(admin, loungeId)).closures).toEqual([
      expect.objectContaining({ startsOn: "2025-09-16", endsOn: "2025-09-17", reason: "Private event", reopensLabel: "Reopens Thursday, September 18" }),
    ]);
    expect(await openDays(admin, loungeId, "2025-09-15", "2025-09-18")).toEqual(["2025-09-15", "2025-09-18"]);
  });

  it("un cierre exige motivo y fin no anterior al inicio", async () => {
    const loungeId = await lounge();
    await expect(
      saveLoungeClosure(admin, loungeId, { startsOn: "2025-09-16", endsOn: "2025-09-16", reason: " ", reopensLabel: "" }),
    ).rejects.toThrow(/reason/i);
    await expect(
      saveLoungeClosure(admin, loungeId, { startsOn: "2025-09-17", endsOn: "2025-09-16", reason: "Works", reopensLabel: "" }),
    ).rejects.toThrow(/end.*start|before/i);
  });

  it("el admin edita y borra un cierre", async () => {
    const loungeId = await lounge();
    const id = await saveLoungeClosure(admin, loungeId, { startsOn: "2025-09-16", endsOn: "2025-09-16", reason: "Works", reopensLabel: "" });
    await saveLoungeClosure(admin, loungeId, { id, startsOn: "2025-09-16", endsOn: "2025-09-18", reason: "Renovation", reopensLabel: "Reopens Friday" });
    expect((await listLoungeSchedule(admin, loungeId)).closures).toEqual([
      expect.objectContaining({ id, endsOn: "2025-09-18", reason: "Renovation" }),
    ]);

    await deleteLoungeClosure(admin, id);
    expect((await listLoungeSchedule(admin, loungeId)).closures).toEqual([]);
  });

  it("cuenta las reservas confirmadas que caen en el periodo antes de guardarlo", async () => {
    const loungeId = await lounge();
    const member = memberClient();
    const { id: memberId } = await signUpConfirmedMemberAndSignIn(member, `schedule-member-${stamp}@ensoleil-test.com`, "LoungeTime!24");
    const booking = { member_id: memberId, lounge_id: loungeId, band: "morning", slot_time: "8:00 AM" };
    const { error } = await service.from("bookings").insert([
      { ...booking, date: "2025-09-16", status: "confirmed" },
      { ...booking, date: "2025-09-17", status: "confirmed" },
      { ...booking, date: "2025-09-17", status: "cancelled" },
      { ...booking, date: "2025-09-19", status: "confirmed" },
    ]);
    if (error) throw error;

    expect(await closureBookingCount(admin, loungeId, "2025-09-16", "2025-09-17")).toBe(2);
  });
});

describe("quién puede escribir", () => {
  it("un miembro lee temporadas y cierres pero no puede escribirlos", async () => {
    const loungeId = await lounge();
    await saveLoungeSeason(admin, loungeId, { name: "Summer", startsOn: "2025-06-01", endsOn: "2025-08-31", weeklyHours: SUMMER });
    const member = memberClient();
    await signUpConfirmedMemberAndSignIn(member, `schedule-reader-${stamp}@ensoleil-test.com`, "LoungeTime!24");

    expect((await listLoungeSchedule(member, loungeId)).seasons).toHaveLength(1);
    await expect(
      saveLoungeSeason(member, loungeId, { name: "Mine", startsOn: "2025-12-01", endsOn: "2025-12-31", weeklyHours: SUMMER }),
    ).rejects.toThrow();
    await expect(
      saveLoungeClosure(member, loungeId, { startsOn: "2025-12-01", endsOn: "2025-12-01", reason: "Mine", reopensLabel: "" }),
    ).rejects.toThrow();
    await expect(closureBookingCount(member, loungeId, "2025-09-01", "2025-09-30")).rejects.toThrow();
  });
});

afterAll(async () => {
  await service.from("lounges").delete().like("id", `test-lounge-schedule-${stamp}-%`);
});
