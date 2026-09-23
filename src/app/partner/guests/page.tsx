"use client";

import * as React from "react";
import { ChevronRight, Download, Search } from "lucide-react";

import { RequirePartnerSession } from "@/components/partner/require-partner-session";
import { PartnerShell } from "@/components/patterns/partner-shell";
import { Segmented } from "@/components/ui/segmented";
import { StatusChip } from "@/components/ui/status-chip";
import { createClient } from "@/lib/supabase/client";
import {
  type PartnerRepeatGuestRow,
  type RepeatGuestFilter,
  type RepeatGuestRow,
  filterRepeatGuests,
  formatCurrency,
  loyaltyTier,
  mapRepeatGuestRow,
  matchesRepeatGuestQuery,
  repeatGuestsSummary,
  repeatGuestsToCsv,
} from "@/lib/partner";
import { downloadTextFile } from "@/lib/download";

/**
 * Story 7.3 — "Repeat guest identification: loyalty trackers". Artboard:
 * RepeatGuests.dc.html. Vive bajo el ítem de nav "Guests" — distinto de la
 * lista diaria de "Today".
 *
 * El segmented del artboard deja "Came back" preseleccionado, pero su propia
 * tabla dibuja a Elena Vasquez con una sola visita ("First visit") — el
 * artboard se contradice. Aquí el filtro por defecto es "Everyone" para que
 * las tres etiquetas de lealtad se puedan ver sin interactuar.
 *
 * Backend real (22 sept 2026): `partner_repeat_guests`
 * (`supabase/schemas/partner_analytics.sql`) agrega toda la historia real de
 * los lounges del partner autenticado — sin límite de fecha, "repeat guest"
 * es un hecho acumulado, no del periodo de Analytics.
 */
function RepeatGuestsContent() {
  const supabase = React.useMemo(() => createClient(), []);
  const [guests, setGuests] = React.useState<RepeatGuestRow[]>([]);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<RepeatGuestFilter>("everyone");

  React.useEffect(() => {
    let active = true;
    supabase.rpc("partner_repeat_guests").then(({ data }) => {
      if (!active || !data) return;
      setGuests((data as PartnerRepeatGuestRow[]).map(mapRepeatGuestRow));
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const filtered = filterRepeatGuests(guests, filter).filter((guest) =>
    matchesRepeatGuestQuery(guest, query),
  );
  const summary = repeatGuestsSummary(guests);

  return (
    <PartnerShell
      topbarLabel="Guests"
      topbarMeta="· all-time"
      topbarRight={
        <button
          type="button"
          onClick={() => downloadTextFile("partner-repeat-guests.csv", repeatGuestsToCsv(filtered))}
          className="flex h-10 items-center gap-2 rounded-[11px] border-[1.5px] border-line px-4 text-[12.5px] font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
        >
          <Download size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
          Export CSV
        </button>
      }
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            Everyone who booked here
          </p>
          <h1 className="mt-2 text-[34px] text-fg">Guests who came back</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-59 items-center gap-2.5 rounded-[11px] border border-line bg-panel-black px-4">
            <Search size={17} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            <label htmlFor="repeat-guest-search" className="sr-only">
              Search guests
            </label>
            <input
              id="repeat-guest-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search guests"
              className="flex-1 bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-subtle"
            />
          </div>

          <Segmented
            label="Filter"
            value={filter}
            onChange={setFilter}
            size="sm"
            className="w-80"
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "came-back", label: "Came back" },
              { value: "first-visit", label: "First visit" },
            ]}
          />
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <SummaryChip label={`${summary.totalMembers} members visited`} active />
        <SummaryChip label={`${summary.cameBackAtLeastOnce} came back at least once`} />
        <SummaryChip label={`${summary.returnRate}% return rate`} />
        <SummaryChip label={`${summary.averageVisits} visits each on average`} />
      </div>

      <div className="mt-5 overflow-hidden rounded-content border border-line bg-dark-card">
        <div className="grid grid-cols-[1fr_92px_146px_132px_128px_112px_34px] items-center gap-3 border-b border-line px-5.5 py-2.5">
          <Th>Guest</Th>
          <Th>Visits here</Th>
          <Th>Last visit</Th>
          <Th>First visit</Th>
          <Th>Loyalty</Th>
          <Th className="text-right">Attributed</Th>
          <span />
        </div>

        {filtered.map((guest) => {
          const tier = loyaltyTier(guest.visits);
          return (
            <div
              key={guest.email}
              className="grid grid-cols-[1fr_92px_146px_132px_128px_112px_34px] items-center gap-3 border-b border-[rgba(58,50,42,0.6)] px-5.5 py-2.5 text-[12.5px] last:border-b-0"
              style={{ height: 54 }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xs font-bold text-on-accent">
                  {guest.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-bold text-fg">{guest.name}</span>
                  <span className="block truncate text-[11.5px] text-fg-subtle">{guest.email}</span>
                </span>
              </div>
              <span className="font-bold text-fg">{guest.visits}</span>
              <span className="text-fg-muted">{guest.lastVisitLabel}</span>
              <span className="text-fg-muted">{guest.firstVisitLabel}</span>
              <span>
                {tier === "regular" ? (
                  <StatusChip outlined size="sm">
                    Regular
                  </StatusChip>
                ) : tier === "returning" ? (
                  <StatusChip available={false} size="sm" className="text-fg-muted">
                    Returning
                  </StatusChip>
                ) : (
                  <StatusChip dashed size="sm">
                    First visit
                  </StatusChip>
                )}
              </span>
              <span className="text-right font-bold text-fg">{formatCurrency(guest.attributed)}</span>
              <span className="flex justify-end text-fg-subtle">
                <ChevronRight size={17} strokeWidth={1.8} />
              </span>
            </div>
          );
        })}
      </div>

      <p className="m-0 mt-3.5 flex items-start gap-2 text-xs leading-[1.55] text-fg-subtle">
        Loyalty is counted at this venue only: <strong className="text-fg-muted">Regular</strong>{" "}
        is five visits or more, <strong className="text-fg-muted">Returning</strong> is two to
        four. Email and phone are shown for guests with a booking on the books — a member&apos;s
        history at other lounges is never shared with you.
      </p>
    </PartnerShell>
  );
}

export default function RepeatGuestsPage() {
  return (
    <RequirePartnerSession>
      <RepeatGuestsContent />
    </RequirePartnerSession>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle ${className ?? ""}`}>
      {children}
    </p>
  );
}

function SummaryChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-pill border border-accent bg-[rgba(201,168,118,0.18)] px-3 py-1.5 text-[11.5px] font-bold text-fg"
          : "inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-[11.5px] font-bold text-fg-muted"
      }
    >
      <span aria-hidden className={active ? "size-1.5 rounded-full bg-accent" : "size-1.5 rounded-full bg-fg-subtle"} />
      {label}
    </span>
  );
}
