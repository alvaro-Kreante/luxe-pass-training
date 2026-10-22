import type { SupabaseClient } from "@supabase/supabase-js";

import { addDays, today } from "@/lib/availability";
import {
  DEFAULT_GUEST_EXPORT_COLUMNS,
  GUEST_EXPORT_COLUMNS,
  NO_SHOW_REASONS,
  type GuestExportColumnKey,
  type PartnerGuestRow,
  type PartnerReport,
  type PartnerRepeatGuestRow,
  formatCurrency,
  guestListToCsv,
  mapGuestRow,
  mapRepeatGuestRow,
  repeatGuestsToCsv,
} from "@/lib/partner";

/**
 * Story 7.3 — Reports.dc.html con datos reales: cada informe sale de una RPC
 * (`partner_analytics.sql`, `partner_reports.sql`, `bookings.sql`) y respeta
 * el rango y las columnas del rail.
 */

export type ReportRangeMonths = 3 | 12;

export interface ReportColumn {
  key: string;
  label: string;
  defaultChecked: boolean;
}

/** Las columnas de `Reports.dc.html` para el volumen semanal/mensual. */
export const VOLUME_COLUMNS: ReportColumn[] = [
  { key: "bookings", label: "Bookings made", defaultChecked: true },
  { key: "arrived", label: "Guests who arrived", defaultChecked: true },
  { key: "no-shows", label: "No-shows and cancellations", defaultChecked: true },
  { key: "visit-type", label: "Day passes against membership visits", defaultChecked: true },
  { key: "revenue", label: "Attributed revenue", defaultChecked: false },
];

export interface ReportSettings {
  /** "One row per …" bajo el título del rail. */
  rowsHint: string;
  /** Sin rango: la lista de hoy o el acumulado de siempre. */
  rangeHint?: string;
  columns?: ReportColumn[];
}

export const REPORT_SETTINGS: Record<PartnerReport["id"], ReportSettings> = {
  "daily-guest-list": {
    rowsHint: "One row per guest",
    rangeHint: "Today",
    columns: GUEST_EXPORT_COLUMNS.map((c) => ({ key: c.key, label: c.label, defaultChecked: c.defaultChecked })),
  },
  "weekly-booking-volume": { rowsHint: "One row per week", columns: VOLUME_COLUMNS },
  "monthly-booking-volume": { rowsHint: "One row per month", columns: VOLUME_COLUMNS },
  "revenue-attribution": { rowsHint: "One row per month" },
  "repeat-guests": { rowsHint: "One row per guest", rangeHint: "All time" },
  "no-show-log": { rowsHint: "One row per no-show" },
};

export function defaultReportColumns(reportId: PartnerReport["id"]): string[] {
  return (REPORT_SETTINGS[reportId]?.columns ?? []).filter((c) => c.defaultChecked).map((c) => c.key);
}

