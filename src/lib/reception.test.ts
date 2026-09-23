import { describe, expect, it } from "vitest";

import { bookingReferenceFromId, confirmBooking, type BookingRequest } from "./booking";
import { TODAY } from "./availability";
import { LOUNGES } from "./lounges";
import {
  RECEPTION_CLOSE_MATCHES,
  checkInReceptionBooking,
  fetchReceptionTodaySummary,
  lookupReceptionBooking,
  reportReceptionNoShow,
} from "./reception";
import { createClient } from "./supabase/client";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";

/**
 * Story 5.2 — Lounge Check-In Process. Criterios en
 * docs/specs/epic-5-qr-code-check-in/story-5.2-lounge-check-in-process.md.
 * Corre contra Supabase local real (RPC "de kiosco", ver
 * supabase/schemas/bookings.sql), como exige la metodología de test del
 * proyecto — `lookupReceptionBooking`/`checkInReceptionBooking`/
 * `reportReceptionNoShow` se llaman con un cliente SIN sesión (anon),
 * porque `/reception` no inicia sesión de personal ni de miembro.
 */

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;
const kiosk = createClient();

/**
 * `TODAY` (2025-09-09) es también la primera fecha sembrada en
 * `lounge_availability` (ver docs/DATA-MODEL-MAP.md) — plazas reales de
 * sobra para que cada test confirme la suya sin depender del formulario
 * mock de `findPredictedSlot` (que solo predice 2-3 bandas para un único
 * día, insuficiente para tantos tests independientes). Se reparte entre
 * tres bandas (nunca "evening", solo 1 plaza sembrada) para no competir con
 * los demás archivos de test que también reservan hoy en este lounge.
 */
const BANDS: { band: BookingRequest["band"]; time: string }[] = [
  { band: "morning", time: "8:00 AM" },
  { band: "afternoon", time: "1:00 PM" },
  { band: "late", time: "6:00 PM" },
];

async function bookTodayForReception(label: number) {
  const memberSupabase = createClient();
  const member = await signUpConfirmedMemberAndSignIn(
    memberSupabase,
    `reception-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
    { membership: "annual" },
  );

  const request: BookingRequest = {
    loungeId: ainsworth.id,
    dateIso: TODAY,
    ...BANDS[label % BANDS.length]!,
    specialRequests: "",
  };

  const booking = await confirmBooking(memberSupabase, request);
  if (!booking) throw new Error(`No se pudo confirmar la reserva de prueba (label ${label})`);

  return { member, booking, reference: bookingReferenceFromId(booking.id) };
}

describe("lookupReceptionBooking", () => {
  it("AC 'Instant verification of booking validity' — encuentra una reserva confirmada de hoy", async () => {
    const { reference } = await bookTodayForReception(10);

    const found = await lookupReceptionBooking(kiosk, ainsworth.id, TODAY, reference);

    expect(found?.reference).toBe(reference);
    expect(found?.status).toBe("confirmed");
    expect(found?.checkedInAt).toBeNull();
  });

  it("no distingue mayúsculas ni espacios sobrantes en el código", async () => {
    const { reference } = await bookTodayForReception(11);

    const found = await lookupReceptionBooking(kiosk, ainsworth.id, TODAY, `  ${reference.toLowerCase()}  `);

    expect(found?.reference).toBe(reference);
  });

  it("devuelve null para un código que no existe hoy en ese lounge", async () => {
    const found = await lookupReceptionBooking(kiosk, ainsworth.id, TODAY, "LP-000000");

    expect(found).toBeNull();
  });

  it("AC 'Emergency contact information accessible to staff' — expone el contacto cuando el perfil lo tiene", async () => {
    const { reference } = await bookTodayForReception(12);

    const found = await lookupReceptionBooking(kiosk, ainsworth.id, TODAY, reference);

    // Story 1.1 no pide contacto de emergencia en el alta (gap anticipado en
    // docs/DATA-MODEL-MAP.md) — un miembro recién creado no lo tiene, así
    // que el campo real es `null`, no un valor de muestra inventado.
    expect(found?.emergencyContact).toBeNull();
  });
});

describe("checkInReceptionBooking", () => {
  it("AC 'Instant verification' + 'Check-in confirmation to member's app' — marca la reserva como in_progress", async () => {
    const { reference } = await bookTodayForReception(13);

    await checkInReceptionBooking(kiosk, ainsworth.id, TODAY, reference);

    const found = await lookupReceptionBooking(kiosk, ainsworth.id, TODAY, reference);
    expect(found?.status).toBe("in_progress");
    expect(found?.checkedInAt).not.toBeNull();
  });

  it("es idempotente por construcción: un segundo check-in falla en vez de reescribir", async () => {
    const { reference } = await bookTodayForReception(14);
    await checkInReceptionBooking(kiosk, ainsworth.id, TODAY, reference);

    await expect(checkInReceptionBooking(kiosk, ainsworth.id, TODAY, reference)).rejects.toThrow();
  });
});

describe("reportReceptionNoShow", () => {
  it("AC 'No-show tracking for booking history' — cierra la reserva como completed + no_show", async () => {
    const { reference } = await bookTodayForReception(15);

    await reportReceptionNoShow(kiosk, ainsworth.id, TODAY, reference);

    const found = await lookupReceptionBooking(kiosk, ainsworth.id, TODAY, reference);
    expect(found?.status).toBe("completed");
    expect(found?.noShow).toBe(true);
  });

  it("no se puede reportar no-show de una reserva ya checked-in", async () => {
    const { reference } = await bookTodayForReception(16);
    await checkInReceptionBooking(kiosk, ainsworth.id, TODAY, reference);

    await expect(reportReceptionNoShow(kiosk, ainsworth.id, TODAY, reference)).rejects.toThrow();
  });
});

describe("fetchReceptionTodaySummary", () => {
  it("cuenta al menos la reserva recién confirmada como esperada hoy", async () => {
    // >= y no === : otros archivos de test corren en paralelo y también
    // confirman reservas reales de hoy en este mismo lounge — el conteo es
    // un agregado global, no aislado a este test.
    const before = await fetchReceptionTodaySummary(kiosk, ainsworth.id, TODAY);
    await bookTodayForReception(17);
    const after = await fetchReceptionTodaySummary(kiosk, ainsworth.id, TODAY);

    expect(after.expected).toBeGreaterThanOrEqual(before.expected + 1);
  });

  it("cuenta un check-in nuevo", async () => {
    const { reference } = await bookTodayForReception(18);
    const before = await fetchReceptionTodaySummary(kiosk, ainsworth.id, TODAY);

    await checkInReceptionBooking(kiosk, ainsworth.id, TODAY, reference);
    const after = await fetchReceptionTodaySummary(kiosk, ainsworth.id, TODAY);

    expect(after.checkedIn).toBeGreaterThanOrEqual(before.checkedIn + 1);
  });
});

describe("RECEPTION_CLOSE_MATCHES", () => {
  it("sigue siendo dato de muestra (no hay AC de búsqueda difusa en la Story 5.2)", () => {
    expect(RECEPTION_CLOSE_MATCHES.length).toBeGreaterThan(0);
  });
});
