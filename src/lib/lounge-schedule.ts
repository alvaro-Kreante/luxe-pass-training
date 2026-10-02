import type { SupabaseClient } from "@supabase/supabase-js";

import { TODAY } from "@/lib/availability";

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
    : supabase.from("lounge_closures").insert({ ...row, posted_on: TODAY }).select("id").single();
  const { data, error } = await query;
  if (error) throw failure(error);
  return data.id;
}

export async function deleteLoungeClosure(supabase: SupabaseClient, closureId: string): Promise<void> {
  const { error } = await supabase.from("lounge_closures").delete().eq("id", closureId);
  if (error) throw failure(error);
}

/** Reservas confirmadas que caerían en el cierre, para avisar antes de guardarlo. */
export async function closureBookingCount(supabase: SupabaseClient, loungeId: string, from: string, to: string): Promise<number> {
  const { data, error } = await supabase.rpc("admin_closure_booking_count", { p_lounge_id: loungeId, p_from: from, p_to: to });
  if (error) throw failure(error);
  return data as number;
}
