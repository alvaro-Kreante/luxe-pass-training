import type { SupabaseClient } from "@supabase/supabase-js";

import { today } from "./availability";
import { ensureReferralCode, fetchReferralOverview } from "./referrals";
import { listSavedPaymentMethods, type SavedPaymentMethod } from "./stripe-payments";

/**
 * Story 9.1 (Membership) — conectada a Supabase real (`memberships`, nace en
 * Epic 9, ver `supabase/schemas/memberships.sql`) y a Stripe real en modo
 * test (Edge Functions `stripe-membership-checkout` y `membership-renewal`).
 * Decisiones de producto del 23 sept 2026: el miembro nace sin membresía
 * hasta elegir plan; elegir/subir de plan es un cobro puntual, y la
 * renovación automática cobra la tarjeta guardada al vencer el término (sin
 * Stripe Billing); el paso de anual a mensual se programa para el final del
 * término — ver `docs/design/COMPONENT-MAP.md` "Backend real — Epic 9".
 *
 * `DESIGN-SYSTEM.md` §6 Fase 9 fija el modelo de negocio: un plan mensual de
 * $249.00 frente a los $2,400.00 anuales ya fijados en la Fase 5 — el anual
 * ahorra $588.00 al año ($249 × 12 = $2,988). Los dos planes dan exactamente
 * lo mismo; solo cambia la periodicidad, el precio y que el anual congela la
 * tarifa durante el término. Los precios en centavos están duplicados en
 * `membership_change_quote` (SQL no lee TS).
 */

export type PlanId = "annual" | "monthly";

export const MONTHLY_PRICE = 249.0;
export const ANNUAL_PRICE = 2400.0;
export const MONTHLY_ANNUALIZED_PRICE = 2988.0;
export const ANNUAL_SAVINGS = 588.0;
export const DAY_PASS_PRICE = 75.0;
export const MEMBERSHIP_VISITS_INCLUDED = 8;

export function priceForPlan(plan: PlanId): number {
  return plan === "annual" ? ANNUAL_PRICE : MONTHLY_PRICE;
}

/* ------------------------------------------------------------------ */
/* Formato — siempre en UTC, igual que el resto de la app               */
/* ------------------------------------------------------------------ */

/** "November 2025" — "Member since". */
export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

/** "November 3, 2026" — renovación / próximo cargo. */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

/** "October 3" — el aviso de un mes antes (`Main.dc.html`). */
export function formatMonthDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

/** "Sept 12, 2026" — rango del nuevo término (`Upgrade.dc.html`). */
export function formatShortDate(iso: string): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
  return formatted.replace(/^Sep /, "Sept ");
}

/* ------------------------------------------------------------------ */
/* Backend real — `memberships`                                         */
/* ------------------------------------------------------------------ */

export interface MemberMembership {
  status: "active" | "inactive";
  plan: PlanId | null;
  startedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  /** Plan con el que se renovará el término siguiente (hoy, solo anual → mensual). */
  pendingPlan: PlanId | null;
}

interface MembershipRow {
  plan: PlanId;
  status: "active" | "expired";
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  auto_renew: boolean;
  pending_plan: PlanId | null;
}

/** AC "Clear membership display in profile (active/inactive)". Sin fila (o vencida) = inactiva. */
export async function fetchMembership(supabase: SupabaseClient): Promise<MemberMembership> {
  const { data, error } = await supabase
    .from("memberships")
    .select("plan, status, started_at, current_period_start, current_period_end, auto_renew, pending_plan")
    .maybeSingle();
  if (error) throw error;

  const row = data as MembershipRow | null;
  if (!row || row.status !== "active") {
    return {
      status: "inactive",
      plan: null,
      startedAt: row?.started_at ?? null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      autoRenew: false,
      pendingPlan: null,
    };
  }

  return {
    status: "active",
    plan: row.plan,
    startedAt: row.started_at,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    autoRenew: row.auto_renew,
    pendingPlan: row.pending_plan,
  };
}

export interface MembershipQuote {
  kind: "join" | "upgrade";
  plan: PlanId;
  termStart: string;
  termEnd: string;
  chargeCents: number;
  creditCents: number;
  creditDays: number;
  dueCents: number;
}

interface QuoteRow {
  kind: "join" | "upgrade";
  plan: PlanId;
  term_start: string;
  term_end: string;
  charge_cents: number;
  credit_cents: number;
  credit_days: number;
  due_cents: number;
}

