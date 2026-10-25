import { describe, expect, it } from "vitest";

import { bookingReferenceFromId, confirmBooking, type BookingRequest } from "./booking";
import { today } from "./availability";
import { LOUNGES } from "./lounges";
import {
  AINSWORTH_PASS,
  CANCELLATION_WINDOW_HOURS,
  LATE_CANCELLATION_FEE_CENTS,
  PASS_LIFECYCLE_STATES,
  cancelBooking,
  fetchDigitalPass,
  fetchPastBookings,
  fetchUpcomingBookings,
  isFreeCancellation,
  isPassLifecycleState,
} from "./passes";
import { checkInReceptionBooking, reportReceptionNoShow } from "./reception";
import { createClient } from "./supabase/client";
import { signInReceptionStaff, signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { findPredictedSlot, OPEN_EVERY_DAY_LOUNGE } from "./testing/lounge-fixture";

/**
 * Story 5.1 (Digital Pass Generation). Criterios en
 * docs/specs/epic-5-qr-code-check-in/story-5.1-digital-pass-generation.md.
 * `fetchDigitalPass`/`fetchUpcomingBookings`/`fetchPastBookings` corren
 * contra Supabase local real (RLS ya limita a las reservas del miembro con
 * sesión), como exige la metodología de test del proyecto. `AINSWORTH_PASS`
 * es una fixture pura para tests de componente, no toca Supabase.
 */

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

describe("AINSWORTH_PASS (fixture de componente)", () => {
  it("tiene un número de confirmación LP único con el formato del resto de la app", () => {
    expect(AINSWORTH_PASS.reference).toMatch(/^LP-\d{6}$/);
  });
});

describe("isPassLifecycleState", () => {
  it("acepta los cuatro estados del pase", () => {
    for (const state of PASS_LIFECYCLE_STATES) {
      expect(isPassLifecycleState(state)).toBe(true);
    }
  });

  it("rechaza cualquier otro valor, incluido null", () => {
    expect(isPassLifecycleState("cancelled")).toBe(false);
    expect(isPassLifecycleState(null)).toBe(false);
  });
});

describe("isFreeCancellation", () => {
  it(`es gratis a partir de las ${CANCELLATION_WINDOW_HOURS} horas de antelación`, () => {
    expect(isFreeCancellation(48)).toBe(true);
    expect(isFreeCancellation(CANCELLATION_WINDOW_HOURS)).toBe(true);
  });

  it("cobra la tarifa por debajo de la ventana de 24 horas", () => {
    expect(isFreeCancellation(19)).toBe(false);
    expect(isFreeCancellation(0)).toBe(false);
  });
});

async function bookAndSignIn(label: string, dateIso: string, band: BookingRequest["band"], time: string) {
  const supabase = createClient();
  await signUpConfirmedMemberAndSignIn(
    supabase,
    `passes-${Date.now()}-${label}@ensoleil-test.example`,
    "EnSoleil!2026",
    { membership: "annual" },
  );

  const booking = await confirmBooking(supabase, {
    loungeId: OPEN_EVERY_DAY_LOUNGE,
    dateIso,
    band,
    time,
    specialRequests: "Window seat please",
  });
  if (!booking) throw new Error(`No se pudo confirmar la reserva de prueba (${label})`);

  return { supabase, booking, reference: bookingReferenceFromId(booking.id) };
}

describe("fetchDigitalPass", () => {
  it("AC 'Information displays: member name, lounge name, date/time, duration' — trae el pase real por LP#", async () => {
    const { supabase, reference } = await bookAndSignIn("digital-1", today(), "morning", "8:00 AM");

    const pass = await fetchDigitalPass(supabase, reference);

    expect(pass?.reference).toBe(reference);
    expect(pass?.loungeName).toBe("Verandah No. 9");
    expect(pass?.arrivalTime).toBe("8:00 AM");
    expect(pass?.stayHours).toBe(4);
    expect(pass?.windowCloseTime).toBe("12:00 PM");
    expect(pass?.specialRequests).toBe("Window seat please");
  });

  it("devuelve null para un LP# que no existe o no es del miembro con sesión", async () => {
    const { supabase } = await bookAndSignIn("digital-2", today(), "afternoon", "1:00 PM");

    const pass = await fetchDigitalPass(supabase, "LP-000000");

    expect(pass).toBeNull();
  });

  it("no encuentra el pase de otro miembro (RLS)", async () => {
    const { reference } = await bookAndSignIn("digital-3", today(), "late", "6:00 PM");
    const otherMember = createClient();
    await signUpConfirmedMemberAndSignIn(
      otherMember,
      `passes-${Date.now()}-digital-3-other@ensoleil-test.example`,
      "EnSoleil!2026",
      { membership: "annual" },
    );

    const pass = await fetchDigitalPass(otherMember, reference);

    expect(pass).toBeNull();
  });
});

describe("fetchUpcomingBookings", () => {
  it("lista una reserva recién confirmada como 'confirmed'", async () => {
    const slot = findPredictedSlot(ainsworth, "available", 3);
    const { supabase, reference } = await bookAndSignIn("upcoming-1", slot.dateIso, slot.band, slot.time);

    const upcoming = await fetchUpcomingBookings(supabase);

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.reference).toBe(reference);
    expect(upcoming[0]?.status).toBe("confirmed");
    expect(upcoming[0]?.dateTimeLabel).toContain(`arrive ${slot.time}`);
  });

  it("una reserva de hoy con check-in aparece como 'in-progress'", async () => {
    const { supabase, reference } = await bookAndSignIn("upcoming-2", today(), "afternoon", "3:30 PM");
    const kiosk = await signInReceptionStaff(OPEN_EVERY_DAY_LOUNGE);
    await checkInReceptionBooking(kiosk, OPEN_EVERY_DAY_LOUNGE, today(), reference);

    const upcoming = await fetchUpcomingBookings(supabase);

    expect(upcoming[0]?.status).toBe("in-progress");
    expect(upcoming[0]?.dateTimeLabel).toContain("Today");
  });
});

