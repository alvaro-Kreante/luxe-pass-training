"use client";

import * as React from "react";
import { Lock, Pencil } from "lucide-react";
import Link from "next/link";

import { LoungeLocationPreview } from "@/components/admin/address-autocomplete";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import { ModalPoint } from "@/components/admin/lounge-saved-notice";
import { PhotoViewer } from "@/components/admin/photo-viewer";
import { AdminShell } from "@/components/patterns/admin-shell";
import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { amenityLabel, type AmenityId } from "@/lib/amenities";
import { unpublishLounge, type LoungeContentDetail } from "@/lib/admin-content";
import { reactivateLounge, suspendLounge } from "@/lib/admin-partners";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const CARD = "rounded-content border border-line bg-dark-card px-5 py-4.5";
const EYEBROW = "m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Lunes primero, como el artboard.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function Locked() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-fg-subtle">
      <Lock size={13} strokeWidth={1.8} aria-hidden />
      Locked while live
    </span>
  );
}

function CardHead({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className={EYEBROW}>{title}</p>
      <div className="flex-1" />
      <Locked />
    </div>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-bold text-fg-subtle">{label}</span>
      <span className="truncate text-[13.5px] text-fg">{value || "—"}</span>
    </div>
  );
}

/**
 * Epic 8 · LoungeLive.dc.html (17) — un lounge publicado se ve entero y
 * bloqueado, ubicación incluida. "Edit lounge" pide confirmación
 * (LoungeEditConfirm.dc.html, 18) y lo devuelve a borrador. Los usuarios
 * partner se gestionan en el partner (Epic 10), no en el lounge. Story 10.4
 * (LoungeSuspend.dc.html, Fase 10 · 11): "Suspend lounge" lo saca del
 * catálogo; suspendido se ve igual de bloqueado y solo ofrece reactivarlo,
 * que lo devuelve a borrador.
 */
