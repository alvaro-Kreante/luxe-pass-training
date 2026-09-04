import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGoogleCalendarUrl,
  buildIcs,
  downloadIcsFile,
  type CalendarEventInput,
} from "./calendar-export";
import { LOUNGES } from "./lounges";

/**
 * Story 4.3 (Calendar Integration). A diferencia del resto del epic, esto no
 * se simula: genera un .ics real y una URL real de Google Calendar — son
 * capacidades del navegador, no llamadas a un backend.
 */

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

const input: CalendarEventInput = {
  lounge: ainsworth,
  address: "122 E 45th St, New York, NY 10017",
  dateIso: "2025-09-14",
  time: "3:30 PM",
  bookingReference: "LP-842193",
  reminderMinutes: 15,
};

describe("buildIcs — evento pre-poblado", () => {
  it("incluye el nombre del lounge, la dirección y la hora de inicio", () => {
    const ics = buildIcs(input);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:LuxePass · The Ainsworth");
    expect(ics).toContain("LOCATION:122 E 45th St, New York, NY 10017");
    expect(ics).toContain("DTSTART:20250914T153000");
  });

  it("dura las horas de estancia declaradas y termina después de empezar", () => {
    const ics = buildIcs(input);

    expect(ics).toContain("DTEND:20250914T193000");
  });

  it("incluye el número de reserva y el enlace de direcciones en la descripción", () => {
    const ics = buildIcs(input);

    expect(ics).toContain("LP-842193");
    expect(ics).toContain("https://www.google.com/maps/search/");
  });

  it("recuerda con el número de minutos indicado antes del evento", () => {
    const ics = buildIcs(input);

    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT15M");
  });

  it("usa el minuto de recordatorio pasado, no un valor fijo", () => {
    const ics = buildIcs({ ...input, reminderMinutes: 30 });

    expect(ics).toContain("TRIGGER:-PT30M");
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("apunta a calendar.google.com con las mismas fechas del evento", () => {
    const url = buildGoogleCalendarUrl(input);

    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(true);
    expect(url).toContain("dates=20250914T153000%2F20250914T193000");
    expect(url).toContain("LP-842193");
  });
});

describe("downloadIcsFile", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("crea un enlace de descarga y lo hace clicar", () => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    downloadIcsFile("visit.ics", "BEGIN:VCALENDAR\r\nEND:VCALENDAR");

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
