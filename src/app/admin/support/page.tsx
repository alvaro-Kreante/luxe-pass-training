"use client";

import * as React from "react";
import { ChevronRight, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { CaseStatusChip } from "@/components/admin/case-status-chip";
import { createClient } from "@/lib/supabase/client";
import { getTicketCounts, listSupportCases, type SupportCase, type TicketCounts } from "@/lib/admin";
import { cn } from "@/lib/utils";

/**
 * Story 8.1 — "Issue tracking and resolution notes" (la lista) y "Member
 * search by name, email or phone" (el atajo de la cabecera, que envía a
 * `/admin/members`). Artboard: docs/design/epic-8-admin-support/Main.dc.html.
 *
 * Backend real (22 sept 2026): `support_tickets` (nace en Epic 8, ver
 * `supabase/schemas/support_tickets.sql`) vía `admin_list_support_tickets`/
 * `admin_ticket_counts`.
 *
 * "New case" y "Filters" no llevan a ningún sitio: ningún artboard dibuja un
 * formulario de caso nuevo ni un panel de filtros para esta pantalla — igual
 * que "Write a review" en el Epic 3, quedan inertes.
 */
const GRID = "grid-cols-[92px_206px_1fr_116px_132px_108px_30px]";

export default function SupportDeskPage() {
  return (
    <RequireAdminSession>
      <SupportDeskScreen />
    </RequireAdminSession>
  );
}

function SupportDeskScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [query, setQuery] = React.useState("");
  const [cases, setCases] = React.useState<SupportCase[] | null>(null);
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);

  React.useEffect(() => {
    let active = true;
    async function load() {
      const [caseRows, ticketCounts] = await Promise.all([
        listSupportCases(supabase),
        getTicketCounts(supabase),
      ]);
      if (!active) return;
      setCases(caseRows);
      setCounts(ticketCounts);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/admin/members?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <AdminShell
      topbarLabel={<span className="text-[13.5px] font-bold text-fg">Support</span>}
      topbarMeta="· Open cases"
      supportBadge={counts?.open}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            En Soleil · support desk
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Support desk</h1>
        </div>

        <form onSubmit={submitSearch} className="flex items-center gap-2.5">
          <label className="flex h-11 w-[318px] items-center gap-2.5 rounded-[11px] border border-line bg-panel-black px-3.5">
            <Search size={17} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            <input
              type="search"
              role="searchbox"
              aria-label="Search members by name, email or phone"
              placeholder="Search members by name, email or phone"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-[13.5px] text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line px-4.5 transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
          >
            <SlidersHorizontal size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
            <span className="text-[12.5px] font-bold tracking-[0.06em] text-fg-muted">Filters</span>
          </button>
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-[11px] bg-accent px-5 transition-colors duration-150 hover:bg-accent-strong"
          >
            <Plus size={16} strokeWidth={2} className="text-on-accent" aria-hidden />
            <span className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-on-accent">New case</span>
          </button>
        </form>
      </div>

      {counts ? (
        <div className="mt-3.5 flex items-center gap-2.5">
          <CaseStatusChip status="open">{counts.open} open</CaseStatusChip>
          <CaseStatusChip status="waiting">{counts.waitingOnMember} waiting on member</CaseStatusChip>
          <CaseStatusChip status="escalated">{counts.escalated} escalated</CaseStatusChip>
          <CaseStatusChip status="resolved">{counts.resolvedToday} resolved today</CaseStatusChip>
          <div className="flex-1" />
          <span className="text-[11.5px] font-semibold text-fg-subtle">Sorted by most recent</span>
        </div>
      ) : null}

      <div className="mt-4.5 overflow-hidden rounded-content border border-line bg-dark-card">
        <div className={cn("grid items-center gap-3.5 border-b border-line px-5.5", GRID)} style={{ height: 42 }}>
          <Th>Case</Th>
          <Th>Member</Th>
          <Th>Subject</Th>
          <Th>Opened</Th>
          <Th>Status</Th>
          <Th>Assignee</Th>
          <span />
        </div>

        {(cases ?? []).map((supportCase) => (
          <button
            key={supportCase.id}
            type="button"
            aria-label={`Open case ${supportCase.id} · ${supportCase.subject}`}
            onClick={() => router.push(`/admin/support/${supportCase.id}`)}
            className={cn(
              "grid w-full cursor-pointer items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-surface-hover",
              GRID,
              supportCase.status === "new" && "bg-[rgba(201,168,118,0.09)] shadow-[inset_3px_0_0_var(--gold-500)]",
            )}
            style={{ height: 54 }}
          >
            <span className="text-[13px] font-bold tracking-[0.04em] text-fg">{supportCase.id}</span>

            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xs font-bold text-on-accent">
                {supportCase.memberInitials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-bold text-fg">{supportCase.memberName}</span>
              </span>
            </span>

            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold text-fg">{supportCase.subject}</span>
              <span className="block truncate text-[11.5px] text-fg-subtle">{supportCase.note}</span>
            </span>

            <span>
              <span className="block text-[13px] font-bold text-fg">{supportCase.openedLabel}</span>
              <span className="block text-[11.5px] text-fg-subtle">{supportCase.openedTimeLabel}</span>
            </span>

            <span>
              <CaseStatusChip status={supportCase.status} />
            </span>

            <span className="text-[12.5px] text-fg-muted">{supportCase.assignee ?? "Unassigned"}</span>

            <ChevronRight size={17} strokeWidth={1.8} className="justify-self-end text-fg-subtle" aria-hidden />
          </button>
        ))}

        {cases && cases.length === 0 ? (
          <p className="px-5.5 py-6 text-[13px] text-fg-subtle">No cases on file yet.</p>
        ) : null}

        {counts ? (
          <div className="flex items-center gap-2.5 px-5.5" style={{ height: 34 }}>
            <span className="text-xs font-semibold text-fg-subtle">
              Showing {(cases ?? []).length} of {counts.totalCases} cases · {counts.open} open,{" "}
              {counts.waitingOnMember} waiting on member, {counts.escalated} escalated
            </span>
          </div>
        ) : null}
      </div>

      <p className="mt-3.5 text-xs text-fg-subtle">
        A no-show reported by a partner opens a case on its own: the flat fee is charged first and only reversed here
        if support waives it.
      </p>
    </AdminShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{children}</p>;
}
