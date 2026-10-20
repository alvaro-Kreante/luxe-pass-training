import type { SupabaseClient } from "@supabase/supabase-js";

import { amenityLabel, type AmenityId } from "@/lib/amenities";
import { today, parseDate } from "@/lib/availability";
import { formatCurrency, getTicketCounts, type TicketCounts } from "@/lib/admin";

/**
 * Epic 8 — Admin & Support. Story 8.2 (Fase 2, `epic-8-admin-support/`):
 * analítica de red, popularidad, export y reportes programados.
 *
 * Backend real (22 sept 2026, ver CLAUDE.md §Alcance y
 * docs/design/COMPONENT-MAP.md): RPC de `supabase/schemas/admin_reports.sql`
 * sobre TODA la red (nunca un lounge elegido). El rango de fechas es
 * siempre relativo a `TODAY` (`src/lib/availability.ts`, 2025-09-09) — el
 * dominio de reservas del proyecto vive sobre ese "hoy" de mockup fijo, no
 * el reloj real, mismo criterio que el resto de la app.
 *
 * La narrativa fija del mock ("1,208 bookings", "$336,250.00 brutos"...) se
 * retira: los números que se muestren ahora son los que de verdad haya en
 * la base. "Revenue by partner" solo suma cargos reales de Stripe
 * (`payments.status = 'succeeded'`) — la facturación de membresía (Epic 9,
 * sin conectar) no es un dato real todavía. Desviación anotada en
 * `docs/design/COMPONENT-MAP.md`.
 */

export { formatCurrency };

export type AnalyticsPeriod = "14d" | "month" | "quarter";

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = { "14d": 14, month: 30, quarter: 90 };

export interface DateRange {
  from: string;
  to: string;
}

export function dateRangeForPeriod(period: AnalyticsPeriod, todayIso: string = today()): DateRange {
  const days = PERIOD_DAYS[period];
  const to = parseDate(todayIso);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: from.toISOString().slice(0, 10), to: todayIso };
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(parseDate(iso));
}

export function formatDateRangeLabel(range: DateRange): string {
  return `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`;
}

/** "Last 7 days" / "Last month" / "Quarter to date" — mismos presets de `Export.dc.html`, sobre `TODAY`. */
export const DATE_RANGE_PRESETS: { label: string; days: number }[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last month", days: 30 },
  { label: "Quarter to date", days: 90 },
];

export function dateRangeForPreset(days: number, todayIso: string = today()): DateRange {
  const to = parseDate(todayIso);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: from.toISOString().slice(0, 10), to: todayIso };
}

export function noShowRatePct(noShows: number, bookings: number): number {
  if (bookings === 0) return 0;
  return Math.round((noShows / bookings) * 1000) / 10;
}

export function sharePct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

/* ------------------------------------------------------------------ */
/* "How the network is doing" (Analytics.dc.html)                      */
/* ------------------------------------------------------------------ */

export interface NetworkSummary {
  bookings: number;
  attended: number;
  noShows: number;
  cancelled: number;
  joined: number;
  left: number;
  activeMembers: number;
}

interface NetworkSummaryRow {
  bookings: number;
  attended: number;
  no_shows: number;
  cancelled: number;
  joined: number;
  left_count: number;
  active_members: number;
}

export async function getNetworkSummary(
  supabase: SupabaseClient,
  range: DateRange,
): Promise<NetworkSummary> {
  const { data, error } = await supabase
    .rpc("admin_network_summary", { p_from: range.from, p_to: range.to })
    .single();
  if (error) throw error;
  const row = data as NetworkSummaryRow;
  return {
    bookings: row.bookings,
    attended: row.attended,
    noShows: row.no_shows,
    cancelled: row.cancelled,
    joined: row.joined,
    left: row.left_count,
    activeMembers: row.active_members,
  };
}

export interface BookingsByDayPoint {
  label: string;
  count: number;
}

interface BookingsByDayRow {
  day: string;
  bookings: number;
}

function formatBarLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
    parseDate(iso),
  );
}

export async function getBookingsByDay(
  supabase: SupabaseClient,
  range: DateRange,
): Promise<BookingsByDayPoint[]> {
  const { data, error } = await supabase.rpc("admin_bookings_by_day", { p_from: range.from, p_to: range.to });
  if (error) throw error;
  return (data as BookingsByDayRow[]).map((row) => ({
    label: formatBarLabel(row.day),
    count: row.bookings,
  }));
}

