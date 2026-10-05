import type { SupabaseClient } from "@supabase/supabase-js";

import { today, addDays } from "@/lib/availability";
import type { HoursRow } from "@/lib/lounge-profile";

/**
 * Story 10.9 — temporadas (`lounge_seasons`) y cierres especiales
 * (`lounge_closures`) de un lounge. Los escribe solo el admin (RLS con
 * `has_role('admin')`); solapes, fechas y motivo los valida la base.
 * La disponibilidad (`lounge_availability_range`) ya los aplica.
 */

export interface LoungeSeasonInput {
  id?: string;
  name: string;
  startsOn: string;
  endsOn: string;
  /** Domingo primero, como `lounges.weekly_hours`; "Closed" = cerrado. */
  weeklyHours: string[];
}

export interface LoungeSeason extends LoungeSeasonInput {
  id: string;
}

export interface LoungeClosureInput {
  id?: string;
  startsOn: string;
  endsOn: string;
  reason: string;
  reopensLabel: string;
}

export interface LoungeClosure extends LoungeClosureInput {
  id: string;
}

export interface LoungeSchedule {
  seasons: LoungeSeason[];
  closures: LoungeClosure[];
}

function failure(error: { message: string; code?: string }): Error {
  if (error.code === "23514") {
    if (/reason/.test(error.message)) return new Error("A closure needs a reason");
    if (/dates|end date/.test(error.message)) return new Error("The end date can't be before the start date");
  }
  return new Error(error.message);
}

export async function listLoungeSchedule(supabase: SupabaseClient, loungeId: string): Promise<LoungeSchedule> {
  const [seasons, closures] = await Promise.all([
    supabase.from("lounge_seasons").select("id, name, starts_on, ends_on, weekly_hours").eq("lounge_id", loungeId).order("starts_on"),
    supabase.from("lounge_closures").select("id, starts_on, ends_on, reason, reopens_label").eq("lounge_id", loungeId).order("starts_on"),
  ]);
  if (seasons.error) throw failure(seasons.error);
  if (closures.error) throw failure(closures.error);
  return {
    seasons: seasons.data.map((row) => ({
      id: row.id,
      name: row.name,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      weeklyHours: row.weekly_hours as string[],
    })),
    closures: closures.data.map((row) => ({
      id: row.id,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      reason: row.reason,
      reopensLabel: row.reopens_label,
    })),
  };
}

/** Crea o, con `id`, edita una temporada. Devuelve su id. */
export async function saveLoungeSeason(supabase: SupabaseClient, loungeId: string, input: LoungeSeasonInput): Promise<string> {
  const row = {
    lounge_id: loungeId,
    name: input.name.trim(),
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    weekly_hours: input.weeklyHours,
  };
  const query = input.id
    ? supabase.from("lounge_seasons").update(row).eq("id", input.id).select("id").single()
    : supabase.from("lounge_seasons").insert(row).select("id").single();
  const { data, error } = await query;
  if (error) throw failure(error);
  return data.id;
}

export async function deleteLoungeSeason(supabase: SupabaseClient, seasonId: string): Promise<void> {
  const { error } = await supabase.from("lounge_seasons").delete().eq("id", seasonId);
  if (error) throw failure(error);
}

/** Crea o, con `id`, edita un cierre especial. Devuelve su id. */
export async function saveLoungeClosure(supabase: SupabaseClient, loungeId: string, input: LoungeClosureInput): Promise<string> {
  const row = {
    lounge_id: loungeId,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    reason: input.reason.trim(),
    reopens_label: input.reopensLabel.trim(),
  };
  const query = input.id
    ? supabase.from("lounge_closures").update(row).eq("id", input.id).select("id").single()
    : supabase.from("lounge_closures").insert({ ...row, posted_on: today() }).select("id").single();
  const { data, error } = await query;
  if (error) throw failure(error);
  return data.id;
}

export async function deleteLoungeClosure(supabase: SupabaseClient, closureId: string): Promise<void> {
  const { error } = await supabase.from("lounge_closures").delete().eq("id", closureId);
  if (error) throw failure(error);
}

