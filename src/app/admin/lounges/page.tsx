"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { LoungeStatusChip } from "@/components/admin/lounge-status-chip";
import { BulkActionBar, BulkActionButton } from "@/components/ui/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { ADMIN_CASE_COUNTS } from "@/lib/admin";
import { ADMIN_LOUNGES, OTHER_CITIES_LOUNGES_FOLD } from "@/lib/admin-content";
import { cn } from "@/lib/utils";

const GRID = "grid-cols-[32px_1fr_158px_92px_106px_128px_30px]";

/**
 * Story 8.3 — "Add/edit/remove lounge profiles" (la lista) y "Bulk update
 * capabilities" (la barra de acción masiva). Artboard:
 * docs/design/epic-8-admin-support/Lounges.dc.html.
 *
 * "Add lounge", "Search lounges", "All cities" y los botones de la barra
 * masiva no llevan a ningún sitio propio — ningún artboard dibuja el
 * formulario de alta, el panel de filtro por ciudad ni el modal de edición
 * masiva; quedan inertes, igual que "New case" en la Story 8.1.
 */
export default function LoungesPage() {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>([]);

  const pendingApprovalCount = ADMIN_LOUNGES.filter((l) => l.status === "pending-approval").length;
  const draftCount = ADMIN_LOUNGES.filter((l) => l.status === "draft").length;
  const liveCount = ADMIN_LOUNGES.filter((l) => l.status === "live").length;

  function toggle(id: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, id] : current.filter((i) => i !== id)));
  }

  return (
    <AdminShell
      topbarLabel={<span className="text-[13.5px] font-bold text-fg">Lounges</span>}
      topbarMeta="· All cities · Monday, September 16 · 10:41 AM"
      supportBadge={ADMIN_CASE_COUNTS.open}
      loungesBadge={pendingApprovalCount}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {liveCount} live · {draftCount} draft · {pendingApprovalCount} changes waiting for approval
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Lounges</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="flex h-11 w-[250px] items-center gap-2.5 rounded-[11px] border border-line bg-panel-black px-3.5">
            <Search size={17} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            <input
              type="search"
              aria-label="Search lounges"
              placeholder="Search lounges"
              className="w-full bg-transparent text-[13.5px] text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line px-4"
          >
            <SlidersHorizontal size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
            <span className="text-[13.5px] font-semibold text-fg">All cities</span>
          </button>
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-[11px] bg-accent px-5"
          >
            <Plus size={16} strokeWidth={2} className="text-on-accent" aria-hidden />
            <span className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-on-accent">Add lounge</span>
          </button>
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="mt-3.5">
          <BulkActionBar count={selected.length} itemLabel="lounge" onClear={() => setSelected([])}>
            <BulkActionButton>Update hours</BulkActionButton>
            <BulkActionButton>Add an amenity</BulkActionButton>
            <BulkActionButton>Set closure dates</BulkActionButton>
            <BulkActionButton destructive>Archive</BulkActionButton>
          </BulkActionBar>
        </div>
      ) : null}

      <div className="mt-3.5 overflow-hidden rounded-content border border-line bg-dark-card">
        <div className={cn("grid items-center gap-3.5 border-b border-line px-5.5", GRID)} style={{ height: 42 }}>
          <span />
          <Th>Lounge</Th>
          <Th>Status</Th>
          <Th>Photos</Th>
          <Th>Amenities</Th>
          <Th>Updated</Th>
          <span />
        </div>

        {ADMIN_LOUNGES.map((lounge) => (
          <div
            key={lounge.id}
            className={cn(
              "grid items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 last:border-b-0",
              GRID,
              lounge.status === "pending-approval" && "shadow-[inset_3px_0_0_var(--gold-500)]",
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
                  {lounge.area}
                  {lounge.capacity ? ` · capacity ${lounge.capacity}` : ""}
                  {lounge.editedNote ? ` · ${lounge.editedNote}` : ""}
                </span>
              </span>
            </button>
            <div>
              <LoungeStatusChip lounge={lounge} />
            </div>
            <p className="m-0 text-[12.5px] text-fg-muted">
              {lounge.photosApproved} of {lounge.photosTotal}
            </p>
            <p className="m-0 text-[12.5px] text-fg-muted">
              {lounge.amenitiesApproved} of {lounge.amenitiesTotal}
            </p>
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

        <div className="flex items-center gap-2.5 px-5.5" style={{ height: 34 }}>
          <ChevronDown size={15} strokeWidth={1.9} className="text-fg-subtle" aria-hidden />
          <span className="text-xs font-semibold text-fg-subtle">{OTHER_CITIES_LOUNGES_FOLD}</span>
        </div>
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