export function LoungeLiveView({
  lounge,
  onMovedToDraft,
  onStatusChanged,
}: {
  lounge: LoungeContentDetail;
  onMovedToDraft: () => Promise<void>;
  onStatusChanged: () => Promise<void>;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [viewing, setViewing] = React.useState<number | null>(null);
  const [suspending, setSuspending] = React.useState(false);
  const suspended = lounge.contentStatus === "suspended";

  async function changeStatus(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setSuspending(false);
      await onStatusChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function moveToDraft() {
    setBusy(true);
    setError("");
    try {
      await unpublishLounge(supabase, lounge.id);
      setConfirming(false);
      await onMovedToDraft();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not move the lounge to draft");
    } finally {
      setBusy(false);
    }
  }

  const photos = [...lounge.images].sort((a, b) => a.position - b.position);

  return (
    <AdminShell
      topbarLabel={
        <>
          <Link href="/admin/lounges" className="text-[13.5px] font-bold text-fg-subtle transition-colors duration-150 hover:text-accent">
            Lounges
          </Link>
          <span className="text-[13.5px] text-fg-subtle">›</span>
          <span className="text-[13.5px] font-bold text-fg">{lounge.name}</span>
        </>
      }
    >
      <div className="flex items-center gap-4 border-b border-line pb-5">
        <span className="relative size-13 shrink-0 overflow-hidden rounded-2xl border border-line bg-panel-black">
          {photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0].url} alt="" className="size-full object-cover" />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="m-0 font-display text-[22px] text-fg">{lounge.name}</h1>
            {suspended ? (
              <span className="inline-flex items-center rounded-pill border border-line px-3 py-1.5 text-[11.5px] font-bold text-fg-subtle">
                Suspended · hidden from members
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-gold-600 bg-accent/16 px-3 py-1.5 text-[11.5px] font-bold text-fg-muted">
                <span className="size-1.5 rounded-full bg-accent" />
                Live · visible to members
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] text-fg-subtle">
            {lounge.area}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {suspended ? (
            <Button size="md" disabled={busy} onClick={() => changeStatus(() => reactivateLounge(supabase, lounge.id))}>
              Reactivate lounge
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={() => setSuspending(true)}>
                Suspend lounge
              </Button>
              <Button size="md" onClick={() => setConfirming(true)}>
                <Pencil size={15} strokeWidth={2} />
                Edit lounge
              </Button>
            </>
          )}
        </div>
      </div>

      {error && !confirming && !suspending ? (
        <p role="alert" className="mt-4 text-[13px] font-bold text-accent-strong">
          {error}
        </p>
      ) : null}

      <div className="mt-4.5 flex min-h-0 gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className={CARD}>
            <CardHead title="Name and contact" />
            <div className="mt-3 grid grid-cols-4 gap-3">
              <Value label="Lounge name" value={lounge.name} />
              <Value label="Phone" value={lounge.phone} />
              <Value label="Email" value={lounge.email} />
              <Value label="Website" value={lounge.website} />
            </div>
          </div>

          <div className={CARD}>
            <CardHead title="Location" />
            <div className="mt-2">
              <LoungeLocationPreview
                value={{ address: lounge.address, neighborhood: lounge.neighborhood, city: lounge.city, lat: lounge.lat, lng: lounge.lng }}
              />
            </div>
          </div>

          <div className={CARD}>
            <CardHead title={`Photos · ${photos.length} of 3`} />
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  aria-label={`View photo ${photo.caption}`}
                  onClick={() => setViewing(index)}
                  className="relative h-36 cursor-zoom-in overflow-hidden rounded-xl border border-line bg-panel-black text-left transition-colors duration-150 hover:border-accent"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.caption} className="absolute inset-0 size-full object-cover" />
                  {photo.position === 0 ? (
                    <span className="absolute left-2 top-2 rounded-pill bg-accent px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-on-accent">
                      Main
                    </span>
                  ) : null}
                  <span className="absolute bottom-2 left-2 rounded-md bg-panel-black/80 px-2 py-0.5 text-[11px] font-bold text-fg">
                    {photo.caption}
                  </span>
                </button>
              ))}
              {photos.length === 0 ? <p className="m-0 text-[12.5px] text-fg-subtle">No photos yet.</p> : null}
            </div>
          </div>

          <div className={CARD}>
            <CardHead title="Operating hours" />
            <div className="mt-3 grid grid-cols-7 gap-2">
              {WEEK_ORDER.map((day) => {
                const hours = lounge.weeklyHours[day] ?? "";
                const closed = !hours || hours.toLowerCase() === "closed";
                return (
                  <div
                    key={day}
                    className={cn("rounded-xl px-1.5 py-2 text-center", closed ? "border border-dashed border-fg-subtle" : "border border-line")}
                  >
                    <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.08em] text-fg-subtle">{WEEKDAYS[day]}</p>
                    <p className={cn("m-0 mt-1 text-[11.5px] font-bold", closed ? "text-fg-subtle" : "text-fg")}>{closed ? "Closed" : hours}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={cn(CARD, "flex flex-wrap items-start gap-x-6 gap-y-4")}>
            <div className="min-w-0 flex-1">
              <p className={EYEBROW}>Amenities</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {lounge.amenities.map((amenity) => (
                  <span key={amenity} className="rounded-pill bg-accent px-3 py-1.5 text-[11.5px] font-bold text-on-accent">
                    {amenityLabel(amenity as AmenityId)}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className={EYEBROW}>Seats</p>
              <p className="m-0 mt-2 text-lg font-extrabold text-fg">{lounge.capacity}</p>
            </div>
            <div>
              <p className={EYEBROW}>Booking restrictions</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {lounge.bookingRestrictions.length === 0 ? <span className="text-[12px] text-fg-subtle">None</span> : null}
                {lounge.bookingRestrictions.map((restriction) => (
                  <span key={restriction} className="rounded-pill border border-line px-3 py-1.5 text-[11.5px] font-bold text-fg-muted">
                    {restriction}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-fit w-[344px] shrink-0 flex-col gap-3">
          <div className="rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4 py-3.5">
            <p className="m-0 text-[11.5px] leading-[1.55] text-fg-muted">
              Everything members read is locked while the lounge is live. <strong className="text-fg">Edit lounge</strong> moves it
              back to draft; publish it again when you finish.
            </p>
          </div>
        </div>
      </div>

      <PhotoViewer photos={photos} index={viewing} onIndexChange={setViewing} onClose={() => setViewing(null)} />

      <ConfirmModal
        open={suspending}
        onOpenChange={setSuspending}
        eyebrow={`${lounge.name} · lounge`}
        title="Suspend this lounge?"
        intro={`Members stop seeing ${lounge.name}. Its partner and their other lounges keep working.`}
        points={[
          { title: "Hidden from members", detail: "It leaves Explore and can't take new bookings. Bookings already made are kept." },
          { title: "Partner users still see it", detail: "Its guest list stays in the Partner Dashboard." },
          { title: "Reactivating brings it back as a draft", detail: "Review it and publish it again when it's ready." },
        ]}
        confirmLabel="Suspend lounge"
        busy={busy}
        error={error}
        onConfirm={() => changeStatus(() => suspendLounge(supabase, lounge.id))}
      />

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        dark
        width={540}
        eyebrow={`${lounge.name} · live`}
        title="Move to draft to edit?"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="normal-case" onClick={() => setConfirming(false)}>
              Keep it live
            </Button>
            <div className="flex-1" />
            <Button disabled={busy} onClick={moveToDraft}>
              Move to draft and edit
            </Button>
          </div>
        }
      >
        <p className="m-0 text-[13.5px] leading-[1.6] text-fg-muted">
          Editing takes the lounge off the member app until you publish it again.
        </p>
        <ModalPoint title="Hidden from members">It leaves Explore and takes no new bookings while it is a draft.</ModalPoint>
        <ModalPoint title="Bookings already made stay valid">Upcoming bookings and their passes keep working at the desk.</ModalPoint>
        <ModalPoint title="Publish again when you finish">Nothing changes for members until you press Publish lounge.</ModalPoint>
        {error ? <p role="alert" className="m-0 mt-3 text-[12.5px] font-bold text-accent-strong">{error}</p> : null}
      </Modal>
    </AdminShell>
  );
}
