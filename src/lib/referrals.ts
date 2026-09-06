/**
 * Story 9.2 (Referral Program). Sin backend: las cinco invitaciones, las
 * stats, los day passes del rail y los términos del programa son datos de
 * muestra deterministas para Alexandra Rivas (`AR-SOLEIL-24`, ver
 * `lib/profile.ts`). `Referrals.dc.html` / `RewardCredited.dc.html` son dos
 * estados de la misma pantalla — el segundo es el que alcanza el nodo
 * "Reward crediting" → "Reward confirmation" del flow, sin un backend que lo
 * dispare de verdad.
 */

export type ReferralStatus = "credited" | "pending" | "invited" | "expired";

export interface ReferralInvitation {
  id: string;
  name: string;
  initials: string;
  email: string;
  sentLabel: string;
  status: ReferralStatus;
  /** "1 day pass" · "Clears in 48 h" · "—" cuando aún no hay reserva de premio. */
  rewardLabel: string;
  /** Rosalind Vane (expirada) se dibuja con el nombre atenuado. */
  inactive?: boolean;
  /** Daniel Okonjo en el estado "credited" — fila recién cambiada. */
  recentlyChanged?: boolean;
}

export const REFERRAL_INVITATIONS: ReferralInvitation[] = [
  {
    id: "priya",
    name: "Priya Raghavan",
    initials: "PR",
    email: "priya.raghavan@email.com",
    sentLabel: "July 26",
    status: "credited",
    rewardLabel: "1 day pass",
  },
  {
    id: "daniel",
    name: "Daniel Okonjo",
    initials: "DO",
    email: "daniel.okonjo@email.com",
    sentLabel: "August 30",
    status: "pending",
    rewardLabel: "Clears in 48 h",
  },
  {
    id: "marta",
    name: "Marta Ibarra",
    initials: "MI",
    email: "marta.ibarra@email.com",
    sentLabel: "August 28",
    status: "invited",
    rewardLabel: "—",
  },
  {
    id: "theo",
    name: "Theo Lindqvist",
    initials: "TL",
    email: "theo.lindqvist@email.com",
    sentLabel: "August 28",
    status: "invited",
    rewardLabel: "—",
  },
  {
    id: "rosalind",
    name: "Rosalind Vane",
    initials: "RV",
    email: "rosalind.vane@email.com",
    sentLabel: "June 14",
    status: "expired",
    rewardLabel: "—",
    inactive: true,
  },
];

export interface ReferralStats {
  sentCount: number;
  sentNote: string;
  joinedCount: number;
  joinedNote: string;
  earnedCount: number;
  earnedNote: string;
}

export const REFERRAL_STATS: ReferralStats = {
  sentCount: 5,
  sentNote: "2 still open · 1 expired",
  joinedCount: 2,
  joinedNote: "Priya in August, Daniel this week",
  earnedCount: 1,
  earnedNote: "$75.00 · 1 more pending",
};

export interface DayPassEntry {
  id: string;
  title: string;
  subtitle: string;
  icon: "referral" | "birthday" | "pending";
  pending?: boolean;
}

export const DAY_PASSES_DEFAULT: DayPassEntry[] = [
  { id: "referral-priya", title: "1 referral day pass", subtitle: "From Priya · ready to use", icon: "referral" },
  { id: "birthday", title: "1 birthday day pass", subtitle: "Yours all September", icon: "birthday" },
  { id: "pending-daniel", title: "1 pending", subtitle: "From Daniel · clears in 48 h", icon: "pending", pending: true },
];

export const DAY_PASSES_CREDITED: DayPassEntry[] = [
  { id: "referral-both", title: "2 referral day passes", subtitle: "From Priya and Daniel", icon: "referral" },
  { id: "birthday", title: "1 birthday day pass", subtitle: "Yours all September", icon: "birthday" },
];

export const REFERRAL_INVITATION_EXPIRY_DAYS = 60;

/* ------------------------------------------------------------------ */
/* Estado de la vista — "default" (Referrals.dc.html) vs "credited"     */
/* (RewardCredited.dc.html)                                             */
/* ------------------------------------------------------------------ */

export type ReferralViewStateId = "default" | "credited";

export interface ReferralViewState {
  invitations: ReferralInvitation[];
  stats: ReferralStats;
  dayPasses: DayPassEntry[];
}

export function referralViewState(state: ReferralViewStateId): ReferralViewState {
  if (state !== "credited") {
    return { invitations: REFERRAL_INVITATIONS, stats: REFERRAL_STATS, dayPasses: DAY_PASSES_DEFAULT };
  }

  return {
    invitations: REFERRAL_INVITATIONS.map((invitation) =>
      invitation.id === "daniel"
        ? { ...invitation, status: "credited", rewardLabel: "1 day pass", recentlyChanged: true }
        : invitation,
    ),
    stats: { ...REFERRAL_STATS, earnedCount: 2, earnedNote: "$150.00 · nothing pending" },
    dayPasses: DAY_PASSES_CREDITED,
  };
}

/* ------------------------------------------------------------------ */
/* Notificaciones de la Story 9.2 — solo se muestran en el estado       */
/* "credited" (ver `NotificationBellMenu`'s prop `extraItems`)          */
/* ------------------------------------------------------------------ */

export const REFERRAL_CREDITED_NOTIFICATIONS = [
  {
    id: "n-referral-day-pass-ready",
    category: "membership" as const,
    icon: "membership" as const,
    title: "Your referral day pass is ready",
    body: "Daniel's first payment went through, so the pass is now in your account.",
    time: "9:12 AM",
    read: false,
  },
  {
    id: "n-referral-friend-joined",
    category: "membership" as const,
    icon: "membership" as const,
    title: "Daniel Okonjo joined",
    body: "He signed up with AR-SOLEIL-24. That is your second friend on LuxePass.",
    time: "Tuesday",
    read: false,
  },
];

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