/* ------------------------------------------------------------------ */
/* "Revenue reporting by partner and time period"                     */
/* ------------------------------------------------------------------ */

export interface RevenueByPartnerRow {
  loungeId: string;
  loungeName: string;
  bookings: number;
  grossRevenueCents: number;
}

interface AdminRevenueByPartnerRow {
  lounge_id: string;
  lounge_name: string;
  bookings: number;
  gross_revenue_cents: number;
}

export async function getRevenueByPartner(
  supabase: SupabaseClient,
  range: DateRange,
): Promise<RevenueByPartnerRow[]> {
  const { data, error } = await supabase.rpc("admin_revenue_by_partner", { p_from: range.from, p_to: range.to });
  if (error) throw error;
  return (data as AdminRevenueByPartnerRow[]).map((row) => ({
    loungeId: row.lounge_id,
    loungeName: row.lounge_name,
    bookings: row.bookings,
    grossRevenueCents: row.gross_revenue_cents,
  }));
}

export function totalGrossRevenueCents(rows: RevenueByPartnerRow[]): number {
  return rows.reduce((sum, row) => sum + row.grossRevenueCents, 0);
}

/* ------------------------------------------------------------------ */
/* "Most popular lounges and amenities report" + "Geographic usage"    */
/* ------------------------------------------------------------------ */

export interface LoungePopularity {
  loungeId: string;
  name: string;
  area: string;
  bookings: number;
  noShows: number;
  sharePct: number;
}

interface AdminLoungePopularityRow {
  lounge_id: string;
  lounge_name: string;
  area: string;
  bookings: number;
  no_shows: number;
}

export async function getLoungePopularity(
  supabase: SupabaseClient,
  range: DateRange,
): Promise<LoungePopularity[]> {
  const { data, error } = await supabase.rpc("admin_lounge_popularity", { p_from: range.from, p_to: range.to });
  if (error) throw error;
  const rows = data as AdminLoungePopularityRow[];
  const total = rows.reduce((sum, row) => sum + row.bookings, 0);
  return rows.map((row) => ({
    loungeId: row.lounge_id,
    name: row.lounge_name,
    area: row.area,
    bookings: row.bookings,
    noShows: row.no_shows,
    sharePct: sharePct(row.bookings, total),
  }));
}

export interface AmenityDemand {
  id: string;
  label: string;
  bookings: number;
  sharePct: number;
}

interface AdminAmenityDemandRow {
  amenity: string;
  bookings: number;
}

export async function getAmenityDemand(
  supabase: SupabaseClient,
  range: DateRange,
): Promise<AmenityDemand[]> {
  const { data, error } = await supabase.rpc("admin_amenity_demand", { p_from: range.from, p_to: range.to });
  if (error) throw error;
  const rows = data as AdminAmenityDemandRow[];
  const total = Math.max(...rows.map((r) => r.bookings), 1);
  return rows.map((row) => ({
    id: row.amenity,
    label: amenityLabel(row.amenity as AmenityId),
    bookings: row.bookings,
    sharePct: sharePct(row.bookings, total),
  }));
}

export interface CityDemand {
  city: string;
  lounges: number;
  bookings: number;
  sharePct: number;
}

interface AdminCityDemandRow {
  city: string;
  lounges: number;
  bookings: number;
}

export async function getCityDemand(
  supabase: SupabaseClient,
  range: DateRange,
): Promise<CityDemand[]> {
  const { data, error } = await supabase.rpc("admin_city_demand", { p_from: range.from, p_to: range.to });
  if (error) throw error;
  const rows = data as AdminCityDemandRow[];
  const total = rows.reduce((sum, row) => sum + row.bookings, 0);
  return rows.map((row) => ({
    city: row.city,
    lounges: row.lounges,
    bookings: row.bookings,
    sharePct: sharePct(row.bookings, total),
  }));
}

/* ------------------------------------------------------------------ */
/* "Data export in CSV format" (Export.dc.html)                        */
/* ------------------------------------------------------------------ */

export type ExportDataset = "bookings" | "members" | "revenue-by-partner" | "no-shows-cancellations";

export const EXPORT_DATASETS: { value: ExportDataset; label: string; note: string }[] = [
  { value: "bookings", label: "Bookings", note: "one row per reservation" },
  { value: "members", label: "Members", note: "anonymised by default" },
  { value: "revenue-by-partner", label: "Revenue by partner", note: "one row per lounge and period" },
  { value: "no-shows-cancellations", label: "No-shows and cancellations", note: "with the fee charged on each" },
];

