import type { SupabaseClient } from "@supabase/supabase-js";

import { today } from "./availability";

/**
 * Story 9.2 (Referral Program) — conectada a Supabase real (`referrals`,
 * `referral_shares` y `profiles.referral_code`, ver
 * `supabase/schemas/referrals.sql`). El amigo llega por `/join/[code]` →
 * `/signup?ref=` y su fila de `referrals` nace al crear el perfil; el premio
 * pasa de "pending" a "credited" con su primer pago real liquidado (trigger
 * sobre `payments`) — decisiones de producto del 23 sept 2026, ver
 * `docs/design/COMPONENT-MAP.md` "Backend real — Epic 9".
 */

export type ReferralStatus = "credited" | "pending" | "invited" | "expired";

export interface ReferralInvitation {
  id: string;
  name: string;
  initials: string;
  email: string;
  sentLabel: string;
  status: ReferralStatus;
  /** "1 day pass" · "After their first payment" · "—" cuando aún no hay reserva de premio. */
  rewardLabel: string;
  /** Una invitación expirada se dibuja con el nombre atenuado. */
  inactive?: boolean;
  /** Fila acreditada en las últimas 48 h — `RewardCredited.dc.html` la resalta. */
  recentlyChanged?: boolean;
}

export interface ReferralStats {
  sentCount: number;
  sentNote: string;
  joinedCount: number;
  joinedNote: string;
  earnedCount: number;
  earnedNote: string;
}

export interface DayPassEntry {
  id: string;
  title: string;
  subtitle: string;
  icon: "referral" | "birthday" | "pending";
  pending?: boolean;
}

export const REFERRAL_INVITATION_EXPIRY_DAYS = 60;
export const REFERRAL_DAY_PASS_VALUE = 75;

const REFERRAL_CODE_SHAPE = /^[A-Z]{1,2}-SOLEIL-\d{2,4}$/;

/** El segmento de `/join/[code]` — normalizado, o `null` si no tiene forma de código. */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const code = decoded.trim().toUpperCase();
  return REFERRAL_CODE_SHAPE.test(code) ? code : null;
}

/** AC "Unique referral code generation" — persistido en `profiles.referral_code`. */
export async function ensureReferralCode(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc("my_referral_code");
  if (error) throw error;
  return data as string;
}

export type ReferralShareChannel = "messages" | "whatsapp" | "email" | "instagram" | "nearby" | "more" | "copy";

/** "Invitations sent" — `Share.dc.html` no pide el email del amigo, así que cuenta las veces que se comparte. */
export async function recordReferralShare(supabase: SupabaseClient, channel: ReferralShareChannel): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("referral_shares").insert({ member_id: user.id, channel });
  if (error) throw error;
}

interface ReferralRow {
  id: string;
  referrer_id: string;
  referee_id: string;
  referee_name: string;
  referee_email: string;
  status: "pending" | "credited";
  joined_at: string;
  credited_at: string | null;
}

export interface ReferralOverview {
  invitations: ReferralInvitation[];
  stats: ReferralStats;
  dayPasses: DayPassEntry[];
  readyDayPassCount: number;
  /** "1 from a referral, 1 for your birthday month." — `Main.dc.html`. */
  dayPassesNote: string;
  /** Algún premio se acreditó en las últimas 48 h (`RewardCredited.dc.html`). */
  recentlyCredited: boolean;
}

function initialsOf(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "?"
  );
}

function formatMonthDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

const RECENT_MS = 48 * 60 * 60 * 1000;

/**
 * AC "Referral tracking and status updates" + "Reward crediting". Day
 * passes: uno por referido acreditado (como referidor, o como amigo que
 * llegó con un código — "you each get a complimentary day pass") y el del
 * mes de cumpleaños (`profiles.birth_month`, contra el "hoy" de mockup).
 * Los ya gastados en una reserva no cancelada (`day_pass_redemptions`, misma
 * cuenta que `booking_coverage_for`) se descuentan de los listos.
 */
