import { amenityLabel } from "./amenities";
import type { Lounge } from "./lounges";
import { TODAY, addDays, isPast, parseDate, weekdayOf } from "./availability";

/**
 * Story 3.1 / 3.2 — el catálogo de `lounges.ts` (Story 2.1/2.2) no trae
 * contacto, horario completo, reseñas ni disponibilidad semanal: son datos
 * de la Fase 4 que no existían todavía. Esta capa los deriva del lounge base,
 * y fija literalmente los de The Ainsworth y Belmont Terrace para que
 * reproduzcan los artboards que los citan (`Main.dc.html`, `Reviews.dc.html`,
 * `NoRatings.dc.html`, `Closure.dc.html`). El resto del catálogo recibe datos
 * de muestra generados a partir de su propio id, para que cualquier lounge
 * tenga un perfil navegable.
 */

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Hash estable y pequeño — no es criptográfico, solo determinista por id. */
function hashOf(seed: string): number {
  return [...seed].reduce((total, char) => total + char.charCodeAt(0) * 31, 0);
}

/* ------------------------------------------------------------------ */
/* Contacto                                                            */
/* ------------------------------------------------------------------ */

export interface LoungeContact {
  address: string;
  phone: string;
  email: string;
  website: string;
  receptionNote: string;
}

const AREA_CODE_BY_CITY: Record<string, string> = {
  "new-york": "212",
  newark: "973",
  "new-rochelle": "914",
  miami: "305",
};

const STATE_BY_CITY: Record<string, string> = {
  "new-york": "NY",
  newark: "NJ",
  "new-rochelle": "NY",
  miami: "FL",
};

const CONTACT_OVERRIDES: Record<string, LoungeContact> = {
  "the-ainsworth": {
    address: "122 E 45th St, New York, NY 10017",
    phone: "+1 (212) 555-0184",
    email: "reception@ainsworth.example",
    website: "ainsworth.example",
    receptionNote:
      "Reception is on Level 2. Show your booking confirmation on arrival.",
  },
};

export function contactFor(lounge: Lounge): LoungeContact {
  const override = CONTACT_OVERRIDES[lounge.id];
  if (override) return override;

  const hash = hashOf(lounge.id);
  const areaCode = AREA_CODE_BY_CITY[lounge.cityId] ?? "212";
  const state = STATE_BY_CITY[lounge.cityId] ?? "NY";
  const streetNumber = 100 + (hash % 800);
  const phoneDigits = String(1000 + (hash % 9000)).padStart(4, "0");
  const zip = String(10001 + (hash % 900));

  return {
    address: `${streetNumber} ${lounge.neighborhood} Ave, ${lounge.city}, ${state} ${zip}`,
    phone: `+1 (${areaCode}) 555-${phoneDigits}`,
    email: `reception@${lounge.id}.example`,
    website: `${lounge.id}.example`,
    receptionNote: "Show your booking confirmation at reception on arrival.",
  };
}

/* ------------------------------------------------------------------ */
/* Horario semanal                                                     */
/* ------------------------------------------------------------------ */

/** Mismo patrón de horario para todo el catálogo — dato de muestra único. */
const STANDARD_WEEK_HOURS = [
  "10:00 AM – 9:00 PM", // domingo
  "8:00 AM – 11:00 PM", // lunes
  "8:00 AM – 11:00 PM", // martes
  "8:00 AM – 11:00 PM", // miércoles
  "8:00 AM – 11:00 PM", // jueves
  "8:00 AM – 1:00 AM", // viernes
  "10:00 AM – 1:00 AM", // sábado
];

export interface HoursRow {
  label: string;
  hours: string;
  isToday?: boolean;
}

/**
 * Fila de hoy primero, y el resto de la semana agrupado en rangos cuando el
 * horario se repite — igual que `Main.dc.html`, pero calculado para
 * cualquier día de hoy, no solo el jueves que dibuja el artboard.
 */
