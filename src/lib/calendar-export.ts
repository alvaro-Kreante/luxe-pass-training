import { STAY_HOURS } from "./booking";

/**
 * Story 4.3 (Calendar Integration). A diferencia del resto del Epic 4, esto
 * es una funcionalidad real: generar un `.ics` y abrir Google Calendar son
 * capacidades del navegador, no necesitan backend ni claves de servicio.
 */

export interface CalendarEventInput {
  /** Solo hace falta `name` — estructural a propósito para aceptar tanto el
   * catálogo mock (epics sin conectar) como `LoungeProfile` (Epic 4). */
  lounge: { id: string; name: string };
  address: string;
  dateIso: string;
  time: string;
  bookingReference: string;
  reminderMinutes: number;
}

function parseTime(time: string): { hour: number; minute: number } {
  const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) throw new Error(`Unrecognized time format: ${time}`);

  const [, hourText, minuteText, meridiem] = match;
  let hour = Number(hourText) % 12;
  if (meridiem!.toUpperCase() === "PM") hour += 12;

  return { hour, minute: Number(minuteText) };
}

function icsTimestamp(dateIso: string, hour: number, minute: number): string {
  const compactDate = dateIso.replaceAll("-", "");

  return `${compactDate}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
}

function eventTimestamps(input: CalendarEventInput): { start: string; end: string } {
  const { hour, minute } = parseTime(input.time);

  return {
    start: icsTimestamp(input.dateIso, hour, minute),
    end: icsTimestamp(input.dateIso, hour + STAY_HOURS, minute),
  };
}

function directionsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function eventDetails(input: CalendarEventInput): string {
  return [
    `Booking reference ${input.bookingReference}`,
    "Admission for one",
    `Directions: ${directionsUrl(input.address)}`,
  ].join("\n");
}

export function buildIcs(input: CalendarEventInput): string {
  const { start, end } = eventTimestamps(input);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LuxePass//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${input.bookingReference}@luxepass.co`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:LuxePass · ${input.lounge.name}`,
    `LOCATION:${input.address}`,
    `DESCRIPTION:${eventDetails(input).replaceAll("\n", "\\n")}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `TRIGGER:-PT${input.reminderMinutes}M`,
    "DESCRIPTION:LuxePass visit reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const { start, end } = eventTimestamps(input);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `LuxePass · ${input.lounge.name}`,
    dates: `${start}/${end}`,
    details: eventDetails(input),
    location: input.address,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
