"use client";

import * as React from "react";
import { Download, FileText } from "lucide-react";

import { PartnerShell } from "@/components/patterns/partner-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import { Segmented } from "@/components/ui/segmented";
import {
  DEFAULT_REPORT_ID,
  PARTNER_GUESTS,
  PARTNER_REPORTS,
  REPEAT_GUESTS,
  RECENT_DOWNLOADS,
  REPORT_DELIVERY_OPTIONS,
  guestListToCsv,
  repeatGuestsToCsv,
  revenueBreakdownToCsv,
  type PartnerReport,
} from "@/lib/partner";
import { downloadTextFile } from "@/lib/download";
import { cn } from "@/lib/utils";

const MONTHLY_COLUMNS = [
  "Bookings made",
  "Guests who arrived",
  "No-shows and cancellations",
  "Day passes against membership visits",
] as const;

const OPTIONAL_COLUMN = "Attributed revenue";

function reportToCsv(reportId: PartnerReport["id"]): string {
  if (reportId === "daily-guest-list") return guestListToCsv(PARTNER_GUESTS);
  if (reportId === "repeat-guests") return repeatGuestsToCsv(REPEAT_GUESTS);
  if (reportId === "revenue-attribution") return revenueBreakdownToCsv();
  return [MONTHLY_COLUMNS.join(","), OPTIONAL_COLUMN].join("\n");
}

/**
 * Story 7.3 — "Downloadable reports: export to CSV". DESIGN-SYSTEM.md §5
 * patrón 15 (App shell del partner). Artboard: Reports.dc.html.
 *
 * El rail derecho solo detalla la configuración de "Monthly booking volume"
 * en el artboard; al elegir otro informe, refleja su título/descripción con
 * la misma anatomía — los cinco checkboxes de columnas son un placeholder
 * hasta que cada informe tenga su propio modelo de columnas.
 */
export default function ReportsPage() {
  const [selectedId, setSelectedId] = React.useState<PartnerReport["id"]>(DEFAULT_REPORT_ID);
  const [range, setRange] = React.useState<"3" | "12" | "custom">("12");
  const [columns, setColumns] = React.useState<string[]>([...MONTHLY_COLUMNS]);
  const [delivery, setDelivery] = React.useState<(typeof REPORT_DELIVERY_OPTIONS)[number]["value"]>(
    "download",
  );

  const selected = PARTNER_REPORTS.find((r) => r.id === selectedId)!;

  function toggleColumn(column: string, checked: boolean) {
    setColumns((current) => (checked ? [...current, column] : current.filter((c) => c !== column)));
  }

  function download() {
    downloadTextFile(`ainsworth-${selected.id}.csv`, reportToCsv(selected.id));
  }

  return (
    <PartnerShell
      topbarLabel="Reports"
      topbarMeta="· The Ainsworth"
      topbarRight={
        <button
          type="button"
          className="flex h-10 items-center rounded-[11px] border-[1.5px] border-line px-4 text-[12.5px] font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
        >
          Scheduled reports
        </button>
      }
    >
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
        Everything here comes out as a spreadsheet
      </p>
      <h1 className="mt-2 text-[34px] text-fg">Reports</h1>

      <div className="mt-5 flex gap-4">
        <div className="flex flex-1 flex-col gap-4">
          <div role="radiogroup" aria-label="Choose a report" className="flex flex-col gap-2.5">
            {PARTNER_REPORTS.map((report) => (
              <PaymentOptionRow
                key={report.id}
                selected={report.id === selectedId}
                onSelect={() => setSelectedId(report.id)}
                title={report.title}
                subtitle={report.description}
                trailing={<span className="shrink-0 text-[11px] font-bold text-fg-subtle">{report.formats}</span>}
              />
            ))}
          </div>

          <div className="overflow-hidden rounded-content border border-line bg-dark-card">
            <p className="m-0 border-b border-line px-5 py-3.5 text-[13px] font-bold text-fg">
              Downloaded recently
            </p>
            {RECENT_DOWNLOADS.map((item) => (
              <div key={item.filename} className="flex items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5 py-3.5 last:border-b-0">
                <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-panel-black">
                  <FileText size={16} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[13px] font-bold text-fg">{item.filename}</p>
                  <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{item.meta}</p>
                </div>
                <span className="shrink-0 cursor-pointer text-xs font-bold text-accent-strong">
                  Download again
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-86 shrink-0 rounded-content border border-line bg-dark-card p-5.5">
          <p className="m-0 text-sm font-bold text-fg">{selected.title}</p>
          <p className="m-0 mt-1 text-xs text-fg-subtle">One row per month, ready for a spreadsheet</p>

          <p className="m-0 mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            Range
          </p>
          <Segmented
            label="Range"
            value={range}
            onChange={setRange}
            size="sm"
            className="w-full"
            options={[
              { value: "3", label: "3 months" },
              { value: "12", label: "12 months" },
              { value: "custom", label: "Custom" },
            ]}
          />

          <p className="m-0 mb-1 mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            Columns
          </p>
          {[...MONTHLY_COLUMNS, OPTIONAL_COLUMN].map((column) => (
            <div key={column} className="border-b border-[rgba(58,50,42,0.6)] py-2.5 last:border-b-0">
              <Checkbox
                align="center"
                checked={columns.includes(column)}
                onCheckedChange={(checked) => toggleColumn(column, checked)}
              >
                {column}
              </Checkbox>
            </div>
          ))}

          <p className="m-0 mb-2.5 mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            How you want it
          </p>
          <div role="radiogroup" aria-label="How you want it" className="flex flex-col gap-2">
            {REPORT_DELIVERY_OPTIONS.map((option) => (
              <PaymentOptionRow
                key={option.value}
                selected={delivery === option.value}
                onSelect={() => setDelivery(option.value)}
                title={option.label}
                subtitle={option.description}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={download}
            className={cn(
              "mt-5 flex h-12.5 w-full items-center justify-center gap-2.5 rounded-control bg-accent text-[13px] font-bold uppercase tracking-[0.12em] text-on-accent",
              "transition-colors duration-150 hover:bg-accent-strong",
            )}
          >
            <Download size={16} strokeWidth={1.9} aria-hidden />
            Download CSV
          </button>
        </div>
      </div>
    </PartnerShell>
  );
}
