"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  MapPin,
  Navigation2,
  Phone,
  Share2,
  Star,
} from "lucide-react";

import { RequireSession } from "@/components/onboarding/require-session";
import { AmenitiesGrid } from "@/components/lounges/amenities-grid";
import { AvailabilityCard } from "@/components/lounges/availability-card";
import { ContactInfo } from "@/components/lounges/contact-info";
import { ClosureBanner } from "@/components/lounges/closure-banner";
import { HeroCarousel } from "@/components/lounges/hero-carousel";
import { LoungeScheduleSections, toBannerClosure } from "@/components/lounges/lounge-schedule-sections";
import { OperatingHours } from "@/components/lounges/operating-hours";
import { PhotoGalleryDialog } from "@/components/lounges/photo-gallery-dialog";
import { ProfileSkeleton } from "@/components/lounges/profile-skeleton";
import { ShareDialog } from "@/components/lounges/share-dialog";
import { AppShell } from "@/components/patterns/app-shell";
import {
  fetchLoungeImages,
  fetchLoungeProfile,
  fetchNextAvailableSlot,
  fetchWeeklyAvailability,
  mondayOf,
  type LoungeImage,
  type LoungeProfile,
  type WeekBandId,
} from "@/lib/lounge-profile";
import { today } from "@/lib/availability";
import { addFavoriteLounge, isFavoriteLounge, removeFavoriteLounge } from "@/lib/profile";
import { today as todayIso } from "@/lib/availability";
import { listLoungeSchedule, memberSchedule, weekHoursFrom, type LoungeSchedule } from "@/lib/lounge-schedule";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 3.1 (Detailed Lounge Information) + estado "Not available" de la
 * Story 3.2 (Availability), que vive en esta misma pantalla — ver
 * `AvailabilityCard`. Artboards: `Main.dc.html`, `Gallery.dc.html`,
 * `Share.dc.html`, `NotAvailable.dc.html`, `Loading.dc.html`.
 * DESIGN-SYSTEM.md §5 patrón 7 — Perfil de lounge.
 *
 * Backend real (Supabase local): `lounges` extendida (contacto, horario,
 * capacidad, restricciones, rating agregado) + `lounge_images` +
 * `lounge_availability`/`lounge_closures` — ver `docs/design/COMPONENT-MAP.md`
 * "Backend real — Epic 3". El chip de distancia del mock se retiró: no está
 * en los Acceptance Criteria y añadir geolocalización aquí, como en
 * `/explore`, es desproporcionado para esta historia.
 *
 * El botón de favorito (Story 6.3 — "Tap the heart on any lounge profile to
 * save it here", `Preferences.dc.html`) no tiene artboard propio en esta
 * pantalla (`Main.dc.html` de la Fase 4 nunca lo dibujó, gap ya anotado en
 * COMPONENT-MAP): se compone reutilizando el mismo botón de acción rápida
 * que Call/Directions/Share, sin CSS nuevo — desviación consciente,
 * documentada en COMPONENT-MAP.
 */
const QUICK_ACTION_CLASS =
  "flex h-10 items-center gap-2 rounded-[11px] border-[1.5px] border-line bg-surface px-4 text-[12.5px] font-bold tracking-[0.06em] text-fg-muted transition-colors duration-150 hover:bg-accent-soft";

const REFRESH_INTERVAL_MS = 5 * 60_000;

interface TodayAvailability {
  seatsLeft: number;
  available: boolean;
  nextAvailable?: { dateIso: string; band: WeekBandId; seatsLeft: number };
  lastUpdatedAt: string;
}

async function fetchTodayAvailability(
  supabase: ReturnType<typeof createClient>,
  lounge: LoungeProfile,
): Promise<TodayAvailability> {
  const todayIso = today();
  const cells = await fetchWeeklyAvailability(supabase, lounge, mondayOf(todayIso));
  const todayCells = cells.filter((cell) => cell.dateIso === todayIso);
  const seatsLeft = todayCells
    .filter((cell) => cell.status === "available")
    .reduce((sum, cell) => sum + (cell.seatsLeft ?? 0), 0);
  const available = seatsLeft > 0;

  const nextAvailable = available
    ? undefined
    : await fetchNextAvailableSlot(supabase, lounge);

  return {
    seatsLeft,
    available,
    nextAvailable,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export default function LoungeProfilePage() {
  return (
    <RequireSession>
      <LoungeProfileScreen />
    </RequireSession>
  );
}

function LoungeProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const forceLoading = searchParams.get("loading") === "1";

  const [lounge, setLounge] = React.useState<LoungeProfile | null | undefined>(
    undefined,
  );
  const [images, setImages] = React.useState<LoungeImage[]>([]);
  const [today, setToday] = React.useState<TodayAvailability | null>(null);
  const [schedule, setSchedule] = React.useState<LoungeSchedule | null>(null);
  /** El intervalo de refresco necesita el lounge más reciente, pero el efecto
   * solo se re-arma cuando cambia `id` — un ref evita el cierre obsoleto. */
  const loungeRef = React.useRef<LoungeProfile | null>(null);

  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [galleryIndex, setGalleryIndex] = React.useState(0);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [favorite, setFavorite] = React.useState(false);
  const supabaseRef = React.useRef<ReturnType<typeof createClient> | null>(null);
  /** El fetch inicial de favorito y el click del miembro compiten (el primero
   * es lento — va en el mismo `Promise.all` que fotos/disponibilidad — y
   * puede resolver DESPUÉS de un click bien temprano). Sin esta guarda, esa
   * resolución tardía pisaría el toggle optimista con el valor previo. */
  const favoriteOverriddenRef = React.useRef(false);

  React.useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;
    let active = true;

    fetchLoungeProfile(supabase, id).then(async (profile) => {
      if (!active) return;
      setLounge(profile);
      loungeRef.current = profile;
      if (!profile) return;

      const [loungeImages, availability, isFavorite, loungeSchedule] = await Promise.all([
        fetchLoungeImages(supabase, id),
        fetchTodayAvailability(supabase, profile),
        isFavoriteLounge(supabase, id),
        listLoungeSchedule(supabase, id),
      ]);
      if (!active) return;
      setImages(loungeImages);
      setSchedule(loungeSchedule);
      setToday(availability);
      if (!favoriteOverriddenRef.current) setFavorite(isFavorite);
    });

    const interval = setInterval(async () => {
      if (!active || !loungeRef.current) return;
      const availability = await fetchTodayAvailability(supabase, loungeRef.current);
      if (active) setToday(availability);
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  if (lounge === null) {
    notFound();
    return null;
  }

  const loading = forceLoading || lounge === undefined || today === null || schedule === null;
  const visible = lounge && schedule ? memberSchedule(schedule, todayIso()) : null;
  const hoursRows = lounge && schedule ? weekHoursFrom(todayIso(), lounge.usualWeeklyHours, schedule) : [];

  async function toggleFavorite() {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    favoriteOverriddenRef.current = true;
    const next = !favorite;
    setFavorite(next);
    if (next) await addFavoriteLounge(supabase, id);
    else await removeFavoriteLounge(supabase, id);
  }

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

          {lounge ? (
            <div className="flex items-center gap-2.5">
              <a href={`tel:${lounge.phone.replace(/[^\d+]/g, "")}`} className={QUICK_ACTION_CLASS}>
                <Phone size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
                Call
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lounge.address)}`}
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
              <button
                type="button"
                onClick={toggleFavorite}
                aria-pressed={favorite}
                className={cn(QUICK_ACTION_CLASS, favorite && "border-accent bg-accent-soft text-accent-strong")}
              >
                <Heart
                  size={16}
                  strokeWidth={1.8}
                  className={favorite ? "fill-accent-strong text-accent-strong" : "text-gold-600"}
                  aria-hidden
                />
                {favorite ? "Saved" : "Save"}
              </button>
            </div>
          ) : null}
        </div>

        {loading || !lounge || !today || !visible ? (
          <ProfileSkeleton />
        ) : (
          <>
            {visible.closedToday ? (
              <div className="shrink-0 px-8 pt-5.5">
                <ClosureBanner closure={toBannerClosure(visible.closedToday)} />
              </div>
            ) : null}

            <HeroCarousel
              loungeId={lounge.id}
              images={images}
              onOpenGallery={(index) => {
                setGalleryIndex(index);
                setGalleryOpen(true);
              }}
            />

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

              <AvailabilityCard
                loungeId={lounge.id}
                capacity={lounge.capacity}
                bookingRestrictions={lounge.bookingRestrictions}
                hoursToday={hoursRows[0]}
                available={today.available}
                todaySeatsLeft={today.seatsLeft}
                nextAvailable={today.nextAvailable}
                lastUpdatedAt={today.lastUpdatedAt}
                closedToday={visible.closedToday}
              />
            </div>
          </>
        )}
      </div>

      {lounge ? (
        <>
          {/* Solo se monta con fotos ya cargadas: el botón que la abre
           * ("View all N photos") vive detrás del mismo `loading` que las
           * trae, así que nunca se puede pulsar antes de que existan. El
           * botón "Share" de la topbar, en cambio, aparece en cuanto llega
           * el perfil — este diálogo no depende de `images`, así que se
           * monta en el mismo momento que ese botón. */
          images.length > 0 ? (
            <PhotoGalleryDialog
              open={galleryOpen}
              onOpenChange={setGalleryOpen}
              loungeId={lounge.id}
              loungeName={lounge.name}
              images={images}
              initialIndex={galleryIndex}
            />
          ) : null}
          <ShareDialog open={shareOpen} onOpenChange={setShareOpen} lounge={lounge} />
        </>
      ) : null}
    </AppShell>
  );
}