export async function fetchReferralOverview(
  supabase: SupabaseClient,
  { todayIso = today(), now = new Date() }: { todayIso?: string; now?: Date } = {},
): Promise<ReferralOverview> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [referralsResult, sharesResult, profileResult, redemptionsResult] = await Promise.all([
    supabase
      .from("referrals")
      .select("id, referrer_id, referee_id, referee_name, referee_email, status, joined_at, credited_at")
      .order("joined_at", { ascending: false }),
    supabase.from("referral_shares").select("id", { count: "exact", head: true }).eq("member_id", user.id),
    supabase.from("profiles").select("birth_month").eq("id", user.id).single(),
    supabase.from("day_pass_redemptions").select("source, bookings!inner(date, status)").eq("member_id", user.id),
  ]);
  if (referralsResult.error) throw referralsResult.error;
  if (sharesResult.error) throw sharesResult.error;
  if (profileResult.error) throw profileResult.error;
  if (redemptionsResult.error) throw redemptionsResult.error;

  const rows = referralsResult.data as ReferralRow[];
  const mine = rows.filter((row) => row.referrer_id === user.id);
  const welcome = rows.find((row) => row.referee_id === user.id && row.status === "credited");
  const credited = mine.filter((row) => row.status === "credited");
  const pending = mine.filter((row) => row.status === "pending");

  const invitations: ReferralInvitation[] = mine.map((row) => ({
    id: row.id,
    name: row.referee_name,
    initials: initialsOf(row.referee_name),
    email: row.referee_email,
    sentLabel: formatMonthDay(row.joined_at),
    status: row.status,
    rewardLabel: row.status === "credited" ? "1 day pass" : "After their first payment",
    recentlyChanged: row.credited_at != null && now.getTime() - Date.parse(row.credited_at) < RECENT_MS,
  }));

  const sentCount = sharesResult.count ?? 0;
  const stats: ReferralStats = {
    sentCount,
    sentNote: sentCount === 0 ? "Share your code to start" : "By message, email or link",
    joinedCount: mine.length,
    joinedNote: mine.length === 0 ? "No one yet" : listNames(mine.map((row) => firstName(row.referee_name))),
    earnedCount: credited.length,
    earnedNote: `${formatUsd(credited.length * REFERRAL_DAY_PASS_VALUE)} · ${
      pending.length === 0 ? "nothing pending" : `${pending.length} more pending`
    }`,
  };

  const birthMonth = (profileResult.data as { birth_month: number | null }).birth_month;
  const today = new Date(`${todayIso}T00:00:00Z`);
  const redemptions = (
    redemptionsResult.data as unknown as { source: "referral" | "birthday"; bookings: { date: string; status: string } }[]
  ).filter((row) => row.bookings.status !== "cancelled");
  const birthdayUsed = redemptions.some(
    (row) => row.source === "birthday" && row.bookings.date.slice(0, 4) === todayIso.slice(0, 4),
  );
  const referralUsed = redemptions.filter((row) => row.source === "referral").length;
  const hasBirthdayPass = birthMonth === today.getUTCMonth() + 1 && !birthdayUsed;
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(today);

  const referralPassCount = Math.max(0, credited.length + (welcome ? 1 : 0) - referralUsed);
  const referralSources = [...credited.map((row) => firstName(row.referee_name)), ...(welcome ? ["your welcome"] : [])];

  const dayPasses: DayPassEntry[] = [];
  if (referralPassCount > 0) {
    dayPasses.push({
      id: "referral",
      title: referralPassCount === 1 ? "1 referral day pass" : `${referralPassCount} referral day passes`,
      subtitle: referralUsed === 0 ? `From ${listNames(referralSources)} · ready to use` : "Ready to use",
      icon: "referral",
    });
  }
  if (hasBirthdayPass) {
    dayPasses.push({ id: "birthday", title: "1 birthday day pass", subtitle: `Yours all ${monthName}`, icon: "birthday" });
  }
  if (pending.length > 0) {
    dayPasses.push({
      id: "pending",
      title: `${pending.length} pending`,
      subtitle: `From ${listNames(pending.map((row) => firstName(row.referee_name)))} · after their first payment`,
      icon: "pending",
      pending: true,
    });
  }

  const noteParts: string[] = [];
  if (referralPassCount > 0) {
    noteParts.push(`${referralPassCount} from ${referralPassCount === 1 ? "a referral" : "referrals"}`);
  }
  if (hasBirthdayPass) noteParts.push("1 for your birthday month");

  return {
    invitations,
    stats,
    dayPasses,
    readyDayPassCount: referralPassCount + (hasBirthdayPass ? 1 : 0),
    dayPassesNote: noteParts.length ? `${noteParts.join(", ")}.` : "",
    recentlyCredited: invitations.some((invitation) => invitation.recentlyChanged),
  };
}

/* ------------------------------------------------------------------ */
/* Términos del programa — `Terms.dc.html`                              */
/* ------------------------------------------------------------------ */

export const REFERRAL_TERMS_VERSION_LABEL =
  "Version 1.2 · in force since August 1, 2026 · part of the LuxePass member agreement";

export const REFERRAL_TERMS_NUMBERS = [
  { label: "The reward", value: "1 day pass", note: "Each · worth $75.00" },
  { label: "Qualifies when", value: "They pay", note: "First membership charge" },
  { label: "Paid within", value: "48 hours", note: "Pending until then" },
];

export const REFERRAL_TERMS_CLAUSES = [
  {
    title: "1. What you both get",
    body: "For every friend who joins LuxePass with your code, one complimentary day pass is credited to your account and one to theirs. A day pass admits one person to any lounge in the network for a single visit, and is worth $75.00 at the member rate.",
  },
  {
    title: "2. What counts as a referral",
    body: "Your friend must be new to LuxePass, must enter your code when they sign up, and must do so within 60 days of the invitation being sent. After 60 days the invitation expires and can be sent again. Only the first code entered on an account counts.",
  },
  {
    title: "3. When the reward is credited",
    body: "The pass shows as Pending from the moment your friend signs up, and is credited within 48 hours of their first membership payment settling. If that payment fails or is refunded, the pending reward is withdrawn and you are told why.",
  },
  {
    title: "4. Using your day passes",
    body: "Referral passes are additional to the 8 visits included with your membership, and are used before those included visits. They can be booked at any of the twelve lounges, subject to the same availability and cancellation rules as any other visit. They have no cash value, cannot be transferred or sold, and remain valid for as long as your membership is active.",
  },
  {
    title: "5. Limits",
    body: "Up to 10 referral day passes can be earned per membership year. One reward is paid per person referred, however many invitations they receive. You cannot refer yourself, and accounts that share a payment method or a home address count as one person.",
  },
  {
    title: "6. Fair use",
    body: "En Soleil may withdraw a reward, retire a code or close the programme where invitations are sent in bulk, where accounts are created to collect rewards, or where the terms are otherwise worked around. We write to you before doing so, and support can review the decision.",
  },
  {
    title: "7. Changes to this programme",
    body: "These terms may change with 30 days' notice by email. Passes already credited are unaffected by a change, and a pending reward is settled under the terms in force on the day the invitation was accepted.",
  },
];

/** Bloque "What they receive" del `ReferralShareModal` (`Share.dc.html`). */
export function referralInviteMessage(memberFirstName: string, code: string) {
  return `${memberFirstName} has invited you to LuxePass. Join with the code ${code} and your first day at any of our twelve lounges is on us.`;
}
