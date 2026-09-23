import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Epic 8 — Admin & Support. Story 8.1 (Fase 2, `epic-8-admin-support/`):
 * consola de soporte, ficha de miembro y caso con log de comunicación.
 *
 * Backend real (22 sept 2026, ver CLAUDE.md §Alcance y
 * docs/DATA-MODEL-MAP.md): tabla `support_tickets`/`support_ticket_messages`
 * (nace aquí) y las RPC de `supabase/schemas/support_tickets.sql`. Las
 * funciones puras de este módulo convierten esas filas reales a lo que ya
 * consumen `/admin/support`, `/admin/support/[id]`, `/admin/members` y
 * `/admin/members/[id]` — mismo criterio que `lib/partner.ts` (Epic 7).
 */

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/** Story 8.1 — "Escalation to manager functionality": el límite sin manager. */
export const MANAGER_APPROVAL_LIMIT = 100;

/**
 * DESIGN-SYSTEM.md §6 (Fase 8) fija a Dana Mbeki como el manager de turno.
 * Sin historia de gestión de personal (Epic 8 no la tiene), sigue siendo un
 * dato de muestra fijo — "escalar" es real (cambia `status` en
 * `support_tickets`), pero no hay una bandeja de manager real que recibirlo,
 * mismo criterio ya anotado en `docs/design/COMPONENT-MAP.md` para la
 * campana de notificaciones del admin.
 */