describe("fetchPastBookings", () => {
  it("AC 'No-show tracking for booking history' — un no-show aparece como outcome 'no-show'", async () => {
    const { supabase, reference } = await bookAndSignIn("past-1", today(), "afternoon", "1:00 PM");
    const kiosk = await signInReceptionStaff(OPEN_EVERY_DAY_LOUNGE);
    await reportReceptionNoShow(kiosk, OPEN_EVERY_DAY_LOUNGE, today(), reference);

    const past = await fetchPastBookings(supabase);

    expect(past).toHaveLength(1);
    expect(past[0]?.reference).toBe(reference);
    expect(past[0]?.outcome).toBe("no-show");
  });
});

describe("cancelBooking (Story 6.1)", () => {
  it("AC '24-hour advance notice requirement for cancellation' — cancela sin fee con más de 24h de antelación", async () => {
    const slot = findPredictedSlot(ainsworth, "available", 4);
    const { supabase, booking } = await bookAndSignIn("cancel-1", slot.dateIso, slot.band, slot.time);

    const cancelled = await cancelBooking(supabase, booking.id, today());

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellationFeeCents).toBeNull();
  });

  it("AC 'No show policy enforcement - flat fee' — cobra el fee plano si quedan menos de 24h", async () => {
    const { supabase, booking } = await bookAndSignIn("cancel-2", today(), "morning", "8:00 AM");

    const cancelled = await cancelBooking(supabase, booking.id, today());

    expect(cancelled.cancellationFeeCents).toBe(LATE_CANCELLATION_FEE_CENTS);
  });

  it("una reserva cancelada desaparece de fetchUpcomingBookings y aparece en fetchPastBookings", async () => {
    const slot = findPredictedSlot(ainsworth, "available", 5);
    const { supabase, booking, reference } = await bookAndSignIn("cancel-3", slot.dateIso, slot.band, slot.time);

    await cancelBooking(supabase, booking.id, today());

    const upcoming = await fetchUpcomingBookings(supabase);
    const past = await fetchPastBookings(supabase);

    expect(upcoming).toHaveLength(0);
    expect(past).toHaveLength(1);
    expect(past[0]?.reference).toBe(reference);
    expect(past[0]?.outcome).toBe("cancelled");
  });

  it("no permite cancelar la reserva de otro miembro (RLS)", async () => {
    const slot = findPredictedSlot(ainsworth, "available", 6);
    const { booking } = await bookAndSignIn("cancel-4", slot.dateIso, slot.band, slot.time);
    const otherMember = createClient();
    await signUpConfirmedMemberAndSignIn(
      otherMember,
      `passes-${Date.now()}-cancel-4-other@ensoleil-test.example`,
      "EnSoleil!2026",
      { membership: "annual" },
    );

    await expect(cancelBooking(otherMember, booking.id, today())).rejects.toThrow();
  });
});