/** AC "Upgrade options... (monthly → yearly price)". El servidor decide el importe, no el navegador. */
export async function fetchMembershipQuote(supabase: SupabaseClient, plan: PlanId): Promise<MembershipQuote> {
  const { data, error } = await supabase.rpc("membership_change_quote", { p_plan: plan });
  if (error) throw error;

  const row = (data as QuoteRow[])[0];
  if (!row) throw new Error("No quote returned");
  return {
    kind: row.kind,
    plan: row.plan,
    termStart: row.term_start,
    termEnd: row.term_end,
    chargeCents: row.charge_cents,
    creditCents: row.credit_cents,
    creditDays: row.credit_days,
    dueCents: row.due_cents,
  };
}

export interface MembershipChargeResult {
  paymentId: string;
  status: "succeeded" | "failed";
  error: string | null;
}

/** Tarjeta guardada — cobro puntual servidor a servidor; el plan se activa en la misma respuesta. */
export async function chargeMembershipWithSavedCard(
  supabase: SupabaseClient,
  request: { plan: PlanId; paymentMethodId: string },
): Promise<MembershipChargeResult> {
  const { data, error } = await supabase.functions.invoke("stripe-membership-checkout", {
    body: { action: "charge_saved", ...request },
  });
  if (error) throw error;
  return data as MembershipChargeResult;
}

/** Tarjeta nueva — Checkout Session `ui_mode: "elements"`; el plan se activa cuando el webhook liquida el pago. */
export async function createMembershipCheckoutSession(
  supabase: SupabaseClient,
  request: { plan: PlanId; saveCard: boolean },
): Promise<{ clientSecret: string; paymentId: string }> {
  const { data, error } = await supabase.functions.invoke("stripe-membership-checkout", {
    body: { action: "create_session", ...request },
  });
  if (error) throw error;
  return data as { clientSecret: string; paymentId: string };
}

/**
 * Tras `checkout.confirm()` el webhook de Stripe llega de forma asíncrona —
 * mismo reintento corto que `findSettledPayment` en `send-booking-receipt`.
 */
export async function waitForMembershipPlan(
  supabase: SupabaseClient,
  plan: PlanId,
  { attempts = 10, delayMs = 1000 }: { attempts?: number; delayMs?: number } = {},
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const membership = await fetchMembership(supabase);
    if (membership.status === "active" && membership.plan === plan) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

/** AC "Renewal date and auto-renewal settings". Apagarla cancela sin tarifa las reservas posteriores al término. */
export async function setMembershipAutoRenew(supabase: SupabaseClient, autoRenew: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_membership_auto_renew", { p_auto_renew: autoRenew });
  if (error) throw error;
}

/**
 * Anual → mensual (`Plans.dc.html`: "Moving to monthly waits until your
 * current term ends"). No cobra nada hoy: la renovación del término cobra
 * ya el mensual (Edge Function `membership-renewal`).
 */
export async function scheduleMembershipPlanChange(supabase: SupabaseClient, plan: PlanId): Promise<void> {
  const { error } = await supabase.rpc("schedule_membership_plan_change", { p_plan: plan });
  if (error) throw error;
}

/** Deshace un paso a mensual programado — el término siguiente vuelve a ser anual. */
export async function cancelMembershipPlanChange(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("cancel_membership_plan_change");
  if (error) throw error;
}

/** "Visits this month" — reservas del mes de `todayIso` (el "hoy" de mockup) sin day pass pagado detrás. */
export async function fetchVisitsThisMonth(
  supabase: SupabaseClient,
  todayIso: string = today(),
): Promise<{ used: number; included: number }> {
  const { data, error } = await supabase.rpc("membership_visits_in_month", { p_month: todayIso });
  if (error) throw error;
  return { used: data as number, included: MEMBERSHIP_VISITS_INCLUDED };
}

/* ------------------------------------------------------------------ */
/* Cuenta completa para `/profile/membership`                          */
/* ------------------------------------------------------------------ */

export interface BillingCard {
  brand: string;
  last4: string;
  expiry: string;
}

export interface MembershipAccount {
  memberName: string;
  initials: string;
  status: "active" | "inactive";
  plan: PlanId | null;
  /** Plan con el que se renovará el término siguiente (paso a mensual programado). */
  pendingPlan: PlanId | null;
  memberSince: string;
  /** "November 3, 2026" (anual, fecha de renovación) u "October 4, 2026" (mensual, próximo cargo). */
  renewalOrChargeDateLabel: string;
  /** "October 3" — un mes antes de la renovación del anual. */
  renewalNoticeDateLabel: string;
  /** "October 3" — hasta cuándo está pagado el término actual (`MonthlyPlan.dc.html`). */
  paidUpToLabel: string;
  /** Días que quedan del término actual — los que acredita la subida a anual (mismo cálculo que `membership_change_quote`). */
  unusedDaysInTerm: number;
  billingCard: BillingCard | null;
  autoRenewal: boolean;
  visitsUsed: number;
  visitsIncluded: number;
  visitsResetLabel: string;
  referralCode: string;
  referralsSentCount: number;
  referralsSummary: string;
  complimentaryDayPassesCount: number;
  complimentaryDayPassesNote: string;
  invoiceCount?: number;
}

export function billingCardFrom(methods: SavedPaymentMethod[]): BillingCard | null {
  const method = methods.find((m) => m.isDefault) ?? methods[0];
  if (!method) return null;
  return {
    brand: method.brand,
    last4: method.last4,
    expiry: `${String(method.expMonth).padStart(2, "0")}/${String(method.expYear).slice(-2)}`,
  };
}

export function cardBrandLabel(brand: string): string {
  if (brand === "visa") return "Visa";
  if (brand === "mastercard") return "Mastercard";
  if (brand === "amex") return "American Express";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function initialsOf(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "LP"
  );
}

/** "Resets on October 1" — el primer día del mes siguiente al "hoy" de mockup. */
export function visitsResetLabel(todayIso: string = today()): string {
  const today = new Date(`${todayIso}T00:00:00Z`);
  const next = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  return `Resets on ${formatMonthDay(next.toISOString())}`;
}

/** Días que quedan hasta `periodEndIso`, redondeando hacia arriba — igual que `membership_change_quote`. */
export function unusedDaysUntil(periodEndIso: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((Date.parse(periodEndIso) - now.getTime()) / 86400000));
}

