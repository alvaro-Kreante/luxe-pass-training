"use client";

import * as React from "react";
import { Info, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { PartnerStatusChip } from "@/components/admin/partner-status-chip";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { StatusFilter } from "@/components/admin/status-filter";
import { TableRow, TableRowChevron } from "@/components/ui/table-row";
import { getTicketCounts, type TicketCounts } from "@/lib/admin";
import { listAdminPartners, type AdminPartnerRow, type PartnerStatus } from "@/lib/admin-partners";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const GRID = "grid-cols-[1fr_132px_88px_270px_140px_30px]";

const STATUS_LABEL: Record<PartnerStatus, string> = { active: "Active", draft: "Draft", suspended: "Suspended" };

/**
 * Story 10.2 — listado de partners. Artboard:
 * docs/design/epic-10-partner-organizations/Partners.dc.html (1). Backend:
 * `admin_partner_list` (`supabase/schemas/admin_partners.sql`), el más nuevo
 * primero. Búsqueda por nombre y filtros rápidos de status como en
 * /admin/lounges.
 */
export default function PartnersPage() {
  return (
    <RequireAdminSession>
      <PartnersScreen />
    </RequireAdminSession>
  );
}

function PartnersScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [partners, setPartners] = React.useState<AdminPartnerRow[] | null>(null);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<PartnerStatus | null>(null);
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);

  React.useEffect(() => {
    let active = true;
    listAdminPartners(supabase).then((rows) => {
      if (active) setPartners(rows);
    });
    getTicketCounts(supabase).then((row) => {
      if (active) setCounts(row);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const all = partners ?? [];
  const needle = query.trim().toLowerCase();
  const filtered = all.filter((p) => (!needle || p.name.toLowerCase().includes(needle)) && (!status || p.status === status));
  const countOf = (value: PartnerStatus) => all.filter((p) => p.status === value).length;

  function toggleStatus(next: PartnerStatus) {
    setStatus((current) => (current === next ? null : next));
  }

  return (
    <AdminShell
      topbarLabel={<span className="text-[13.5px] font-bold text-fg">Partners</span>}
      topbarMeta="· All cities"
      supportBadge={counts?.open}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {countOf("active")} active · {countOf("draft")} draft · {countOf("suspended")} suspended
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Partners</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="flex h-11 w-[280px] items-center gap-2.5 rounded-[11px] border border-line bg-panel-black px-3.5">
            <Search size={17} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            <input
              type="search"
              aria-label="Search partners"
              placeholder="Search partners"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-[13.5px] text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
          <Link
            href="/admin/partners/new"
            className="flex h-11 items-center justify-center gap-2 rounded-[11px] bg-accent px-5 transition-colors duration-150 hover:bg-accent-strong"
          >
            <Plus size={16} strokeWidth={2} className="text-on-accent" aria-hidden />
            <span className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-on-accent">Add partner</span>
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["active", "draft", "suspended"] as const).map((value) => (
          <StatusFilter
            key={value}
            label={STATUS_LABEL[value]}
            count={countOf(value)}
            pressed={status === value}
            onToggle={() => toggleStatus(value)}
          />
        ))}
        <span className="ml-auto text-[11.5px] font-semibold text-fg-subtle">
          {status || needle ? `${filtered.length} of ${all.length} partners · newest first` : "Newest first"}
        </span>
      </div>

      <div role="table" aria-label="Partners" className="mt-3.5 overflow-hidden rounded-content border border-line bg-dark-card">
        <div role="row" className={cn("grid items-center gap-3.5 border-b border-line px-5.5", GRID)} style={{ height: 42 }}>
          <Th>Partner</Th>
          <Th>Status</Th>
          <Th>Lounges</Th>
          <Th>Representative</Th>
          <Th>Main city</Th>
          <span role="columnheader" />
        </div>

        {filtered.map((partner) => (
          <TableRow
            key={partner.id}
            role="row"
            aria-label={partner.name}
            onOpen={() => router.push(`/admin/partners/${partner.id}`)}
            className={cn("grid items-center gap-3.5 px-5.5", GRID)}
            style={{ height: 58 }}
          >
            <div role="cell" className="min-w-0">
              <button
                type="button"
                onClick={() => router.push(`/admin/partners/${partner.id}`)}
                aria-label={`Open ${partner.name}`}
                className="block min-w-0 cursor-pointer text-left"
              >
                <span
                  className={cn(
                    "block truncate text-[13.5px] font-bold",
                    partner.status === "suspended" ? "text-fg-muted" : "text-fg",
                  )}
                >
                  {partner.name}
                </span>
                <span className="block truncate text-[11.5px] text-fg-subtle">{partner.contactEmail}</span>
              </button>
            </div>
            <div role="cell">
              <PartnerStatusChip status={partner.status} />
            </div>
            <p
              role="cell"
              className={cn("m-0 text-[12.5px] font-bold", partner.loungeCount === 0 ? "text-fg-subtle" : "text-fg-muted")}
            >
              {partner.loungeCount}
            </p>
            <div role="cell" className="min-w-0">
              {partner.representative ? (
                <>
                  <p className="m-0 truncate text-[13px] font-bold text-fg">{partner.representative.name}</p>
                  <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">{partner.representative.email}</p>
                </>
              ) : (
                <p className="m-0 text-[12.5px] italic text-fg-subtle">No users yet</p>
              )}
            </div>
            <p role="cell" className="m-0 truncate text-[12.5px] text-fg-muted">
              {partner.city}
            </p>
            <div role="cell" className="flex justify-end">
              <TableRowChevron label={partner.name} onOpen={() => router.push(`/admin/partners/${partner.id}`)} />
            </div>
          </TableRow>
        ))}

        {partners && filtered.length === 0 ? (
          <p className="px-5.5 py-6 text-[13px] text-fg-subtle">
            {status ? "No partners match these filters." : "No partners match this search."}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex items-start gap-2.5">
        <Info size={15} strokeWidth={1.8} className="mt-px shrink-0 text-fg-subtle" aria-hidden />
        <p className="m-0 text-xs text-fg-subtle">
          A partner is the business behind one or more lounges — a hotel, a spa, a club. Its users sign in to the Partner
          Dashboard once the partner is active.
        </p>
      </div>
    </AdminShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <p role="columnheader" className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
      {children}
    </p>
  );
}
