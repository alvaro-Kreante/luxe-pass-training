import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { addDays } from "./availability";

/**
 * Story 5.1 — "Booking expires automatically after booking window". El cron
 * `expire-finished-bookings` llama a `expire_finished_bookings()`: al acabar
 * la ventana (llegada + 4 h, en el huso del lounge) la visita con check-in
 * pasa a completed y la que no lo tuvo, a completed + no-show (sin fee).
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
// Los dos extremos de husos: a la misma fecha y hora, en Kiritimati (UTC+14)
// la ventana ya acabó y en UTC−12 aún no ha empezado.
const ahead = `test-lounge-expiry-ahead-${stamp}`;
const behind = `test-lounge-expiry-behind-${stamp}`;
const utcToday = new Date().toISOString().slice(0, 10);
let memberId = "";

beforeAll(async () => {
  const lounge = (id: string, timezone: string) => ({
    id,
    name: `Expiry ${id}`,
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    content_status: "live",
    timezone,
  });
  const { error } = await admin.from("lounges").insert([lounge(ahead, "Pacific/Kiritimati"), lounge(behind, "Etc/GMT+12")]);
  if (error) throw error;

  const { data, error: userError } = await admin.auth.admin.createUser({
    email: `expiry-${stamp}@ensoleil-test.example`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (userError) throw userError;
  memberId = data.user.id;
});

async function booking(loungeId: string, date: string, status: string, checkedIn: boolean) {
  const { data, error } = await admin
    .from("bookings")
    .insert({
      member_id: memberId,
      lounge_id: loungeId,
      date,
      band: "morning",
      slot_time: "8:00 AM",
      status,
      checked_in_at: checkedIn ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function read(id: string) {
  const { data } = await admin
    .from("bookings")
    .select("status, no_show, cancellation_fee_cents")
    .eq("id", id)
    .single();
  return data!;
}

async function expire() {
  const { error } = await admin.rpc("expire_finished_bookings");
  if (error) throw error;
}

describe("cierre automático al acabar la ventana", () => {
  it("una visita con check-in pasa a completed", async () => {
    const id = await booking(ahead, addDays(utcToday, -2), "in_progress", true);

    await expire();

    expect(await read(id)).toMatchObject({ status: "completed", no_show: false });
  });

  it("una reserva sin check-in pasa a completed + no-show, sin fee", async () => {
    const id = await booking(ahead, addDays(utcToday, -2), "confirmed", false);

    await expire();

    expect(await read(id)).toMatchObject({ status: "completed", no_show: true, cancellation_fee_cents: null });
  });

  it("sin fee no se abre un caso de soporte", async () => {
    const id = await booking(ahead, addDays(utcToday, -3), "confirmed", false);

    await expire();

    const { data } = await admin.from("support_tickets").select("id").eq("booking_id", id);
    expect(data).toEqual([]);
  });

  it("usa el huso del lounge: a la misma fecha y hora solo cierra donde ya acabó", async () => {
    const done = await booking(ahead, utcToday, "confirmed", false);
    const notYet = await booking(behind, utcToday, "confirmed", false);

    await expire();

    expect((await read(done)).status).toBe("completed");
    expect((await read(notYet)).status).toBe("confirmed");
  });

  it("no toca reservas futuras ni canceladas", async () => {
    const future = await booking(behind, addDays(utcToday, 3), "confirmed", false);
    const cancelled = await booking(ahead, addDays(utcToday, -4), "cancelled", false);

    await expire();

    expect((await read(future)).status).toBe("confirmed");
    expect(await read(cancelled)).toMatchObject({ status: "cancelled", no_show: false });
  });

  it("un miembro no puede dispararlo", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

    const { error } = await anon.rpc("expire_finished_bookings");

    expect(error).not.toBeNull();
  });
});