/** Un mes antes de la renovación — `Main.dc.html` "We email you on October 3 — a month before". */
export function renewalNoticeDate(periodEndIso: string): string {
  const end = new Date(periodEndIso);
  return new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, end.getUTCDate())).toISOString();
}

export async function fetchMembershipAccount(supabase: SupabaseClient): Promise<MembershipAccount> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [profile, membership, visits, referralCode, referrals, methods] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    fetchMembership(supabase),
    fetchVisitsThisMonth(supabase),
    ensureReferralCode(supabase),
    fetchReferralOverview(supabase),
    listSavedPaymentMethods(supabase).catch(() => [] as SavedPaymentMethod[]),
  ]);
  if (profile.error) throw profile.error;

  const fullName = (profile.data as { full_name: string }).full_name;
  const { invitations, stats, readyDayPassCount, dayPassesNote } = referrals;

  return {
    memberName: fullName,
    initials: initialsOf(fullName),
    status: membership.status,
    plan: membership.plan,
    pendingPlan: membership.pendingPlan,
    memberSince: membership.startedAt ? formatMonthYear(membership.startedAt) : "",
    renewalOrChargeDateLabel: membership.currentPeriodEnd ? formatLongDate(membership.currentPeriodEnd) : "",
    renewalNoticeDateLabel: membership.currentPeriodEnd
      ? formatMonthDay(renewalNoticeDate(membership.currentPeriodEnd))
      : "",
    paidUpToLabel: membership.currentPeriodEnd ? formatMonthDay(membership.currentPeriodEnd) : "",
    unusedDaysInTerm: membership.currentPeriodEnd ? unusedDaysUntil(membership.currentPeriodEnd) : 0,
    billingCard: billingCardFrom(methods),
    autoRenewal: membership.autoRenew,
    visitsUsed: visits.used,
    visitsIncluded: visits.included,
    visitsResetLabel: visitsResetLabel(),
    referralCode,
    referralsSentCount: stats.sentCount,
    referralsSummary: referralsRailSummary(invitations.length, stats.earnedCount),
    complimentaryDayPassesCount: readyDayPassCount,
    complimentaryDayPassesNote: dayPassesNote,
  };
}

/** "2 friends joined with your code. 1 day pass is credited, 1 is still pending." */
export function referralsRailSummary(joined: number, credited: number): string {
  if (joined === 0) return "Share your code and you each get a complimentary day pass when they join.";
  const pending = joined - credited;
  const friends = joined === 1 ? "1 friend joined" : `${joined} friends joined`;
  const creditedText = credited === 1 ? "1 day pass is credited" : `${credited} day passes are credited`;
  const pendingText = pending === 1 ? "1 is still pending" : `${pending} are still pending`;
  return `${friends} with your code. ${creditedText}${pending > 0 ? `, ${pendingText}` : ""}.`;
}

