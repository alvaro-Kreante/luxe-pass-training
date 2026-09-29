"use client";

import * as React from "react";
import { Eye, Plus, X } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { LoungeDraftForm } from "@/components/admin/lounge-draft-form";
import { AdminShell } from "@/components/patterns/admin-shell";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { ApprovalDiff } from "@/components/ui/approval-diff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/status-chip";
import { AMENITIES } from "@/lib/amenities";
import { createClient } from "@/lib/supabase/client";
import { getTicketCounts, type TicketCounts } from "@/lib/admin";
import {
  approveLoungeSubmission,
  diffLoungeChanges,
  getLoungeContentDetail,
  getLoungePartnerInvite,
  rejectLoungeSubmission,
  submitLoungeContentChange,
  uploadLoungeImage,
  type LoungeContentDetail,
  type ProposedLoungeContent,
} from "@/lib/admin-content";
import type { PartnerInviteInput } from "@/lib/lounge-draft";
import { cn } from "@/lib/utils";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Story 8.3 — "Update amenities (shower) and operating hours", "Set booking
 * availability and restrictions", "Upload and manage lounge images" y
 * "Content approval workflow". Artboard:
 * docs/design/epic-8-admin-support/LoungeEdit.dc.html.
 *
 * Backend real (22 sept 2026): `admin_lounge_detail`/
 * `admin_submit_lounge_content_change`/`admin_approve_lounge_submission`/
 * `admin_reject_lounge_submission` (`supabase/schemas/admin_content.sql`).
 * El mock solo dibujaba el editor completo para The Vestry — aquí funciona
 * igual para cualquier lounge real, con el catálogo de amenities de
 * `lib/amenities.ts` (Story 2.2) en vez de la lista propia del mock (que
 * incluía "Showers", ajena a ese catálogo — desviación anotada en
 * `docs/design/COMPONENT-MAP.md`). "Image optimization and resizing" no es
 * real: la subida a Storage sí lo es, el redimensionado no.
 */
export default function LoungeEditPage() {
  return (
    <RequireAdminSession>
      <LoungeEditScreen />
    </RequireAdminSession>
  );
}

function LoungeEditScreen() {
  const { id } = useParams<{ id: string }>();
  const supabase = React.useMemo(() => createClient(), []);
  const [lounge, setLounge] = React.useState<LoungeContentDetail | null | undefined>(undefined);
  const [partner, setPartner] = React.useState<PartnerInviteInput | null>(null);

  React.useEffect(() => {
    let active = true;
    Promise.all([getLoungeContentDetail(supabase, id), getLoungePartnerInvite(supabase, id)]).then(([detail, invite]) => {
      if (!active) return;
      setPartner(invite);
      setLounge(detail ?? null);
    });
    return () => {
      active = false;
    };
  }, [supabase, id]);

  if (lounge === null) notFound();
  if (lounge === undefined) return null;

  // Un borrador se sigue editando con el formulario de alta, dirección
  // incluida (LoungeNew.dc.html); publicado, la dirección queda fija.
  if (lounge.contentStatus === "draft") return <LoungeDraftForm lounge={lounge} partner={partner} />;

  return <LiveLoungeEditor initial={lounge} />;
}

