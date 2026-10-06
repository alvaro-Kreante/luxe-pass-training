import { createClient as createAdminClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { today, addDays } from "./availability";
import { confirmBooking, fetchBookingCoverage, type BookingRequest } from "./booking";
import { fetchVisitsThisMonth } from "./membership";
import { createClient } from "./supabase/client";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { grantTestMembership, insertSucceededTestPayment } from "./testing/membership-fixture";

/**
 * Epic 9 × Epic 4 — quién paga una reserva. Decidido con el usuario (23 sept
 * 2026): sin plan se paga el day pass; con plan activo, primero se gasta un
 * day pass de regalo (Terms §4: "used before those included visits"), luego
 * una de las 8 visitas incluidas del mes, y si no queda nada se paga el day
 * pass. `confirm_booking` es quien lo hace cumplir — antes aceptaba
 * cualquier reserva sin pago.
 */

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function freshMember(label: string, options: { birthMonth?: number } = {}) {
  const supabase = createClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `coverage-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  if (options.birthMonth) {
    await admin().from("profiles").update({ birth_day: 14, birth_month: options.birthMonth }).eq("id", user.id);
  }
  return { supabase, user };
}

/** Una reserva ya hecha este mes, sembrada directamente (no consume plazas reales). */
async function seedVisits(memberId: string, dates: string[]) {
  const { error } = await admin()
    .from("bookings")
    .insert(
      dates.map((date) => ({
        member_id: memberId,
        lounge_id: "the-ainsworth",
        date,
        band: "late",
        slot_time: "6:00 PM",
        status: "completed",
      })),
    );
  if (error) throw error;
}

/** Un amigo acreditado de este miembro — le da un day pass de referido real. */
async function seedCreditedReferral(referrerId: string) {
  const service = admin();
  const { data, error } = await service.auth.admin.createUser({
    email: `coverage-friend-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@ensoleil-test.com`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (error) throw error;
  await service.from("profiles").insert({
    id: data.user.id,
    full_name: "Friend Member",
    phone: "+15555550102",
    city: "Miami",
    industry: "Testing",
    terms_accepted_at: new Date().toISOString(),
  });
  const { error: referralError } = await service.from("referrals").insert({
    referrer_id: referrerId,
    referee_id: data.user.id,
    code: "TM-SOLEIL-00",
    referee_name: "Friend Member",
    referee_email: data.user.email,
  });
  if (referralError) throw referralError;
  await insertSucceededTestPayment(data.user.id);
}

/** Fechas con plazas reales (disponibilidad en vivo) en la franja de noche de Belmont Terrace. */
async function datesWithSeats(count: number): Promise<string[]> {
  const { data, error } = await admin().rpc("lounge_availability_range", {
    p_lounge_id: "belmont-terrace",
    p_from: addDays(today(), 20),
    p_to: addDays(today(), 80),
  });
  if (error) throw error;
  return (data as { date: string; band: string; seats_left: number }[])
    .filter((row) => row.band === "late" && row.seats_left > 2)
    .slice(0, count)
    .map((row) => row.date);
}

/** Las visitas cuentan por mes natural: "este mes" y "el que viene", con el reloj real. */
const THIS_MONTH = today().slice(0, 7);
const NEXT_MONTH = addDays(`${THIS_MONTH}-28`, 7).slice(0, 7);
const dayOfThisMonth = (day: number) => `${THIS_MONTH}-${String(day).padStart(2, "0")}`;
const eightVisitsThisMonth = Array.from({ length: 8 }, (_, index) => dayOfThisMonth(index + 1));

const bookingOn = (dateIso: string): BookingRequest => ({
  loungeId: "belmont-terrace",
  dateIso,
  band: "late",
  time: "6:00 PM",
  specialRequests: "",
});

describe("fetchBookingCoverage", () => {
  it("sin plan, la visita se paga como day pass", async () => {
    const { supabase } = await freshMember("none");

    const coverage = await fetchBookingCoverage(supabase, today());
    expect(coverage.kind).toBe("none");
  });

  it("con plan activo y visitas libres, la cubre la membresía", async () => {
    const { supabase, user } = await freshMember("membership");
    await grantTestMembership(user.id, "annual");
    await seedVisits(user.id, [dayOfThisMonth(1)]);

    const coverage = await fetchBookingCoverage(supabase, today());
    expect(coverage.kind).toBe("membership");
    expect(coverage.plan).toBe("annual");
    expect(coverage.visitsUsed).toBe(1);
    expect(coverage.visitsIncluded).toBe(8);
  });

  it("con las 8 visitas del mes ya usadas, vuelve a pagarse", async () => {
    const { supabase, user } = await freshMember("exhausted");
    await grantTestMembership(user.id, "monthly");
    await seedVisits(
      user.id,
      eightVisitsThisMonth,
    );

    expect((await fetchBookingCoverage(supabase, today())).kind).toBe("none");
  });

  it("las visitas cuentan por el mes de la reserva, no por el de hoy", async () => {
    const { supabase, user } = await freshMember("next-month");
    await grantTestMembership(user.id, "monthly");
    await seedVisits(
      user.id,
      eightVisitsThisMonth,
    );

    expect((await fetchBookingCoverage(supabase, `${NEXT_MONTH}-15`)).kind).toBe("membership");
  });

  it("un day pass de referido se usa antes que las visitas incluidas", async () => {
    const { supabase, user } = await freshMember("referral-credit");
    await grantTestMembership(user.id, "annual");
    await seedCreditedReferral(user.id);

    const coverage = await fetchBookingCoverage(supabase, today());
    expect(coverage.kind).toBe("day_pass_credit");
    expect(coverage.creditSource).toBe("referral");
  });

  it("el day pass de cumpleaños solo vale en el mes del cumpleaños", async () => {
    const { supabase, user } = await freshMember("birthday", {
      birthMonth: Number(THIS_MONTH.slice(5)),
    });
    await grantTestMembership(user.id, "annual");

    expect((await fetchBookingCoverage(supabase, dayOfThisMonth(20))).creditSource).toBe("birthday");
    expect((await fetchBookingCoverage(supabase, `${NEXT_MONTH}-20`)).kind).toBe("membership");
  });

  it("sin plan activo, los day passes de regalo no se pueden usar (Terms §4)", async () => {
    const { supabase, user } = await freshMember("credit-no-plan");
    await seedCreditedReferral(user.id);

    expect((await fetchBookingCoverage(supabase, today())).kind).toBe("none");
  });
});

describe("confirm_booking hace cumplir quién paga", () => {
  it("sin plan y sin pago, rechaza la reserva", async () => {
    const { supabase } = await freshMember("reject");

    const [date] = await datesWithSeats(1);
    await expect(confirmBooking(supabase, bookingOn(date!))).rejects.toThrow(/payment/i);
  });

  it("con plan y visitas libres, confirma sin pago y la visita cuenta en el mes", async () => {
    const { supabase, user } = await freshMember("covered");
    await grantTestMembership(user.id, "annual");

    const [date] = await datesWithSeats(1);
    const booking = await confirmBooking(supabase, bookingOn(date!));
    expect(booking?.status).toBe("confirmed");
    expect((await fetchVisitsThisMonth(supabase, date!)).used).toBe(1);
  });

  it("con las visitas agotadas, rechaza la reserva sin pago", async () => {
    const { supabase, user } = await freshMember("exhausted-reject");
    await grantTestMembership(user.id, "monthly");
    const [date] = await datesWithSeats(1);
    /** Las 8 visitas, en el mes de la reserva. */
    await seedVisits(
      user.id,
      Array.from({ length: 8 }, (_, index) => `${date!.slice(0, 7)}-0${index + 1}`),
    );

    await expect(confirmBooking(supabase, bookingOn(date!))).rejects.toThrow(/payment/i);
  });

  it("con un day pass de referido, lo gasta y no toca las visitas incluidas", async () => {
    const { supabase, user } = await freshMember("spend-credit");
    await grantTestMembership(user.id, "annual");
    await seedCreditedReferral(user.id);

    const [date] = await datesWithSeats(1);
    const booking = await confirmBooking(supabase, bookingOn(date!));
    expect(booking?.status).toBe("confirmed");
    expect((await fetchVisitsThisMonth(supabase, date!)).used).toBe(0);
    expect((await fetchBookingCoverage(supabase, date!)).kind).toBe("membership");
  });

  it("no acepta un pago de otro miembro", async () => {
    const { user: other } = await freshMember("other-payer");
    const otherPayment = await insertSucceededTestPayment(other.id);
    const { supabase } = await freshMember("thief");

    const [date] = await datesWithSeats(1);
    await expect(confirmBooking(supabase, bookingOn(date!), otherPayment)).rejects.toThrow(/payment/i);
  });

  it("no acepta un pago que ya pagó otra reserva", async () => {
    const { supabase, user } = await freshMember("reuse");
    const payment = await insertSucceededTestPayment(user.id);

    const [first, second] = await datesWithSeats(2);
    expect((await confirmBooking(supabase, bookingOn(first!), payment))?.status).toBe("confirmed");
    await expect(confirmBooking(supabase, bookingOn(second!), payment)).rejects.toThrow(/payment/i);
  });
});
