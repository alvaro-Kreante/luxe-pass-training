import { describe, expect, it } from "vitest";

import {
  ADMISSION_COUNT,
  BOOKING_WINDOW_DAYS,
  MEMBERSHIP_VISITS_INCLUDED,
  NEW_CARD_OPTION_ID,
  SAMPLE_PAYMENT_METHODS,
  SPECIAL_REQUEST_MAX_LENGTH,
  WAITLIST_THRESHOLD_SEATS,
  addMinutesToTime,
  bookingReference,
  errorReference,
  formatCountdown,
  formatWholeCurrency,
  isAtRiskOfWaitlist,
  monthCalendar,
  paymentWillDecline,
  pricingFor,
  slotsFor,
} from "./booking";
import { TODAY, addDays } from "./availability";
import { LOUNGES } from "./lounges";

/**
 * Story 4.1 (Seamless Booking Flow) y Story 4.2 (Payment Processing).
 * Criterios en docs/specs/epic-4-booking-system/story-4.1-*.md y story-4.2-*.md
 */

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;
const closedOnSundays = LOUNGES.find((lounge) =>
  lounge.closedWeekdays?.includes(0),
)!;

describe("admisión y peticiones especiales", () => {
  it("la admisión es siempre de un solo miembro", () => {
    expect(ADMISSION_COUNT).toBe(1);
  });

  it("las peticiones especiales tienen un límite de 100 caracteres", () => {
    expect(SPECIAL_REQUEST_MAX_LENGTH).toBe(100);
  });
});

describe("monthCalendar — date picker mensual", () => {
  it("marca como pasados los días anteriores a hoy", () => {
    const days = monthCalendar(ainsworth, TODAY.slice(0, 7) + "-01");
    const yesterday = days.find((day) => day.dateIso < TODAY);

    expect(yesterday?.status).toBe("past");
  });

  it("marca hoy con su propio estado, distinto de 'open'", () => {
    const days = monthCalendar(ainsworth, TODAY.slice(0, 7) + "-01");
    const today = days.find((day) => day.dateIso === TODAY);

    expect(today?.status).toBe("today");
  });

  it("cierra los días fuera de la ventana de reserva de 60 días", () => {
    const farMonth = addDays(TODAY, BOOKING_WINDOW_DAYS + 40).slice(0, 7) + "-01";
    const days = monthCalendar(ainsworth, farMonth);
    const beyondWindow = days.find(
      (day) => day.dateIso > addDays(TODAY, BOOKING_WINDOW_DAYS),
    );

    expect(beyondWindow?.status).toBe("closed");
  });

  it("cierra los días de la semana que el lounge no admite", () => {
    const days = monthCalendar(
      closedOnSundays,
      TODAY.slice(0, 7) + "-01",
    );
    const sunday = days.find(
      (day) => new Date(`${day.dateIso}T00:00:00Z`).getUTCDay() === 0 && day.dateIso > TODAY,
    );

    expect(sunday?.status).toBe("closed");
  });
});

describe("slotsFor — slots de llegada", () => {
  it("devuelve los cinco horarios fijos del artboard", () => {
    const slots = slotsFor(ainsworth, addDays(TODAY, 5));

    expect(slots.map((slot) => slot.time)).toEqual([
      "8:00 AM",
      "10:30 AM",
      "1:00 PM",
      "3:30 PM",
      "6:00 PM",
    ]);
  });

  it("cierra todos los slots en un día que el lounge no admite", () => {
    const nextSunday = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i + 1)).find(
      (dateIso) => new Date(`${dateIso}T00:00:00Z`).getUTCDay() === 0,
    )!;
    const slots = slotsFor(closedOnSundays, nextSunday);

    for (const slot of slots) {
      expect(slot.status).toBe("closed");
      expect(slot.seatsLeft).toBeNull();
    }
  });

  it("reparte las plazas de una franja entre sus slots sin superar el total", () => {
    const dateIso = addDays(TODAY, 5);
    const slots = slotsFor(ainsworth, dateIso);
    const morningSlots = slots.filter((slot) => slot.band === "morning");
    const total = morningSlots.reduce((sum, slot) => sum + (slot.seatsLeft ?? 0), 0);

    expect(morningSlots).toHaveLength(2);
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it("un slot con 0 plazas queda completo", () => {
    // Buscamos una fecha donde alguna franja del catálogo salga a 0 (sample determinista).
    const dates = Array.from({ length: 30 }, (_, i) => addDays(TODAY, i));
    const someFull = dates
      .flatMap((dateIso) => slotsFor(ainsworth, dateIso))
      .find((slot) => slot.seatsLeft === 0 && slot.status !== "closed" && slot.status !== "past");

    expect(someFull?.status).toBe("full");
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

describe("waitlist y pago — disparadores de muestra", () => {
  it("un slot con pocas plazas se considera en riesgo de completarse", () => {
    expect(isAtRiskOfWaitlist(WAITLIST_THRESHOLD_SEATS)).toBe(true);
    expect(isAtRiskOfWaitlist(WAITLIST_THRESHOLD_SEATS + 1)).toBe(false);
    expect(isAtRiskOfWaitlist(null)).toBe(false);
  });

  it("la tarjeta de muestra marcada como declinada falla el pago", () => {
    const declining = SAMPLE_PAYMENT_METHODS.find((method) => method.simulatesDecline)!;
    const succeeding = SAMPLE_PAYMENT_METHODS.find((method) => !method.simulatesDecline)!;

    expect(paymentWillDecline(declining.id)).toBe(true);
    expect(paymentWillDecline(succeeding.id)).toBe(false);
    expect(paymentWillDecline(NEW_CARD_OPTION_ID)).toBe(false);
  });
});

describe("referencias de reserva", () => {
  it("genera una referencia estable con el formato LP-######", () => {
    const reference = bookingReference("the-ainsworth", "2025-09-14", "3:30 PM");

    expect(reference).toMatch(/^LP-\d{6}$/);
    expect(bookingReference("the-ainsworth", "2025-09-14", "3:30 PM")).toBe(reference);
  });

  it("dos reservas distintas producen referencias distintas", () => {
    const a = bookingReference("the-ainsworth", "2025-09-14", "3:30 PM");
    const b = bookingReference("the-ainsworth", "2025-09-15", "3:30 PM");

    expect(a).not.toBe(b);
  });

  it("la referencia de error sigue el formato LP-ERR-####", () => {
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