function LiveLoungeEditor({ initial }: { initial: LoungeContentDetail }) {
  const id = initial.id;
  const supabase = React.useMemo(() => createClient(), []);
  const [lounge, setLounge] = React.useState<LoungeContentDetail | null | undefined>(initial);
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const reload = React.useCallback(() => setReloadToken((t) => t + 1), []);

  const [amenities, setAmenities] = React.useState<string[]>(initial.amenities);
  const [weeklyHours, setWeeklyHours] = React.useState<string[]>(initial.weeklyHours);
  const [capacity, setCapacity] = React.useState(initial.capacity);
  const [restrictions, setRestrictions] = React.useState<string[]>(initial.bookingRestrictions);
  const [newRestriction, setNewRestriction] = React.useState("");
  const [photos, setPhotos] = React.useState<{ url: string; caption: string }[]>(
    initial.images.map((i) => ({ url: i.url, caption: i.caption })),
  );
  const [rejectNote, setRejectNote] = React.useState("");
  const [banner, setBanner] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let active = true;
    // La ficha ya llega cargada (`initial`); solo se relee tras enviar,
    // aprobar o devolver un cambio — releerla al montar podía pisar un
    // cambio que el admin ya hubiera hecho en el formulario.
    if (reloadToken > 0) getLoungeContentDetail(supabase, id).then((detail) => {
      if (!active) return;
      setLounge(detail ?? null);
      if (detail) {
        setAmenities(detail.amenities);
        setWeeklyHours(detail.weeklyHours);
        setCapacity(detail.capacity);
        setRestrictions(detail.bookingRestrictions);
        setPhotos(detail.images.map((i) => ({ url: i.url, caption: i.caption })));
      }
    });
    getTicketCounts(supabase).then((row) => {
      if (active) setCounts(row);
    });
    return () => {
      active = false;
    };
  }, [supabase, id, reloadToken]);

  if (lounge === null) notFound();
  if (lounge === undefined) return null;

  function toggleAmenity(amenityId: string) {
    setAmenities((current) =>
      current.includes(amenityId) ? current.filter((a) => a !== amenityId) : [...current, amenityId],
    );
  }

  function addRestriction() {
    const value = newRestriction.trim();
    if (!value) return;
    setRestrictions((current) => [...current, value]);
    setNewRestriction("");
  }

  async function addPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || photos.length >= 3) return;
    const url = await uploadLoungeImage(supabase, id, file);
    setPhotos((current) => [...current, { url, caption: file.name }]);
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  function buildProposal(): ProposedLoungeContent {
    const proposal: ProposedLoungeContent = {};
    if (JSON.stringify([...amenities].sort()) !== JSON.stringify([...lounge!.amenities].sort())) {
      proposal.amenities = amenities;
    }
    if (JSON.stringify(weeklyHours) !== JSON.stringify(lounge!.weeklyHours)) {
      proposal.weekly_hours = weeklyHours;
    }
    if (capacity !== lounge!.capacity) {
      proposal.capacity = capacity;
    }
    if (JSON.stringify(restrictions) !== JSON.stringify(lounge!.bookingRestrictions)) {
      proposal.booking_restrictions = restrictions;
    }
    if (JSON.stringify(photos) !== JSON.stringify(lounge!.images.map((i) => ({ url: i.url, caption: i.caption })))) {
      proposal.photos = photos;
    }
    return proposal;
  }

  const proposal = buildProposal();
  const hasDraftChanges = Object.keys(proposal).length > 0;

  async function submitForReview() {
    await submitLoungeContentChange(supabase, id, proposal);
    setBanner(null);
    reload();
  }

  async function approve() {
    await approveLoungeSubmission(supabase, lounge!.pendingSubmissionId!);
    setBanner("Published — the changes are now live for members.");
    reload();
  }

  async function reject() {
    await rejectLoungeSubmission(supabase, lounge!.pendingSubmissionId!, rejectNote);
    setBanner("Sent back with a note.");
    setRejectNote("");
    reload();
  }

  const pendingChanges = lounge.pendingProposed ? diffLoungeChanges(lounge, lounge.pendingProposed) : [];

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
          <span className="text-[13.5px] font-bold text-fg">{lounge.name}</span>
        </>
      }
      supportBadge={counts?.open}
    >
      <div className="flex items-center gap-4 border-b border-line pb-5">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl border border-gold-600 bg-[radial-gradient(circle_at_35%_25%,#3a2f25,#15110d_70%)] font-display text-xl text-accent">
          {lounge.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="m-0 font-display text-[22px] text-fg">{lounge.name}</h1>
            {pendingChanges.length > 0 ? (
              <StatusChip emphasis>
                {pendingChanges.length} {pendingChanges.length === 1 ? "change" : "changes"} waiting for approval
              </StatusChip>
            ) : null}
          </div>
          <p className="mt-1.5 text-[12.5px] text-fg-subtle">
            {lounge.area} · capacity {lounge.capacity}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="md" className="normal-case">
            <Eye size={16} strokeWidth={1.8} />
            Preview as a member
          </Button>
          {!lounge.pendingSubmissionId && hasDraftChanges ? (
            <Button size="md" onClick={submitForReview}>
              Submit for review
            </Button>
          ) : null}
        </div>
      </div>

      {banner ? <p className="mt-4 text-[13px] font-bold text-accent-strong">{banner}</p> : null}

      <div className="mt-4.5 flex min-h-0 gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5 py-4.5">
            <div className="flex items-center gap-3">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Photos · up to 3</p>
              <div className="flex-1" />
              <p className="m-0 text-[11.5px] text-fg-subtle">Uploaded as-is — resizing is not automatic yet</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div
                  key={`${photo.url}-${index}`}
                  className="relative h-28 overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle_at_35%_30%,#3a2f25,#15110d_72%)]"
                >
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => removePhoto(index)}
                    className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-panel-black text-fg-subtle"
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                  <p className="absolute bottom-3 left-3.5 m-0 text-[11.5px] font-bold text-fg-muted">
                    {photo.caption}
                  </p>
                </div>
              ))}
              {photos.length < 3 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-fg-subtle text-fg-subtle"
                >
                  <Plus size={20} strokeWidth={1.8} />
                  <span className="text-[11.5px] font-bold">Add photo</span>
                </button>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              aria-label="Add lounge photo"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={addPhoto}
            />
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5 py-4.5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Amenities</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {AMENITIES.map((amenity) => {
                const active = amenities.includes(amenity.id);
                return (
                  <button
                    key={amenity.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleAmenity(amenity.id)}
                    className={cn(
                      "inline-flex items-center rounded-pill px-4 py-2 text-xs font-bold transition-colors duration-150",
                      active ? "bg-accent text-on-accent" : "border-[1.5px] border-line text-fg-muted",
                    )}
                  >
                    {amenity.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5 py-4.5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Operating hours</p>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {WEEKDAY_NAMES.map((day, index) => (
                <div key={day} className="rounded-xl border border-line px-2 py-2.5 text-center">
                  <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">{day}</p>
                  <input
                    aria-label={`${day} hours`}
                    value={weeklyHours[index] ?? ""}
                    onChange={(event) =>
                      setWeeklyHours((current) => {
                        const next = [...current];
                        next[index] = event.target.value;
                        return next;
                      })
                    }
                    className="mt-1.5 w-full bg-transparent text-center text-xs font-bold text-fg focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5 py-4.5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              Capacity and booking restrictions
            </p>
            <div className="mt-3 flex items-center gap-3">
              <label htmlFor="capacity" className="text-[12.5px] font-bold text-fg-muted">
                Capacity
              </label>
              <Input
                id="capacity"
                type="number"
                min={0}
                value={String(capacity)}
                onChange={(event) => setCapacity(Number(event.target.value) || 0)}
                className="w-24"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {restrictions.map((restriction, index) => (
                <span
                  key={`${restriction}-${index}`}
                  className="inline-flex items-center gap-2 rounded-pill border border-line px-3.5 py-1.5 text-[11.5px] font-bold text-fg-muted"
                >
                  {restriction}
                  <button
                    type="button"
                    aria-label={`Remove ${restriction}`}
                    onClick={() => setRestrictions((current) => current.filter((_, i) => i !== index))}
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <Input
                aria-label="Add a booking restriction"
                placeholder="Add a restriction"
                value={newRestriction}
                onChange={(event) => setNewRestriction(event.target.value)}
                className="max-w-xs"
              />
              <Button variant="ghost" size="md" className="normal-case" onClick={addRestriction}>
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="flex h-fit w-[344px] shrink-0 flex-col gap-3.5">
          {lounge.pendingSubmissionId ? (
            <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                Waiting for you · {pendingChanges.length} {pendingChanges.length === 1 ? "change" : "changes"}
              </p>
              {lounge.pendingSubmittedBy ? (
                <p className="mt-2 text-[11.5px] text-fg-subtle">Submitted by {lounge.pendingSubmittedBy}</p>
              ) : null}

              {pendingChanges.map((change) => (
                <ApprovalDiff key={change.id} change={change} />
              ))}

              <div className="mt-4 flex flex-col gap-2.5">
                <Button size="lg" block onClick={approve}>
                  Approve and publish
                </Button>
                <Input
                  aria-label="Note for sending back"
                  placeholder="Note for sending back (optional)"
                  value={rejectNote}
                  onChange={(event) => setRejectNote(event.target.value)}
                />
                <Button variant="ghost" block className="normal-case" onClick={reject}>
                  Send back with a note
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
              <p className="m-0 text-[13px] font-bold text-fg">
                {lounge.images.length} photos · {lounge.amenities.length} amenities
              </p>
              <p className="mt-2 text-[12.5px] text-fg-muted">
                {hasDraftChanges
                  ? "Unsaved changes — submit for review to send them to approval."
                  : "No changes waiting for approval."}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4 py-3.5">
            <p className="m-0 text-[11.5px] text-fg-muted">
              Nothing here reaches the member app until it is approved.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
