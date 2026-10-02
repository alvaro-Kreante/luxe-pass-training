import { beforeAll, describe, expect, it } from "vitest";

import {
  ADMISSION_COUNT,
  BOOKING_WINDOW_DAYS,
  MEMBERSHIP_VISITS_INCLUDED,
  NEW_CARD_OPTION_ID,
  SAMPLE_PAYMENT_METHODS,
  SPECIAL_REQUEST_MAX_LENGTH,
  addMinutesToTime,
  bookingReferenceFromId,
  confirmBooking,
  errorReference,
  formatCountdown,
  formatWholeCurrency,
  joinWaitlist,
  monthCalendar,
  monthDayStatus,
  paymentWillDecline,
  pricingFor,
  slotsFor,
  type BookingRequest,
} from "./booking";
import { today, addDays } from "./availability";
import { LOUNGES } from "./lounges";
import {
  fetchAvailability,
  type AvailabilityCell,
  type LoungeProfile,
} from "./lounge-profile";
import { createClient } from "./supabase/client";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { fetchAinsworthProfile, fillSlot, findPredictedSlot } from "./testing/lounge-fixture";

/**
 * Story 4.1 (Seamless Booking Flow) y Story 4.2 (Payment Processing).
 * Criterios en docs/specs/epic-4-booking-system/story-4.1-*.md y story-4.2-*.md
 *
 * `monthCalendar`/`monthDayStatus`/`slotsFor` son puras (reciben celdas ya
 * resueltas); `confirmBooking`/`joinWaitlist` corren contra Supabase local
 * real (RPC `confirm_booking`/`join_waitlist`), como exige la metodología de
 * test del proyecto.
 */

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

function cell(
  dateIso: string,
  band: AvailabilityCell["band"],
  status: AvailabilityCell["status"],
  seatsLeft: number | null,
): AvailabilityCell {
  return { dateIso, band, status, seatsLeft };
}

describe("admisión y peticiones especiales", () => {
  it("la admisión es siempre de un solo miembro", () => {
    expect(ADMISSION_COUNT).toBe(1);
  });

  it("las peticiones especiales tienen un límite de 100 caracteres", () => {
    expect(SPECIAL_REQUEST_MAX_LENGTH).toBe(100);
  });
});

describe("monthDayStatus — a partir de celdas reales", () => {
  it("marca como pasados los días anteriores a hoy, sin mirar las celdas", () => {
    const yesterday = addDays(today(), -1);

    expect(monthDayStatus(yesterday, [])).toBe("past");
  });

  it("marca hoy con su propio estado, aunque todas sus celdas estén 'past'", () => {
    const cells = [cell(today(), "morning", "past", null)];

    expect(monthDayStatus(today(), cells)).toBe("today");
  });

  it("cierra los días fuera de la ventana de reserva de 60 días", () => {
    const farDate = addDays(today(), BOOKING_WINDOW_DAYS + 5);

    expect(monthDayStatus(farDate, [])).toBe("closed");
  });

  it("cierra un día sin ninguna celda abierta", () => {
    const date = addDays(today(), 5);
    const cells = [
      cell(date, "morning", "closed", null),
      cell(date, "afternoon", "closed", null),
    ];

    expect(monthDayStatus(date, cells)).toBe("closed");
  });

  it("abre un día con al menos una celda disponible", () => {
    const date = addDays(today(), 5);
    const cells = [
      cell(date, "morning", "full", 0),
      cell(date, "afternoon", "available", 4),
    ];

    expect(monthDayStatus(date, cells)).toBe("open");
  });

  it("marca 'full' un día con celdas abiertas pero ninguna disponible", () => {
    const date = addDays(today(), 5);
    const cells = [cell(date, "morning", "full", 0)];

    expect(monthDayStatus(date, cells)).toBe("full");
  });
});

describe("monthCalendar — date picker mensual", () => {
  it("agrega el estado de cada día a partir de sus celdas", () => {
    const monthIso = today().slice(0, 7) + "-01";
    const futureOpenDate = addDays(today(), 3);
    const cells = [cell(futureOpenDate, "morning", "available", 5)];

    const days = monthCalendar(monthIso, cells);
    const found = days.find((day) => day.dateIso === futureOpenDate);

    expect(found?.status).toBe("open");
  });

  it("un día sin celdas (fuera del rango consultado) cierra", () => {
    const monthIso = today().slice(0, 7) + "-01";
    const days = monthCalendar(monthIso, []);
    const futureDay = days.find((day) => day.dateIso > today());

    expect(futureDay?.status).toBe("closed");
  });
});

