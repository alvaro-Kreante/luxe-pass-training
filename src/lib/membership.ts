import { MEMBERSHIP_SUMMARY, REFERRAL_CODE } from "./profile";
import { VISITS_THIS_MONTH } from "./passes";

/**
 * Story 9.1 (Membership). Sin backend: los dos planes, la cuenta anual de
 * Alexandra Rivas (reutiliza `MEMBERSHIP_SUMMARY`/`REFERRAL_CODE` de
 * `lib/profile.ts` y `VISITS_THIS_MONTH` de `lib/passes.ts`) y la cuenta
 * mensual de Naomi Feldstein son datos de muestra deterministas.
 *
 * `DESIGN-SYSTEM.md` §6 Fase 9 fija el modelo de negocio: un plan mensual de
 * $249.00 frente a los $2,400.00 anuales ya fijados en la Fase 5 — el anual
 * ahorra $588.00 al año ($249 × 12 = $2,988). Los dos planes dan exactamente
 * lo mismo; solo cambia la periodicidad, el precio y que el anual congela la
 * tarifa durante el término.
 */

export type PlanId = "annual" | "monthly";

export const MONTHLY_PRICE = 249.0;
export const ANNUAL_PRICE = 2400.0;
export const MONTHLY_ANNUALIZED_PRICE = 2988.0;
export const ANNUAL_SAVINGS = 588.0;
export const DAY_PASS_PRICE = 75.0;

export interface BillingCard {
  brand: "visa" | "mastercard";
  last4: string;
  expiry: string;
}

export interface MembershipAccount {
  memberName: string;
  initials: string;
  plan: PlanId;
  memberSince: string;
  /** "November 3, 2026" (anual, fecha de renovación) u "October 4, 2026" (mensual, próximo cargo). */
  renewalOrChargeDateLabel: string;
  billingCard: BillingCard;
  autoRenewal: boolean;
  visitsUsed: number;
  visitsIncluded: number;
  visitsResetLabel: string;
  referralCode: string;
  invoiceCount?: number;
  referralsSentCount: number;
}

/**
 * `MEMBERSHIP_SUMMARY.memberSince` corrige "March 2026" (Epic 6) a
 * "November 2025" en `lib/profile.ts` — ver COMPONENT-MAP.md, desviación de
 * la Fase 9 sobre el término de doce meses que no cuadraba con la renovación
 * de noviembre de 2026.
 */
export const ALEXANDRA_MEMBERSHIP: MembershipAccount = {
  memberName: "Alexandra Rivas",
  initials: "AR",
  plan: "annual",
  memberSince: MEMBERSHIP_SUMMARY.memberSince,
  renewalOrChargeDateLabel: MEMBERSHIP_SUMMARY.renews,
  billingCard: { brand: "visa", last4: "4242", expiry: "04/29" },
  autoRenewal: true,
  visitsUsed: VISITS_THIS_MONTH.used,
  visitsIncluded: VISITS_THIS_MONTH.included,
  visitsResetLabel: "Resets on October 1",
  referralCode: REFERRAL_CODE,
  referralsSentCount: 5,
};

export const NAOMI_MEMBERSHIP: MembershipAccount = {
  memberName: "Naomi Feldstein",
  initials: "NF",
  plan: "monthly",
  memberSince: "July 2026",
  renewalOrChargeDateLabel: "October 4, 2026",
  billingCard: { brand: "mastercard", last4: "8813", expiry: "11/28" },
  autoRenewal: true,
  visitsUsed: 5,
  visitsIncluded: 8,
  visitsResetLabel: "Resets Oct 1",
  referralCode: "NF-SOLEIL-26",
  invoiceCount: 3,
  referralsSentCount: 0,
};

export function membershipAccountForPlan(plan: PlanId): MembershipAccount {
  return plan === "monthly" ? NAOMI_MEMBERSHIP : ALEXANDRA_MEMBERSHIP;
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

/** El aviso de la card "Visits this month" (`Main.dc.html`). */
export const COMPLIMENTARY_DAY_PASSES_NOTE = "1 from a referral, 1 for your birthday month.";
export const COMPLIMENTARY_DAY_PASSES_COUNT = 2;
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
/* Subida mensual → anual con prorrateo — `Upgrade.dc.html`             */
/* ------------------------------------------------------------------ */

export const UPGRADE_PRORATION = {
  newTermLabel: "Annual membership · Sept 12, 2026 – Sept 11, 2027",
  newTermCharge: 2400.0,
  unusedDaysCreditLabel: "Credit for 22 unused days on monthly",
  unusedDaysCredit: 182.6,
  dueToday: 2217.4,
  nextChargeAfterLabel: "$2,400.00 on September 12, 2027",
  visitsCarryOverLabel: "you have used 5 of 8 visits and the other 3 stay yours",
};
