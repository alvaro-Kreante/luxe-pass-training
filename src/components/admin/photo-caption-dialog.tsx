"use client";

import * as React from "react";

import type { PhotoCrop } from "@/lib/admin-content";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DraftPhotoItem {
  key: string;
  url: string;
  caption: string;
  detail: string;
  fileName: string;
  /** Story 10.10 — original y encuadre, para "Adjust crop". */
  originalUrl?: string | null;
  crop?: PhotoCrop | null;
  /** Story 10.10 — mientras sube (PhotoUploading.dc.html). */
  uploading?: boolean;
}

const AREA_SHORTCUTS = ["Main room", "Bar", "Day room", "Shower suite", "Terrace", "Work area"];

/**
 * Story 8.3 — "Upload and manage lounge images". Artboard:
 * docs/design/epic-8-admin-support/PhotoCaption.dc.html (15). El área es el
 * `caption` de `lounge_images`, el detalle su `detail`; "Main photo" mueve la
 * foto a la primera posición (solo puede haber una principal).
 */
export function PhotoCaptionDialog({
  photo,
  index,
  total,
  loungeName,
  isMain,
  onOpenChange,
  onSave,
  onRemove,
}: {
  photo: DraftPhotoItem | null;
  index: number;
  total: number;
  loungeName: string;
  isMain: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (changes: { caption: string; detail: string; makeMain: boolean }) => void;
  onRemove: () => void;
}) {
  const [caption, setCaption] = React.useState(photo?.caption ?? "");
  const [detail, setDetail] = React.useState(photo?.detail ?? "");
  const [makeMain, setMakeMain] = React.useState(isMain);

  return (
    <Modal
      open={photo !== null}
      onOpenChange={onOpenChange}
      dark
      width={620}
      eyebrow={`${loungeName || "New lounge"} · photo ${index + 1} of ${total}`}
      title="What does this photo show?"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="border-dashed normal-case" onClick={onRemove}>
            Remove photo
          </Button>
          <div className="flex-1" />
          <Button
            disabled={caption.trim() === ""}
            onClick={() => onSave({ caption: caption.trim(), detail: detail.trim(), makeMain })}
          >
            Save photo
          </Button>
        </div>
      }
    >
      {photo ? (
        <div className="relative h-40 overflow-hidden rounded-2xl border border-line bg-panel-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="" className="size-full object-cover" />
          <span className="absolute bottom-3 left-3.5 rounded-lg bg-panel-black/85 px-2.5 py-1 text-[11px] font-bold text-fg-muted">
            {photo.fileName}
          </span>
        </div>
      ) : null}

      <Field label="Area" htmlFor="photo-area" className="mb-0 mt-5">
        <Input id="photo-area" inputSize="compact" value={caption} onChange={(event) => setCaption(event.target.value)} />
      </Field>
      <div className="mt-3 flex flex-wrap gap-2">
        {AREA_SHORTCUTS.map((area) => (
          <button
            key={area}
            type="button"
            aria-pressed={caption === area}
            onClick={() => setCaption(area)}
            className={cn(
              "inline-flex items-center rounded-pill px-3.5 py-2 text-xs font-bold transition-colors duration-150",
              caption === area ? "bg-accent text-on-accent" : "border-[1.5px] border-line text-fg-muted hover:bg-surface-hover",
            )}
          >
            {area}
          </button>
        ))}
      </div>

      <Field label="Detail" optional htmlFor="photo-detail" className="mb-0 mt-4.5">
        <Input id="photo-detail" inputSize="compact" value={detail} onChange={(event) => setDetail(event.target.value)} />
      </Field>

      <div className="mt-4.5 rounded-2xl border border-line px-4 py-3.5">
        <Checkbox checked={makeMain} onCheckedChange={(checked) => setMakeMain(isMain || checked)}>
          <span className="block text-[13px] font-bold text-fg">Main photo</span>
          <span className="mt-1 block text-[11.5px] text-fg-subtle">
            {isMain ? "This is the main photo — it opens the lounge profile." : "Opens the lounge profile. Only one photo can be the main one."}
          </span>
        </Checkbox>
      </div>

      <p className="mb-4 mt-3 text-[11.5px] leading-normal text-fg-subtle">
        Members see the area under the photo on the lounge profile, and the detail when they open it.
      </p>
    </Modal>
  );
}
