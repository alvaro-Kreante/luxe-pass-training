"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, GalleryHorizontal } from "lucide-react";

import { HeroPhotoSurface } from "@/components/lounges/hero-photo-surface";
import type { LoungeImage } from "@/lib/lounge-profile";
import { cn } from "@/lib/utils";

/**
 * Story 3.1 — "High-quality hero image carousel (min 3 images)".
 * Main.dc.html: imagen principal 1fr con flechas y contador, dos miniaturas
 * a la derecha (348px), la inferior con overlay "View all N photos" que abre
 * la galería (`PhotoGalleryDialog`). `images` viene de `lounge_images`
 * (Supabase) — asume al menos 3 fotos, como exige el AC.
 */
export function HeroCarousel({
  loungeId,
  images,
  onOpenGallery,
}: {
  loungeId: string;
  images: LoungeImage[];
  onOpenGallery: (index: number) => void;
}) {
  const [index, setIndex] = React.useState(0);
  const total = images.length;
  const photo = images[index];

  return (
    <div className="grid h-[268px] shrink-0 grid-cols-[1fr_348px] gap-3 px-8 pt-5.5">
      <div className="relative overflow-hidden rounded-[18px]">
        <HeroPhotoSurface loungeId={loungeId} photoIndex={index} caption={photo.caption} />

        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => setIndex((i) => (i - 1 + total) % total)}
          className="absolute left-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 transition-colors duration-150 hover:bg-white"
        >
          <ChevronLeft size={18} strokeWidth={1.9} />
        </button>
        <button
          type="button"
          aria-label="Next photo"
          onClick={() => setIndex((i) => (i + 1) % total)}
          className="absolute right-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 transition-colors duration-150 hover:bg-white"
        >
          <ChevronRight size={18} strokeWidth={1.9} />
        </button>

        <span className="absolute right-4 top-4 rounded-pill bg-panel-black/55 px-3 py-1 text-[11.5px] font-bold tracking-[0.06em] text-gold-100">
          {index + 1} / {total}
        </span>

        <span className="absolute inset-x-0 bottom-4.5 flex items-center justify-center gap-1.5">
          {images.map((_, dotIndex) => (
            <span
              key={dotIndex}
              aria-hidden
              className={cn(
                "h-[5px] rounded-[3px] bg-gold-100/45",
                dotIndex === index ? "w-4.5 bg-gold-500" : "w-[5px]",
              )}
            />
          ))}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative flex-1 overflow-hidden rounded-[18px]">
          <HeroPhotoSurface
            loungeId={loungeId}
            photoIndex={1}
            caption={images[1].caption}
          />
        </div>

        <button
          type="button"
          onClick={() => onOpenGallery(2)}
          className="relative flex-1 overflow-hidden rounded-[18px] text-left"
        >
          <HeroPhotoSurface loungeId={loungeId} photoIndex={2} />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-panel-black/55">
            <GalleryHorizontal size={20} strokeWidth={1.7} className="text-gold-100" />
            <span className="text-[13px] font-bold text-gold-100">
              View all {total} photos
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