export const DUTY_MANAGER = {
  name: "Dana Mbeki",
  initials: "DM",
  roleLabel: "Duty manager today",
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${last ?? ""}`.toUpperCase();
}

/** "Priya Raghunathan" a partir de "priya.raghunathan@ensoleil.co" — sin perfil de admin propio (Epic 8 no lo pide). */
export function displayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

/** "Today" / "Sep 15" — relativo a `now` (inyectable para tests), mismo criterio que `bookedAgoLabel` (Epic 7). */
export function formatOpenedDateLabel(createdAtIso: string, now: Date = new Date()): string {
  const created = new Date(createdAtIso);
  const sameDay =
    created.getUTCFullYear() === now.getUTCFullYear() &&
    created.getUTCMonth() === now.getUTCMonth() &&
    created.getUTCDate() === now.getUTCDate();
  if (sameDay) return "Today";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(created);
}

export function formatOpenedTimeLabel(createdAtIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(createdAtIso));
}

/* ------------------------------------------------------------------ */
/* Mesa de soporte ("Main.dc.html")                                    */
/* ------------------------------------------------------------------ */

export type CaseStatus = "new" | "open" | "waiting" | "escalated" | "resolved";

/** Fila cruda de `admin_list_support_tickets` (`supabase/schemas/support_tickets.sql`). */
export interface SupportTicketRow {
  id: string;
  case_number: string;
  member_id: string;
  member_name: string;
  status: CaseStatus;
  subject: string;
  note: string;
  assigned_admin_id: string | null;
  assigned_admin_name: string | null;
  created_at: string;
}

export interface SupportCase {
  /** uuid real de `support_tickets.id` — lo que reciben las mutaciones. */
  ticketId: string;
  /** "CS-4417" — lo que ya muestra la UI y lo que trae la URL de `/admin/support/[id]`. */
  id: string;
  memberId: string;
  memberName: string;
  memberInitials: string;
  subject: string;
  note: string;
  openedLabel: string;
  openedTimeLabel: string;
  status: CaseStatus;
  assignee: string | null;
}

export function mapSupportCaseRow(row: SupportTicketRow, now: Date = new Date()): SupportCase {
  return {
    ticketId: row.id,
    id: row.case_number,
    memberId: row.member_id,
    memberName: row.member_name,
    memberInitials: initialsFromName(row.member_name),
    subject: row.subject,
    note: row.note,
    openedLabel: formatOpenedDateLabel(row.created_at, now),
    openedTimeLabel: formatOpenedTimeLabel(row.created_at),
    status: row.status,
    assignee: row.assigned_admin_name ? displayNameFromEmail(row.assigned_admin_name) : null,
  };
}

export interface TicketCounts {
  open: number;
  waitingOnMember: number;
  escalated: number;
  resolvedToday: number;
  totalCases: number;
}

/**
 * @deprecated Placeholder temporal para las pantallas de Story 8.2/8.3 que
 * todavía no se han conectado a `admin_ticket_counts` en esta misma pasada
 * de Epic 8 — se retira en cuanto esas historias se conecten.
 */
export const ADMIN_CASE_COUNTS = { open: 0 };

export async function listSupportCases(supabase: SupabaseClient): Promise<SupportCase[]> {
  const { data, error } = await supabase.rpc("admin_list_support_tickets");
  if (error) throw error;
  return (data as SupportTicketRow[]).map((row) => mapSupportCaseRow(row));
}

interface TicketCountsRow {
  open_count: number;
  waiting_count: number;
  escalated_count: number;
  resolved_today_count: number;
  total_count: number;
}

export async function getTicketCounts(supabase: SupabaseClient): Promise<TicketCounts> {
  const { data, error } = await supabase.rpc("admin_ticket_counts").single();
  if (error) throw error;
  const row = data as TicketCountsRow;
  return {
    open: row.open_count,
    waitingOnMember: row.waiting_count,
    escalated: row.escalated_count,
    resolvedToday: row.resolved_today_count,
    totalCases: row.total_count,
  };
}

/* ------------------------------------------------------------------ */
/* "Member search by email, phone, or name"                            */
/* ------------------------------------------------------------------ */

/** Fila cruda de `admin_search_members`/`admin_member_profile`. */
export interface AdminMemberRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  membership_status: "active" | "inactive";
  deleted_at: string | null;
  member_since: string | null;
  open_cases_count: number;
  last_visit_date: string | null;
  last_visit_lounge: string | null;
}

export interface AdminMember {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  /** "Active member" / "Inactive" / "Account deleted" — ver nota de `admin_member_profile` sobre por qué no hay Annual/Day pass real todavía. */
  membershipLabel: string;
  status: "active" | "inactive" | "deleted";
  memberSinceLabel: string;
  openCasesCount: number;
  lastVisitLabel: string;
  lastVisitNote: string;
}

function formatMemberSinceLabel(memberSinceIso: string | null): string {
  if (!memberSinceIso) return "member since —";
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(memberSinceIso),
  );
  return `member since ${label}`;
}

function formatShortDate(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${dateIso}T00:00:00Z`),
  );
}

/**
 * "Annual"/"Day pass" del mock asumía un plan real (Epic 9, sin conectar) —
 * `profiles.membership_status` (Story 6.3) solo distingue Active/Inactive
 * para cualquier miembro con perfil. Desviación anotada en
 * `docs/design/COMPONENT-MAP.md`.
 */
export function mapAdminMemberRow(row: AdminMemberRow): AdminMember {
  const status = row.deleted_at ? "deleted" : row.membership_status;
  const membershipLabel =
    status === "deleted" ? "Account deleted" : status === "active" ? "Active member" : "Inactive";

  return {
    id: row.id,
    name: row.full_name,
    initials: initialsFromName(row.full_name),
    email: row.email,
    phone: row.phone ?? "",
    membershipLabel,
    status,
    memberSinceLabel: formatMemberSinceLabel(row.member_since),
    openCasesCount: row.open_cases_count,
    lastVisitLabel: row.last_visit_date ? formatShortDate(row.last_visit_date) : "No visits yet",
    lastVisitNote: row.last_visit_lounge ?? "",
  };
}

export async function searchMembers(supabase: SupabaseClient, query: string): Promise<AdminMember[]> {
  const { data, error } = await supabase.rpc("admin_search_members", { p_query: query });
  if (error) throw error;
  return (data as AdminMemberRow[]).map(mapAdminMemberRow);
}

