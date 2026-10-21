"use client";

import * as React from "react";
import { Download, FileText, Mail } from "lucide-react";

import { RequirePartnerSession } from "@/components/partner/require-partner-session";
import { PartnerShell } from "@/components/patterns/partner-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import { Segmented } from "@/components/ui/segmented";
import { usePartnerContext } from "@/components/partner/partner-context";
import { analyticsLoungeId } from "@/lib/partner-lounges";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_REPORT_ID, PARTNER_REPORTS, REPORT_DELIVERY_OPTIONS, type PartnerReport } from "@/lib/partner";
import {
  type RecentReportExport,
  type ReportRangeMonths,
  type ReportRequest,
  REPORT_SETTINGS,
  defaultReportColumns,
  emailPartnerReport,
  fetchRecentReportExports,
  generatePartnerReport,
  logReportExport,
} from "@/lib/partner-reports";
import { downloadTextFile } from "@/lib/download";
import { cn } from "@/lib/utils";

type Delivery = (typeof REPORT_DELIVERY_OPTIONS)[number]["value"];

/**
 * Story 7.3 — "Downloadable reports: export to CSV". DESIGN-SYSTEM.md §5
 * patrón 15 (App shell del partner). Artboard: Reports.dc.html.
 *
 * Los seis informes salen de datos reales (`src/lib/partner-reports.ts`); el
 * rango y las columnas del rail se aplican al CSV. Desviaciones del
 * artboard: sin "Send it every month", sin "Scheduled reports" ni rango
 * "Custom"; el botón dice "Email report" cuando se envía al equipo.
 */
function ReportsContent() {
  const supabase = React.useMemo(() => createClient(), []);
  const [selectedId, setSelectedId] = React.useState<PartnerReport["id"]>(DEFAULT_REPORT_ID);
  const [range, setRange] = React.useState<"3" | "12">("12");
  const [columns, setColumns] = React.useState<string[]>(() => defaultReportColumns(DEFAULT_REPORT_ID));
  const [delivery, setDelivery] = React.useState<Delivery>("download");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [recent, setRecent] = React.useState<RecentReportExport[]>([]);
  const context = usePartnerContext()?.context ?? null;

  const selected = PARTNER_REPORTS.find((r) => r.id === selectedId)!;
  const settings = REPORT_SETTINGS[selected.id];

  const refreshRecent = React.useCallback(() => {
    fetchRecentReportExports(supabase)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, [supabase]);

  React.useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  function selectReport(id: PartnerReport["id"]) {
    setSelectedId(id);
    setColumns(defaultReportColumns(id));
    setNotice(null);
  }

  function toggleColumn(column: string, checked: boolean) {
    setColumns((current) => (checked ? [...current, column] : current.filter((c) => c !== column)));
  }

  async function run(request: ReportRequest, how: Delivery) {
    setBusy(true);
    setNotice(null);
    try {
      const report = await generatePartnerReport(supabase, request);
      if (how === "email-team") {
        const title = PARTNER_REPORTS.find((r) => r.id === request.reportId)?.title ?? "Report";
        const sent = await emailPartnerReport(supabase, title, report);
        setNotice(`Sent to ${sent} ${sent === 1 ? "person" : "people"} on your team.`);
      } else {
        downloadTextFile(report.filename, report.csv);
      }
      await logReportExport(supabase, request, how === "email-team" ? "email" : "download", report);
      refreshRecent();
    } catch {
      setNotice(how === "email-team" ? "We couldn't send the report. Try again." : "We couldn't prepare the report. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    run(
      {
        reportId: selected.id,
        loungeId: analyticsLoungeId(context),
        dayLoungeId: context?.selectedLoungeId ?? null,
        rangeMonths: Number(range) as ReportRangeMonths,
        columns,
      },
      delivery,
    );
  }

  const emailing = delivery === "email-team";

  return (
    <PartnerShell allowAllLounges topbarLabel="Reports">
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
                onSelect={() => selectReport(report.id)}
                title={report.title}
                subtitle={report.description}
                trailing={<span className="shrink-0 text-[11px] font-bold text-fg-subtle">{report.formats}</span>}
              />
            ))}
          </div>

          <div className="overflow-hidden rounded-content border border-line bg-dark-card">
            <p id="recent-exports" className="m-0 border-b border-line px-5 py-3.5 text-[13px] font-bold text-fg">
              Downloaded recently
            </p>
            {recent.length === 0 ? (
              <p className="m-0 px-5 py-3.5 text-[12.5px] text-fg-subtle">
                Nothing yet — reports you download or email show up here.
              </p>
            ) : (
              <ul aria-labelledby="recent-exports" className="m-0 list-none p-0">
                {recent.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5 py-3.5 last:border-b-0"
                  >
                    <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-panel-black">
                      <FileText size={16} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[13px] font-bold text-fg">{item.filename}</p>
                      <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{item.meta}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(item.request, "download")}
                      className="shrink-0 cursor-pointer text-xs font-bold text-accent-strong transition-colors duration-150 hover:text-accent disabled:opacity-50"
                    >
                      Download again
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="w-86 shrink-0 rounded-content border border-line bg-dark-card p-5.5">
          <p className="m-0 text-sm font-bold text-fg">{selected.title}</p>
          <p className="m-0 mt-1 text-xs text-fg-subtle">{settings.rowsHint}, ready for a spreadsheet</p>

          <p className="m-0 mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Range</p>
          {settings.rangeHint ? (
            <p className="m-0 text-[13px] font-bold text-fg-muted">{settings.rangeHint}</p>
          ) : (
            <Segmented
              label="Range"
              value={range}
              onChange={setRange}
              size="sm"
              className="w-full"
              options={[
                { value: "3", label: "3 months" },
                { value: "12", label: "12 months" },
              ]}
            />
          )}

          {settings.columns ? (
            <>
              <p className="m-0 mb-1 mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                Columns
              </p>
              {settings.columns.map((column) => (
                <div key={column.key} className="border-b border-[rgba(58,50,42,0.6)] py-2.5 last:border-b-0">
                  <Checkbox
                    align="center"
                    checked={columns.includes(column.key)}
                    onCheckedChange={(checked) => toggleColumn(column.key, checked)}
                  >
                    {column.label}
                  </Checkbox>
                </div>
              ))}
            </>
          ) : null}

          <p className="m-0 mb-2.5 mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            How you want it
          </p>
          <div role="radiogroup" aria-label="How you want it" className="flex flex-col gap-2">
            {REPORT_DELIVERY_OPTIONS.map((option) => (
              <PaymentOptionRow
                key={option.value}
                selected={delivery === option.value}
                onSelect={() => {
                  setDelivery(option.value);
                  setNotice(null);
                }}
                title={option.label}
                subtitle={option.description}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className={cn(
              "mt-5 flex h-12.5 w-full items-center justify-center gap-2.5 rounded-control bg-accent text-[13px] font-bold uppercase tracking-[0.12em] text-on-accent disabled:opacity-50",
              "transition-colors duration-150 hover:bg-accent-strong",
            )}
          >
            {emailing ? (
              <Mail size={16} strokeWidth={1.9} aria-hidden />
            ) : (
              <Download size={16} strokeWidth={1.9} aria-hidden />
            )}
            {busy ? (emailing ? "Sending…" : "Preparing…") : emailing ? "Email report" : "Download CSV"}
          </button>
          {notice ? (
            <p role="status" className="m-0 mt-3 text-xs leading-[1.5] text-fg-muted">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    </PartnerShell>
  );
}

export default function ReportsPage() {
  return (
    <RequirePartnerSession>
      <ReportsContent />
    </RequirePartnerSession>
  );
}
