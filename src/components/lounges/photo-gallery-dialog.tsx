"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { HeroPhotoSurface } from "@/components/lounges/hero-photo-surface";
import type { LoungeImage } from "@/lib/lounge-profile";
import { cn } from "@/lib/utils";

/**
 * `Gallery.dc.html` — lightbox a pantalla completa sobre el perfil
 * desenfocado: imagen grande con flechas de 48px y tira de miniaturas.
 * Distinto del patrón 4 (modal blanco de 640px): scrim oscuro al 0.82 y
 * card de 1100px en tema oscuro, así que no reutiliza `Modal`.
 */
export function PhotoGalleryDialog({
  open,
  onOpenChange,
  loungeId,
  loungeName,
  images,
  initialIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loungeId: string;
  loungeName: string;
  images: LoungeImage[];
  initialIndex: number;
}) {
  const total = images.length;
  const [index, setIndex] = React.useState(initialIndex);
  const [wasOpen, setWasOpen] = React.useState(open);

  /** Reabrir en `initialIndex` — ajuste de estado durante el render, no un efecto. */
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setIndex(initialIndex);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-panel-black/82" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-140px)] max-w-[1100px] -translate-x-1/2 -translate-y-1/2 flex-col focus:outline-none">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-500">
                Photo gallery
              </p>
              <Dialog.Title asChild>
                <h2
                  aria-label={`Photo gallery — ${loungeName}`}
                  className="mt-1.5 text-[22px] text-white"
                >
                  {loungeName}
                </h2>
              </Dialog.Title>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[12.5px] font-semibold text-gold-100/75">
                {index + 1} of {total}
              </span>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close gallery"
                  className="flex size-10 items-center justify-center rounded-full bg-gold-100/14 text-gold-100"
                >
                  <X size={18} strokeWidth={1.9} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="relative h-[472px] overflow-hidden rounded-[20px]">
            <HeroPhotoSurface
              loungeId={loungeId}
              photoIndex={index}
              src={images[index].url}
              caption={images[index].caption}
              detail={images[index].detail}
            />
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => setIndex((i) => (i - 1 + total) % total)}
              className="absolute left-5 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/88"
            >
              <ChevronLeft size={20} strokeWidth={1.9} />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => setIndex((i) => (i + 1) % total)}
              className="absolute right-5 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/88"
            >
              <ChevronRight size={20} strokeWidth={1.9} />
            </button>
          </div>

          <div className="mt-4 flex gap-3">
            {images.map((thumb, thumbIndex) => (
              <button
                key={thumbIndex}
                type="button"
                aria-label={`Photo ${thumbIndex + 1}: ${thumb.caption}`}
                aria-current={thumbIndex === index}
                onClick={() => setIndex(thumbIndex)}
                className={cn(
                  "relative h-24 flex-1 overflow-hidden rounded-xl",
                  thumbIndex === index ? "border-2 border-gold-500" : "opacity-60",
                )}
              >
                <HeroPhotoSurface loungeId={loungeId} photoIndex={thumbIndex} src={thumb.url} />
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