export interface ExportColumn {
  id: string;
  label: string;
  personal?: boolean;
}

export const EXPORT_COLUMNS: Record<ExportDataset, ExportColumn[]> = {
  bookings: [
    { id: "reference", label: "Booking reference" },
    { id: "memberId", label: "Member ID" },
    { id: "memberName", label: "Member name", personal: true },
    { id: "email", label: "Email address", personal: true },
    { id: "phone", label: "Phone number", personal: true },
    { id: "lounge", label: "Lounge" },
    { id: "city", label: "City" },
    { id: "date", label: "Date" },
    { id: "time", label: "Arrival time" },
    { id: "status", label: "Status" },
    { id: "amount", label: "Amount charged" },
    { id: "paymentMethod", label: "Payment method" },
  ],
  members: [
    { id: "memberId", label: "Member ID" },
    { id: "memberName", label: "Member name", personal: true },
    { id: "email", label: "Email address", personal: true },
    { id: "phone", label: "Phone number", personal: true },
    { id: "status", label: "Status" },
    { id: "memberSince", label: "Member since" },
  ],
  "revenue-by-partner": [
    { id: "lounge", label: "Lounge" },
    { id: "bookings", label: "Bookings" },
    { id: "revenue", label: "Gross revenue" },
  ],
  "no-shows-cancellations": [
    { id: "reference", label: "Booking reference" },
    { id: "memberName", label: "Member name", personal: true },
    { id: "lounge", label: "Lounge" },
    { id: "date", label: "Date" },
    { id: "status", label: "Status" },
    { id: "fee", label: "Fee" },
  ],
};

export function defaultSelectedColumns(dataset: ExportDataset): string[] {
  return EXPORT_COLUMNS[dataset].filter((c) => !c.personal).map((c) => c.id);
}

/** Fila cruda de `admin_export_bookings`. */
export interface AdminExportBookingRow {
  confirmation_code: string;
  member_id: string;
  member_name: string;
  member_email: string;
  member_phone: string | null;
  lounge_name: string;
  city: string;
  date: string;
  slot_time: string;
  status: string;
  amount_charged_cents: number;
  payment_method: string;
}

export async function fetchExportBookings(
  supabase: SupabaseClient,
  range: DateRange,
): Promise<AdminExportBookingRow[]> {
  const { data, error } = await supabase.rpc("admin_export_bookings", { p_from: range.from, p_to: range.to });
  if (error) throw error;
  return data as AdminExportBookingRow[];
}

/** Fila cruda de `admin_export_members`. */
export interface AdminExportMemberRow {
  member_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  membership_status: string;
  member_since: string;
  deleted_at: string | null;
}

export async function fetchExportMembers(supabase: SupabaseClient): Promise<AdminExportMemberRow[]> {
  const { data, error } = await supabase.rpc("admin_export_members");
  if (error) throw error;
  return data as AdminExportMemberRow[];
}

/** Fila cruda de `admin_export_no_shows_cancellations`. */
export interface AdminExportNoShowRow {
  confirmation_code: string;
  member_name: string;
  lounge_name: string;
  date: string;
  status: string;
  no_show: boolean;
  fee_cents: number;
}

