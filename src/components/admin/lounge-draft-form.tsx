"use client";

import * as React from "react";
import { Check, Crop, Plus, X } from "lucide-react";
import Link from "next/link";

import { AddressAutocomplete } from "@/components/admin/address-autocomplete";
import type { LoungeSavedKind } from "@/components/admin/lounge-saved-notice";
import { PhotoCaptionDialog, type DraftPhotoItem } from "@/components/admin/photo-caption-dialog";
import { PhotoCropDialog, type PhotoCropChoice, type PhotoSource } from "@/components/admin/photo-crop-dialog";
import { PartnerPicker } from "@/components/admin/partner-picker";
import { StatusSelect } from "@/components/admin/status-select";
import { LoungeScheduleCards, useLoungeSchedule } from "@/components/admin/lounge-schedule";
import { WeeklyHoursEditor } from "@/components/admin/weekly-hours-editor";
import { AdminShell } from "@/components/patterns/admin-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AMENITIES } from "@/lib/amenities";
import {
  createLoungeDraft,
  publishLounge,
  setDraftLoungePhotos,
  updateLoungeDraft,
  uploadLoungeImage,
  type LoungeContentDetail,
  type PhotoCrop,
} from "@/lib/admin-content";
import { ACCEPTED_TYPES, PHOTO_SIZES, cropImage, isAcceptedImage } from "@/lib/photo-crop";
import {
  captionFromFileName,
  makeMainPhoto,
  publishChecklist,
  type LoungeDraftInput,
  type LoungeLocation,
} from "@/lib/lounge-draft";
import { listAdminPartners, type AdminPartnerRow } from "@/lib/admin-partners";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 3;
const MONDAY = 1;

const CARD = "rounded-content border border-line bg-dark-card px-5 py-4.5";
const EYEBROW = "m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle";

function locationOf(lounge: LoungeContentDetail): LoungeLocation | null {
  if (!lounge.address) return null;
  return { address: lounge.address, neighborhood: lounge.neighborhood, city: lounge.city, lat: lounge.lat, lng: lounge.lng };
}

/**
 * Story 8.3 — "Add/edit/remove lounge profiles": alta de un lounge nuevo y
 * edición de un borrador (dirección incluida). Artboard:
 * docs/design/epic-8-admin-support/LoungeNew.dc.html (14), con el popup de
 * PhotoCaption.dc.html (15). Un borrador no aparece a los miembros; se
 * publica directo, sin cola de aprobación (decisión 25 sept 2026).
 *
 * Con LoungeDraftPartners.dc.html (19): el formulario lleva también las
 * restricciones de reserva. Es también la vista de edición de un lounge que
 * estuvo live y volvió a borrador (LoungeEditConfirm.dc.html, 18). Story
 * 10.1: los usuarios partner ya no viven en el lounge sino en su partner, y
 * publicar no invita a nadie (exige un partner activo). Story 10.5
 * (LoungeDraftPartner.dc.html, Fase 10 · 12): el partner se elige aquí,
 * opcional mientras es borrador.
 *
 * Guardar o publicar no saca al admin del lounge: `onSaved` decide qué
 * mostrar después (LoungeDraftSaved.dc.html, 24 · LoungePublished.dc.html, 25).
 */
