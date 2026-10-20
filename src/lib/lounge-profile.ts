import type { SupabaseClient } from "@supabase/supabase-js";

import { amenityLabel } from "./amenities";
import { listLoungeSchedule, type LoungeSchedule } from "./lounge-schedule";
import { isFavoriteLounge } from "./profile";
import { addDays, isPast, minutesNow, parseDate, today, weekdayOf } from "./availability";
import type { LoungeRow } from "./lounge-directory";
import type { Lounge } from "./lounges";

/**
 * Story 3.1 / 3.2 — perfil real de un lounge (tabla `public.lounges`
 * extendida, más `lounge_images`/`lounge_closures` y la disponibilidad en
 * vivo de `lounge_availability_range`).
 * Sustituye la capa de derivación por hash que vivía aquí (ver historial de
 * este archivo): contacto, horario, capacidad y restricciones ya son
 * columnas reales; `reviewsFor`/`ratingBreakdownFor`/`mentionsFor` siguen
 * siendo datos de muestra a propósito — ninguna historia permite dejar una
 * reseña, así que no hay tabla `reviews` (ver docs/DATA-MODEL-MAP.md).
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
/* Perfil del lounge (Story 3.1)                                       */
/* ------------------------------------------------------------------ */

export interface LoungeProfile extends LoungeRow {
  address: string;
  phone: string;
  email: string;
  website: string;
  receptionNote: string;
  /** 7 entradas, domingo primero — ver `operatingHoursFor`. */
  weeklyHours: string[];
  /** Story 10.9 — la semana habitual, sin la temporada de hoy aplicada. */
  usualWeeklyHours: string[];
  reviewCount: number;
  capacity: number;
  bookingRestrictions: string[];
}

interface LoungeProfileTableRow {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  city_id: string;
  lat: number;
  lng: number;
  amenities: string[];
  rating: number;
  open_now: boolean;
  slots_today: number;
  hours: string;
  bands: string[];
  closed_weekdays: number[];
  featured: boolean;
  address: string;
  phone: string;
  email: string;
  website: string;
  reception_note: string;
  weekly_hours: string[];
  review_count: number;
  capacity: number;
  booking_restrictions: string[];
  partners: { name: string } | null;
}

function fromProfileRow(row: LoungeProfileTableRow): LoungeProfile {
  return {
    id: row.id,
    name: row.name,
    neighborhood: row.neighborhood,
    city: row.city,
    cityId: row.city_id,
    lat: row.lat,
    lng: row.lng,
    amenities: row.amenities as LoungeRow["amenities"],
    rating: row.rating,
    openNow: row.open_now,
    slotsToday: row.slots_today,
    hours: row.hours,
    bands: row.bands as LoungeRow["bands"],
    closedWeekdays: row.closed_weekdays,
    featured: row.featured,
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website,
    receptionNote: row.reception_note,
    weeklyHours: row.weekly_hours,
    usualWeeklyHours: row.weekly_hours,
    reviewCount: row.review_count,
    capacity: row.capacity,
    bookingRestrictions: row.booking_restrictions,
    partnerName: row.partners?.name ?? null,
  };
}

