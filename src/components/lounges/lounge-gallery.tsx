"use client";

import * as React from "react";

import { HeroCarousel } from "@/components/lounges/hero-carousel";
import { PhotoGalleryDialog } from "@/components/lounges/photo-gallery-dialog";
import type { LoungeImage } from "@/lib/lounge-profile";

/**
 * Story 3.1 — el carousel del perfil y la galería a pantalla completa que
 * abre (`Main.dc.html`, `Gallery.dc.html`). Isla cliente de `/lounges/[id]`
 * (PERF-02).
 */
export function LoungeGallery({
  loungeId,
  loungeName,
  images,
}: {
  loungeId: string;
  loungeName: string;
  images: LoungeImage[];
}) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  return (
    <>
      <HeroCarousel
        loungeId={loungeId}
        images={images}
        onOpenGallery={(photo) => {
          setIndex(photo);
          setOpen(true);
        }}
      />
      {images.length > 0 ? (
        <PhotoGalleryDialog
          open={open}
          onOpenChange={setOpen}
          loungeId={loungeId}
          loungeName={loungeName}
          images={images}
          initialIndex={index}
        />
      ) : null}
    </>
  );
}