export async function getAdminMember(
  supabase: SupabaseClient,
  memberId: string,
): Promise<AdminMember | undefined> {
  const { data, error } = await supabase.rpc("admin_member_profile", { p_member_id: memberId });
  if (error) throw error;
  const row = (data as AdminMemberRow[])[0];
  return row ? mapAdminMemberRow(row) : undefined;
}

/* ------------------------------------------------------------------ */
/* "Complete booking history view"                                     */
/* ------------------------------------------------------------------ */

export type BookingHistoryStatus = "confirmed" | "no-show" | "completed" | "cancelled";

/** Fila cruda de `admin_member_bookings`. */
export interface AdminBookingRow {
  id: string;
  confirmation_code: string;
  lounge_id: string;
  lounge_name: string;
  lounge_area: string;
  date: string;
  band: string;
  slot_time: string;
  status: string;
  no_show: boolean;
  checked_in_at: string | null;
  cancelled_at: string | null;
  cancellation_fee_cents: number | null;
  created_at: string;
}

export interface BookingHistoryRow {
  bookingId: string;
  loungeId: string;
  date: string;
  band: string;
  slotTime: string;
  dateLabel: string;
  dayLabel: string;
  lounge: string;
  detail: string;
  reference: string;
  status: BookingHistoryStatus;
  charged: string;
}

export function bookingHistoryStatusFrom(row: Pick<AdminBookingRow, "status" | "no_show">): BookingHistoryStatus {
  if (row.status === "cancelled") return "cancelled";
  if (row.no_show) return "no-show";
  if (row.status === "confirmed" || row.status === "waitlisted") return "confirmed";
  return "completed";
}

