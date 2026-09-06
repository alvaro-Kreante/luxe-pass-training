"use client";

import * as React from "react";
import { CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ADMIN_CASE_COUNTS } from "@/lib/admin";
import {
  VESTRY_APPROVAL_COMPARISON,
  VESTRY_APPROVAL_IMPACT,
  VESTRY_QUEUE_ITEMS,
  VESTRY_SUBMITTED_BY,
  VESTRY_SUBMITTED_TIME_LABEL,
} from "@/lib/admin-content";
import { cn } from "@/lib/utils";

const VESTRY_ID = "the-vestry";

/**
 * Story 8.3 — "Content approval workflow". DESIGN-SYSTEM.md §5 patrón 24 —
 * la única pantalla donde conviven las dos mitades del tema: las previews
 * "Live now"/"Proposed" van en tema claro (lo que ve el miembro) dentro del
 * shell oscuro del admin. Artboard:
 * docs/design/epic-8-admin-support/Approval.dc.html.
 *
 * Solo The Vestry tiene cambios pendientes en el catálogo de muestra — la
 * cola siempre trae sus 3 entradas o queda vacía tras resolverlas, nunca
 * una segunda solicitud de otro lounge.
 */
export default function ApprovalsPage() {
  const router = useRouter();
  const [resolved, setResolved] = React.useState(false);

  return (
    <AdminShell
      topbarLabel={
        <>
          <Link
            href="/admin/lounges"
            className="text-[13.5px] font-bold text-fg-subtle transition-colors duration-150 hover:text-accent"
          >
            Lounges
          </Link>
          <span className="text-[13.5px] text-fg-subtle">›</span>
          <span className="text-[13.5px] font-bold text-fg">Approvals</span>
        </>
      }
      supportBadge={ADMIN_CASE_COUNTS.open}
      loungesBadge={resolved ? 0 : 1}
    >
      {resolved ? (
        <EmptyState icon={CheckCheck} title="All caught up" description="No content changes are waiting for approval right now." />
      ) : (
        <>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            3 changes · The Vestry · submitted {VESTRY_SUBMITTED_TIME_LABEL} by {VESTRY_SUBMITTED_BY}
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Approve before members see it</h1>

          <div className="mt-4.5 flex min-h-0 gap-4">
            <div className="h-fit w-[380px] shrink-0 overflow-hidden rounded-content border border-line bg-dark-card">
              <div className="flex h-[42px] items-center border-b border-line px-5.5">
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">The queue</p>
              </div>

              {VESTRY_QUEUE_ITEMS.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 border-b border-[rgba(58,50,42,0.6)] px-5.5 py-3.5 last:border-b-0",
                    index === 0 && "bg-[rgba(201,168,118,0.09)] shadow-[inset_3px_0_0_var(--gold-500)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-[10px] border",
                      index === 0 ? "border-gold-600 bg-[rgba(201,168,118,0.16)]" : "border-line bg-panel-black",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("m-0 text-[13px] font-bold", index === 0 ? "text-fg" : "text-fg-muted")}>
                      {item.title}
                    </p>
                    <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{item.detail}</p>
                  </div>
                </div>
              ))}

              <div className="px-5.5 py-4">
                <p className="m-0 text-[11.5px] text-fg-subtle">
                  Approving all three at once publishes them together, so members never see half a change.
                </p>
                <Button
                  variant="ghost"
                  block
                  className="mt-3 normal-case"
                  onClick={() => router.push(`/admin/lounges/${VESTRY_ID}`)}
                >
                  Open the lounge editor
                </Button>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex gap-4">
                <ComparisonCard
                  eyebrow="Live now"
                  dimmed
                  amenities={VESTRY_APPROVAL_COMPARISON.live.amenities}
                  highlightedAmenity={null}
                  hoursLabel={VESTRY_APPROVAL_COMPARISON.live.fridayHoursLabel}
                  photoCount={VESTRY_APPROVAL_COMPARISON.live.photoCount}
                  statusLabel={VESTRY_APPROVAL_COMPARISON.live.statusLabel}
                />
                <ComparisonCard
                  eyebrow="Proposed"
                  amenities={VESTRY_APPROVAL_COMPARISON.proposed.amenities}
                  highlightedAmenity="Showers"
                  hoursLabel={VESTRY_APPROVAL_COMPARISON.proposed.fridayHoursLabel}
                  photoCount={VESTRY_APPROVAL_COMPARISON.proposed.photoCount}
                  statusLabel={VESTRY_APPROVAL_COMPARISON.proposed.statusLabel}
                />
              </div>

              <div className="mt-4 rounded-content border border-line bg-dark-card px-5.5 py-4.5">
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                  What approving does
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {VESTRY_APPROVAL_IMPACT.map((impact) => (
                    <div key={impact.label} className="rounded-2xl border border-line bg-panel-black px-3.5 py-3">
                      <p className="m-0 text-[11px] text-fg-subtle">{impact.label}</p>
                      <p className="m-0 mt-1.5 text-[15px] font-extrabold text-fg">{impact.value}</p>
                      <p className="m-0 mt-1 text-[11px] text-fg-subtle">{impact.note}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Button variant="ghost" className="border-dashed normal-case" onClick={() => setResolved(true)}>
                    Send back with a note
                  </Button>
                  <div className="flex-1" />
                  <p className="m-0 text-[11.5px] text-fg-subtle">
                    Approved by you · {VESTRY_SUBMITTED_BY.split(" ")[0]} is told either way
                  </p>
                  <Button onClick={() => setResolved(true)}>Approve and publish</Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}

function ComparisonCard({
  eyebrow,
  amenities,
  highlightedAmenity,
  hoursLabel,
  photoCount,
  statusLabel,
  dimmed,
}: {
  eyebrow: string;
  amenities: string[];
  highlightedAmenity: string | null;
  hoursLabel: string;
  photoCount: number;
  statusLabel: string;
  dimmed?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            dimmed ? "bg-fg-subtle" : "bg-accent shadow-[0_0_0_3px_rgba(201,168,118,0.28)]",
          )}
        />
        <p
          className={cn(
            "m-0 text-[11px] font-bold uppercase tracking-[0.1em]",
            dimmed ? "text-fg-subtle" : "text-accent",
          )}
        >
          {eyebrow}
        </p>
      </div>

      <div
        data-theme="light"
        className={cn(
          "surface-blush mt-2.5 rounded-content p-4",
          dimmed ? "opacity-72" : "border-[1.5px] border-accent shadow-ring",
        )}
      >
        <div className="overflow-hidden rounded-panel bg-white shadow-[0_10px_30px_-14px_rgba(34,26,20,0.14)]">
          <div className="surface-night dot-pattern h-26 w-full" />
          <div className="px-4.5 py-4">
            <h2 className="m-0 font-display text-lg text-ink-900">The Vestry</h2>
            <p className="m-0 mt-1.5 text-xs text-ink-400">
              Tribeca · New York · <span>{statusLabel}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {amenities.map((amenity) => (
                <span
                  key={amenity}
                  className={cn(
                    "rounded-pill px-3 py-1.5 text-[11px] font-bold",
                    amenity === highlightedAmenity ? "bg-accent text-white" : "bg-accent-soft text-ink-900",
                  )}
                >
                  {amenity}
                </span>
              ))}
            </div>
            <div className="mt-3.5 flex justify-between border-t border-line pt-2.5">
              <span className="text-xs text-ink-700">Friday</span>
              <span className={cn("text-xs font-bold", dimmed ? "text-ink-900" : "text-accent-strong")}>
                {hoursLabel}
              </span>
            </div>
            <div className="mt-2.5 flex justify-between">
              <span className="text-xs text-ink-700">Photos</span>
              <span className={cn("text-xs font-bold", dimmed ? "text-ink-900" : "text-accent-strong")}>
                {photoCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
