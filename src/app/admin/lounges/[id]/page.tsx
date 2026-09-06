"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { ApprovalDiff } from "@/components/ui/approval-diff";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { ADMIN_CASE_COUNTS } from "@/lib/admin";
import {
  getAdminLounge,
  VESTRY_AMENITIES,
  VESTRY_AVAILABILITY,
  VESTRY_HOURS,
  VESTRY_LAST_PUBLISHED_NOTE,
  VESTRY_PENDING_CHANGES,
  VESTRY_PHOTOS,
  VESTRY_RESTRICTIONS,
  VESTRY_SEASONAL_CLOSURE,
  VESTRY_SUBMITTED_BY,
  VESTRY_SUBMITTED_TIME_LABEL,
  type PendingChange,
} from "@/lib/admin-content";
import { cn } from "@/lib/utils";

const VESTRY_ID = "the-vestry";

const COUNT_WORDS = ["zero", "one", "two", "three"];

/**
 * Story 8.3 — "Update amenities (shower) and operating hours", "Set booking
 * availability and restrictions" y "Content approval workflow". Artboard:
 * docs/design/epic-8-admin-support/LoungeEdit.dc.html.
 *
 * Solo The Vestry trae el editor completo (fotos, amenities, horario,
 * disponibilidad) — es el único ejemplo que dibuja el artboard. El resto de
 * `ADMIN_LOUNGES` muestra una ficha mínima derivada de su fila de la lista,
 * mismo criterio que `getMemberProfile` en la Story 8.1.
 */
