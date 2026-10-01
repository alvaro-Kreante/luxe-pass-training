/**
 * Story 8.3 — "Add/edit/remove lounge profiles": alta de un lounge nuevo.
 * Artboards: docs/design/epic-8-admin-support/LoungeNew.dc.html (14) y
 * PhotoCaption.dc.html (15). Lógica pura del formulario; la persistencia
 * vive en `admin-content.ts` (RPC de `supabase/schemas/admin_content.sql`).
 */

export interface LoungeLocation {
  address: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
}

export interface LoungeDraftInput {
  name: string;
  phone: string;
  email: string;
  website: string;
  location: LoungeLocation | null;
  /** 7 entradas, domingo primero — "Closed" marca un día cerrado. */
  weeklyHours: string[];
  amenities: string[];
  capacity: number;
  bookingRestrictions: string[];
  /** Story 10.5 — el partner que lo opera; null mientras no se elige (solo en borrador). */
  partnerId: string | null;
}

export const CLOSED = "Closed";

/** "una-foto-cualquiera.jpg" → "una foto cualquiera". */
export function captionFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  return stem.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

export function loungeIdFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** La foto principal es la de `position = 0` — la primera del carrusel del perfil. */
export function makeMainPhoto<T>(photos: T[], index: number): T[] {
  if (index <= 0 || index >= photos.length) return photos;
  return [photos[index], ...photos.slice(0, index), ...photos.slice(index + 1)];
}

export function closedWeekdaysFromHours(weeklyHours: string[]): number[] {
  return weeklyHours.flatMap((hours, weekday) => (isClosed(hours) ? [weekday] : []));
}

/** El texto corto de `lounges.hours` que muestra el catálogo ("Open until 9 PM"). */
export function hoursSummary(weeklyHours: string[]): string {
  const firstOpen = weeklyHours.find((hours) => !isClosed(hours));
  if (!firstOpen) return CLOSED;
  const closing = firstOpen.split(/[–-]/).pop()?.trim();
  return closing ? `Open until ${closing}` : firstOpen;
}

function isClosed(hours: string | undefined): boolean {
  return !hours || hours.trim() === "" || hours.trim().toLowerCase() === CLOSED.toLowerCase();
}

/** Un día del horario tal como lo editan los desplegables del formulario. */
export interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

export const DEFAULT_OPEN = "8:00 AM";
export const DEFAULT_CLOSE = "9:00 PM";

/** "12:00 AM" … "11:30 PM", cada 30 minutos. */
export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, index) => {
  const hour24 = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minutes} ${hour24 < 12 ? "AM" : "PM"}`;
});

export function formatDayHours(day: DayHours): string {
  return day.open ? `${day.from} – ${day.to}` : CLOSED;
}

/** "9 AM" → "9:00 AM", para leer también el formato corto de los lounges sembrados. */
function normalizeTime(value: string): string {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return value.trim();
  return `${Number(match[1])}:${match[2] ?? "00"} ${match[3].toUpperCase()}`;
}

export function parseDayHours(hours: string): DayHours {
  if (isClosed(hours)) return { open: false, from: DEFAULT_OPEN, to: DEFAULT_CLOSE };
  const [from, to] = hours.split(/[–-]/).map(normalizeTime);
  return { open: true, from: from || DEFAULT_OPEN, to: to || DEFAULT_CLOSE };
}

export interface ChecklistItem {
  id: "contact" | "location" | "hours" | "seats" | "partner";
  label: string;
  done: boolean;
}

/**
 * Lo mismo que comprueba `admin_publish_lounge`. `partnerStatus` es el del
 * partner elegido (Story 10.5): solo uno activo deja publicar.
 */
export function publishChecklist(
  draft: LoungeDraftInput,
  partnerStatus: "draft" | "active" | "suspended" | null = null,
): ChecklistItem[] {
  return [
    {
      id: "contact",
      label: "Name and contact",
      done: draft.name.trim() !== "" && draft.phone.trim() !== "" && draft.email.trim() !== "",
    },
    { id: "location", label: "Address on the map", done: draft.location !== null },
    { id: "hours", label: "Operating hours", done: draft.weeklyHours.some((hours) => !isClosed(hours)) },
    { id: "seats", label: "Seats per time slot", done: draft.capacity > 0 },
    { id: "partner", label: "An active partner", done: draft.partnerId !== null && partnerStatus === "active" },
  ];
}
