"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  Navigation2,
  Phone,
  Share2,
  Star,
} from "lucide-react";

import { AmenitiesGrid } from "@/components/lounges/amenities-grid";
import { AvailabilityCard } from "@/components/lounges/availability-card";
import { ContactInfo } from "@/components/lounges/contact-info";
import { HeroCarousel } from "@/components/lounges/hero-carousel";
import { OperatingHours } from "@/components/lounges/operating-hours";
import { PhotoGalleryDialog } from "@/components/lounges/photo-gallery-dialog";
import { ProfileSkeleton } from "@/components/lounges/profile-skeleton";
import { ShareDialog } from "@/components/lounges/share-dialog";
import { AppShell } from "@/components/patterns/app-shell";
import { formatDistance } from "@/lib/distance";
import { contactFor, reviewCountFor } from "@/lib/lounge-profile";
import { LOUNGES } from "@/lib/lounges";

/**
 * Story 3.1 (Detailed Lounge Information) + estado "Not available" de la
 * Story 3.2 (Availability), que vive en esta misma pantalla — ver
 * `AvailabilityCard`. Artboards: `Main.dc.html`, `Gallery.dc.html`,
 * `Share.dc.html`, `NotAvailable.dc.html`, `Loading.dc.html`.
 * DESIGN-SYSTEM.md §5 patrón 7 — Perfil de lounge.
 */
const QUICK_ACTION_CLASS =
  "flex h-10 items-center gap-2 rounded-[11px] border-[1.5px] border-line bg-surface px-4 text-[12.5px] font-bold tracking-[0.06em] text-fg-muted transition-colors duration-150 hover:bg-accent-soft";

export default function LoungeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const loading = searchParams.get("loading") === "1";

  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [galleryIndex, setGalleryIndex] = React.useState(0);
  const [shareOpen, setShareOpen] = React.useState(false);

  const lounge = LOUNGES.find((candidate) => candidate.id === id);

  if (!lounge) {
    notFound();
    return null;
  }

  const contact = contactFor(lounge);
  const reviewCount = reviewCountFor(lounge);
  const phoneHref = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`;

  return (
    <AppShell padded={false}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-8">
          <Link
            href="/explore"
            className="flex items-center gap-2 text-[13.5px] font-semibold text-fg-muted"
          >
            <ArrowLeft size={18} strokeWidth={1.8} aria-hidden />
            Back to results
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-2.5">
            <a href={phoneHref} className={QUICK_ACTION_CLASS}>
              <Phone size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
              Call
            </a>
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className={QUICK_ACTION_CLASS}
            >
              <Navigation2
                size={16}
                strokeWidth={1.8}
                className="text-gold-600"
                aria-hidden
              />
              Directions
            </a>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className={QUICK_ACTION_CLASS}
            >
              <Share2 size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
              Share
            </button>
          </div>
        </div>

        {loading ? (
          <ProfileSkeleton />
        ) : (
          <>
            <HeroCarousel
              loungeId={lounge.id}
              onOpenGallery={(index) => {
                setGalleryIndex(index);
                setGalleryOpen(true);
              }}
            />

            <div className="flex flex-1 gap-7 overflow-y-auto px-8 pb-7 pt-5.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[30px] text-fg">{lounge.name}</h1>

                  {reviewCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-fg">
                      <Star size={15} className="fill-gold-500 text-gold-500" aria-hidden />
                      {lounge.rating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[11.5px] font-bold text-fg">
                      New on LuxePass
                    </span>
                  )}

                  <Link
                    href={`/lounges/${lounge.id}/reviews`}
                    className="flex items-center gap-1.5 rounded-pill border-[1.5px] border-line px-3 py-1.5 text-[12.5px] font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:text-accent-strong"
                  >
                    {reviewCount > 0 ? `${reviewCount} reviews` : "No reviews yet"}
                    <ChevronRight size={14} strokeWidth={2} aria-hidden />
                  </Link>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-3.5">
                  <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                    <MapPin size={15} strokeWidth={1.7} className="text-fg-subtle" aria-hidden />
                    {contact.address}
                  </span>
                  <span className="h-3.5 w-px bg-line" aria-hidden />
                  <span className="text-[13px] font-bold text-accent-strong">
                    {formatDistance(lounge.distanceMiles, "mi")} away
                  </span>
                  <span className="h-3.5 w-px bg-line" aria-hidden />
                  <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                    <Phone size={15} strokeWidth={1.7} className="text-fg-subtle" aria-hidden />
                    {contact.phone}
                  </span>
                </div>

                <AmenitiesGrid amenities={lounge.amenities} />

                <div className="mt-6 grid grid-cols-2 gap-5.5">
                  <OperatingHours />
                  <ContactInfo lounge={lounge} />
                </div>
              </div>

              <AvailabilityCard lounge={lounge} />
            </div>
          </>
        )}
      </div>

      <PhotoGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        loungeId={lounge.id}
        loungeName={lounge.name}
        initialIndex={galleryIndex}
      />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} lounge={lounge} />
    </AppShell>
  );
}
