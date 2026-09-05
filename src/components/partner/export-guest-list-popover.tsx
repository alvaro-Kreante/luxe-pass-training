"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Download, Info } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Segmented } from "@/components/ui/segmented";
import {
  DEFAULT_GUEST_EXPORT_COLUMNS,
  GUEST_EXPORT_COLUMNS,
  guestListToCsv,
  type GuestExportColumnKey,
  type PartnerGuest,
} from "@/lib/partner";
import { downloadTextFile } from "@/lib/download";
import { cn } from "@/lib/utils";

/**
 * Story 7.1 — "print-friendly guest list format CSV" que "sigue los filtros
 * de pantalla" (DESIGN-SYSTEM.md §6 Fase 2). Artboard: Export.dc.html.
 * `guests` ya llega filtrado por la pantalla que lo usa.
 */
type Range = "today" | "week" | "custom";
type Format = "csv" | "pdf";

export function ExportGuestListPopover({ guests }: { guests: PartnerGuest[] }) {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<Range>("today");
  const [format, setFormat] = React.useState<Format>("csv");
  const [columns, setColumns] = React.useState<GuestExportColumnKey[]>(DEFAULT_GUEST_EXPORT_COLUMNS);

  function toggleColumn(key: GuestExportColumnKey, checked: boolean) {
    setColumns((current) =>
      checked ? [...current, key] : current.filter((column) => column !== key),
    );
  }

  function download() {
    const csv = guestListToCsv(guests, columns);
    downloadTextFile("ainsworth-guest-list.csv", csv);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 items-center justify-center gap-2.5 rounded-[11px] border-[1.5px] px-4.5 transition-colors duration-150",
            open
              ? "border-accent bg-[rgba(201,168,118,0.16)] text-fg"
              : "border-line text-fg-muted hover:border-accent hover:bg-surface-hover",
          )}
        >
          <Download size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
          <span className="text-[12.5px] font-bold tracking-[0.06em]">Export CSV</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          data-theme="dark"
          align="end"
          sideOffset={10}
          className="z-50 w-[372px] overflow-hidden rounded-content border border-line bg-dark-card shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]"
        >
          <div className="border-b border-line px-5 py-4.5">
            <p className="m-0 text-sm font-bold text-fg">Export guest list</p>
            <p className="m-0 mt-1 text-xs text-fg-subtle">
              {guests.length} {guests.length === 1 ? "guest" : "guests"} · matching the filters on
              screen
            </p>
          </div>

          <div className="px-5 py-4.5">
            <p className="m-0 mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              Range
            </p>
            <Segmented
              label="Range"
              value={range}
              onChange={setRange}
              size="sm"
              className="w-full"
              options={[
                { value: "today", label: "Today" },
                { value: "week", label: "This week" },
                { value: "custom", label: "Custom" },
              ]}
            />

            <p className="m-0 mb-1 mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              Columns
            </p>
            <div>
              {GUEST_EXPORT_COLUMNS.map((column) => (
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
            </div>

            <p className="m-0 mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              Format
            </p>
            <Segmented
              label="Format"
              value={format}
              onChange={setFormat}
              size="sm"
              className="w-full"
              options={[
                { value: "csv", label: "CSV" },
                { value: "pdf", label: "Print-friendly PDF" },
              ]}
            />

            <button
              type="button"
              onClick={download}
              className="mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-control bg-accent text-[13px] font-bold uppercase tracking-[0.12em] text-on-accent transition-colors duration-150 hover:bg-accent-strong"
            >
              <Download size={16} strokeWidth={1.9} aria-hidden />
              Download CSV
            </button>

            <div className="mt-3.5 flex gap-2">
              <Info size={13} strokeWidth={1.8} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden />
              <p className="m-0 text-[11.5px] leading-[1.55] text-fg-subtle">
                Guest contact details leave our systems with this file. Handle it under your
                partner agreement and delete it once the day is closed.
              </p>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
