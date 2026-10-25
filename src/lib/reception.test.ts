import { beforeAll, describe, expect, it } from "vitest";

import { bookingReferenceFromId, confirmBooking, type BookingRequest } from "./booking";
import { today } from "./availability";
import {
  RECEPTION_CLOSE_MATCHES,
  checkInReceptionBooking,
  fetchReceptionTodaySummary,
  lookupReceptionBooking,
  reportReceptionNoShow,
} from "./reception";
import { signUpConfirmedMemberAndSignIn, signUpConfirmedPartnerAndSignIn } from "./testing/confirmed-user";
import { OPEN_EVERY_DAY_LOUNGE } from "./testing/lounge-fixture";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 5.2 — Lounge Check-In Process. Criterios en
 * docs/specs/epic-5-qr-code-check-in/story-5.2-lounge-check-in-process.md.
 * Corre contra Supabase local real. SEC-01 (docs/audit/seguridad-y-datos.md):
 * las RPC de recepción solo responden al personal del partner dueño del
 * lounge — `kiosk` es una sesión real de partner de Verandah No. 9.
 */

const LOUNGE = OPEN_EVERY_DAY_LOUNGE;
const kiosk = isolatedClient();

beforeAll(async () => {
  await signUpConfirmedPartnerAndSignIn(kiosk, `reception-staff-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026", {
    businessName: "Verandah Hospitality",
    loungeIds: [LOUNGE],
  });
});

/**
 * `TODAY` (2025-09-09) tiene plazas reales de sobra (aforo por franja
 * menos reservas, calculado en vivo) para que cada test confirme la suya
 * sin depender de `findPredictedSlot` (que solo da 2-3 bandas para un único
 * día, insuficiente para tantos tests independientes). Se reparte entre
 * tres bandas (nunca "evening") para no competir con los demás archivos de
 * test que también reservan hoy en este lounge.
 */
const BANDS: { band: BookingRequest["band"]; time: string }[] = [
  { band: "morning", time: "8:00 AM" },
  { band: "afternoon", time: "1:00 PM" },
  { band: "late", time: "6:00 PM" },
];

async function bookTodayForReception(label: number) {
  const memberSupabase = isolatedClient();
  const member = await signUpConfirmedMemberAndSignIn(
    memberSupabase,
    `reception-${Date.now()}-${label}@ensoleil-test.example`,
    "EnSoleil!2026",
    { membership: "annual" },
  );

  const request: BookingRequest = {
    loungeId: LOUNGE,
    dateIso: today(),
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

    const found = await lookupReceptionBooking(kiosk, LOUNGE, today(), reference);

    expect(found?.reference).toBe(reference);
    expect(found?.status).toBe("confirmed");
    expect(found?.checkedInAt).toBeNull();
  });

  it("no distingue mayúsculas ni espacios sobrantes en el código", async () => {
    const { reference } = await bookTodayForReception(11);

    const found = await lookupReceptionBooking(kiosk, LOUNGE, today(), `  ${reference.toLowerCase()}  `);

    expect(found?.reference).toBe(reference);
  });

  it("devuelve null para un código que no existe hoy en ese lounge", async () => {
    const found = await lookupReceptionBooking(kiosk, LOUNGE, today(), "LP-000000");

    expect(found).toBeNull();
  });

  it("AC 'Emergency contact information accessible to staff' — expone el contacto cuando el perfil lo tiene", async () => {
    const { reference } = await bookTodayForReception(12);

    const found = await lookupReceptionBooking(kiosk, LOUNGE, today(), reference);

    // Story 1.1 no pide contacto de emergencia en el alta (gap anticipado en
    // docs/DATA-MODEL-MAP.md) — un miembro recién creado no lo tiene, así
    // que el campo real es `null`, no un valor de muestra inventado.
    expect(found?.emergencyContact).toBeNull();
  });
});

describe("checkInReceptionBooking", () => {
  it("AC 'Instant verification' + 'Check-in confirmation to member's app' — marca la reserva como in_progress", async () => {
    const { reference } = await bookTodayForReception(13);

    await checkInReceptionBooking(kiosk, LOUNGE, today(), reference);

    const found = await lookupReceptionBooking(kiosk, LOUNGE, today(), reference);
    expect(found?.status).toBe("in_progress");
    expect(found?.checkedInAt).not.toBeNull();
  });

  it("es idempotente por construcción: un segundo check-in falla en vez de reescribir", async () => {
    const { reference } = await bookTodayForReception(14);
    await checkInReceptionBooking(kiosk, LOUNGE, today(), reference);

    await expect(checkInReceptionBooking(kiosk, LOUNGE, today(), reference)).rejects.toThrow();
  });
});

describe("reportReceptionNoShow", () => {
  it("AC 'No-show tracking for booking history' — cierra la reserva como completed + no_show", async () => {
    const { reference } = await bookTodayForReception(15);

    await reportReceptionNoShow(kiosk, LOUNGE, today(), reference);

    const found = await lookupReceptionBooking(kiosk, LOUNGE, today(), reference);
    expect(found?.status).toBe("completed");
    expect(found?.noShow).toBe(true);
  });

  it("no se puede reportar no-show de una reserva ya checked-in", async () => {
    const { reference } = await bookTodayForReception(16);
    await checkInReceptionBooking(kiosk, LOUNGE, today(), reference);

    await expect(reportReceptionNoShow(kiosk, LOUNGE, today(), reference)).rejects.toThrow();
  });
});

describe("fetchReceptionTodaySummary", () => {
  it("cuenta al menos la reserva recién confirmada como esperada hoy", async () => {
    // >= y no === : otros archivos de test corren en paralelo y también
    // confirman reservas reales de hoy en este mismo lounge — el conteo es
    // un agregado global, no aislado a este test.
    const before = await fetchReceptionTodaySummary(kiosk, LOUNGE, today());
    await bookTodayForReception(17);
    const after = await fetchReceptionTodaySummary(kiosk, LOUNGE, today());

    expect(after.expected).toBeGreaterThanOrEqual(before.expected + 1);
  });

  it("cuenta un check-in nuevo", async () => {
    const { reference } = await bookTodayForReception(18);
    const before = await fetchReceptionTodaySummary(kiosk, LOUNGE, today());

    await checkInReceptionBooking(kiosk, LOUNGE, today(), reference);
    const after = await fetchReceptionTodaySummary(kiosk, LOUNGE, today());

    expect(after.checkedIn).toBeGreaterThanOrEqual(before.checkedIn + 1);
  });
});

describe("SEC-01 — solo el personal del lounge usa la recepción", () => {
  it("sin sesión no puede buscar una reserva", async () => {
    const { reference } = await bookTodayForReception(20);

    await expect(lookupReceptionBooking(isolatedClient(), LOUNGE, today(), reference)).rejects.toThrow();
  });

  it("sin sesión no puede hacer check-in ni marcar no-show", async () => {
    const { reference } = await bookTodayForReception(21);
    const anonymous = isolatedClient();

    await expect(checkInReceptionBooking(anonymous, LOUNGE, today(), reference)).rejects.toThrow();
    await expect(reportReceptionNoShow(anonymous, LOUNGE, today(), reference)).rejects.toThrow();

    const found = await lookupReceptionBooking(kiosk, LOUNGE, today(), reference);
    expect(found?.status).toBe("confirmed");
    expect(found?.noShow).toBe(false);
  });

  it("sin sesión no puede leer el resumen del día", async () => {
    await expect(fetchReceptionTodaySummary(isolatedClient(), LOUNGE, today())).rejects.toThrow();
  });

  it("un miembro con sesión no ve las reservas de otros", async () => {
    const { reference } = await bookTodayForReception(22);
    const otherMember = isolatedClient();
    await signUpConfirmedMemberAndSignIn(otherMember, `reception-other-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026");

    expect(await lookupReceptionBooking(otherMember, LOUNGE, today(), reference)).toBeNull();
    await expect(checkInReceptionBooking(otherMember, LOUNGE, today(), reference)).rejects.toThrow();
  });

  it("el personal de otro lounge no ve ni toca las reservas de este", async () => {
    const { reference } = await bookTodayForReception(23);
    const otherStaff = isolatedClient();
    await signUpConfirmedPartnerAndSignIn(otherStaff, `reception-cordelia-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026", {
      businessName: "Cordelia Group",
      loungeIds: ["the-cordelia"],
    });

    expect(await lookupReceptionBooking(otherStaff, LOUNGE, today(), reference)).toBeNull();
    await expect(reportReceptionNoShow(otherStaff, LOUNGE, today(), reference)).rejects.toThrow();
    expect(await fetchReceptionTodaySummary(otherStaff, LOUNGE, today())).toEqual({ expected: 0, checkedIn: 0 });
  });
});

describe("RECEPTION_CLOSE_MATCHES", () => {
  it("sigue siendo dato de muestra (no hay AC de búsqueda difusa en la Story 5.2)", () => {
    expect(RECEPTION_CLOSE_MATCHES.length).toBeGreaterThan(0);
  });
});