function formatDayLabel(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${dateIso}T00:00:00Z`),
  );
}

export function mapBookingRow(row: AdminBookingRow): BookingHistoryRow {
  const status = bookingHistoryStatusFrom(row);
  const charged =
    status === "no-show" && row.cancellation_fee_cents
      ? `${formatCurrency(row.cancellation_fee_cents / 100)} fee`
      : status === "cancelled"
        ? "No charge"
        : "Included";

  return {
    bookingId: row.id,
    loungeId: row.lounge_id,
    date: row.date,
    band: row.band,
    slotTime: row.slot_time,
    dateLabel: formatShortDate(row.date),
    dayLabel: formatDayLabel(row.date),
    lounge: row.lounge_name,
    detail: `${row.lounge_area} · ${row.slot_time}`,
    reference: row.confirmation_code,
    status,
    charged,
  };
}

export async function getMemberBookings(
  supabase: SupabaseClient,
  memberId: string,
): Promise<BookingHistoryRow[]> {
  const { data, error } = await supabase.rpc("admin_member_bookings", { p_member_id: memberId });
  if (error) throw error;
  return (data as AdminBookingRow[]).map(mapBookingRow);
}

/** La próxima reserva confirmada (para "Modify booking" / `BookingOverrideDrawer`). */
export function upcomingBookingFrom(
  bookings: BookingHistoryRow[],
  today: string,
): BookingHistoryRow | null {
  return (
    bookings
      .filter((b) => b.status === "confirmed" && b.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  );
}

/* ------------------------------------------------------------------ */
/* "Payment transaction details"                                       */
/* ------------------------------------------------------------------ */

/** Fila cruda de `admin_member_payments` — une cargos reales de Stripe y tarifas solo registradas. */
export interface AdminPaymentRow {
  kind: "payment" | "fee";
  id: string;
  booking_id: string | null;
  title: string;
  detail: string;
  amount_cents: number;
  status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  kind: "payment" | "fee";
  title: string;
  detail: string;
  amount: string;
  amountCents: number;
  /** Un cargo real (`succeeded`) puede reembolsarse de verdad vía Stripe. */
  refundable: boolean;
  /** Una tarifa solo registrada (nunca cobrada) se "waives", no se reembolsa. */
  waivable: boolean;
}

export function mapPaymentRow(row: AdminPaymentRow): PaymentRow {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    detail: row.detail,
    amount: formatCurrency(row.amount_cents / 100),
    amountCents: row.amount_cents,
    refundable: row.kind === "payment" && row.status === "succeeded",
    waivable: row.kind === "fee",
  };
}

export async function getMemberPayments(
  supabase: SupabaseClient,
  memberId: string,
): Promise<PaymentRow[]> {
  const { data, error } = await supabase.rpc("admin_member_payments", { p_member_id: memberId });
  if (error) throw error;
  return (data as AdminPaymentRow[]).map(mapPaymentRow);
}

/** "Paid to date" — solo dinero real recibido (cargos `succeeded`), nunca tarifas solo registradas. */
export function totalPaidToDateCents(payments: PaymentRow[]): number {
  return payments.filter((p) => p.refundable).reduce((sum, p) => sum + p.amountCents, 0);
}

/* ------------------------------------------------------------------ */
/* Caso con log de comunicación ("CaseDetail.dc.html")                 */
/* ------------------------------------------------------------------ */

/** Fila cruda de `admin_get_ticket`. */
export interface TicketDetailRow {
  id: string;
  case_number: string;
  member_id: string;
  member_name: string;
  member_email: string;
  status: CaseStatus;
  subject: string;
  note: string;
  assigned_admin_id: string | null;
  assigned_admin_name: string | null;
  resolution_reason: string | null;
  resolution_note: string;
  created_at: string;
  resolved_at: string | null;
  booking_id: string | null;
  booking_confirmation_code: string | null;
  booking_fee_cents: number | null;
  payment_id: string | null;
  payment_amount_cents: number | null;
  payment_status: string | null;
  payment_intent_id: string | null;
}

export interface CaseDetail {
  ticketId: string;
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberInitials: string;
  subject: string;
  note: string;
  openedLabel: string;
  openedTimeLabel: string;
  status: CaseStatus;
  assignee: string | null;
  resolutionReason: string | null;
  resolutionNote: string;
  bookingReference: string | null;
  /** Presente cuando hay una tarifa solo registrada (nunca cobrada) que "waive". */
  waivableFee?: { bookingId: string; amountCents: number };
  /** Presente cuando hay un cargo real de Stripe (`succeeded`) que reembolsar. */
  refundablePayment?: { paymentId: string; amountCents: number };
}

const DEFAULT_RESOLUTION_REASONS = ["Goodwill exception", "Technical error", "Lounge was at capacity", "Not applicable"];

export function mapTicketDetailRow(row: TicketDetailRow, now: Date = new Date()): CaseDetail {
  return {
    ticketId: row.id,
    id: row.case_number,
    memberId: row.member_id,
    memberName: row.member_name,
    memberEmail: row.member_email,
    memberInitials: initialsFromName(row.member_name),
    subject: row.subject,
    note: row.note,
    openedLabel: formatOpenedDateLabel(row.created_at, now),
    openedTimeLabel: formatOpenedTimeLabel(row.created_at),
    status: row.status,
    assignee: row.assigned_admin_name ? displayNameFromEmail(row.assigned_admin_name) : null,
    resolutionReason: row.resolution_reason,
    resolutionNote: row.resolution_note,
    bookingReference: row.booking_confirmation_code,
    waivableFee:
      row.booking_id && row.booking_fee_cents
        ? { bookingId: row.booking_id, amountCents: row.booking_fee_cents }
        : undefined,
    refundablePayment:
      row.payment_id && row.payment_status === "succeeded" && row.payment_amount_cents
        ? { paymentId: row.payment_id, amountCents: row.payment_amount_cents }
        : undefined,
  };
}

export async function getCaseDetail(
  supabase: SupabaseClient,
  caseNumber: string,
): Promise<CaseDetail | undefined> {
  const { data, error } = await supabase.rpc("admin_get_ticket", { p_case_number: caseNumber });
  if (error) throw error;
  const row = (data as TicketDetailRow[])[0];
  return row ? mapTicketDetailRow(row) : undefined;
}

export const RESOLUTION_REASONS = DEFAULT_RESOLUTION_REASONS;

export type CommLogEntryKind = "system" | "email-auto" | "member" | "internal-note" | "partner" | "staff-reply";

/** Fila cruda de `support_ticket_messages`. */
export interface SupportTicketMessageRow {
  id: string;
  ticket_id: string;
  kind: CommLogEntryKind;
  author: string;
  body: string;
  created_at: string;
}

export interface CommLogEntryData {
  id: string;
  kind: CommLogEntryKind;
  author: string;
  timestampLabel: string;
  body: string;
}

export function mapMessageRow(row: SupportTicketMessageRow, now: Date = new Date()): CommLogEntryData {
  return {
    id: row.id,
    kind: row.kind,
    author: row.author,
    timestampLabel: `${formatOpenedDateLabel(row.created_at, now)} · ${formatOpenedTimeLabel(row.created_at)}`,
    body: row.body,
  };
}

export async function listTicketMessages(
  supabase: SupabaseClient,
  ticketId: string,
): Promise<CommLogEntryData[]> {
  const { data, error } = await supabase
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as SupportTicketMessageRow[]).map((row) => mapMessageRow(row));
}

export async function addTicketMessage(
  supabase: SupabaseClient,
  ticketId: string,
  kind: CommLogEntryKind,
  author: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from("support_ticket_messages")
    .insert({ ticket_id: ticketId, kind, author, body });
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Mutaciones de un caso                                                */
/* ------------------------------------------------------------------ */

export async function assignTicketToMe(supabase: SupabaseClient, ticketId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("support_tickets")
    .update({ assigned_admin_id: user.id, updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) throw error;
}

export async function escalateTicket(supabase: SupabaseClient, ticketId: string): Promise<void> {
  const { error } = await supabase
    .from("support_tickets")
    .update({ status: "escalated", updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) throw error;
}

export async function resolveTicket(
  supabase: SupabaseClient,
  ticketId: string,
  resolutionReason: string,
  resolutionNote: string,
): Promise<void> {
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: "resolved",
      resolution_reason: resolutionReason,
      resolution_note: resolutionNote,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);
  if (error) throw error;
}

/** "Waive and refund" cuando la tarifa nunca se cobró de verdad — ver `admin_waive_booking_fee`. */
export async function waiveBookingFee(supabase: SupabaseClient, bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_waive_booking_fee", { p_booking_id: bookingId });
  if (error) throw error;
}

/** "Waive and refund" cuando hay un cargo real de Stripe detrás — Edge Function `stripe-refund-payment`. */
export async function refundPayment(
  supabase: SupabaseClient,
  paymentId: string,
  amountCents?: number,
  reason?: string,
): Promise<{ refundId: string; status: string; amountCents: number }> {
  const { data, error } = await supabase.functions.invoke("stripe-refund-payment", {
    body: { paymentId, amountCents, reason },
  });
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/* "Booking modification capabilities" — override explícito incluido   */
/* ------------------------------------------------------------------ */

export interface UpcomingBooking {
  lounge: string;
  area: string;
  detail: string;
  reference: string;
}

export async function rescheduleBooking(
  supabase: SupabaseClient,
  bookingId: string,
  date: string,
  band: string,
  slotTime: string,
  override: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("admin_reschedule_booking", {
    p_booking_id: bookingId,
    p_date: date,
    p_band: band,
    p_slot_time: slotTime,
    p_override: override,
  });
  if (error) throw error;
}

export async function cancelBookingAsAdmin(supabase: SupabaseClient, bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_cancel_booking", { p_booking_id: bookingId });
  if (error) throw error;
}