export function LoungeDraftForm({
  lounge,
  onSaved,
}: {
  lounge?: LoungeContentDetail;
  onSaved: (loungeId: string, kind: LoungeSavedKind, loungeName: string) => void | Promise<void>;
}) {
  const supabase = React.useMemo(() => createClient(), []);

  const [name, setName] = React.useState(lounge?.name ?? "");
  const [phone, setPhone] = React.useState(lounge?.phone ?? "");
  const [email, setEmail] = React.useState(lounge?.email ?? "");
  const [website, setWebsite] = React.useState(lounge?.website ?? "");
  const [location, setLocation] = React.useState<LoungeLocation | null>(lounge ? locationOf(lounge) : null);
  const [weeklyHours, setWeeklyHours] = React.useState<string[]>(
    lounge?.weeklyHours.length === 7 ? lounge.weeklyHours : Array(7).fill(""),
  );
  const [amenities, setAmenities] = React.useState<string[]>(lounge?.amenities ?? []);
  const [capacity, setCapacity] = React.useState(lounge?.capacity ?? 0);
  const [restrictions, setRestrictions] = React.useState<string[]>(lounge?.bookingRestrictions ?? []);
  const [partnerId, setPartnerId] = React.useState<string | null>(lounge?.partner?.id ?? null);
  const [partners, setPartners] = React.useState<AdminPartnerRow[]>([]);
  const [newRestriction, setNewRestriction] = React.useState("");
  const [photos, setPhotos] = React.useState<DraftPhotoItem[]>(
    (lounge?.images ?? []).map((image) => ({
      key: image.id,
      url: image.url,
      caption: image.caption,
      detail: image.detail ?? "",
      fileName: image.caption,
      originalUrl: image.originalUrl,
      crop: image.crop,
    })),
  );
  const [queue, setQueue] = React.useState<File[]>([]);
  const [recropping, setRecropping] = React.useState<{ key: string; source: PhotoSource } | null>(null);
  const [invalidFile, setInvalidFile] = React.useState("");
  const uploading = photos.some((photo) => photo.uploading);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let active = true;
    listAdminPartners(supabase)
      .then((rows) => {
        if (active) setPartners(rows);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [supabase]);

  const draft: LoungeDraftInput = {
    name,
    phone,
    email,
    website,
    location,
    weeklyHours,
    amenities,
    capacity,
    bookingRestrictions: restrictions,
    partnerId,
  };
  const partnerStatus =
    partners.find((partner) => partner.id === partnerId)?.status ?? (partnerId === lounge?.partner?.id ? lounge?.partner?.status : null) ?? null;
  const checklist = publishChecklist(draft, partnerStatus);
  const ready = checklist.every((item) => item.done);
  const canSave = name.trim() !== "" && location !== null && !busy && !uploading;

  /** Story 10.10 — cada foto pasa por el editor antes de subirse (PhotoCropOpen 23). */
  function addPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const rejected = files.find((file) => !isAcceptedImage(file));
    setInvalidFile(rejected ? rejected.name : "");
    const images = files.filter(isAcceptedImage);
    const room = MAX_PHOTOS - photos.length - queue.length;
    setPhotoNotice(images.length > room ? `A lounge has up to 3 photos — ${images.length - room} not added.` : "");
    setQueue((current) => [...current, ...images.slice(0, Math.max(room, 0))]);
  }

  const folder = React.useMemo(() => lounge?.id ?? `new-${crypto.randomUUID()}`, [lounge?.id]);

  async function uploadCrop(source: Blob, fileName: string, choice: PhotoCropChoice) {
    const size = PHOTO_SIZES.find((option) => option.id === choice.size)!;
    const cropped = await cropImage(source, choice.area, size.longEdge);
    const stem = fileName.replace(/\.[^.]+$/, "");
    return uploadLoungeImage(supabase, folder, new File([cropped], `${stem}-${size.longEdge}.jpg`, { type: "image/jpeg" }));
  }

  /** Sube el recorte y el original; la miniatura sale "Uploading" mientras tanto (PhotoUploading 25). */
  function addCroppedPhoto(choice: PhotoCropChoice) {
    const [file, ...rest] = queue;
    setQueue(rest);
    const key = crypto.randomUUID();
    const crop: PhotoCrop = { ...choice.area, size: choice.size };
    setPhotos((current) => [
      ...current,
      { key, url: "", caption: captionFromFileName(file.name), detail: "", fileName: file.name, crop, uploading: true },
    ]);
    void (async () => {
      try {
        const [url, originalUrl] = await Promise.all([uploadCrop(file, file.name, choice), uploadLoungeImage(supabase, folder, file)]);
        setPhotos((current) => current.map((photo) => (photo.key === key ? { ...photo, url, originalUrl, uploading: false } : photo)));
      } catch (err) {
        setPhotos((current) => current.filter((photo) => photo.key !== key));
        setError(err instanceof Error ? err.message : `${file.name} couldn't be uploaded`);
      }
    })();
  }

  /** PhotoRecrop (26) — reabre el editor sobre el original guardado. */
  async function adjustCrop(photo: DraftPhotoItem) {
    if (!photo.originalUrl) return;
    try {
      const response = await fetch(photo.originalUrl);
      if (!response.ok) throw new Error("unreadable");
      const blob = await response.blob();
      // Storage guarda "<timestamp>-<archivo>": se muestra el nombre que eligió el admin.
      const fileName = (photo.originalUrl.split("/").pop() ?? photo.caption).replace(/^\d{13}-/, "");
      setRecropping({ key: photo.key, source: { blob, fileName } });
    } catch {
      setError(`The original of ${photo.caption} can't be read`);
    }
  }

  async function saveRecrop(choice: PhotoCropChoice) {
    if (!recropping) return;
    const { key, source } = recropping;
    setBusy(true);
    try {
      const url = await uploadCrop(source.blob, source.fileName, choice);
      setPhotos((current) => current.map((photo) => (photo.key === key ? { ...photo, url, crop: { ...choice.area, size: choice.size } } : photo)));
      setRecropping(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the new crop");
    } finally {
      setBusy(false);
    }
  }

  const recroppingPhoto = photos.find((photo) => photo.key === recropping?.key);
  const editingIndex = photos.findIndex((photo) => photo.key === editingKey);
  const editing = editingIndex >= 0 ? photos[editingIndex] : null;

  function savePhoto(changes: { caption: string; detail: string; makeMain: boolean }) {
    setPhotos((current) => {
      const next = current.map((photo, index) =>
        index === editingIndex ? { ...photo, caption: changes.caption, detail: changes.detail } : photo,
      );
      return changes.makeMain ? makeMainPhoto(next, editingIndex) : next;
    });
    setEditingKey(null);
  }

  function removePhoto() {
    setPhotos((current) => current.filter((_, index) => index !== editingIndex));
    setEditingKey(null);
    setPhotoNotice("");
  }

  async function save(): Promise<string> {
    const id = lounge ? lounge.id : await createLoungeDraft(supabase, draft);
    if (lounge) await updateLoungeDraft(supabase, id, draft);
    await setDraftLoungePhotos(
      supabase,
      id,
      photos.map((photo) => ({
        url: photo.url,
        caption: photo.caption,
        detail: photo.detail || null,
        originalUrl: photo.originalUrl ?? null,
        crop: photo.crop ?? null,
      })),
    );
    return id;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this lounge");
    } finally {
      setBusy(false);
    }
  }

  const saveDraft = () =>
    run(async () => {
      await onSaved(await save(), "draft", name.trim());
    });

  const publish = () =>
    run(async () => {
      const id = await save();
      await publishLounge(supabase, id);
      await onSaved(id, "live", name.trim());
    });

  return (
    <AdminShell
      topbarLabel={
        <>
          <Link href="/admin/lounges" className="text-[13.5px] font-bold text-fg-subtle transition-colors duration-150 hover:text-accent">
            Lounges
          </Link>
          <span className="text-[13.5px] text-fg-subtle">›</span>
          <span className="text-[13.5px] font-bold text-fg">{lounge ? lounge.name : "New lounge"}</span>
        </>
      }
    >
      <div className="flex items-center gap-4 border-b border-line pb-5">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-dashed border-gold-600 text-accent">
          <Plus size={20} strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="m-0 font-display text-[22px] text-fg">{name.trim() || "New lounge"}</h1>
            {lounge ? (
              <StatusSelect
                current="draft"
                busy={busy}
                options={[
                  {
                    value: "live",
                    label: "Live",
                    detail: canSave && ready ? "Publish it — members can book it right away" : "Complete the checklist before publishing",
                    disabled: !canSave || !ready,
                  },
                  { value: "draft", label: "Draft", detail: "Draft · not visible to members" },
                  { value: "suspended", label: "Suspended", detail: "Only a live lounge can be suspended", disabled: true },
                ]}
                onSelect={(value) => {
                  if (value === "live") void publish();
                }}
              />
            ) : (
              <span className="inline-flex items-center rounded-pill border border-dashed border-fg-subtle px-3 py-1.5 text-[11.5px] font-bold text-fg-muted">
                Draft · not visible to members
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] text-fg-subtle">{lounge ? "Draft lounge" : "New lounge"}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="md" className="normal-case" disabled={!canSave} onClick={saveDraft}>
            Save draft
          </Button>
          <Button size="md" disabled={!canSave || !ready} onClick={publish}>
            Publish lounge
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-[13px] font-bold text-accent-strong">
          {error}
        </p>
      ) : null}

      <div className="mt-4.5 flex min-h-0 gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          {/* Arriba de todo: quién opera el lounge, antes que su nombre (ajuste del 2 oct 2026). */}
          <PartnerPicker partners={partners} value={partnerId} onChange={setPartnerId} />

          <div className={CARD}>
            <p className={EYEBROW}>Name and contact</p>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <Field label="Lounge name" htmlFor="lounge-name" className="mb-0">
                <Input id="lounge-name" inputSize="compact" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Phone" htmlFor="lounge-phone" className="mb-0">
                <Input id="lounge-phone" inputSize="compact" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="Email" htmlFor="lounge-email" className="mb-0">
                <Input id="lounge-email" inputSize="compact" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Website" htmlFor="lounge-website" className="mb-0">
                <Input id="lounge-website" inputSize="compact" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </Field>
            </div>
          </div>

          <div className={CARD}>
            <div className="flex items-center gap-3">
              <p className={EYEBROW}>Location</p>
              <div className="flex-1" />
              <p className="m-0 text-[11.5px] text-fg-subtle">Pick the address from the list — the pin is where members are sent</p>
            </div>
            <div className="mt-3">
              <AddressAutocomplete value={location} onChange={setLocation} />
            </div>
            {location ? (
              <div className="mt-3 flex flex-wrap gap-2.5">
                {location.neighborhood ? <LocationChip>Neighborhood · {location.neighborhood}</LocationChip> : null}
                {location.city ? <LocationChip>City · {location.city}</LocationChip> : null}
                <LocationChip muted>
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </LocationChip>
              </div>
            ) : null}
          </div>

          <div className={CARD}>
            <div className="flex items-center gap-3">
              <p className={EYEBROW}>Operating hours</p>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setWeeklyHours((current) => Array(7).fill(current[MONDAY]))}
                className="text-[11.5px] font-bold text-gold-600 transition-colors duration-150 hover:text-accent"
              >
                Copy Monday to every day
              </button>
            </div>
            <WeeklyHoursEditor value={weeklyHours} onChange={setWeeklyHours} className="mt-3" />
          </div>

          {lounge ? <DraftSchedule loungeId={lounge.id} loungeName={lounge.name} regularWeek={weeklyHours} /> : null}

          <div className="grid grid-cols-2 gap-3.5">
            <div className={CARD}>
              <p className={EYEBROW}>Amenities</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {AMENITIES.map((amenity) => {
                  const active = amenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setAmenities((current) =>
                          active ? current.filter((a) => a !== amenity.id) : [...current, amenity.id],
                        )
                      }
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
            <div className={CARD}>
              <p className={EYEBROW}>
                <label htmlFor="lounge-seats">Seats per time slot</label>
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Input
                  id="lounge-seats"
                  inputSize="compact"
                  type="number"
                  min={0}
                  value={capacity === 0 ? "" : String(capacity)}
                  onChange={(event) => setCapacity(Math.max(0, Number(event.target.value) || 0))}
                  className="w-24 text-[15px] font-extrabold"
                />
                <p className="m-0 text-[11.5px] leading-normal text-fg-subtle">
                  Each morning, afternoon and evening slot opens with this many seats. Bookings take them live.
                </p>
              </div>
            </div>
          </div>

          <div className={CARD}>
            <p className={EYEBROW}>Booking restrictions</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {restrictions.map((restriction) => (
                <span
                  key={restriction}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-[11.5px] font-bold text-fg-muted"
                >
                  {restriction}
                  <button
                    type="button"
                    aria-label={`Remove ${restriction}`}
                    onClick={() => setRestrictions((current) => current.filter((r) => r !== restriction))}
                    className="flex text-fg-subtle transition-colors duration-150 hover:text-accent"
                  >
                    <X size={12} strokeWidth={2.2} />
                  </button>
                </span>
              ))}
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = newRestriction.trim();
                  if (value && !restrictions.includes(value)) setRestrictions((current) => [...current, value]);
                  setNewRestriction("");
                }}
              >
                <Input
                  aria-label="Add a booking restriction"
                  inputSize="compact"
                  placeholder="Add a restriction"
                  value={newRestriction}
                  onChange={(event) => setNewRestriction(event.target.value)}
                  className="w-52"
                />
              </form>
            </div>
          </div>

        </div>

        <div className="flex h-fit w-[344px] shrink-0 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 pb-2 pt-5">
            <p id="checklist-title" className={EYEBROW}>
              Before it can be published
            </p>
            <p className="mb-3 mt-2 text-[11.5px] text-fg-subtle">
              {ready ? "All set" : `${checklist.filter((item) => item.done).length} of ${checklist.length} done`}
            </p>
            <ul aria-labelledby="checklist-title" className="m-0 list-none p-0">
              {checklist.map((item) => (
                <li
                  key={item.id}
                  aria-label={`${item.label} · ${item.done ? "done" : "pending"}`}
                  className="flex items-center gap-3 border-t border-line/60 py-3"
                >
                  {item.done ? (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
                      <Check size={11} strokeWidth={3} aria-hidden />
                    </span>
                  ) : (
                    <span className="size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-fg-subtle" />
                  )}
                  <span className={cn("text-[12.5px] font-bold", item.done ? "text-fg" : "text-fg-muted")}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={CARD}>
            <div className="flex items-center gap-3">
              <p className={EYEBROW}>Photos · up to 3</p>
              <div className="flex-1" />
              <p className="m-0 text-[11.5px] text-fg-subtle">
                {photos.length} of {MAX_PHOTOS}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {photos.map((photo, index) => (
                <div key={photo.key} className="relative h-[86px] overflow-hidden rounded-xl border border-line bg-panel-black">
                  {photo.uploading ? (
                    <div className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-accent">Uploading</span>
                      <span className="w-full truncate text-[11px] font-bold text-fg-muted">{photo.caption}</span>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label={`Edit photo ${photo.caption}`}
                        onClick={() => setEditingKey(photo.key)}
                        className="absolute inset-0 text-left transition-colors duration-150 hover:bg-surface-hover/30"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt="" className="absolute inset-0 size-full object-cover" />
                        {index === 0 ? (
                          <span className="absolute left-2 top-2 rounded-pill bg-accent px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-on-accent">
                            Main
                          </span>
                        ) : null}
                        <span className="absolute inset-x-2.5 bottom-2 truncate text-[11px] font-bold text-fg-muted">
                          {photo.caption}
                        </span>
                      </button>
                      {photo.originalUrl ? (
                        <button
                          type="button"
                          aria-label={`Adjust crop ${photo.caption}`}
                          onClick={() => void adjustCrop(photo)}
                          className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-lg bg-panel-black/85 text-accent transition-colors duration-150 hover:bg-panel-black"
                        >
                          <Crop size={14} strokeWidth={1.8} aria-hidden />
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-[86px] flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-fg-subtle transition-colors duration-150 hover:bg-surface-hover"
                >
                  <Plus size={18} strokeWidth={2} className="text-accent" aria-hidden />
                  <span className="text-[11px] font-bold text-fg-muted">Add photos</span>
                </button>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              aria-label="Add lounge photos"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={addPhotos}
            />
            {invalidFile ? (
              <div role="alert" className="mt-2.5 rounded-xl border border-accent-strong px-3 py-2.5">
                <p className="m-0 text-[12px] font-bold text-fg">{invalidFile} isn&apos;t an image</p>
                <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">Choose a JPEG, PNG or WebP photo. Nothing was uploaded.</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1.5 text-[11.5px] font-bold text-gold-600 transition-colors duration-150 hover:text-accent"
                >
                  Choose another file
                </button>
              </div>
            ) : null}
            <p className="mb-0 mt-2.5 text-[11px] leading-normal text-fg-subtle">
              {photoNotice ||
                (uploading
                  ? "Photos upload one at a time. Keep editing the rest of the lounge — saving waits until they finish."
                  : "Each photo opens in the editor first: frame it, pick a size, then it uploads. Click a photo to name it or make it the main one.")}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4 py-3.5">
            <p className="m-0 text-[11.5px] leading-[1.55] text-fg-muted">
              Publishing no longer invites anyone: the partner&apos;s users get their email when you activate the partner.
            </p>
          </div>
        </div>
      </div>

      <PhotoCaptionDialog
        key={editing?.key ?? "closed"}
        photo={editing}
        index={Math.max(editingIndex, 0)}
        total={photos.length}
        loungeName={name.trim()}
        isMain={editingIndex === 0}
        onOpenChange={(open) => {
          if (!open) setEditingKey(null);
        }}
        onSave={savePhoto}
        onRemove={removePhoto}
      />

      <PhotoCropDialog
        key={queue[0] ? `crop-${queue[0].name}-${queue.length}` : `crop-${recropping?.key ?? "closed"}`}
        source={queue[0] ? { blob: queue[0], fileName: queue[0].name } : recropping?.source ?? null}
        mode={queue[0] ? "new" : "recrop"}
        eyebrow={
          queue[0]
            ? `${name.trim() || "New lounge"} · photo ${photos.length + 1} of ${MAX_PHOTOS}`
            : `${name.trim() || "New lounge"} · ${recroppingPhoto?.caption ?? "photo"}`
        }
        initial={
          !queue[0] && recroppingPhoto?.crop
            ? {
                area: { x: recroppingPhoto.crop.x, y: recroppingPhoto.crop.y, width: recroppingPhoto.crop.width, height: recroppingPhoto.crop.height },
                size: recroppingPhoto.crop.size,
              }
            : null
        }
        busy={busy}
        onCancel={() => (queue[0] ? setQueue((current) => current.slice(1)) : setRecropping(null))}
        onConfirm={(choice) => (queue[0] ? addCroppedPhoto(choice) : void saveRecrop(choice))}
      />
    </AdminShell>
  );
}

/** Story 10.9 — en un borrador ya guardado; un lounge nuevo las tiene al guardarse por primera vez. */
function DraftSchedule({ loungeId, loungeName, regularWeek }: { loungeId: string; loungeName: string; regularWeek: string[] }) {
  const state = useLoungeSchedule(loungeId);
  return <LoungeScheduleCards loungeId={loungeId} loungeName={loungeName} regularWeek={regularWeek} state={state} />;
}

function LocationChip({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border border-line px-3.5 py-1.5 text-[11.5px] font-bold",
        muted ? "text-fg-subtle" : "text-fg-muted",
      )}
    >
      {children}
    </span>
  );
}
