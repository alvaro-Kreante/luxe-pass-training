"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { CaseStatusChip } from "@/components/admin/case-status-chip";
import { ADMIN_CASE_COUNTS, SUPPORT_CASES } from "@/lib/admin";
import { cn } from "@/lib/utils";

/**
 * Story 8.1 — "Issue tracking and resolution notes" (la lista) y "Member
 * search by name, email or phone" (el atajo de la cabecera, que envía a
 * `/admin/members`). Artboard: docs/design/epic-8-admin-support/Main.dc.html.
 *
 * "New case" y "Filters" no llevan a ningún sitio: ningún artboard dibuja un
 * formulario de caso nuevo ni un panel de filtros para esta pantalla — igual
 * que "Write a review" en el Epic 3, quedan inertes.
 */
const GRID = "grid-cols-[92px_206px_1fr_116px_132px_108px_30px]";

export default function SupportDeskPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/admin/members?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <AdminShell
      topbarLabel={<span className="text-[13.5px] font-bold text-fg">Support</span>}
      topbarMeta="· Open cases · Monday, September 16 · 10:24 AM"
      supportBadge={ADMIN_CASE_COUNTS.open}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            En Soleil · all 12 lounges
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

      <div className="mt-3.5 flex items-center gap-2.5">
        <CaseStatusChip status="open">{ADMIN_CASE_COUNTS.open} open</CaseStatusChip>
        <CaseStatusChip status="waiting">{ADMIN_CASE_COUNTS.waitingOnMember} waiting on member</CaseStatusChip>
        <CaseStatusChip status="escalated">{ADMIN_CASE_COUNTS.escalated} escalated</CaseStatusChip>
        <CaseStatusChip status="resolved">{ADMIN_CASE_COUNTS.resolvedToday} resolved today</CaseStatusChip>
        <div className="flex-1" />
        <span className="text-[11.5px] font-semibold text-fg-subtle">Sorted by most recent</span>
      </div>

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

        {SUPPORT_CASES.map((supportCase) => (
          <button
            key={supportCase.id}
            type="button"
            aria-label={`Open case ${supportCase.id} · ${supportCase.subject}`}
            onClick={() => router.push(`/admin/support/${supportCase.id}`)}
            className={cn(
              "grid w-full items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-surface-hover",
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
                <span className="block truncate text-[11.5px] text-fg-subtle">{supportCase.membershipLabel}</span>
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

        <div className="flex items-center gap-2.5 px-5.5" style={{ height: 34 }}>
          <ChevronDown size={15} strokeWidth={1.9} className="text-fg-subtle" aria-hidden />
          <span className="text-xs font-semibold text-fg-subtle">
            Showing {ADMIN_CASE_COUNTS.shown} of {ADMIN_CASE_COUNTS.totalCases} cases · {ADMIN_CASE_COUNTS.open} open,{" "}
            {ADMIN_CASE_COUNTS.waitingOnMember} waiting on member, {ADMIN_CASE_COUNTS.escalated} escalated
          </span>
        </div>
      </div>

      <p className="mt-3.5 text-xs text-fg-subtle">
        A no-show reported by a partner opens a case on its own: the flat fee is charged first and only reversed here
        if support waives it. Every reply, refund and booking change made on these screens is written to the
        member&apos;s audit trail with your name.
      </p>
    </AdminShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{children}</p>;
}