/** Primer día del rango: hoy menos N meses, más un día. */
export function reportRangeFrom(todayIso: string, months: ReportRangeMonths): string {
  const date = new Date(`${todayIso}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return addDays(date.toISOString().slice(0, 10), 1);
}

export interface PartnerBookingVolumeRow {
  period_start: string;
  bookings: number;
  arrived: number;
  no_shows: number;
  cancellations: number;
  day_pass_visits: number;
  membership_visits: number;
  day_pass_revenue_cents: number;
  no_show_fee_cents: number;
  complimentary_visits: number;
}

export interface PartnerNoShowLogRow {
  date: string;
  slot_time: string;
  lounge_name: string;
  guest_name: string;
  reason: string | null;
  fee_cents: number;
}

function cell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function toCsv(header: string[], rows: (string | number)[][]): string {
  return [header.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))].join("\n");
}

function formatDate(dateIso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(`${dateIso}T00:00:00Z`));
}

function periodLabel(dateIso: string, grain: "week" | "month"): string {
  return grain === "month"
    ? formatDate(dateIso, { month: "short", year: "numeric" })
    : `Week of ${formatDate(dateIso, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function bookingVolumeToCsv(rows: PartnerBookingVolumeRow[], grain: "week" | "month", columns: string[]): string {
  const header = [grain === "month" ? "Month" : "Week"];
  if (columns.includes("bookings")) header.push("Bookings made");
  if (columns.includes("arrived")) header.push("Guests who arrived");
  if (columns.includes("no-shows")) header.push("No-shows", "Cancellations");
  if (columns.includes("visit-type")) header.push("Day passes", "Membership visits", "Complimentary day passes");
  if (columns.includes("revenue")) header.push("Attributed revenue");

  const body = rows.map((row) => {
    const cells: (string | number)[] = [periodLabel(row.period_start, grain)];
    if (columns.includes("bookings")) cells.push(row.bookings);
    if (columns.includes("arrived")) cells.push(row.arrived);
    if (columns.includes("no-shows")) cells.push(row.no_shows, row.cancellations);
    if (columns.includes("visit-type")) cells.push(row.day_pass_visits, row.membership_visits, row.complimentary_visits);
    if (columns.includes("revenue")) cells.push(formatCurrency((row.day_pass_revenue_cents + row.no_show_fee_cents) / 100));
    return cells;
  });
  return toCsv(header, body);
}

export function revenueByMonthToCsv(rows: PartnerBookingVolumeRow[]): string {
  return toCsv(
    ["Month", "Day passes", "Day pass revenue", "Membership visits", "Complimentary day passes", "No-shows", "No-show fees", "Total"],
    rows.map((row) => [
      periodLabel(row.period_start, "month"),
      row.day_pass_visits,
      formatCurrency(row.day_pass_revenue_cents / 100),
      row.membership_visits,
      row.complimentary_visits,
      row.no_shows,
      formatCurrency(row.no_show_fee_cents / 100),
      formatCurrency((row.day_pass_revenue_cents + row.no_show_fee_cents) / 100),
    ]),
  );
}

export function noShowLogToCsv(rows: PartnerNoShowLogRow[]): string {
  return toCsv(
    ["Date", "Booked arrival", "Lounge", "Guest", "Reason", "Fee"],
    rows.map((row) => [
      formatDate(row.date, { month: "short", day: "numeric", year: "numeric" }),
      row.slot_time,
      row.lounge_name,
      row.guest_name,
      NO_SHOW_REASONS.find((r) => r.value === row.reason)?.label ?? "",
      formatCurrency(row.fee_cents / 100),
    ]),
  );
}

export interface ReportRequest {
  reportId: PartnerReport["id"];
  /** Lounge de la cabecera; `null` = "All lounges". */
  loungeId: string | null;
  /** La lista del día es siempre de un lounge. */
  dayLoungeId: string | null;
  rangeMonths: ReportRangeMonths;
  columns: string[];
}

export interface GeneratedReport {
  filename: string;
  csv: string;
  rowCount: number;
}

function rowCountOf(csv: string): number {
  return csv.split("\n").length - 1;
}

export async function generatePartnerReport(supabase: SupabaseClient, request: ReportRequest): Promise<GeneratedReport> {
  const to = today();
  const from = reportRangeFrom(to, request.rangeMonths);
  const csv = await reportCsv(supabase, request, from, to);
  return { filename: `partner-${request.reportId}-${to}.csv`, csv, rowCount: rowCountOf(csv) };
}

async function reportCsv(supabase: SupabaseClient, request: ReportRequest, from: string, to: string): Promise<string> {
  const { reportId, loungeId, columns } = request;

  if (reportId === "daily-guest-list") {
    const guestColumns = (columns.length ? columns : DEFAULT_GUEST_EXPORT_COLUMNS) as GuestExportColumnKey[];
    if (!request.dayLoungeId) return guestListToCsv([], guestColumns);
    const { data, error } = await supabase.rpc("partner_guest_list", { p_lounge_id: request.dayLoungeId, p_date: to });
    if (error) throw error;
    return guestListToCsv(((data ?? []) as PartnerGuestRow[]).map((row) => mapGuestRow(row)), guestColumns);
  }

  if (reportId === "repeat-guests") {
    const { data, error } = await supabase.rpc("partner_repeat_guests", { p_lounge_id: loungeId });
    if (error) throw error;
    return repeatGuestsToCsv(((data ?? []) as PartnerRepeatGuestRow[]).map(mapRepeatGuestRow));
  }

  if (reportId === "no-show-log") {
    const { data, error } = await supabase.rpc("partner_no_show_log", { p_from: from, p_to: to, p_lounge_id: loungeId });
    if (error) throw error;
    return noShowLogToCsv((data ?? []) as PartnerNoShowLogRow[]);
  }

  const grain = reportId === "weekly-booking-volume" ? "week" : "month";
  const { data, error } = await supabase.rpc("partner_booking_volume", {
    p_from: from,
    p_to: to,
    p_grain: grain,
    p_lounge_id: loungeId,
  });
  if (error) throw error;
  const rows = (data ?? []) as PartnerBookingVolumeRow[];
  return reportId === "revenue-attribution" ? revenueByMonthToCsv(rows) : bookingVolumeToCsv(rows, grain, columns);
}

/** "Email it to the team" — `send-partner-report` resuelve los destinatarios en el servidor. */
export async function emailPartnerReport(
  supabase: SupabaseClient,
  reportTitle: string,
  report: GeneratedReport,
): Promise<number> {
  const { data, error } = await supabase.functions.invoke("send-partner-report", {
    body: { reportTitle, filename: report.filename, csv: report.csv },
  });
  if (error) throw error;
  return (data as { recipients: number }).recipients;
}

export interface RecentReportExport {
  id: string;
  request: ReportRequest;
  delivery: "download" | "email";
  filename: string;
  meta: string;
}

interface RecentReportExportRow {
  id: string;
  report_id: string;
  lounge_id: string | null;
  range_months: number | null;
  columns: string[];
  delivery: "download" | "email";
  filename: string;
  row_count: number;
  created_at: string;
  by_name: string;
}

export async function logReportExport(
  supabase: SupabaseClient,
  request: ReportRequest,
  delivery: "download" | "email",
  report: GeneratedReport,
): Promise<void> {
  const { error } = await supabase.rpc("partner_log_report_export", {
    p_report_id: request.reportId,
    p_lounge_id: request.reportId === "daily-guest-list" ? request.dayLoungeId : request.loungeId,
    p_range_months: request.rangeMonths,
    p_columns: request.columns,
    p_delivery: delivery,
    p_filename: report.filename,
    p_row_count: report.rowCount,
  });
  if (error) throw error;
}

function exportedAtLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export async function fetchRecentReportExports(supabase: SupabaseClient): Promise<RecentReportExport[]> {
  const { data, error } = await supabase.rpc("partner_recent_report_exports", { p_limit: 5 });
  if (error) throw error;
  return ((data ?? []) as RecentReportExportRow[]).map((row) => ({
    id: row.id,
    request: {
      reportId: row.report_id,
      loungeId: row.report_id === "daily-guest-list" ? null : row.lounge_id,
      dayLoungeId: row.report_id === "daily-guest-list" ? row.lounge_id : null,
      rangeMonths: row.range_months === 3 ? 3 : 12,
      columns: row.columns,
    },
    delivery: row.delivery,
    filename: row.filename,
    meta: `${exportedAtLabel(row.created_at)} · ${row.delivery === "email" ? "emailed" : "downloaded"} by ${row.by_name} · ${row.row_count} ${row.row_count === 1 ? "row" : "rows"}`,
  }));
}