export interface ClosureBooking {
  memberName: string;
  date: string;
  slotTime: string;
}

/** Reservas confirmadas que caerían en el cierre, para avisar antes de guardarlo. */
export async function closureBookings(supabase: SupabaseClient, loungeId: string, from: string, to: string): Promise<ClosureBooking[]> {
  const { data, error } = await supabase.rpc("admin_closure_bookings", { p_lounge_id: loungeId, p_from: from, p_to: to });
  if (error) throw failure(error);
  return (data as { member_name: string; date: string; slot_time: string }[]).map((row) => ({
    memberName: row.member_name,
    date: row.date,
    slotTime: row.slot_time,
  }));
}

/* Cálculos de pantalla (SeasonalFilled "Next 7 days", ClosureEdit "Reopens"). */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Lunes primero, como la ve el admin. */
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

function weekdayOf(dateIso: string): number {
  return new Date(`${dateIso}T12:00:00Z`).getUTCDay();
}

function isClosedHours(hours: string | undefined): boolean {
  return !hours || hours.trim() === "" || hours.trim().toLowerCase() === "closed";
}

export type DayHours =
  | { hours: string; source: "regular" }
  | { hours: string; source: "season"; season: string }
  | { hours: "Closed"; source: "closure"; reason: string };

/** Primero el cierre especial, luego la temporada y por último el horario habitual. */
export function dayHours(dateIso: string, regularWeek: string[], schedule: LoungeSchedule): DayHours {
  const closure = schedule.closures.find((c) => dateIso >= c.startsOn && dateIso <= c.endsOn);
  if (closure) return { hours: "Closed", source: "closure", reason: closure.reason };
  const weekday = weekdayOf(dateIso);
  const season = schedule.seasons.find((s) => dateIso >= s.startsOn && dateIso <= s.endsOn);
  if (season) {
    const hours = season.weeklyHours[weekday];
    return { hours: isClosedHours(hours) ? "Closed" : hours, source: "season", season: season.name };
  }
  const hours = regularWeek[weekday];
  return { hours: isClosedHours(hours) ? "Closed" : hours, source: "regular" };
}

/** El siguiente día abierto tras un cierre que acaba en `endsOn`, a su hora de apertura. */
export function defaultReopening(endsOn: string, regularWeek: string[], schedule: LoungeSchedule): { date: string; time: string } | null {
  for (let offset = 1; offset <= 366; offset++) {
    const date = addDays(endsOn, offset);
    const day = dayHours(date, regularWeek, schedule);
    if (day.hours !== "Closed") return { date, time: day.hours.split(/\s*[–-]\s*/)[0].trim() };
  }
  return null;
}

/** "Mon–Fri 7 AM – 11 PM · Sat–Sun 9 AM – 11 PM", o "Every day …" si todos coinciden. */
export function weekSummary(weeklyHours: string[]): string {
  // "7:00 AM" y "7 AM" son la misma hora: el resumen usa la forma corta.
  const hoursOf = (weekday: number) =>
    isClosedHours(weeklyHours[weekday]) ? "Closed" : weeklyHours[weekday].trim().replace(/:00(?=\s*[AP]M)/gi, "");
  if (MONDAY_FIRST.every((weekday) => hoursOf(weekday) === hoursOf(1))) return `Every day ${hoursOf(1)}`;
  const parts: string[] = [];
  let i = 0;
  while (i < MONDAY_FIRST.length) {
    let j = i;
    while (j + 1 < MONDAY_FIRST.length && hoursOf(MONDAY_FIRST[j + 1]) === hoursOf(MONDAY_FIRST[i])) j++;
    const label = j > i ? `${DAY_NAMES[MONDAY_FIRST[i]]}–${DAY_NAMES[MONDAY_FIRST[j]]}` : DAY_NAMES[MONDAY_FIRST[i]];
    parts.push(`${label} ${hoursOf(MONDAY_FIRST[i])}`);
    i = j + 1;
  }
  return parts.join(" · ");
}

