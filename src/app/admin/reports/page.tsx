"use client";

import * as React from "react";
import { CalendarDays, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import { createClient } from "@/lib/supabase/client";
import { downloadTextFile } from "@/lib/download";
import { getTicketCounts, type TicketCounts } from "@/lib/admin";
import {
  DATE_RANGE_PRESETS,
  EXPORT_DATASETS,
  EXPORT_COLUMNS,
  buildExportCsv,
  createScheduledReport,
  dateRangeForPreset,
  defaultSelectedColumns,
  fetchExportBookings,
  fetchExportMembers,
  fetchExportNoShowsCancellations,
  formatDateRangeLabel,
  getRevenueByPartner,
  type DateRange,
  type ExportDataset,
  type ReportCadence,
} from "@/lib/admin-analytics";

type DeliveryMethod = "download" | "email" | "schedule";

/**
 * Story 8.2 — "User data export (anonymized for privacy)", "Booking data
 * export with date range selection" y "Data export in CSV format". Artboard:
 * docs/design/epic-8-admin-support/Export.dc.html.
 *
 * Backend real (22 sept 2026): `admin_export_*`
 * (`supabase/schemas/admin_reports.sql`) — "Download CSV" descarga filas
 * reales; "Email it to me" y "Save as a scheduled report" también son
 * reales ahora (Edge Function `send-admin-report` / tabla
 * `scheduled_reports` + `pg_cron`), ver `docs/design/COMPONENT-MAP.md`.
 */
export default function ExportPage() {
  return (
    <RequireAdminSession>
      <React.Suspense>
        <ExportScreen />
      </React.Suspense>
    </RequireAdminSession>
  );
}

function ExportScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = React.useMemo(() => createClient(), []);

  const initialDataset = (searchParams.get("dataset") as ExportDataset | null) ?? "bookings";
  const [dataset, setDataset] = React.useState<ExportDataset>(initialDataset);
  const [range, setRange] = React.useState<DateRange>(dateRangeForPreset(90));
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(defaultSelectedColumns(initialDataset));
  const [personalReason, setPersonalReason] = React.useState("");
  const initialDelivery = searchParams.get("delivery") === "schedule" ? "schedule" : "download";
  const [delivery, setDelivery] = React.useState<DeliveryMethod>(initialDelivery);
  const [submitting, setSubmitting] = React.useState(false);
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);

  React.useEffect(() => {
    getTicketCounts(supabase).then(setCounts);
  }, [supabase]);

  const columns = EXPORT_COLUMNS[dataset];
  const hasPersonalColumn = selectedColumns.some((id) => columns.find((c) => c.id === id)?.personal);
  const reasonMissing = hasPersonalColumn && personalReason.trim().length === 0;

  function selectDataset(value: ExportDataset) {
    setDataset(value);
    setSelectedColumns(defaultSelectedColumns(value));
  }

  function toggleColumn(id: string, checked: boolean) {
    setSelectedColumns((current) => (checked ? [...current, id] : current.filter((c) => c !== id)));
  }

  async function fetchRows() {
    if (dataset === "bookings") return fetchExportBookings(supabase, range);
    if (dataset === "members") return fetchExportMembers(supabase);
    if (dataset === "no-shows-cancellations") return fetchExportNoShowsCancellations(supabase, range);
    const revenue = await getRevenueByPartner(supabase, range);
    return revenue as unknown as { [key: string]: unknown }[];
  }

  function primaryLabel() {
    if (submitting) return "Working…";
    if (delivery === "email") return "Email me the CSV";
    if (delivery === "schedule") return "Save scheduled report";
    return "Download CSV";
  }

  async function submit() {
    if (reasonMissing || submitting) return;
    setSubmitting(true);
    try {
      if (delivery === "schedule") {
        await createScheduledReport(supabase, {
          name: `${EXPORT_DATASETS.find((d) => d.value === dataset)?.label ?? dataset} report`,
          dataset,
          recipients: [],
          cadence: "daily" as ReportCadence,
        });
        router.push("/admin/reports/scheduled");
        return;
      }

      const rows = await fetchRows();
      const csv = buildExportCsv(dataset, selectedColumns, rows as never);

      if (delivery === "download") {
        downloadTextFile(`${dataset}-export.csv`, csv);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.functions.invoke("send-admin-report", {
        body: {
          report_name: `${dataset}-export`,
          recipients: user?.email ? [user.email] : [],
          csv,
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell
      topbarLabel={
        <>
          <span className="text-[13.5px] font-bold text-fg-subtle">Reports</span>
          <span className="text-[13.5px] text-fg-subtle">›</span>
          <span className="text-[13.5px] font-bold text-fg">New export</span>
        </>
      }
      supportBadge={counts?.open}
    >
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
        CSV · delivered now or on a schedule
      </p>
      <h1 className="mt-2 font-display text-[34px] text-fg">Export data</h1>

      <div className="mt-4.5 flex min-h-0 gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              What are you exporting?
            </p>
            <div role="radiogroup" aria-label="What are you exporting?" className="mt-3 grid grid-cols-2 gap-2.5">
              {EXPORT_DATASETS.map((d) => (
                <PaymentOptionRow
                  key={d.value}
                  selected={dataset === d.value}
                  onSelect={() => selectDataset(d.value)}
                  title={d.label}
                  subtitle={d.note}
                />
              ))}
            </div>
          </div>

          {dataset !== "members" ? (
            <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Date range</p>

              <div className="mt-3 flex items-center gap-2.5">
                <span className="flex h-[50px] items-center gap-3 rounded-xl border-[1.5px] border-accent bg-panel-black px-4 shadow-ring">
                  <CalendarDays size={18} strokeWidth={1.7} className="text-accent" aria-hidden />
                  <span className="text-[13.5px] font-bold text-fg">{formatDateRangeLabel(range)}</span>
                </span>
                {DATE_RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setRange(dateRangeForPreset(preset.days))}
                    className="rounded-pill border border-line px-4 py-2 text-[11.5px] font-bold text-fg-muted transition-colors duration-150 hover:border-accent"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <div className="flex items-center gap-3">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                Columns · {selectedColumns.length} of {columns.length} selected
              </p>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setSelectedColumns(columns.map((c) => c.id))}
                className="text-[11.5px] font-bold text-accent-strong"
              >
                Select all
              </button>
            </div>

            <div className="mt-3.5 grid grid-cols-3 gap-x-5 gap-y-3">
              {columns.map((column) => (
                <Checkbox
                  key={column.id}
                  align="center"
                  checked={selectedColumns.includes(column.id)}
                  onCheckedChange={(checked) => toggleColumn(column.id, checked)}
                >
                  {column.label}
                </Checkbox>
              ))}
            </div>

            {hasPersonalColumn ? (
              <div className="mt-4">
                <label htmlFor="personal-reason" className="mb-1.5 block text-xs font-bold text-fg-muted">
                  Reason for including personal columns
                </label>
                <Input
                  id="personal-reason"
                  value={personalReason}
                  onChange={(event) => setPersonalReason(event.target.value)}
                  placeholder="Why does this export need names, emails or phone numbers?"
                />
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4.5 py-4">
              <p className="m-0 text-xs leading-[1.55] text-fg-muted">
                Names, emails and phone numbers are off by default and replaced by a stable member ID, so the same
                person can be followed across exports without being identified. Ticking one of those columns asks for
                a reason.
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-fit w-[344px] shrink-0 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Delivery</p>
            <div role="radiogroup" aria-label="Delivery" className="mt-3 flex flex-col gap-2.5">
              <PaymentOptionRow selected={delivery === "download"} onSelect={() => setDelivery("download")} title="Download now" />
              <PaymentOptionRow
                selected={delivery === "email"}
                onSelect={() => setDelivery("email")}
                title="Email it to me"
                subtitle="sent to your own admin address"
              />
              <PaymentOptionRow
                selected={delivery === "schedule"}
                onSelect={() => setDelivery("schedule")}
                title="Save as a scheduled report"
                subtitle="daily, weekly or monthly"
              />
            </div>

            <button
              type="button"
              disabled={reasonMissing || submitting}
              onClick={submit}
              className="mt-3.5 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-accent text-on-accent transition-colors duration-150 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} strokeWidth={1.9} aria-hidden />
              <span className="text-[13px] font-bold uppercase tracking-[0.12em]">{primaryLabel()}</span>
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
