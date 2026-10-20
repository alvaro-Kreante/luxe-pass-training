import Link from "next/link";
import { ArrowLeft, ChevronRight, MapPin, Phone, Star } from "lucide-react";

import { AmenitiesGrid } from "@/components/lounges/amenities-grid";
import { ContactInfo } from "@/components/lounges/contact-info";
import { ClosureBanner } from "@/components/lounges/closure-banner";
import { LiveAvailabilityCard } from "@/components/lounges/live-availability-card";
import { LoungeGallery } from "@/components/lounges/lounge-gallery";
import { LoungeQuickActions } from "@/components/lounges/lounge-quick-actions";
import { LoungeScheduleSections, toBannerClosure } from "@/components/lounges/lounge-schedule-sections";
import { OperatingHours } from "@/components/lounges/operating-hours";
import { ProfileSkeleton } from "@/components/lounges/profile-skeleton";
import { AppShell } from "@/components/patterns/app-shell";
import { today as todayIso } from "@/lib/availability";
import type { LoungeProfileData } from "@/lib/lounge-profile";
import { memberSchedule, weekHoursFrom } from "@/lib/lounge-schedule";

/**
 * Story 3.1 (Detailed Lounge Information) + estado "Not available" de la
 * Story 3.2 (Availability), que vive en esta misma pantalla — ver
 * `AvailabilityCard`. Artboards: `Main.dc.html`, `Gallery.dc.html`,
 * `Share.dc.html`, `NotAvailable.dc.html`, `Loading.dc.html`.
 * DESIGN-SYSTEM.md §5 patrón 7 — Perfil de lounge.
 *
 * PERF-02 — se renderiza en el servidor con los datos de `loadLoungeProfile`.
 * Solo son cliente las tres islas interactivas: `LoungeQuickActions`
 * (compartir y favorito), `LoungeGallery` (carousel y galería) y
 * `LiveAvailabilityCard` (refresco cada 5 minutos); el resto no se hidrata.
 */

export function LoungeProfileView({
  lounge,
  images,
  today,
  schedule,
  favorite,
  forceLoading = false,
}: LoungeProfileData & {
  /** `?loading=1` — el estado de `Loading.dc.html`, alcanzable a propósito. */
  forceLoading?: boolean;
}) {
  const visible = memberSchedule(schedule, todayIso());
  const hoursRows = weekHoursFrom(todayIso(), lounge.usualWeeklyHours, schedule);

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

          <LoungeQuickActions lounge={lounge} favorite={favorite} />
        </div>

        {forceLoading ? (
          <ProfileSkeleton />
        ) : (
          <>
            {visible.closedToday ? (
              <div className="shrink-0 px-8 pt-5.5">
                <ClosureBanner closure={toBannerClosure(visible.closedToday)} />
              </div>
            ) : null}

            <LoungeGallery loungeId={lounge.id} loungeName={lounge.name} images={images} />

            <div className="flex flex-1 gap-7 overflow-y-auto px-8 pb-7 pt-5.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[30px] text-fg">{lounge.name}</h1>

                  {lounge.reviewCount > 0 ? (
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
                    {lounge.reviewCount > 0
                      ? `${lounge.reviewCount} reviews`
                      : "No reviews yet"}
                    <ChevronRight size={14} strokeWidth={2} aria-hidden />
                  </Link>
                </div>

                {lounge.partnerName ? (
                  <p className="m-0 mt-1 text-[13.5px] text-fg-muted">
                    at <span className="font-bold text-fg">{lounge.partnerName}</span>
                  </p>
                ) : null}

                <div className="mt-2.5 flex flex-wrap items-center gap-3.5">
                  <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                    <MapPin size={15} strokeWidth={1.7} className="text-fg-subtle" aria-hidden />
                    {lounge.address}
                  </span>
                  <span className="h-3.5 w-px bg-line" aria-hidden />
                  <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                    <Phone size={15} strokeWidth={1.7} className="text-fg-subtle" aria-hidden />
                    {lounge.phone}
                  </span>
                </div>

                <AmenitiesGrid amenities={lounge.amenities} />

                <div className="mt-6 grid grid-cols-2 gap-5.5">
                  <OperatingHours rows={hoursRows} season={visible.inEffect} />
                  <ContactInfo lounge={lounge} />
                </div>

                <LoungeScheduleSections seasons={visible.seasons} closures={visible.closures} />
              </div>

              <LiveAvailabilityCard
                lounge={lounge}
                initial={today}
                hoursToday={hoursRows[0]}
                closedToday={visible.closedToday}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
