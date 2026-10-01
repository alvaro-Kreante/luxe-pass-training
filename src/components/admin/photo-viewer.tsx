"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ViewerPhoto {
  url: string;
  caption: string;
}

const ROUND =
  "flex items-center justify-center rounded-full border border-line bg-panel-black/85 text-fg transition-colors duration-150 hover:border-accent";

/**
 * Epic 8 · LoungePhotoViewer.dc.html (26) — las fotos de un lounge a tamaño
 * completo, con flechas (también las del teclado) y miniaturas.
 */
export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: ViewerPhoto[];
  /** `null` = cerrado. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const photo = index === null ? null : photos[index];
  const step = (delta: number) => index !== null && onIndexChange((index + delta + photos.length) % photos.length);

  return (
    <Dialog.Root open={photo != null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay data-theme="dark" className="fixed inset-0 z-50 bg-panel-black/92" />
        <Dialog.Content
          data-theme="dark"
          aria-describedby={undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
          }}
          className="fixed inset-0 z-50 flex flex-col px-4 py-6 focus:outline-none sm:px-9"
        >
          {photo ? (
            <>
              <div className="flex items-center gap-3">
                <Dialog.Title className="m-0 font-sans text-[13px] font-bold text-fg">
                  {photo.caption} · {index! + 1} of {photos.length}
                </Dialog.Title>
                <div className="flex-1" />
                <Dialog.Close aria-label="Close" className={cn(ROUND, "size-10")}>
                  <X size={16} strokeWidth={2} />
                </Dialog.Close>
              </div>

              <div className="relative mt-5 flex min-h-0 flex-1 items-center justify-center sm:px-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="max-h-full max-w-full rounded-[18px] border border-line object-contain"
                />
                {photos.length > 1 ? (
                  <>
                    <button type="button" aria-label="Previous photo" onClick={() => step(-1)} className={cn(ROUND, "absolute left-0 size-12")}>
                      <ChevronLeft size={20} strokeWidth={2} />
                    </button>
                    <button type="button" aria-label="Next photo" onClick={() => step(1)} className={cn(ROUND, "absolute right-0 size-12")}>
                      <ChevronRight size={20} strokeWidth={2} />
                    </button>
                  </>
                ) : null}
              </div>

              {photos.length > 1 ? (
                <div className="mt-6 flex justify-center gap-2.5">
                  {photos.map((thumb, i) => (
                    <button
                      key={thumb.url}
                      type="button"
                      aria-label={`Show photo ${thumb.caption}`}
                      aria-current={i === index}
                      onClick={() => onIndexChange(i)}
                      className={cn(
                        "h-14 w-21 overflow-hidden rounded-[10px] transition-opacity duration-150",
                        i === index ? "border-2 border-accent" : "border border-line opacity-55 hover:opacity-100",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb.url} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