/* ------------------------------------------------------------------ */
/* Beneficios — "What your membership includes" (Main.dc.html)         */
/* ------------------------------------------------------------------ */

export interface MembershipBenefit {
  id: string;
  title: string;
  subtitle: string;
}

export const MEMBERSHIP_BENEFITS: MembershipBenefit[] = [
  { id: "visits", title: "8 visits every month", subtitle: "Book any lounge, any day it has room" },
  { id: "lounges", title: "12 lounges, 3 cities", subtitle: "New York, Miami and Los Angeles" },
  { id: "birthday", title: "A day pass each birthday month", subtitle: "On top of your included visits" },
  { id: "referral", title: "A day pass per friend who joins", subtitle: "For you and for them, with your code" },
  { id: "cancellation", title: "Free cancellation", subtitle: "Up to 24 hours before you arrive" },
  { id: "support", title: "Support from any booking", subtitle: "Moves, refunds and waivers" },
];

export const EXTRA_VISIT_PRICE_LABEL = "$75.00";

/* ------------------------------------------------------------------ */
/* Comparación de planes — `Plans.dc.html`                              */
/* ------------------------------------------------------------------ */

export interface PlanComparisonRow {
  label: string;
  /** `true`/`false` se dibujan como check dorado o `—`; un string se dibuja tal cual. */
  monthly: string | boolean;
  annual: string | boolean;
  /** La fila de total va resaltada y con la cifra ganadora en dorado. */
  isTotal?: boolean;
}

export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = [
  { label: "Included visits each month", monthly: "8", annual: "8" },
  { label: "Lounges you can book", monthly: "All 12", annual: "All 12" },
  { label: "Extra visits, at the member day pass rate", monthly: "$75.00", annual: "$75.00" },
  { label: "Free cancellation up to 24 hours before", monthly: true, annual: true },
  { label: "A day pass in your birthday month", monthly: true, annual: true },
  { label: "A day pass for every friend who joins with your code", monthly: true, annual: true },
  { label: "Your rate held for the whole term", monthly: false, annual: true },
  { label: "What twelve months costs", monthly: "$2,988.00", annual: "$2,400.00", isTotal: true },
];

/* ------------------------------------------------------------------ */
/* Fixtures de componente (sin Supabase) — cuentas de los artboards     */
/* ------------------------------------------------------------------ */

/** Alexandra Rivas, anual (`Main.dc.html`). Solo para tests de componente, no toca Supabase. */
export const ALEXANDRA_MEMBERSHIP: MembershipAccount = {
  memberName: "Alexandra Rivas",
  initials: "AR",
  status: "active",
  plan: "annual",
  pendingPlan: null,
  memberSince: "November 2025",
  renewalOrChargeDateLabel: "November 3, 2026",
  renewalNoticeDateLabel: "October 3",
  paidUpToLabel: "November 3",
  unusedDaysInTerm: 41,
  billingCard: { brand: "visa", last4: "4242", expiry: "04/29" },
  autoRenewal: true,
  visitsUsed: 3,
  visitsIncluded: 8,
  visitsResetLabel: "Resets on October 1",
  referralCode: "AR-SOLEIL-24",
  referralsSentCount: 5,
  referralsSummary: referralsRailSummary(2, 1),
  complimentaryDayPassesCount: 2,
  complimentaryDayPassesNote: "1 from a referral, 1 for your birthday month.",
};

/** Naomi Feldstein, mensual (`MonthlyPlan.dc.html`). Solo para tests de componente. */
export const NAOMI_MEMBERSHIP: MembershipAccount = {
  memberName: "Naomi Feldstein",
  initials: "NF",
  status: "active",
  plan: "monthly",
  pendingPlan: null,
  memberSince: "July 2026",
  renewalOrChargeDateLabel: "October 4, 2026",
  renewalNoticeDateLabel: "September 4",
  paidUpToLabel: "October 3",
  unusedDaysInTerm: 22,
  billingCard: { brand: "mastercard", last4: "8813", expiry: "11/28" },
  autoRenewal: true,
  visitsUsed: 5,
  visitsIncluded: 8,
  visitsResetLabel: "Resets Oct 1",
  referralCode: "NF-SOLEIL-26",
  invoiceCount: 3,
  referralsSentCount: 0,
  referralsSummary: referralsRailSummary(0, 0),
  complimentaryDayPassesCount: 0,
  complimentaryDayPassesNote: "",
};