describe("slotsFor — slots de llegada", () => {
  const dateIso = addDays(today(), 5);

  it("devuelve los cinco horarios fijos del artboard", () => {
    const cells = [
      cell(dateIso, "morning", "available", 6),
      cell(dateIso, "afternoon", "available", 4),
      cell(dateIso, "evening", "available", 3),
      cell(dateIso, "late", "closed", null),
    ];

    const slots = slotsFor(cells);

    expect(slots.map((slot) => slot.time)).toEqual([
      "8:00 AM",
      "10:30 AM",
      "1:00 PM",
      "3:30 PM",
      "6:00 PM",
    ]);
  });

  it("cierra todos los slots de una franja cerrada", () => {
    const cells = [
      cell(dateIso, "morning", "closed", null),
      cell(dateIso, "afternoon", "closed", null),
      cell(dateIso, "evening", "closed", null),
      cell(dateIso, "late", "closed", null),
    ];

    for (const slot of slotsFor(cells)) {
      expect(slot.status).toBe("closed");
      expect(slot.seatsLeft).toBeNull();
    }
  });

  it("reparte las plazas de una franja entre sus slots sin superar el total", () => {
    const cells = [
      cell(dateIso, "morning", "available", 5),
      cell(dateIso, "afternoon", "available", 2),
      cell(dateIso, "evening", "available", 1),
      cell(dateIso, "late", "closed", null),
    ];

    const morningSlots = slotsFor(cells).filter((slot) => slot.band === "morning");
    const total = morningSlots.reduce((sum, slot) => sum + (slot.seatsLeft ?? 0), 0);

    expect(morningSlots).toHaveLength(2);
    expect(total).toBe(5);
  });

  it("un slot de una franja con 0 plazas queda completo", () => {
    const cells = [
      cell(dateIso, "morning", "full", 0),
      cell(dateIso, "afternoon", "available", 2),
      cell(dateIso, "evening", "available", 1),
      cell(dateIso, "late", "closed", null),
    ];

    for (const slot of slotsFor(cells).filter((slot) => slot.band === "morning")) {
      expect(slot.status).toBe("full");
      expect(slot.seatsLeft).toBe(0);
    }
  });
});

describe("pricingFor — Story 4.2", () => {
  it("cuando la visita está cubierta por la membresía, el total es cero", () => {
    const pricing = pricingFor(true);

    expect(pricing.subtotal).toBe(0);
    expect(pricing.tax).toBe(0);
    expect(pricing.total).toBe(0);
    expect(pricing.visitsIncluded).toBe(MEMBERSHIP_VISITS_INCLUDED);
  });

  it("cuando se factura como day pass, suma el impuesto al desglose", () => {
    const pricing = pricingFor(false);

    expect(pricing.subtotal).toBe(75);
    expect(pricing.tax).toBeCloseTo(6.66, 2);
    expect(pricing.total).toBeCloseTo(81.66, 2);
  });
});

describe("pago — disparador de muestra (Story 4.2, sin conectar)", () => {
  it("la tarjeta de muestra marcada como declinada falla el pago", () => {
    const declining = SAMPLE_PAYMENT_METHODS.find((method) => method.simulatesDecline)!;
    const succeeding = SAMPLE_PAYMENT_METHODS.find((method) => !method.simulatesDecline)!;

    expect(paymentWillDecline(declining.id)).toBe(true);
    expect(paymentWillDecline(succeeding.id)).toBe(false);
    expect(paymentWillDecline(NEW_CARD_OPTION_ID)).toBe(false);
  });
});

