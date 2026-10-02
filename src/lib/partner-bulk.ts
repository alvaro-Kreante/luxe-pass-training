import type { SupabaseClient } from "@supabase/supabase-js";

import { publishLounge, unpublishLounge } from "@/lib/admin-content";
import { reactivateLounge, suspendLounge, type AdminPartnerLounge, type PartnerStatus } from "@/lib/admin-partners";
import { hoursSummary } from "@/lib/lounge-draft";

/**
 * Story 10.11 — acciones masivas sobre los lounges de un partner
 * (PartnerBulkSelect 28 … PartnerBulkResult 34). Las mismas reglas que
 * lounge por lounge: el plan dice qué se aplica y qué se salta con su
 * motivo, y `runBulk` aplica cada uno por su cuenta para que un fallo no
 * frene a los demás.
 */

export type BulkLounge = Pick<AdminPartnerLounge, "id" | "name" | "contentStatus" | "suspendedBy" | "checklistMissing">;

export type BulkStatus = "live" | "draft" | "suspended";

export interface BulkSkip {
  lounge: BulkLounge;
  reason: string;
}

export interface BulkPlan {
  apply: BulkLounge[];
  skip: BulkSkip[];
}

export interface BulkOutcome {
  lounge: BulkLounge;
  ok: boolean;
  reason?: string;
}

function skipReason(lounge: BulkLounge, target: BulkStatus, partnerStatus: PartnerStatus): string | null {
  const from = lounge.contentStatus;
  if (target === "live") {
    if (from === "live") return "Already live";
    if (from === "suspended") return "Suspended — reactivate it as a draft first";
    if (partnerStatus !== "active") return "Won't publish: the partner isn't active";
    if (lounge.checklistMissing.length > 0) return `Won't publish: checklist incomplete · ${lounge.checklistMissing.join(", ")}`;
    return null;
  }
  if (target === "draft") return from === "draft" ? "Already a draft" : null;
  if (from === "suspended") return "Already suspended";
  return from === "live" ? null : "Only a live lounge can be suspended";
}

export function planStatusChange(lounges: BulkLounge[], target: BulkStatus, partnerStatus: PartnerStatus): BulkPlan {
  const plan: BulkPlan = { apply: [], skip: [] };
  for (const lounge of lounges) {
    const reason = skipReason(lounge, target, partnerStatus);
    if (reason) plan.skip.push({ lounge, reason });
    else plan.apply.push(lounge);
  }
  return plan;
}

/** La RPC de cada transición, la misma que usa la vista del lounge. */
export function statusAction(supabase: SupabaseClient, lounge: BulkLounge, target: BulkStatus): () => Promise<void> {
  if (target === "live") return () => publishLounge(supabase, lounge.id);
  if (target === "suspended") return () => suspendLounge(supabase, lounge.id);
  return lounge.contentStatus === "suspended" ? () => reactivateLounge(supabase, lounge.id) : () => unpublishLounge(supabase, lounge.id);
}

/** Aplica a cada lounge por separado; los saltados del plan salen como no aplicados. */
export async function runBulk(
  plan: BulkPlan,
  action: (lounge: BulkLounge) => () => Promise<void>,
): Promise<BulkOutcome[]> {
  const outcomes: BulkOutcome[] = [];
  for (const lounge of plan.apply) {
    try {
      await action(lounge)();
      outcomes.push({ lounge, ok: true });
    } catch (error) {
      outcomes.push({ lounge, ok: false, reason: error instanceof Error ? error.message : "Couldn't be changed" });
    }
  }
  return [...outcomes, ...plan.skip.map(({ lounge, reason }) => ({ lounge, ok: false, reason }))];
}

/** PartnerBulkHours (30) — sustituye la semana habitual, en cualquier status. */
export async function setLoungeHours(supabase: SupabaseClient, loungeId: string, weeklyHours: string[]): Promise<void> {
  const { error } = await supabase.rpc("admin_set_lounge_hours", {
    p_lounge_id: loungeId,
    p_weekly_hours: weeklyHours,
    p_hours: hoursSummary(weeklyHours),
  });
  if (error) throw new Error(error.message);
}