export default function LoungeEditPage() {
  const { id } = useParams<{ id: string }>();
  const lounge = getAdminLounge(id);
  if (!lounge) notFound();

  const [pendingChanges, setPendingChanges] = React.useState<PendingChange[]>(
    lounge!.id === VESTRY_ID ? VESTRY_PENDING_CHANGES : [],
  );
  const [resolution, setResolution] = React.useState<"published" | "sent-back" | null>(null);

  function approveAll() {
    setPendingChanges([]);
    setResolution("published");
  }

  function approveOneByOne() {
    setPendingChanges((current) => {
      const next = current.slice(1);
      if (next.length === 0) setResolution("published");
      return next;
    });
  }

  function sendBack() {
    setPendingChanges([]);
    setResolution("sent-back");
  }

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
          <span className="text-[13.5px] font-bold text-fg">{lounge!.name}</span>
        </>
      }
      supportBadge={ADMIN_CASE_COUNTS.open}
    >
      <div className="flex items-center gap-4 border-b border-line pb-5">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl border border-gold-600 bg-[radial-gradient(circle_at_35%_25%,#3a2f25,#15110d_70%)] font-display text-xl text-accent">
          {lounge!.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="m-0 font-display text-[22px] text-fg">{lounge!.name}</h1>
            {pendingChanges.length > 0 ? (
              <StatusChip emphasis>
                {pendingChanges.length} {pendingChanges.length === 1 ? "change" : "changes"} waiting for approval
              </StatusChip>
            ) : null}
          </div>
          <p className="mt-1.5 text-[12.5px] text-fg-subtle">
            {lounge!.area}
            {lounge!.capacity ? ` · capacity ${lounge!.capacity}` : ""}
            {lounge!.editedNote ? ` · ${lounge!.editedNote}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="md" className="normal-case">
            <Eye size={16} strokeWidth={1.8} />
            Preview as a member
          </Button>
          {pendingChanges.length > 0 ? (
            <>
              <Button variant="ghost" size="md" className="border-dashed normal-case" onClick={sendBack}>
                Send back to Theo
              </Button>
              <Button size="md" onClick={approveAll}>
                Approve and publish
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {resolution ? (
        <p className="mt-4 text-[13px] font-bold text-accent-strong">
          {resolution === "published"
            ? "Published — the changes are now live for members."
            : `Sent back to ${VESTRY_SUBMITTED_BY.split(" ")[0]} with a note.`}
        </p>
      ) : null}

      {lounge!.id === VESTRY_ID ? (
        <div className="mt-4.5 flex min-h-0 gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            <div className="rounded-content border border-line bg-dark-card px-5 py-4.5">
              <div className="flex items-center gap-3">
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Photos · up to 3</p>
                <div className="flex-1" />
                <p className="m-0 text-[11.5px] text-fg-subtle">
                  Resized to 1600, 800 and 400 px on upload — send the original, not a crop
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {VESTRY_PHOTOS.map((photo) => (
                  <div
                    key={photo.label}
                    className={cn(
                      "relative h-28 overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_35%_30%,#3a2f25,#15110d_72%)]",
                      photo.state === "new-waiting" ? "border-[1.5px] border-accent shadow-ring" : "border-line",
                    )}
                  >
                    {photo.state === "new-waiting" ? (
                      <span className="absolute left-3 top-3 rounded-pill bg-accent px-2.5 py-1 text-[10.5px] font-extrabold text-white">
                        NEW · WAITING
                      </span>
                    ) : null}
                    <p className="absolute bottom-3 left-3.5 m-0 text-[11.5px] font-bold text-fg-muted">
                      {photo.label}
                      {photo.state === "live" ? " · live" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-content border border-line bg-dark-card px-5 py-4.5">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Amenities</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {VESTRY_AMENITIES.map((amenity) => (
                  <span
                    key={amenity.label}
                    className={cn(
                      "inline-flex items-center rounded-pill px-4 py-2 text-xs font-bold",
                      amenity.state === "being-added"
                        ? "border-[1.5px] border-accent bg-transparent text-fg shadow-ring"
                        : "bg-accent text-on-accent",
                    )}
                  >
                    {amenity.label}
                    {amenity.state === "being-added" ? " · being added" : ""}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-content border border-line bg-dark-card px-5 py-4.5">
              <div className="flex items-center gap-3">
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Operating hours</p>
                <div className="flex-1" />
                <button type="button" className="text-[11.5px] font-bold text-accent-strong">
                  Add a seasonal closure
                </button>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {VESTRY_HOURS.map((day) => (
                  <div
                    key={day.day}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-center",
                      day.highlighted ? "border-[1.5px] border-accent shadow-ring" : day.closed ? "border-dashed border-fg-subtle" : "border-line",
                    )}
                  >
                    <p
                      className={cn(
                        "m-0 text-[11px] font-bold uppercase tracking-[0.08em]",
                        day.highlighted ? "text-accent" : "text-fg-subtle",
                      )}
                    >
                      {day.day}
                    </p>
                    <p className={cn("m-0 mt-1.5 text-xs font-bold", day.closed ? "text-fg-subtle" : "text-fg")}>
                      {day.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-content border border-line bg-dark-card px-5 py-4.5">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Booking availability</p>
              <div className="mt-3 grid grid-cols-4 gap-2.5">
                {VESTRY_AVAILABILITY.map((slot) => (
                  <div
                    key={slot.label}
                    className={cn(
                      "rounded-2xl border bg-panel-black px-3.5 py-3",
                      slot.highlighted ? "border-[1.5px] border-accent shadow-ring" : "border-line",
                    )}
                  >
                    <p className={cn("m-0 text-[11px]", slot.highlighted ? "text-accent" : "text-fg-subtle")}>
                      {slot.label}
                    </p>
                    <p className="m-0 mt-1.5 text-[17px] font-extrabold text-fg">{slot.seats} seats</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {VESTRY_RESTRICTIONS.map((restriction) => (
                  <span key={restriction} className="rounded-pill border border-line px-3.5 py-1.5 text-[11.5px] font-bold text-fg-muted">
                    {restriction}
                  </span>
                ))}
                <span className="rounded-pill border border-dashed border-fg-subtle px-3.5 py-1.5 text-[11.5px] font-bold text-fg-subtle">
                  {VESTRY_SEASONAL_CLOSURE}
                </span>
              </div>
            </div>
          </div>

          <div className="flex h-fit w-[344px] shrink-0 flex-col gap-3.5">
            {pendingChanges.length > 0 ? (
              <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                  Waiting for you · {pendingChanges.length} {pendingChanges.length === 1 ? "change" : "changes"}
                </p>
                <p className="mt-2 text-[11.5px] text-fg-subtle">
                  Submitted by {VESTRY_SUBMITTED_BY} at {VESTRY_SUBMITTED_TIME_LABEL}
                </p>

                {pendingChanges.map((change) => (
                  <ApprovalDiff key={change.id} change={change} />
                ))}

                <div className="mt-4 flex flex-col gap-2.5">
                  <Button size="lg" block onClick={approveAll}>
                    Approve all {COUNT_WORDS[pendingChanges.length] ?? pendingChanges.length}
                  </Button>
                  <Button variant="ghost" block className="normal-case" onClick={approveOneByOne}>
                    Approve one by one
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4 py-3.5">
              <p className="m-0 text-[11.5px] leading-[1.55] text-fg-muted">
                Nothing here reaches the member app until it is approved. Showers is the most searched amenity in the
                network, so approving it puts The Vestry into a filter 62% of searches use.
              </p>
            </div>

            <div className="rounded-content border border-line bg-dark-card px-5.5 py-4.5">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Last published</p>
              <p className="mt-2.5 text-[12.5px] text-fg-muted">{VESTRY_LAST_PUBLISHED_NOTE}</p>
              <button type="button" className="mt-2.5 text-[11.5px] font-bold text-accent-strong">
                See the full change history
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4.5 rounded-content border border-line bg-dark-card px-5.5 py-5">
          <p className="m-0 text-[13px] font-bold text-fg">
            {lounge!.photosApproved} of {lounge!.photosTotal} photos · {lounge!.amenitiesApproved} of{" "}
            {lounge!.amenitiesTotal} amenities
          </p>
          <p className="mt-2 text-[12.5px] text-fg-muted">No changes waiting for approval.</p>
        </div>
      )}
    </AdminShell>
  );
}