describe("referencias de reserva", () => {
  it("bookingReferenceFromId genera una referencia estable con el formato LP-######", () => {
    const reference = bookingReferenceFromId("11111111-1111-1111-1111-111111111111");

    expect(reference).toMatch(/^LP-\d{6}$/);
    expect(bookingReferenceFromId("11111111-1111-1111-1111-111111111111")).toBe(reference);
  });

  it("dos reservas distintas producen referencias distintas", () => {
    const a = bookingReferenceFromId("11111111-1111-1111-1111-111111111111");
    const b = bookingReferenceFromId("22222222-2222-2222-2222-222222222222");

    expect(a).not.toBe(b);
  });

  it("la referencia de error sigue el formato LP-ERR-######", () => {
    const reference = errorReference("the-ainsworth", "2025-09-14", "3:30 PM");

    expect(reference).toMatch(/^LP-ERR-\d{6}$/);
  });
});

describe("formatWholeCurrency — importe anual de la membresía", () => {
  it("agrupa los miles y no muestra decimales", () => {
    expect(formatWholeCurrency(2400)).toBe("$2,400");
  });

  it("no agrupa los importes por debajo de mil", () => {
    expect(formatWholeCurrency(75)).toBe("$75");
  });
});

describe("addMinutesToTime — alternativa de la waitlist", () => {
  it("suma minutos cruzando de AM a PM", () => {
    expect(addMinutesToTime("3:30 PM", 90)).toBe("5:00 PM");
  });

  it("suma minutos cruzando la medianoche", () => {
    expect(addMinutesToTime("11:30 PM", 90)).toBe("1:00 AM");
  });

  it("suma minutos cruzando el mediodía", () => {
    expect(addMinutesToTime("11:15 AM", 60)).toBe("12:15 PM");
  });
});

describe("formatCountdown — Slot held for M:SS", () => {
  it("formatea segundos con ceros a la izquierda", () => {
    expect(formatCountdown(581)).toBe("9:41");
    expect(formatCountdown(60)).toBe("1:00");
    expect(formatCountdown(5)).toBe("0:05");
  });
});

describe("confirmBooking / joinWaitlist — chequeo final de disponibilidad (Supabase real)", () => {
  const supabase = createClient();
  let ainsworthProfile: LoungeProfile;

  beforeAll(async () => {
    await signUpConfirmedMemberAndSignIn(
      supabase,
      `booking-actions-${Date.now()}@ensoleil-test.com`,
      "EnSoleil!2026",
      { membership: "annual" },
    );
    ainsworthProfile = await fetchAinsworthProfile(supabase);
  });

  function requestFor(target: { dateIso: string; band: AvailabilityCell["band"]; time: string }): BookingRequest {
    return {
      loungeId: ainsworth.id,
      dateIso: target.dateIso,
      band: target.band,
      time: target.time,
      specialRequests: "",
    };
  }

  it("confirma la reserva y decrementa las plazas reales cuando hay hueco", async () => {
    // occurrence 1: distinta de las que usa summary/page.test.tsx (2 y 3)
    // para que dos archivos de test no confirmen la misma plaza real.
    const target = findPredictedSlot(ainsworth, "available", 1);
    const before = await fetchAvailability(supabase, ainsworthProfile, target.dateIso, target.dateIso);
    const beforeSeats = before.find((c) => c.band === target.band)!.seatsLeft!;

    const booking = await confirmBooking(supabase, requestFor(target));

    expect(booking?.status).toBe("confirmed");
    expect(booking?.dateIso).toBe(target.dateIso);
    expect(booking?.band).toBe(target.band);

    const after = await fetchAvailability(supabase, ainsworthProfile, target.dateIso, target.dateIso);
    const afterSeats = after.find((c) => c.band === target.band)!.seatsLeft!;

    expect(afterSeats).toBe(beforeSeats - 1);
  });

  it("no confirma (devuelve null) cuando el slot ya está lleno", async () => {
    const target = findPredictedSlot(ainsworth, "full", 1);
    await fillSlot(ainsworth.id, target.dateIso, target.band);

    const booking = await confirmBooking(supabase, requestFor(target));

    expect(booking).toBeNull();
  });

  it("join_waitlist crea la reserva como 'waitlisted' sin tocar las plazas", async () => {
    const target = findPredictedSlot(ainsworth, "full", 1);

    const booking = await joinWaitlist(supabase, requestFor(target));

    expect(booking.status).toBe("waitlisted");
    expect(booking.dateIso).toBe(target.dateIso);
  });
});
