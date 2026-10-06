"use client";

import { ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

import { PartnerBulkFlow, type BulkAction } from "@/components/admin/partner-bulk-dialogs";
import { ADMIN_CARD, ADMIN_EYEBROW } from "@/components/admin/partner-details-card";
import { BulkActionBar, BulkActionButton } from "@/components/ui/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusChip } from "@/components/ui/status-chip";
import type { AdminPartnerLounge, PartnerStatus } from "@/lib/admin-partners";

/**
 * Story 10.3 — "Lounges" de PartnerDetail.dc.html (3): los lounges del
 * partner con su status; "Open lounge" abre la vista de lounge que ya existe
 * (`/admin/lounges/[id]`). Se vinculan desde el formulario del lounge.
 * Story 10.12 — buscador con el patrón de las listas de admin
 * (Lounges.dc.html): nombre, dirección y ciudad, sin mayúsculas ni tildes.
 * Story 10.11 — PartnerBulkSelect (28): casilla por lounge, "Select all
 * shown" y la barra de acciones masivas; la selección sobrevive a la
 * búsqueda. Los modales viven en `partner-bulk-dialogs.tsx`.
 */
const CHECKLIST_TOTAL = 4;

const ACTIONS: { action: BulkAction; label: string }[] = [
  { action: "status", label: "Change status" },
  { action: "hours", label: "Set hours" },
  { action: "season", label: "Add season" },
  { action: "closure", label: "Add closure" },
];

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function PartnerLoungesCard({
  lounges,
  hint,
  partnerStatus,
  onChanged,
}: {
  lounges: AdminPartnerLounge[];
  hint: string;
  partnerStatus: PartnerStatus;
  /** Tras una acción masiva, recarga el partner. */
  onChanged: () => Promise<unknown>;
}) {
  const [query, setQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [action, setAction] = React.useState<BulkAction | null>(null);
  const needle = fold(query.trim());
  const visible = needle
    ? lounges.filter((lounge) => fold([lounge.name, lounge.address, lounge.area, lounge.city].join(" ")).includes(needle))
    : lounges;
  const selected = lounges.filter((lounge) => selectedIds.includes(lounge.id));
  const hidden = selected.filter((lounge) => !visible.includes(lounge)).length;
  const allShown = visible.length > 0 && visible.every((lounge) => selectedIds.includes(lounge.id));

  function toggle(id: string, checked: boolean) {
    setSelectedIds((current) => (checked ? [...current, id] : current.filter((other) => other !== id)));
  }

  return (
    <div className={ADMIN_CARD}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={ADMIN_EYEBROW}>Lounges · {lounges.length}</p>
        <div className="flex-1" />
        <p className="m-0 text-[11.5px] text-fg-subtle">{hint}</p>
      </div>
      {lounges.length > 0 ? (
        <label className="mt-3 flex h-11 items-center gap-2.5 rounded-[11px] border border-line bg-panel-black px-3.5">
          <Search size={17} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
          <input
            type="search"
            aria-label="Search this partner's lounges"
            placeholder="Search by name, address or city"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-[13.5px] text-fg placeholder:text-fg-subtle focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="text-fg-subtle transition-colors duration-150 hover:text-fg"
            >
              <X size={15} strokeWidth={1.8} aria-hidden />
            </button>
          ) : null}
        </label>
      ) : null}
      {selected.length > 0 ? (
        <div className="mt-3">
          <BulkActionBar
            count={selected.length}
            itemLabel="lounge"
            onClear={() => setSelectedIds([])}
            note={hidden ? `${hidden} hidden by the search` : null}
          >
            {ACTIONS.map((item) => (
              <BulkActionButton key={item.action} onClick={() => setAction(item.action)}>
                {item.label}
              </BulkActionButton>
            ))}
          </BulkActionBar>
        </div>
      ) : null}
      {visible.length > 0 ? (
        <div className="mt-3 flex items-center gap-3 px-1">
          <Checkbox
            align="center"
            checked={allShown}
            aria-label={`Select all shown · ${visible.length} of ${lounges.length} match`}
            onCheckedChange={(checked) =>
              setSelectedIds((current) =>
                checked
                  ? [...new Set([...current, ...visible.map((lounge) => lounge.id)])]
                  : current.filter((id) => !visible.some((lounge) => lounge.id === id)),
              )
            }
          >
            <span className="text-[11.5px] font-bold text-fg-subtle">
              {needle ? `Select all shown · ${visible.length} of ${lounges.length} match` : "Select all"}
            </span>
          </Checkbox>
          <div className="flex-1" />
          <span className="w-[86px] text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Checklist</span>
          <span className="w-[118px]" />
        </div>
      ) : null}
      {lounges.length === 0 ? (
        <p className="mb-0 mt-3 rounded-[14px] border-[1.5px] border-dashed border-line px-4 py-4.5 text-center text-[12.5px] text-fg-subtle">
          No lounges yet. Pick this partner when you create a lounge.
        </p>
      ) : visible.length === 0 ? (
        <p className="mb-0 mt-3 rounded-[14px] border-[1.5px] border-dashed border-line px-4 py-4.5 text-center text-[12.5px] text-fg-subtle">
          No lounges match “{query.trim()}”.
        </p>
      ) : (
        <ul aria-label="Lounges" className="m-0 mt-2.5 list-none p-0">
          {visible.map((lounge) => (
            <li
              key={lounge.id}
              aria-label={lounge.name}
              className="flex flex-wrap items-center gap-3 border-t border-line/60 py-2.5"
            >
              <Checkbox
                align="center"
                checked={selectedIds.includes(lounge.id)}
                aria-label={`Select ${lounge.name}`}
                onCheckedChange={(checked) => toggle(lounge.id, checked)}
              />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[13px] font-bold text-fg">{lounge.name}</p>
                <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">
                  {lounge.area} · capacity {lounge.capacity}
                </p>
              </div>
              {lounge.contentStatus === "suspended" ? (
                <>
                  <span className="text-[11px] text-fg-subtle">
                    {lounge.suspendedBy === "partner" ? "was live" : "suspended by admin"}
                  </span>
                  <StatusChip available={false}>Suspended</StatusChip>
                </>
              ) : lounge.contentStatus === "draft" ? (
                <StatusChip dashed>Draft</StatusChip>
              ) : (
                <StatusChip available outlined>
                  Live
                </StatusChip>
              )}
              <span
                className={cn(
                  "w-[86px] text-[12px] font-bold",
                  lounge.checklistMissing.length ? "text-accent-strong" : "text-fg-muted",
                )}
                title={lounge.checklistMissing.join(", ") || undefined}
              >
                {CHECKLIST_TOTAL - lounge.checklistMissing.length} of {CHECKLIST_TOTAL}
              </span>
              <Link
                href={`/admin/lounges/${lounge.id}`}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border-[1.5px] border-line px-3 text-xs font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
              >
                Open lounge
                <ChevronRight size={14} strokeWidth={1.8} className="text-accent" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {action ? (
        <PartnerBulkFlow
          action={action}
          selected={selected}
          all={lounges}
          partnerStatus={partnerStatus}
          onClose={() => setAction(null)}
          onApplied={(failedIds) => {
            setSelectedIds(failedIds);
            void onChanged();
          }}
        />
      ) : null}
    </div>
  );
}