export async function fetchLoungeProfile(
  supabase: SupabaseClient,
  id: string,
): Promise<LoungeProfile | null> {
  const { data, error } = await supabase
    .from("lounges")
    .select("*, partners(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Story 10.9 — si hoy cae en una temporada, la ficha muestra su horario.
  const { data: season } = await supabase
    .from("lounge_seasons")
    .select("weekly_hours, closed_weekdays")
    .eq("lounge_id", id)
    .lte("starts_on", today())
    .gte("ends_on", today())
    .maybeSingle();
  const row = data as LoungeProfileTableRow;
  const profile = fromProfileRow(season ? { ...row, weekly_hours: season.weekly_hours, closed_weekdays: season.closed_weekdays } : row);
  return { ...profile, usualWeeklyHours: row.weekly_hours };
}

/* ------------------------------------------------------------------ */
/* Fotos (Story 3.1 — "Hero image carousel")                           */
/* ------------------------------------------------------------------ */

export interface LoungeImage {
  id: string;
  url: string;
  caption: string;
  detail?: string;
  position: number;
}

interface LoungeImageTableRow {
  id: string;
  url: string;
  caption: string;
  detail: string | null;
  position: number;
}

export async function fetchLoungeImages(
  supabase: SupabaseClient,
  loungeId: string,
): Promise<LoungeImage[]> {
  const { data, error } = await supabase
    .from("lounge_images")
    .select("id, url, caption, detail, position")
    .eq("lounge_id", loungeId)
    .order("position");

  if (error) throw error;

  return (data as LoungeImageTableRow[]).map((row) => ({
    id: row.id,
    url: row.url,
    caption: row.caption,
    detail: row.detail ?? undefined,
    position: row.position,
  }));
}

/* ------------------------------------------------------------------ */
/* Horario semanal (Story 3.1)                                         */
/* ------------------------------------------------------------------ */

export interface HoursRow {
  label: string;
  hours: string;
  isToday?: boolean;
}

/**
 * Fila de hoy primero, y el resto de la semana agrupado en rangos cuando el
 * horario se repite — `weeklyHours` viene de `LoungeProfile.weeklyHours`
 * (domingo primero, igual que `WEEKDAY_NAMES`).
 */
export function operatingHoursFor(weeklyHours: string[]): HoursRow[] {
  const todayIndex = weekdayOf(today());
  const order = Array.from({ length: 7 }, (_, i) => (todayIndex + i) % 7);
  const rows: HoursRow[] = [];

  let i = 0;
  while (i < order.length) {
    if (i === 0) {
      rows.push({
        label: `${WEEKDAY_NAMES[order[0]]} · Today`,
        hours: weeklyHours[order[0]],
        isToday: true,
      });
      i++;
      continue;
    }

    let j = i;
    while (
      j + 1 < order.length &&
      weeklyHours[order[j + 1]] === weeklyHours[order[i]]
    ) {
      j++;
    }

    const label =
      j > i
        ? `${WEEKDAY_NAMES[order[i]]} – ${WEEKDAY_NAMES[order[j]]}`
        : WEEKDAY_NAMES[order[i]];

    rows.push({ label, hours: weeklyHours[order[i]] });
    i = j + 1;
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/* Reseñas — datos de muestra (sin tabla, ver cabecera del archivo)     */
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

export function ratingBreakdownFor(lounge: LoungeProfile): RatingBreakdownRow[] {
  if (lounge.id === "the-ainsworth") return AINSWORTH_BREAKDOWN;

  return genericBreakdown(lounge.rating, lounge.reviewCount);
}

const AINSWORTH_MENTIONS = [
  { label: "Quiet", count: 62 },
  { label: "Fast WiFi", count: 48 },
  { label: "Staff", count: 41 },
  { label: "Coffee", count: 33 },
  { label: "Showers", count: 21 },
];

export function mentionsFor(lounge: LoungeProfile): { label: string; count: number }[] {
  const total = lounge.reviewCount;
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

export function reviewsFor(lounge: LoungeProfile): LoungeReview[] {
  if (lounge.reviewCount === 0) return [];
  if (lounge.id === "the-ainsworth") return AINSWORTH_REVIEWS;

  return GENERIC_REVIEWS;
}

/* ------------------------------------------------------------------ */
/* Disponibilidad semanal y cierres (Story 3.2)                        */
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

/** Hora (0–24) a la que termina cada franja de `WEEK_BANDS`, en el mismo orden. */
const BAND_END_HOURS = [12, 17, 21, 23];

/**
 * Cuántas franjas de hoy ya terminaron, con la hora real: las de índice
 * menor que este número están "past".
 */
export function currentBandIndex(minutes: number = minutesNow()): number {
  return BAND_END_HOURS.filter((hour) => hour * 60 <= minutes).length;
}

export type CellStatus = "available" | "full" | "closed" | "past";

export interface AvailabilityCell {
  dateIso: string;
  band: WeekBandId;
  status: CellStatus;
  seatsLeft: number | null;
  closureReason?: string;
}

export interface Closure {
  startIso: string;
  endIso: string;
  reason: string;
  reopensLabel: string;
}

interface AvailabilityTableRow {
  date: string;
  band: WeekBandId;
  seats_left: number;
}

interface ClosureTableRow {
  starts_on: string;
  ends_on: string;
  reason: string;
  reopens_label: string;
}

type LoungeAvailabilitySource = Pick<LoungeProfile, "id" | "bands" | "closedWeekdays">;

/**
 * Rango arbitrario de días (Story 4.1 — calendario mensual del booking flow
 * pide un mes entero, no una semana). `fetchWeeklyAvailability` de abajo es
 * el caso particular de 7 días que ya usaba la Story 3.2.
 */
export async function fetchAvailability(
  supabase: SupabaseClient,
  lounge: LoungeAvailabilitySource,
  startIso: string,
  endIso: string,
): Promise<AvailabilityCell[]> {
  const [availabilityResult, closuresResult] = await Promise.all([
    supabase.rpc("lounge_availability_range", {
      p_lounge_id: lounge.id,
      p_from: startIso,
      p_to: endIso,
    }),
    supabase
      .from("lounge_closures")
      .select("starts_on, ends_on, reason, reopens_label")
      .eq("lounge_id", lounge.id)
      .lte("starts_on", endIso)
      .gte("ends_on", startIso),
  ]);

  if (availabilityResult.error) throw availabilityResult.error;
  if (closuresResult.error) throw closuresResult.error;

  const seatsByKey = new Map<string, number>();
  for (const row of availabilityResult.data as AvailabilityTableRow[]) {
    seatsByKey.set(`${row.date}|${row.band}`, row.seats_left);
  }

  const closures = closuresResult.data as ClosureTableRow[];
  const dayCount = Math.round(
    (parseDate(endIso).getTime() - parseDate(startIso).getTime()) / 86_400_000,
  ) + 1;
  const days = Array.from({ length: dayCount }, (_, i) => addDays(startIso, i));
  const cells: AvailabilityCell[] = [];

  for (const dateIso of days) {
    const weekday = weekdayOf(dateIso);

    for (const [bandIndex, band] of WEEK_BANDS.entries()) {
      const closure = closures.find(
        (c) => dateIso >= c.starts_on && dateIso <= c.ends_on,
      );
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
        (dateIso === today() && bandIndex < currentBandIndex())
      ) {
        cells.push({ dateIso, band: band.id, seatsLeft: null, status: "past" });
        continue;
      }

      const seats = seatsByKey.get(`${dateIso}|${band.id}`) ?? 0;

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

/** Semana concreta (Story 3.2) — caso particular de `fetchAvailability`. */
export async function fetchWeeklyAvailability(
  supabase: SupabaseClient,
  lounge: LoungeAvailabilitySource,
  weekStartIso: string,
): Promise<AvailabilityCell[]> {
  return fetchAvailability(supabase, lounge, weekStartIso, addDays(weekStartIso, 6));
}

/** Cierres vigentes que tocan la semana de `weekStartIso` — para `ClosureBanner`. */
export async function fetchClosuresForWeek(
  supabase: SupabaseClient,
  loungeId: string,
  weekStartIso: string,
): Promise<Closure[]> {
  const weekEndIso = addDays(weekStartIso, 6);

  const { data, error } = await supabase
    .from("lounge_closures")
    .select("starts_on, ends_on, reason, reopens_label")
    .eq("lounge_id", loungeId)
    .lte("starts_on", weekEndIso)
    .gte("ends_on", weekStartIso);

  if (error) throw error;

  return (data as ClosureTableRow[]).map((row) => ({
    startIso: row.starts_on,
    endIso: row.ends_on,
    reason: row.reason,
    reopensLabel: row.reopens_label,
  }));
}

/** El primer hueco libre desde hoy — usado por la card de "Not available". */
export async function fetchNextAvailableSlot(
  supabase: SupabaseClient,
  lounge: LoungeAvailabilitySource,
): Promise<{ dateIso: string; band: WeekBandId; seatsLeft: number } | undefined> {
  for (let week = 0; week < 3; week++) {
    const weekStart = addDays(mondayOf(today()), week * 7);
    const cells = await fetchWeeklyAvailability(supabase, lounge, weekStart);
    const found = cells.find(
      (cell) =>
        cell.status === "available" &&
        (cell.dateIso > today() ||
          (cell.dateIso === today() &&
            WEEK_BANDS.findIndex((b) => b.id === cell.band) >=
              currentBandIndex())),
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

/* ------------------------------------------------------------------ */
/* Legacy — mock de disponibilidad, vivo a propósito para Epic 3       */
/* ------------------------------------------------------------------ */

/**
 * `contactFor`/`LoungeContact` (contacto derivado del catálogo mock) se
 * retiraron al conectar Epic 4 — las pantallas de `/lounges/[id]/book/*`
 * leen `lounge.address`/`phone`/etc. reales de `LoungeProfile` en su lugar.
 *
 * `weeklyAvailability`/`closureCovering`/`closuresFor`/`CLOSURES` siguen
 * vivas: no las usa ningún epic sin conectar, pero `findPredictedSlot`
 * (`lib/testing/lounge-fixture.ts`) usa `weeklyAvailability` como generador
 * de slots distintos entre tests — ya no predice plazas, que se calculan en
 * vivo (`lounge_availability_range`).
 */

/** Solo The Ainsworth declara un cierre — el que dibuja `Closure.dc.html`. */
const CLOSURES: Record<string, Closure[]> = {
  "the-ainsworth": [
    {
      startIso: "2025-11-27",
      endIso: "2025-11-28",
      reason: "Thanksgiving",
      reopensLabel: "Sat Nov 29 at 10:00 AM",
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
        (dateIso === today() && bandIndex < currentBandIndex())
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

/** Story 3.1/3.2 — la card de disponibilidad del perfil: plazas de hoy o el siguiente hueco libre. */
export interface TodayAvailability {
  seatsLeft: number;
  available: boolean;
  nextAvailable?: { dateIso: string; band: WeekBandId; seatsLeft: number };
  lastUpdatedAt: string;
}

export async function fetchTodayAvailability(
  supabase: SupabaseClient,
  lounge: LoungeProfile,
): Promise<TodayAvailability> {
  const todayIso = today();
  const cells = await fetchWeeklyAvailability(supabase, lounge, mondayOf(todayIso));
  const seatsLeft = cells
    .filter((cell) => cell.dateIso === todayIso && cell.status === "available")
    .reduce((sum, cell) => sum + (cell.seatsLeft ?? 0), 0);
  const available = seatsLeft > 0;

  return {
    seatsLeft,
    available,
    nextAvailable: available ? undefined : await fetchNextAvailableSlot(supabase, lounge),
    lastUpdatedAt: new Date().toISOString(),
  };
}

export interface LoungeProfileData {
  lounge: LoungeProfile;
  images: LoungeImage[];
  today: TodayAvailability;
  schedule: LoungeSchedule;
  favorite: boolean;
}

/**
 * PERF-02 — todo lo que pinta `/lounges/[id]`, en paralelo tras el perfil.
 * La página (Server Component) la llama con el cliente de servidor y los
 * tests con el de navegador: mismo resultado, misma RLS. `null` si el
 * lounge no existe o no es visible para el miembro.
 */
export async function loadLoungeProfile(supabase: SupabaseClient, id: string): Promise<LoungeProfileData | null> {
  const lounge = await fetchLoungeProfile(supabase, id);
  if (!lounge) return null;

  const [images, today, favorite, schedule] = await Promise.all([
    fetchLoungeImages(supabase, id),
    fetchTodayAvailability(supabase, lounge),
    isFavoriteLounge(supabase, id),
    listLoungeSchedule(supabase, id),
  ]);
  return { lounge, images, today, schedule, favorite };
}
