import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import { addDays, today } from "./availability";
import { fetchAvailability, mondayOf } from "./lounge-profile";


/** Lunes de la semana que viene: fechas futuras con el día de la semana fijo. */
const BASE = mondayOf(addDays(today(), 7));

/**
 * Disponibilidad en vivo: plazas libres = `lounges.capacity` (por franja) −
 * reservas que ocupan plaza en esa franja. Sin filas sembradas por fecha —
 * un lounge recién dado de alta es reservable desde el primer momento.
 */

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const supabase = createClient();
const stamp = Date.now();
const loungeId = `test-lounge-live-${stamp}`;
// Jueves. Domingo (0) queda cerrado por `closed_weekdays`.
const openDate = addDays(BASE, 3);
const sunday = addDays(BASE, 6);

const otherMemberIds: string[] = [];

const lounge = { id: loungeId, bands: ["morning", "afternoon"] as ("morning" | "afternoon")[], closedWeekdays: [0] };

async function insertBooking(member: string, date: string, band: string, status: string) {
  const { data, error } = await admin
    .from("bookings")
    .insert({ member_id: member, lounge_id: loungeId, date, band, slot_time: "8:00 AM", status })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function createOtherMember(suffix: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `live-other-${suffix}-${stamp}@ensoleil-test.com`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (error) throw error;
  otherMemberIds.push(data.user.id);
  return data.user.id;
}

async function cell(date: string, band: string) {
  const cells = await fetchAvailability(supabase, lounge, date, date);
  return cells.find((c) => c.band === band)!;
}

beforeAll(async () => {
  const { error } = await admin.from("lounges").insert({
    id: loungeId,
    name: "Live Availability Lounge",
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open",
    bands: ["morning", "afternoon"],
    closed_weekdays: [0],
    capacity: 2,
  });
  if (error) throw error;

  await signUpConfirmedMemberAndSignIn(
    supabase,
    `live-member-${stamp}@ensoleil-test.com`,
    "EnSoleil!2026",
    { membership: "annual" },
  );

});

afterAll(async () => {
  await admin.from("lounges").delete().eq("id", loungeId);
  for (const id of otherMemberIds) await admin.auth.admin.deleteUser(id);
});

describe("disponibilidad de un lounge recién dado de alta", () => {
  it("ofrece toda su capacidad en cada franja abierta, sin filas sembradas", async () => {
    expect(await cell(openDate, "morning")).toMatchObject({ status: "available", seatsLeft: 2 });
  });

  it("cierra las franjas que el lounge no soporta y sus días de cierre semanal", async () => {
    expect((await cell(openDate, "evening")).status).toBe("closed");
    expect((await cell(sunday, "morning")).status).toBe("closed");
  });
});

describe("plazas calculadas desde las reservas reales", () => {
  it("las reservas en waitlist o canceladas no ocupan plaza", async () => {
    const other = await createOtherMember("ignored");
    await insertBooking(other, addDays(BASE, 4), "morning", "waitlisted");
    await insertBooking(other, addDays(BASE, 4), "morning", "cancelled");

    expect(await cell(addDays(BASE, 4), "morning")).toMatchObject({ status: "available", seatsLeft: 2 });
  });

  it("una franja con tantas reservas como capacidad sale llena", async () => {
    const a = await createOtherMember("full-a");
    const b = await createOtherMember("full-b");
    await insertBooking(a, addDays(BASE, 5), "afternoon", "confirmed");
    await insertBooking(b, addDays(BASE, 5), "afternoon", "confirmed");

    expect(await cell(addDays(BASE, 5), "afternoon")).toMatchObject({ status: "full", seatsLeft: 0 });
  });
});

describe("confirm_booking contra la disponibilidad en vivo", () => {
  it("confirma en un lounge nuevo y descuenta la plaza", async () => {
    const { data, error } = await supabase.rpc("confirm_booking", {
      p_lounge_id: loungeId,
      p_date: addDays(BASE, 8),
      p_band: "morning",
      p_slot_time: "8:00 AM",
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(await cell(addDays(BASE, 8), "morning")).toMatchObject({ seatsLeft: 1 });
  });

  it("no confirma en una franja llena (devuelve cero filas para ofrecer la waitlist)", async () => {
    const a = await createOtherMember("rpc-full-a");
    const b = await createOtherMember("rpc-full-b");
    await insertBooking(a, addDays(BASE, 9), "morning", "confirmed");
    await insertBooking(b, addDays(BASE, 9), "morning", "confirmed");

    const { data, error } = await supabase.rpc("confirm_booking", {
      p_lounge_id: loungeId,
      p_date: addDays(BASE, 9),
      p_band: "morning",
      p_slot_time: "8:00 AM",
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("rechaza una franja que el lounge no abre", async () => {
    const { error } = await supabase.rpc("confirm_booking", {
      p_lounge_id: loungeId,
      p_date: sunday,
      p_band: "morning",
      p_slot_time: "8:00 AM",
    });

    expect(error?.message).toMatch(/No availability window/);
  });

  it("cancelar una reserva libera su plaza", async () => {
    const { data } = await supabase.rpc("confirm_booking", {
      p_lounge_id: loungeId,
      p_date: addDays(BASE, 10),
      p_band: "afternoon",
      p_slot_time: "3:30 PM",
    });
    expect(await cell(addDays(BASE, 10), "afternoon")).toMatchObject({ seatsLeft: 1 });

    const { error } = await supabase.rpc("cancel_booking", {
      p_booking_id: data![0].id,
      p_today: addDays(BASE, -19),
    });

    expect(error).toBeNull();
    expect(await cell(addDays(BASE, 10), "afternoon")).toMatchObject({ seatsLeft: 2 });
  });
});