export function operatingHoursFor(): HoursRow[] {
  const todayIndex = weekdayOf(TODAY);
  const order = Array.from({ length: 7 }, (_, i) => (todayIndex + i) % 7);
  const rows: HoursRow[] = [];

  let i = 0;
  while (i < order.length) {
    if (i === 0) {
      rows.push({
        label: `${WEEKDAY_NAMES[order[0]]} · Today`,
        hours: STANDARD_WEEK_HOURS[order[0]],
        isToday: true,
      });
      i++;
      continue;
    }

    let j = i;
    while (
      j + 1 < order.length &&
      STANDARD_WEEK_HOURS[order[j + 1]] === STANDARD_WEEK_HOURS[order[i]]
    ) {
      j++;
    }

    const label =
      j > i
        ? `${WEEKDAY_NAMES[order[i]]} – ${WEEKDAY_NAMES[order[j]]}`
        : WEEKDAY_NAMES[order[i]];

    rows.push({ label, hours: STANDARD_WEEK_HOURS[order[i]] });
    i = j + 1;
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/* Disponibilidad — capacidad y restricciones                          */
/* ------------------------------------------------------------------ */

/** Constante única para todo el catálogo — como en `Main.dc.html` ("de 40"). */
export const LOUNGE_CAPACITY = 40;

export const BOOKING_RESTRICTIONS = [
  "Annual and Signature members",
  "Book at least 2 hours ahead",
  "Admission for one member",
];

/* ------------------------------------------------------------------ */
/* Reseñas                                                              */
/* ------------------------------------------------------------------ */

export interface RatingBreakdownRow {
  stars: 5 | 4 | 3 | 2 | 1;
  count: number;
}

export interface LoungeReview {
  initials: string;
  name: string;
  tier: string;
  visitedOn: string;
  rating: number;
  text: string;
}

/** Belmont Terrace es el ejemplo de `NoRatings.dc.html`: cero reseñas. */
const REVIEW_COUNT_OVERRIDES: Record<string, number> = {
  "the-ainsworth": 128,
  "belmont-terrace": 0,
};

export function reviewCountFor(lounge: Lounge): number {
  const override = REVIEW_COUNT_OVERRIDES[lounge.id];
  if (override !== undefined) return override;

  return Math.max(1, Math.round(lounge.rating * 20));
}

const AINSWORTH_BREAKDOWN: RatingBreakdownRow[] = [
  { stars: 5, count: 96 },
  { stars: 4, count: 24 },
  { stars: 3, count: 5 },
  { stars: 2, count: 2 },
  { stars: 1, count: 1 },
];

/** Reparto plausible a partir de la valoración media: cuanto más alta, más se concentra en 5★. */
function genericBreakdown(rating: number, total: number): RatingBreakdownRow[] {
  if (total === 0) return [5, 4, 3, 2, 1].map((stars) => ({ stars: stars as 1|2|3|4|5, count: 0 }));

  const weights = {
    5: Math.max(0, rating - 3.5),
    4: 1,
    3: 0.4,
    2: 0.15,
    1: 0.08,
  };
  const weightSum = weights[5] + weights[4] + weights[3] + weights[2] + weights[1];

  const rows: RatingBreakdownRow[] = [5, 4, 3, 2, 1].map(
    (stars) => ({
      stars: stars as 5 | 4 | 3 | 2 | 1,
      count: Math.round((weights[stars as 5 | 4 | 3 | 2 | 1] / weightSum) * total),
    }),
  );

  const rounded = rows.reduce((sum, row) => sum + row.count, 0);
  rows[0].count += total - rounded;

  return rows;
}

export function ratingBreakdownFor(lounge: Lounge): RatingBreakdownRow[] {
  if (lounge.id === "the-ainsworth") return AINSWORTH_BREAKDOWN;

  return genericBreakdown(lounge.rating, reviewCountFor(lounge));
}

const AINSWORTH_MENTIONS = [
  { label: "Quiet", count: 62 },
  { label: "Fast WiFi", count: 48 },
  { label: "Staff", count: 41 },
  { label: "Coffee", count: 33 },
  { label: "Showers", count: 21 },
];

export function mentionsFor(lounge: Lounge): { label: string; count: number }[] {
  const total = reviewCountFor(lounge);
  if (total === 0) return [];
  if (lounge.id === "the-ainsworth") return AINSWORTH_MENTIONS;

  const hash = hashOf(lounge.id);

  return [
    { label: "Staff", count: Math.max(1, Math.round(total * 0.32)) },
    ...lounge.amenities.slice(0, 2).map((amenity, index) => ({
      label: amenityLabel(amenity),
      count: Math.max(1, Math.round(total * (0.24 - index * 0.08))),
    })),
  ].map((mention) => ({ ...mention, count: mention.count + (hash % 2) }));
}

const AINSWORTH_REVIEWS: LoungeReview[] = [
  {
    initials: "MC",
    name: "Marcus C.",
    tier: "Signature member",
    visitedOn: "Sep 4",
    rating: 5,
    text: "Took two calls from a quiet booth on Level 3 and nobody heard a thing. The espresso is better than most cafés around Grand Central, and reception held my bag until my evening train.",
  },
  {
    initials: "PN",
    name: "Priya N.",
    tier: "Annual member",
    visitedOn: "Aug 29",
    rating: 4,
    text: "Lovely space and the shower suites are spotless. Only note: the afternoon band fills fast, so book the moment you land.",
  },
  {
    initials: "EL",
    name: "Elena L.",
    tier: "Annual member",
    visitedOn: "Aug 21",
    rating: 5,
    text: "Checked in with the confirmation on my phone in under a minute. Staff walked me to a day room without me having to ask twice.",
  },
];

/** Genérica y neutra a propósito — no cita nada específico de un lounge en particular. */
const GENERIC_REVIEWS: LoungeReview[] = [
  {
    initials: "JR",
    name: "Jordan R.",
    tier: "Annual member",
    visitedOn: "Aug 30",
    rating: 5,
    text: "Checked in without any friction and the staff were attentive the whole visit. Would book again on a work trip.",
  },
  {
    initials: "SK",
    name: "Sam K.",
    tier: "Signature member",
    visitedOn: "Aug 12",
    rating: 4,
    text: "Comfortable space and quieter than I expected. The only downside is that the popular time bands fill up fast.",
  },
];

export function reviewsFor(lounge: Lounge): LoungeReview[] {
  if (reviewCountFor(lounge) === 0) return [];
  if (lounge.id === "the-ainsworth") return AINSWORTH_REVIEWS;

  return GENERIC_REVIEWS;
}

/* ------------------------------------------------------------------ */
/* Cierres por festivo                                                  */
/* ------------------------------------------------------------------ */

export interface Closure {
  startIso: string;
  endIso: string;
  reason: string;
  reopensLabel: string;
  postedOn: string;
}

/** Solo The Ainsworth declara un cierre — el que dibuja `Closure.dc.html`. */
const CLOSURES: Record<string, Closure[]> = {
  "the-ainsworth": [
    {
      startIso: "2025-11-27",
      endIso: "2025-11-28",
      reason: "Thanksgiving",
      reopensLabel: "Sat Nov 29 at 10:00 AM",
      postedOn: "Oct 30",
    },
  ],
};

export function closuresFor(lounge: Lounge): Closure[] {
  return CLOSURES[lounge.id] ?? [];
}

export function closureCovering(
  lounge: Lounge,
  dateIso: string,
): Closure | undefined {
  return closuresFor(lounge).find(
    (closure) => dateIso >= closure.startIso && dateIso <= closure.endIso,
  );
}

/* ------------------------------------------------------------------ */
/* Calendario semanal de disponibilidad                                */
/* ------------------------------------------------------------------ */

export const WEEK_BANDS = [
  { id: "morning", label: "Morning", hours: "8 AM – 12 PM" },
  { id: "afternoon", label: "Afternoon", hours: "12 – 5 PM" },
  { id: "evening", label: "Evening", hours: "5 – 9 PM" },
  { id: "late", label: "Late", hours: "9 – 11 PM" },
] as const;

export type WeekBandId = (typeof WEEK_BANDS)[number]["id"];

/** Qué franja de la Story 2.2 respalda cada franja del calendario semanal. */
const SUPPORTING_BAND: Record<WeekBandId, "morning" | "afternoon" | "evening"> = {
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  late: "evening",
};

/** El lunes de la semana en que cae `dateIso`. */
export function mondayOf(dateIso: string): string {
  const weekday = weekdayOf(dateIso);
  const backToMonday = weekday === 0 ? 6 : weekday - 1;

  return addDays(dateIso, -backToMonday);
}

/** La franja "actual" del mock: no hay hora real, así que la mañana de hoy ya pasó. */
const CURRENT_BAND_INDEX = 1;

export type CellStatus = "available" | "full" | "closed" | "past";

export interface AvailabilityCell {
  dateIso: string;
  band: WeekBandId;
  status: CellStatus;
  seatsLeft: number | null;
  closureReason?: string;
}

export function weeklyAvailability(
  lounge: Lounge,
  weekStartIso: string,
): AvailabilityCell[] {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartIso, i));
  const cells: AvailabilityCell[] = [];

  for (const dateIso of days) {
    const weekday = weekdayOf(dateIso);

    for (const [bandIndex, band] of WEEK_BANDS.entries()) {
      const closure = closureCovering(lounge, dateIso);
      const bandSupported = lounge.bands.includes(SUPPORTING_BAND[band.id]);

      if (closure) {
        cells.push({
          dateIso,
          band: band.id,
          status: "closed",
          seatsLeft: null,
          closureReason: closure.reason,
        });
        continue;
      }

      if (!bandSupported || lounge.closedWeekdays?.includes(weekday)) {
        cells.push({ dateIso, band: band.id, seatsLeft: null, status: "closed" });
        continue;
      }

      if (
        isPast(dateIso) ||
        (dateIso === TODAY && bandIndex < CURRENT_BAND_INDEX)
      ) {
        cells.push({ dateIso, band: band.id, seatsLeft: null, status: "past" });
        continue;
      }

      const seats = hashOf(`${lounge.id}|${dateIso}|${band.id}`) % 21;

      cells.push({
        dateIso,
        band: band.id,
        status: seats === 0 ? "full" : "available",
        seatsLeft: seats,
      });
    }
  }

  return cells;
}

/** El primer hueco libre desde hoy — usado por la card de "Not available". */
export function nextAvailableSlot(
  lounge: Lounge,
): { dateIso: string; band: WeekBandId; seatsLeft: number } | undefined {
  for (let week = 0; week < 3; week++) {
    const weekStart = addDays(mondayOf(TODAY), week * 7);
    const cells = weeklyAvailability(lounge, weekStart);
    const found = cells.find(
      (cell) =>
        cell.status === "available" &&
        (cell.dateIso > TODAY ||
          (cell.dateIso === TODAY &&
            WEEK_BANDS.findIndex((b) => b.id === cell.band) >=
              CURRENT_BAND_INDEX)),
    );

    if (found) {
      return { dateIso: found.dateIso, band: found.band, seatsLeft: found.seatsLeft! };
    }
  }

  return undefined;
}

/** "Sun, Sep 14" — reutilizado por la sub-vista de disponibilidad. */
export function formatWeekdayDate(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseDate(dateIso));
}