export async function fetchExportNoShowsCancellations(
  supabase: SupabaseClient,
  range: DateRange,
): Promise<AdminExportNoShowRow[]> {
  const { data, error } = await supabase.rpc("admin_export_no_shows_cancellations", {
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw error;
  return data as AdminExportNoShowRow[];
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Arma el CSV real de descarga inmediata, columna a columna según lo que el
 * formulario dejó marcado — "anonymized by default": una columna personal
 * (`memberName`/`email`/`phone`) que no esté marcada simplemente no
 * aparece; el `memberId` estable siempre está disponible como alternativa.
 */
export function buildExportCsv(
  dataset: ExportDataset,
  selectedColumnIds: string[],
  rows: AdminExportBookingRow[] | AdminExportMemberRow[] | AdminExportNoShowRow[],
): string {
  const columns = EXPORT_COLUMNS[dataset].filter((c) => selectedColumnIds.includes(c.id));
  const header = columns.map((c) => csvCell(c.label)).join(",");

  const cellFor = (row: Record<string, unknown>, columnId: string): string => {
    if (dataset === "bookings") {
      const r = row as unknown as AdminExportBookingRow;
      const cell: Record<string, string> = {
        reference: r.confirmation_code,
        memberId: r.member_id,
        memberName: r.member_name,
        email: r.member_email,
        phone: r.member_phone ?? "",
        lounge: r.lounge_name,
        city: r.city,
        date: r.date,
        time: r.slot_time,
        status: r.status,
        amount: formatCurrency(r.amount_charged_cents / 100),
        paymentMethod: r.payment_method,
      };
      return cell[columnId] ?? "";
    }
    if (dataset === "members") {
      const r = row as unknown as AdminExportMemberRow;
      const cell: Record<string, string> = {
        memberId: r.member_id,
        memberName: r.full_name,
        email: r.email,
        phone: r.phone ?? "",
        status: r.deleted_at ? "deleted" : r.membership_status,
        memberSince: r.member_since,
      };
      return cell[columnId] ?? "";
    }
    if (dataset === "no-shows-cancellations") {
      const r = row as unknown as AdminExportNoShowRow;
      const cell: Record<string, string> = {
        reference: r.confirmation_code,
        memberName: r.member_name,
        lounge: r.lounge_name,
        date: r.date,
        status: r.no_show ? "no-show" : r.status,
        fee: formatCurrency(r.fee_cents / 100),
      };
      return cell[columnId] ?? "";
    }
    const r = row as unknown as RevenueByPartnerRow;
    const cell: Record<string, string> = {
      lounge: r.loungeName,
      bookings: String(r.bookings),
      revenue: formatCurrency(r.grossRevenueCents / 100),
    };
    return cell[columnId] ?? "";
  };

  const body = (rows as unknown as Record<string, unknown>[]).map((row) =>
    columns.map((c) => csvCell(cellFor(row, c.id))).join(","),
  );

  return [header, ...body].join("\n");
}

/* ------------------------------------------------------------------ */
/* "Automated daily/weekly report generation" + "Scheduled email       */
/* delivery of reports" (ScheduledReports.dc.html) — pg_cron real       */
/* ------------------------------------------------------------------ */

export type ReportCadence = "daily" | "weekly" | "monthly";

export interface ScheduledReport {
  id: string;
  name: string;
  dataset: ExportDataset;
  recipients: string[];
  cadence: ReportCadence;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
}

interface ScheduledReportRow {
  id: string;
  name: string;
  dataset: ExportDataset;
  recipients: string[];
  cadence: ReportCadence;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string;
}

function mapScheduledReportRow(row: ScheduledReportRow): ScheduledReport {
  return {
    id: row.id,
    name: row.name,
    dataset: row.dataset,
    recipients: row.recipients,
    cadence: row.cadence,
    enabled: row.enabled,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
  };
}

export async function listScheduledReports(supabase: SupabaseClient): Promise<ScheduledReport[]> {
  const { data, error } = await supabase
    .from("scheduled_reports")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ScheduledReportRow[]).map(mapScheduledReportRow);
}

export async function createScheduledReport(
  supabase: SupabaseClient,
  input: { name: string; dataset: ExportDataset; recipients: string[]; cadence: ReportCadence },
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("scheduled_reports").insert({
    name: input.name,
    dataset: input.dataset,
    recipients: input.recipients,
    cadence: input.cadence,
    created_by: user?.id,
  });
  if (error) throw error;
}

export async function toggleScheduledReport(
  supabase: SupabaseClient,
  id: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("scheduled_reports")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export function cadenceLabel(cadence: ReportCadence): string {
  if (cadence === "daily") return "Every day";
  if (cadence === "weekly") return "Every week";
  return "Every month";
}

export interface AdminAnalyticsData {
  period: AnalyticsPeriod;
  summary: NetworkSummary;
  byDay: BookingsByDayPoint[];
  revenue: RevenueByPartnerRow[];
  counts: TicketCounts;
}

/**
 * PERF-02 — lo que pinta `/admin/analytics` para un periodo, en paralelo. La
 * página (Server Component) la llama con el periodo por defecto; la vista
 * vuelve a pedir resumen, barras e ingresos al cambiar de periodo.
 */
export async function loadAdminAnalytics(
  supabase: SupabaseClient,
  period: AnalyticsPeriod = "14d",
): Promise<AdminAnalyticsData> {
  const range = dateRangeForPeriod(period);
  const [summary, byDay, revenue, counts] = await Promise.all([
    getNetworkSummary(supabase, range),
    getBookingsByDay(supabase, range),
    getRevenueByPartner(supabase, range),
    getTicketCounts(supabase),
  ]);
  return { period, summary, byDay, revenue, counts };
}
