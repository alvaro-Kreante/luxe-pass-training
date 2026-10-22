import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "Invoices and receipts" (`Receipts.dc.html`). La lista sale de
 * `payments` (RLS: solo los propios) — cobrados o reembolsados, nunca
 * pendientes ni fallidos — y cada fila enlaza el recibo del cargo en Stripe
 * (`stripe-billing` → `receipt_urls`). Un pago sin cargo real en Stripe
 * (sembrado, o anterior al Customer) sale sin enlace.
 */

export interface Receipt {
  id: string;
  /** "Oct 3, 2026" */
  dateLabel: string;
  /** "Annual membership" · "Day pass · The Ainsworth" */
  title: string;
  /** "Joined" · "Renewal" · "Visit on Sep 14 · cancelled" */
  subtitle: string;
  amount: number;
  status: "paid" | "refunded";
  receiptUrl: string | null;
}

export interface ReceiptsOverview {
  receipts: Receipt[];
  /** Lo cobrado en el año en curso (incluye lo luego reembolsado). */
  yearTotal: number;
  yearChargeCount: number;
  yearRefunded: number;
}

interface PaymentRow {
  id: string;
  amount_cents: number;
  status: "succeeded" | "refunded";
  created_at: string;
  membership_plan: "annual" | "monthly" | null;
  stripe_payment_intent_id: string | null;
  refunded_amount_cents: number | null;
  bookings: { date: string; status: string; lounges: { name: string } | null } | null;
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

function formatMonthDay(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${dateIso}T00:00:00Z`),
  );
}

export async function fetchReceipts(supabase: SupabaseClient, now: Date = new Date()): Promise<ReceiptsOverview> {
  const [paymentsResult, urlsResult] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount_cents, status, created_at, membership_plan, stripe_payment_intent_id, refunded_amount_cents, bookings(date, status, lounges(name))",
      )
      .in("status", ["succeeded", "refunded"])
      .order("created_at", { ascending: false }),
    supabase.functions.invoke("stripe-billing", { body: { action: "receipt_urls" } }),
  ]);
  if (paymentsResult.error) throw paymentsResult.error;
  if (urlsResult.error) throw urlsResult.error;

  const rows = paymentsResult.data as unknown as PaymentRow[];
  const receiptUrls = (urlsResult.data as { receiptUrls: Record<string, string> }).receiptUrls;
  const firstMembershipId = [...rows].reverse().find((row) => row.membership_plan)?.id;

  const receipts = rows.map((row): Receipt => {
    let title: string;
    let subtitle = "";
    if (row.membership_plan) {
      title = row.membership_plan === "annual" ? "Annual membership" : "Monthly membership";
      subtitle = row.id === firstMembershipId ? "Joined" : "Renewal";
    } else {
      title = row.bookings?.lounges ? `Day pass · ${row.bookings.lounges.name}` : "Day pass";
      if (row.bookings) {
        subtitle = `Visit on ${formatMonthDay(row.bookings.date)}${row.bookings.status === "cancelled" ? " · cancelled" : ""}`;
      }
    }
    return {
      id: row.id,
      dateLabel: formatShortDate(row.created_at),
      title,
      subtitle,
      amount: row.amount_cents / 100,
      status: row.status === "refunded" ? "refunded" : "paid",
      receiptUrl: (row.stripe_payment_intent_id && receiptUrls[row.stripe_payment_intent_id]) || null,
    };
  });

  const thisYear = rows.filter((row) => new Date(row.created_at).getUTCFullYear() === now.getUTCFullYear());
  return {
    receipts,
    yearTotal: thisYear.reduce((sum, row) => sum + row.amount_cents, 0) / 100,
    yearChargeCount: thisYear.length,
    yearRefunded: thisYear.reduce((sum, row) => sum + (row.refunded_amount_cents ?? 0), 0) / 100,
  };
}

/** "Update card" — sesión del Customer Portal de Stripe; vuelve a `returnUrl`. */
export async function openBillingPortal(supabase: SupabaseClient, returnUrl: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-billing", { body: { action: "portal", returnUrl } });
  if (error) throw error;
  return (data as { url: string }).url;
}
