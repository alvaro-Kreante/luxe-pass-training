"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Info, Search, X } from "lucide-react";
import Link from "next/link";

import { PartnerStatusChip } from "@/components/admin/partner-status-chip";
import type { AdminPartnerRow } from "@/lib/admin-partners";
import { cn } from "@/lib/utils";

/**
 * Story 10.5 — "Partner" del borrador de lounge (LoungeDraftPartner.dc.html,
 * Fase 10 · 12): busca entre los partners existentes, también los que siguen
 * en draft, y elige uno. Si no está, avisa de crearlo primero en Partners
 * (el lounge no crea partners). Opcional mientras es borrador.
 */
export function PartnerPicker({
  partners,
  value,
  onChange,
}: {
  partners: AdminPartnerRow[];
  value: string | null;
  onChange: (partnerId: string | null) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const selected = partners.find((partner) => partner.id === value) ?? null;
  const needle = query.trim().toLowerCase();
  const matches = partners.filter((partner) => partner.status !== "suspended" && (!needle || partner.name.toLowerCase().includes(needle)));

  return (
    <div className="rounded-content border border-line bg-dark-card px-5 py-4.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Partner</p>
        <div className="flex-1" />
        <p className="m-0 text-[11.5px] text-fg-subtle">Optional while draft · an active partner is needed to publish</p>
      </div>

      <label htmlFor="lounge-partner" className="mb-2 mt-3 block text-[13px] font-semibold text-fg-muted">
        Who runs this lounge
      </label>

      {selected && !open ? (
        <div className="flex items-center gap-3 rounded-[11px] border border-line bg-panel-black px-3.5 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-[13px] font-bold text-fg">{selected.name}</p>
            <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">{subtitle(selected)}</p>
          </div>
          <PartnerStatusChip status={selected.status} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-bold text-accent-strong transition-colors duration-150 hover:text-accent"
          >
            Change
          </button>
          <button
            type="button"
            aria-label="Remove the partner"
            onClick={() => onChange(null)}
            className="flex size-[30px] items-center justify-center rounded-[9px] border border-line text-fg-muted transition-colors duration-150 hover:border-accent"
          >
            <X size={13} strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="flex h-11 items-center gap-2.5 rounded-[11px] border border-line bg-panel-black px-3.5 focus-within:border-accent focus-within:shadow-ring">
            <Search size={16} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            <input
              id="lounge-partner"
              role="combobox"
              aria-expanded={open}
              aria-controls="lounge-partner-options"
              autoComplete="off"
              placeholder="Search partners"
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              className="w-full bg-transparent text-[13.5px] text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            <ChevronDown size={15} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
          </div>
          {open ? (
            <div className="mt-2 rounded-[14px] border border-line bg-panel-black p-2 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)]">
              <ul id="lounge-partner-options" role="listbox" aria-label="Partners" className="m-0 max-h-64 list-none overflow-y-auto p-0">
                {matches.map((partner) => (
                  <li
                    key={partner.id}
                    role="option"
                    aria-selected={partner.id === value}
                    aria-label={`${partner.name} · ${partner.status}`}
                    onClick={() => {
                      onChange(partner.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors duration-150 hover:bg-surface-hover",
                      partner.id === value && "bg-surface-hover",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[13px] font-bold text-fg">{partner.name}</p>
                      <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">{subtitle(partner)}</p>
                    </div>
                    <PartnerStatusChip status={partner.status} />
                  </li>
                ))}
                {matches.length === 0 ? <li className="px-3 py-2.5 text-[12.5px] text-fg-subtle">No partner matches this search.</li> : null}
              </ul>
              <NotListed />
            </div>
          ) : (
            <NotListed />
          )}
        </div>
      )}
    </div>
  );
}

function subtitle(partner: AdminPartnerRow) {
  return [
    `${partner.loungeCount} ${partner.loungeCount === 1 ? "lounge" : "lounges"}`,
    partner.city,
    partner.representative?.name ?? "no users yet",
  ]
    .filter(Boolean)
    .join(" · ");
}

function NotListed() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2.5 border-t border-line px-3 pt-2.5">
      <Info size={15} strokeWidth={1.8} className="shrink-0 text-fg-subtle" aria-hidden />
      <p className="m-0 min-w-0 flex-1 text-[11.5px] text-fg-muted">Not listed? Create the partner first — draft partners show up here too.</p>
      <Link
        href="/admin/partners/new"
        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-accent-strong transition-colors duration-150 hover:text-accent"
      >
        Go to Partners
        <ChevronRight size={13} strokeWidth={1.8} aria-hidden />
      </Link>
    </div>
  );
}
