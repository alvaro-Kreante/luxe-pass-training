"use client";

import * as React from "react";
import { CalendarDays, Download, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import { RemovableChip } from "@/components/ui/chip";
import { ADMIN_CASE_COUNTS } from "@/lib/admin";
import { downloadTextFile } from "@/lib/download";
import {
  DATE_RANGE_PRESETS,
  DEFAULT_SELECTED_COLUMN_IDS,
  EXPORT_COLUMNS,
  EXPORT_DATASETS,
  type DeliveryMethod,
  type ExportDataset,
} from "@/lib/admin-analytics";

const DEFAULT_FILTERS = ["New York", "All 12 lounges", "Annual and day pass"];

/**
 * Story 8.2 — "User data export (anonymized for privacy)", "Booking data
 * export with date range selection" y "Data export in CSV format". Artboard:
 * docs/design/epic-8-admin-support/Export.dc.html.
 *
 * `?dataset=` (enlazado desde Analytics/Popularity) y `?delivery=schedule`
 * (enlazado desde "New report" en Reports programados) preseleccionan el
 * formulario, igual que `?covered=1` en el Epic 4.
 */
export default function ExportPage() {
  return (
    <React.Suspense>
      <ExportScreen />
    </React.Suspense>
  );
}

function ExportScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialDataset = (searchParams.get("dataset") as ExportDataset | null) ?? "bookings";
  const [dataset, setDataset] = React.useState<ExportDataset>(initialDataset);
  const [rangeLabel, setRangeLabel] = React.useState("September 1 – September 14");
  const [filters, setFilters] = React.useState<string[]>(DEFAULT_FILTERS);
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(DEFAULT_SELECTED_COLUMN_IDS);
  const [personalReason, setPersonalReason] = React.useState("");
  const initialDelivery = searchParams.get("delivery") === "schedule" ? "schedule" : "download";
  const [delivery, setDelivery] = React.useState<DeliveryMethod>(initialDelivery);

  const activeDataset = EXPORT_DATASETS.find((d) => d.value === dataset) ?? EXPORT_DATASETS[0];
  const hasPersonalColumn = selectedColumns.some((id) => EXPORT_COLUMNS.find((c) => c.id === id)?.personal);
  const personalCount = selectedColumns.filter((id) => EXPORT_COLUMNS.find((c) => c.id === id)?.personal).length;
  const reasonMissing = hasPersonalColumn && personalReason.trim().length === 0;

  function toggleColumn(id: string, checked: boolean) {
    setSelectedColumns((current) => (checked ? [...current, id] : current.filter((c) => c !== id)));
  }

  function primaryLabel() {
    if (delivery === "email") return "Email me the CSV";
    if (delivery === "schedule") return "Save scheduled report";
    return "Download CSV";
  }

  function submit() {
    if (reasonMissing) return;
    if (delivery === "schedule") {
      router.push("/admin/reports/scheduled");
      return;
    }
    if (delivery === "download") {
      const header = selectedColumns.map((id) => EXPORT_COLUMNS.find((c) => c.id === id)?.label ?? id).join(",");
      downloadTextFile(`${dataset}-export.csv`, header);
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
      supportBadge={ADMIN_CASE_COUNTS.open}
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
                  onSelect={() => setDataset(d.value)}
                  title={d.label}
                  subtitle={d.note}
                />
              ))}
            </div>
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <div className="flex items-center gap-3">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                Date range and filters
              </p>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setFilters([])}
                className="text-[11.5px] font-bold text-accent-strong"
              >
                Clear all
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex h-[50px] items-center gap-3 rounded-xl border-[1.5px] border-accent bg-panel-black px-4 shadow-ring">
                <CalendarDays size={18} strokeWidth={1.7} className="text-accent" aria-hidden />
                <span className="text-[13.5px] font-bold text-fg">{rangeLabel}</span>
              </span>
              {DATE_RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setRangeLabel(preset.rangeLabel)}
                  className="rounded-pill border border-line px-4 py-2 text-[11.5px] font-bold text-fg-muted transition-colors duration-150 hover:border-accent"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              {filters.map((filter) => (
                <RemovableChip
                  key={filter}
                  label={filter}
                  onRemove={() => setFilters((current) => current.filter((f) => f !== filter))}
                />
              ))}
              <span className="inline-flex items-center gap-2 rounded-pill border-[1.5px] border-dashed border-fg-subtle px-3.5 py-1.5 text-[11.5px] font-bold text-fg-muted">
                <Plus size={13} strokeWidth={2.2} className="text-accent" aria-hidden />
                Add a filter
              </span>
            </div>
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <div className="flex items-center gap-3">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                Columns · {selectedColumns.length} of {EXPORT_COLUMNS.length} selected
              </p>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setSelectedColumns(EXPORT_COLUMNS.map((c) => c.id))}
                className="text-[11.5px] font-bold text-accent-strong"
              >
                Select all
              </button>
            </div>

            <div className="mt-3.5 grid grid-cols-3 gap-x-5 gap-y-3">
              {EXPORT_COLUMNS.map((column) => (
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
                person can be followed across exports without being identified. Ticking one of the three asks for a
                reason and puts your name, the reason and the row count in the audit log.
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-fit w-[344px] shrink-0 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">This export</p>
            <SummaryRow label="Rows" value={`${activeDataset.rows.toLocaleString("en-US")} ${activeDataset.value === "revenue-by-partner" ? "rows" : activeDataset.value.replace("-", " ")}`} />
            <SummaryRow
              label="Columns"
              value={`${selectedColumns.length} · ${personalCount > 0 ? `${personalCount} personal` : "no personal data"}`}
            />
            <SummaryRow label="Format" value="CSV · UTF-8" />
            <SummaryRow label="Estimated size" value="412 KB" />
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Delivery</p>
            <div role="radiogroup" aria-label="Delivery" className="mt-3 flex flex-col gap-2.5">
              <PaymentOptionRow selected={delivery === "download"} onSelect={() => setDelivery("download")} title="Download now" />
              <PaymentOptionRow
                selected={delivery === "email"}
                onSelect={() => setDelivery("email")}
                title="Email it to me"
                subtitle="link valid for 7 days"
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
              disabled={reasonMissing}
              onClick={submit}
              className="mt-3.5 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-accent text-on-accent transition-colors duration-150 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} strokeWidth={1.9} aria-hidden />
              <span className="text-[13px] font-bold uppercase tracking-[0.12em]">{primaryLabel()}</span>
            </button>
            <p className="mt-3 text-[11.5px] text-fg-subtle">
              Exports over 50,000 rows are built in the background and emailed when they are ready.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-[rgba(58,50,42,0.6)] py-2.5">
      <span className="text-[12.5px] text-fg-subtle">{label}</span>
      <span className="text-[12.5px] font-bold text-fg">{value}</span>
    </div>
  );
}