/** Story 10.9 — lo que se añadió a un lounge nuevo antes de su primer guardado. */
export async function persistLoungeSchedule(supabase: SupabaseClient, loungeId: string, schedule: LoungeSchedule): Promise<void> {
  for (const { name, startsOn, endsOn, weeklyHours } of schedule.seasons) {
    await saveLoungeSeason(supabase, loungeId, { name, startsOn, endsOn, weeklyHours });
  }
  for (const { startsOn, endsOn, reason, reopensLabel } of schedule.closures) {
    await saveLoungeClosure(supabase, loungeId, { startsOn, endsOn, reason, reopensLabel });
  }
}

/* ------------------------------------------------------------------ */
/* Vista del miembro (SeasonalHours / NoSchedule / ClosedToday.dc.html) */
/* ------------------------------------------------------------------ */

export interface MemberSeason extends LoungeSeason {
  inEffect: boolean;
}

export interface MemberSchedule {
  /** En curso o futuras; las pasadas no se muestran. */
  seasons: MemberSeason[];
  /** Cierres que aún no han empezado (el de hoy va aparte, en `closedToday`). */
  closures: LoungeClosure[];
  inEffect: LoungeSeason | null;
  closedToday: LoungeClosure | null;
}

export function memberSchedule(schedule: LoungeSchedule, todayIso: string): MemberSchedule {
  const byStart = <T extends { startsOn: string }>(a: T, b: T) => a.startsOn.localeCompare(b.startsOn);
  const covers = (item: { startsOn: string; endsOn: string }) => item.startsOn <= todayIso && todayIso <= item.endsOn;

  const seasons = schedule.seasons
    .filter((season) => season.endsOn >= todayIso)
    .sort(byStart)
    .map((season) => ({ ...season, inEffect: covers(season) }));
  const closedToday = schedule.closures.find(covers) ?? null;

  return {
    seasons,
    closures: schedule.closures.filter((closure) => closure.startsOn > todayIso).sort(byStart),
    inEffect: seasons.find((season) => season.inEffect) ?? null,
    closedToday,
  };
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Los próximos 7 días desde hoy, cada uno con lo que manda (cierre →
 * temporada → semana habitual), agrupando los consecutivos iguales. Hoy va
 * siempre solo y primero, como `operatingHoursFor`.
 */
export function weekHoursFrom(todayIso: string, regularWeek: string[], schedule: LoungeSchedule): HoursRow[] {
  const days = Array.from({ length: 7 }, (_, i) => {
    const dateIso = addDays(todayIso, i);
    const day = dayHours(dateIso, regularWeek, schedule);
    return {
      name: WEEKDAY_NAMES[weekdayOf(dateIso)],
      hours: day.source === "closure" ? `Closed · ${day.reason}` : day.hours,
    };
  });

  const rows: HoursRow[] = [{ label: `${days[0].name} · Today`, hours: days[0].hours, isToday: true }];
  let i = 1;
  while (i < days.length) {
    let j = i;
    while (j + 1 < days.length && days[j + 1].hours === days[i].hours) j++;
    rows.push({ label: j > i ? `${days[i].name} – ${days[j].name}` : days[i].name, hours: days[i].hours });
    i = j + 1;
  }
  return rows;
}

function monthDay(dateIso: string, withYear: boolean): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${dateIso}T12:00:00Z`));
}

/** "Sep 1 – Sep 30, 2025", o "Dec 20, 2025 – Jan 4, 2026" si cruza de año. */
export function formatDateRange(startsOn: string, endsOn: string): string {
  const sameYear = startsOn.slice(0, 4) === endsOn.slice(0, 4);
  return `${monthDay(startsOn, !sameYear)} – ${monthDay(endsOn, true)}`;
}

/** "Season hours until Sep 30 · usual hours from Oct 1". */
export function seasonNote(season: LoungeSeason): string {
  return `Season hours until ${monthDay(season.endsOn, false)} · usual hours from ${monthDay(addDays(season.endsOn, 1), false)}`;
}

export function seasonTitle(season: LoungeSeason): string {
  return season.name.trim() || "Seasonal hours";
}
