"use client";

import * as React from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/patterns/modal";
import {
  PHOTO_ASPECT,
  PHOTO_SIZES,
  centeredCrop,
  estimatedKb,
  formatKb,
  imageDimensions,
  outputSize,
  type CropArea,
  type Dimensions,
  type PhotoSizeId,
} from "@/lib/photo-crop";
import { cn } from "@/lib/utils";

/**
 * Story 10.10 · PhotoCropOpen (23), PhotoCropSize (24) y PhotoRecrop (26):
 * encuadre con `react-easy-crop` en un marco fijo 3 : 2, zoom y tamaño
 * final con su peso estimado. Mismo modal oscuro que `PhotoCaptionDialog`.
 */

export interface PhotoSource {
  blob: Blob;
  fileName: string;
}

export interface PhotoCropChoice {
  area: CropArea;
  size: PhotoSizeId;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function typeLabel(type: string) {
  return type.replace("image/", "").toUpperCase().replace("JPG", "JPEG");
}

export function PhotoCropDialog({
  source,
  mode,
  eyebrow,
  initial,
  busy,
  onCancel,
  onConfirm,
}: {
  source: PhotoSource | null;
  mode: "new" | "recrop";
  eyebrow: string;
  /** Al reencuadrar: el encuadre y el tamaño con los que está publicada. */
  initial?: PhotoCropChoice | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (choice: PhotoCropChoice) => void;
}) {
  const [imageUrl, setImageUrl] = React.useState("");
  const [dimensions, setDimensions] = React.useState<Dimensions | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(MIN_ZOOM);
  const [area, setArea] = React.useState<CropArea | null>(initial?.area ?? null);
  const [size, setSize] = React.useState<PhotoSizeId>(initial?.size ?? "standard");

  React.useEffect(() => {
    if (!source) return;
    const url = URL.createObjectURL(source.blob);
    let active = true;
    imageDimensions(source.blob)
      .then((next) => {
        if (active) setDimensions(next);
      })
      .catch(() => undefined);
    // El `<img>` del editor necesita la URL; se revoca al cerrar.
    queueMicrotask(() => {
      if (active) setImageUrl(url);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [source]);

  // Hasta que el editor mida la foto (o en un entorno sin imágenes), el
  // recorte es el guardado o el mayor 3 : 2 centrado.
  const effectiveArea = area ?? (dimensions ? centeredCrop(dimensions.width, dimensions.height) : null);
  const title = mode === "recrop" ? "Adjust the crop" : "Frame this photo";
  const chosen = PHOTO_SIZES.find((option) => option.id === size)!;
  const result = effectiveArea ? outputSize(effectiveArea, chosen.longEdge) : null;

  return (
    <Modal
      open={source !== null}
      onOpenChange={(open) => (open ? null : onCancel())}
      dark
      width={900}
      eyebrow={eyebrow}
      title={title}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="normal-case" onClick={onCancel}>
            Cancel
          </Button>
          <p className="m-0 flex-1 text-[12px] leading-[1.5] text-fg-subtle">
            {result
              ? mode === "recrop"
                ? "Opens on the current framing. Saving uploads the new crop and replaces the old one."
                : `Uploads ${result.width} × ${result.height} · ≈ ${formatKb(estimatedKb(result))} · JPEG. The original is kept so you can adjust the crop later.`
              : null}
          </p>
          <Button disabled={!effectiveArea || busy} onClick={() => effectiveArea && onConfirm({ area: effectiveArea, size })}>
            {mode === "recrop" ? "Save crop" : "Use photo"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-5">
        <div className="min-w-[280px] flex-[1.5]">
          <div className="relative h-[320px] overflow-hidden rounded-2xl border border-line bg-panel-black">
            {imageUrl ? (
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                aspect={PHOTO_ASPECT}
                showGrid
                initialCroppedAreaPixels={initial?.area}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_: Area, pixels: Area) => setArea(pixels)}
              />
            ) : null}
            <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-panel-black/85 px-2.5 py-1 text-[11px] font-bold text-fg-muted">
              3 : 2
            </span>
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-pill bg-panel-black/85 px-3 py-1 text-[11px] font-bold text-fg-muted">
              Drag to reposition
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label htmlFor="photo-zoom" className="text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              Zoom
            </label>
            <button type="button" aria-label="Zoom out" className="text-fg-muted" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 0.2))}>
              <Minus size={15} strokeWidth={1.8} aria-hidden />
            </button>
            <input
              id="photo-zoom"
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="flex-1 accent-[var(--color-accent)]"
            />
            <button type="button" aria-label="Zoom in" className="text-fg-muted" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 0.2))}>
              <Plus size={15} strokeWidth={1.8} aria-hidden />
            </button>
            <span className="w-10 text-right text-[12px] font-bold text-fg">{zoom.toFixed(1)}×</span>
          </div>
          <p className="m-0 mt-1.5 text-[11.5px] text-fg-subtle">
            Scroll or pinch on the photo to zoom too. The frame keeps the 3 : 2 shape of the lounge photos.
          </p>
        </div>

        <div className="min-w-[240px] flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{mode === "recrop" ? "Original · kept" : "Original"}</p>
          <p className="m-0 mt-1.5 truncate text-[13px] font-bold text-fg">{source?.fileName}</p>
          <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">
            {[dimensions ? `${dimensions.width} × ${dimensions.height}` : null, source ? formatKb(Math.round(source.blob.size / 1000)) : null, source ? typeLabel(source.blob.type || "image/jpeg") : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {effectiveArea ? (
            <p className="m-0 mt-2 text-[11.5px] text-fg-muted">
              Crop · {effectiveArea.width} × {effectiveArea.height} of the original
            </p>
          ) : null}

          <fieldset className="m-0 mt-4 border-0 p-0">
            <legend className="mb-2 flex w-full text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              <span className="flex-1">Final size</span>
              <span>Estimated weight</span>
            </legend>
            <div className="flex flex-col gap-2">
              {PHOTO_SIZES.map((option) => {
                const output = effectiveArea ? outputSize(effectiveArea, option.longEdge) : null;
                const selected = option.id === size;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors duration-150",
                      selected ? "border-accent bg-accent/12" : "border-line hover:border-gold-600",
                    )}
                  >
                    <input
                      type="radio"
                      name="photo-size"
                      value={option.id}
                      checked={selected}
                      onChange={() => setSize(option.id)}
                      className="accent-[var(--color-accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-bold text-fg">
                          {option.label} · {option.longEdge} px
                        </span>
                        {option.recommended ? (
                          <span className="rounded-pill bg-accent px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-on-accent">
                            Recommended
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-fg-subtle">
                        {output ? `${output.width} × ${output.height} · ` : ""}
                        {option.hint}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12.5px] font-bold text-fg-muted">{output ? `≈ ${formatKb(estimatedKb(output))}` : ""}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </div>
    </Modal>
  );
}
