"use client";

import * as React from "react";
import { ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { CityFilterPopover } from "@/components/admin/city-filter-popover";
import { LoungeStatusChip } from "@/components/admin/lounge-status-chip";
import { StatusFilter } from "@/components/admin/status-filter";
import { BulkActionBar, BulkActionButton } from "@/components/ui/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { getTicketCounts, type TicketCounts } from "@/lib/admin";
import {
  archiveLounges,
  listAdminLounges,
  type AdminLoungeRow,
  type LoungeContentStatus,
} from "@/lib/admin-content";
import { cn } from "@/lib/utils";

const GRID = "grid-cols-[32px_1fr_210px_150px_76px_92px_92px_30px]";

/**
 * Story 8.3 — "Add/edit/remove lounge profiles" (la lista) y "Bulk update
 * capabilities" (la barra de acción masiva). Artboard:
 * docs/design/epic-8-admin-support/Lounges.dc.html.
 *
 * Backend real (22 sept 2026): `admin_lounge_list`
 * (`supabase/schemas/admin_content.sql`). "Add lounge" lleva al alta
 * (`/admin/lounges/new`, artboard LoungeNew.dc.html); de la barra masiva, solo "Archive" es real ahora — retira el lounge del
 * catálogo de miembro de inmediato, sin pasar por revisión. El resto
 * ("Update hours", "Add an amenity", "Set closure dates") sigue inerte:
 * ningún artboard dibuja su modal.
 *
 * Orden por fecha de alta, el más nuevo arriba (el RPC ya lo devuelve así).
 * Filtros rápidos Live/Draft y de ciudad: LoungeFilterCity.dc.html (27) y
 * LoungeFilterApplied.dc.html (28). Story 10.5 (LoungesWithPartner.dc.html,
 * Fase 10 · 9): columna Partner, búsqueda también por partner y filtro
 * Suspended.
 */
export default function LoungesPage() {
  return (
    <RequireAdminSession>
      <LoungesScreen />
    </RequireAdminSession>
  );
}

function LoungesScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [lounges, setLounges] = React.useState<AdminLoungeRow[] | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<Exclude<LoungeContentStatus, "archived"> | null>(null);
  const [city, setCity] = React.useState<string | null>(null);
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const reload = React.useCallback(() => setReloadToken((t) => t + 1), []);

  React.useEffect(() => {
    let active = true;
    listAdminLounges(supabase).then((rows) => {
      if (active) setLounges(rows);
    });
    getTicketCounts(supabase).then((row) => {
      if (active) setCounts(row);
    });
    return () => {
      active = false;
    };
  }, [supabase, reloadToken]);

  const visible = (lounges ?? []).filter((l) => l.contentStatus !== "archived");
  const needle = query.trim().toLowerCase();
  const filtered = visible.filter(
    (l) =>
      (!needle || l.name.toLowerCase().includes(needle) || (l.partnerName ?? "").toLowerCase().includes(needle)) &&
      (!status || l.contentStatus === status) &&
      (!city || l.city === city),
  );
  const draftCount = visible.filter((l) => l.contentStatus === "draft").length;
  const liveCount = visible.filter((l) => l.contentStatus === "live").length;
  const suspendedCount = visible.filter((l) => l.contentStatus === "suspended").length;
  const cityCounts = new Map<string, number>();
  for (const l of visible) cityCounts.set(l.city, (cityCounts.get(l.city) ?? 0) + 1);
  const cities = [...cityCounts]
    .map(([name, count]) => ({ city: name, count }))
    .sort((a, b) => a.city.localeCompare(b.city));
  const filtering = status !== null || city !== null;

  function toggleStatus(next: Exclude<LoungeContentStatus, "archived">) {
    setStatus((current) => (current === next ? null : next));
  }

  function clearFilters() {
    setStatus(null);
    setCity(null);
  }

  function toggle(id: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, id] : current.filter((i) => i !== id)));
  }

  async function archiveSelected() {
    await archiveLounges(supabase, selected);
    setSelected([]);
    reload();
  }

  return (
    <AdminShell
      topbarLabel={<span className="text-[13.5px] font-bold text-fg">Lounges</span>}
      topbarMeta={`· ${city ?? "All cities"}`}
      supportBadge={counts?.open}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {liveCount} live · {draftCount} draft
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Lounges</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="flex h-11 w-[250px] items-center gap-2.5 rounded-[11px] border border-line bg-panel-black px-3.5">
            <Search size={17} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            <input
              type="search"
              aria-label="Search lounges or partners"
              placeholder="Search lounges or partners"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-[13.5px] text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
          <CityFilterPopover cities={cities} total={visible.length} value={city} onChange={setCity} />
          <Link
            href="/admin/lounges/new"
            className="flex h-11 items-center justify-center gap-2 rounded-[11px] bg-accent px-5 transition-colors duration-150 hover:bg-accent-strong"
          >
            <Plus size={16} strokeWidth={2} className="text-on-accent" aria-hidden />
            <span className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-on-accent">Add lounge</span>
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusFilter label="Live" count={liveCount} pressed={status === "live"} onToggle={() => toggleStatus("live")} />
        <StatusFilter
          label="Draft"
          count={draftCount}
          pressed={status === "draft"}
          onToggle={() => toggleStatus("draft")}
        />
        <StatusFilter
          label="Suspended"
          count={suspendedCount}
          pressed={status === "suspended"}
          onToggle={() => toggleStatus("suspended")}
        />
        {filtering ? (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-1.5 text-xs font-bold text-accent-strong transition-colors duration-150 hover:text-accent"
          >
            Clear filters
          </button>
        ) : null}
        <span className="ml-auto text-[11.5px] font-semibold text-fg-subtle">
          {filtering || needle ? `${filtered.length} of ${visible.length} lounges · newest first` : "Newest first"}
        </span>
      </div>

      {selected.length > 0 ? (
        <div className="mt-3.5">
          <BulkActionBar count={selected.length} itemLabel="lounge" onClear={() => setSelected([])}>
            <BulkActionButton>Update hours</BulkActionButton>
            <BulkActionButton>Add an amenity</BulkActionButton>
            <BulkActionButton>Set closure dates</BulkActionButton>
            <BulkActionButton destructive onClick={archiveSelected}>
              Archive
            </BulkActionButton>
          </BulkActionBar>
        </div>
      ) : null}

      <div className="mt-3.5 overflow-hidden rounded-content border border-line bg-dark-card">
        <div className={cn("grid items-center gap-3.5 border-b border-line px-5.5", GRID)} style={{ height: 42 }}>
          <span />
          <Th>Lounge</Th>
          <Th>Partner</Th>
          <Th>Status</Th>
          <Th>Photos</Th>
          <Th>Amenities</Th>
          <Th>Updated</Th>
          <span />
        </div>

        {filtered.map((lounge) => (
          <div
            key={lounge.id}
            className={cn(
              "grid items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 last:border-b-0",
              GRID,
            )}
            style={{ height: 54 }}
          >
            <Checkbox
              checked={selected.includes(lounge.id)}
              onCheckedChange={(checked) => toggle(lounge.id, checked)}
              align="center"
              aria-label={`Select ${lounge.name}`}
            />
            <button
              type="button"
              onClick={() => router.push(`/admin/lounges/${lounge.id}`)}
              aria-label={`Open ${lounge.name}`}
              className="flex min-w-0 items-center text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-bold text-fg">{lounge.name}</span>
                <span className="block truncate text-[11.5px] text-fg-subtle">
                  {lounge.area} · capacity {lounge.capacity}
                </span>
              </span>
            </button>
            {lounge.partnerName ? (
              <Link
                href={`/admin/partners/${lounge.partnerId}`}
                className="truncate text-[12.5px] font-bold text-fg-muted transition-colors duration-150 hover:text-accent"
              >
                {lounge.partnerName}
              </Link>
            ) : (
              <p className="m-0 text-[12.5px] italic text-fg-subtle">No partner yet</p>
            )}
            <div>
              <LoungeStatusChip lounge={lounge} />
            </div>
            <p className="m-0 text-[12.5px] text-fg-muted">{lounge.photosCount}</p>
            <p className="m-0 text-[12.5px] text-fg-muted">{lounge.amenitiesCount}</p>
            <p className="m-0 text-[12.5px] font-bold text-fg-muted">{lounge.updatedLabel}</p>
            <button
              type="button"
              onClick={() => router.push(`/admin/lounges/${lounge.id}`)}
              aria-label={`View ${lounge.name}`}
              className="flex justify-end text-fg-subtle"
            >
              <ChevronRight size={17} strokeWidth={1.8} />
            </button>
          </div>
        ))}

        {lounges && filtered.length === 0 ? (
          <p className="px-5.5 py-6 text-[13px] text-fg-subtle">
            {filtering ? "No lounges match these filters." : "No lounges match this search."}
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-fg-subtle">
        A bulk change writes the same edit to every selected lounge and then waits for the same approval a single
        edit does — nothing reaches the member app until a content manager has seen it.
      </p>
    </AdminShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{children}</p>;
}
