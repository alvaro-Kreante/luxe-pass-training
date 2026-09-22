"use client";

import * as React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import { toneOf } from "@/components/lounges/lounge-thumb";
import { RequireSession } from "@/components/onboarding/require-session";
import { AccountShell, SavedIndicatorChip } from "@/components/patterns/account-shell";
import { buttonVariants } from "@/components/ui/button";
import { SelectableChip } from "@/components/ui/chip";
import { AMENITIES, type AmenityId } from "@/lib/amenities";
import {
  INTERESTS,
  fetchFavoriteLounges,
  fetchInterests,
  fetchPreferredAmenities,
  removeFavoriteLounge,
  updateInterests,
  updatePreferredAmenities,
  type DistanceUnit,
  type FavoriteLounge,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 6.3 — "Favorite lounges list", "Preferred amenities selection".
 * `Preferences.dc.html`, backend real (autoguarda cada cambio, como marca
 * `SavedIndicatorChip`).
 */
export default function PreferencesPage() {
  return (
    <RequireSession>
      <PreferencesScreen />
    </RequireSession>
  );
}

function PreferencesScreen() {
  const supabase = React.useMemo(() => createClient(), []);
  const [favorites, setFavorites] = React.useState<FavoriteLounge[]>([]);
  const [amenities, setAmenities] = React.useState<Set<AmenityId>>(new Set());
  const [interests, setInterests] = React.useState<Set<string>>(new Set());
  const [unit, setUnit] = React.useState<DistanceUnit>("mi");

  React.useEffect(() => {
    let active = true;

    Promise.all([fetchFavoriteLounges(supabase), fetchPreferredAmenities(supabase), fetchInterests(supabase)]).then(
      ([favoriteLounges, preferredAmenities, savedInterests]) => {
        if (!active) return;
        setFavorites(favoriteLounges);
        setAmenities(new Set(preferredAmenities));
        setInterests(new Set(savedInterests));
      },
    );

    return () => {
      active = false;
    };
  }, [supabase]);

  async function removeFavorite(loungeId: string) {
    setFavorites((current) => current.filter((lounge) => lounge.id !== loungeId));
    await removeFavoriteLounge(supabase, loungeId);
  }

  async function toggleAmenity(id: AmenityId) {
    const next = new Set(amenities);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAmenities(next);
    await updatePreferredAmenities(supabase, Array.from(next));
  }

  async function toggleInterest(interest: string) {
    const next = new Set(interests);
    if (next.has(interest)) next.delete(interest);
    else next.add(interest);
    setInterests(next);
    await updateInterests(supabase, Array.from(next));
  }

  return (
    <AccountShell
      active="preferences"
      breadcrumb="Preferences"
      topbarRight={<SavedIndicatorChip />}
    >
      <h1 className="m-0 text-[34px] text-fg">Preferences</h1>
      <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
        What we put first in Explore, and which lounges are worth telling you about.
      </p>

      <div className="mt-6 flex items-baseline justify-between">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Favorite lounges</p>
        <span className="text-xs text-fg-subtle">{favorites.length} saved</span>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {favorites.map((lounge) => (
          <div
            key={lounge.id}
            className="flex items-center gap-3.5 rounded-content border border-line bg-surface p-3 shadow-content"
          >
            <span aria-hidden data-tone={toneOf(lounge.name)} className="lounge-hero size-11 shrink-0 rounded-[11px]" />
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-bold text-fg">{lounge.name}</p>
              <p className="m-0 mt-0.5 text-xs text-fg-subtle">{lounge.neighborhood}</p>
            </div>
            <button
              type="button"
              aria-label={`Remove ${lounge.name} from favorites`}
              onClick={() => removeFavorite(lounge.id)}
              className="cursor-pointer"
            >
              <Heart size={19} strokeWidth={1.4} className="fill-accent text-accent-strong" aria-hidden />
            </button>
            <Link
              href={`/lounges/${lounge.id}/book`}
              className={cn(buttonVariants({ variant: "secondary", size: "md" }), "h-9 px-3.5 text-xs normal-case")}
            >
              Book
            </Link>
          </div>
        ))}
      </div>
      <p className="m-0 mt-2.5 text-[11.5px] text-fg-subtle">Tap the heart on any lounge profile to save it here.</p>

      <p className="m-0 mt-6 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Preferred amenities</p>
      <p className="m-0 mt-1 mb-3 text-[12.5px] text-fg-subtle">Lounges with these come first in Explore.</p>
      <div className="flex flex-wrap gap-2">
        {AMENITIES.map((amenity) => (
          <SelectableChip
            key={amenity.id}
            selected={amenities.has(amenity.id)}
            onToggle={() => toggleAmenity(amenity.id)}
          >
            {amenity.label}
          </SelectableChip>
        ))}
      </div>

      <p className="m-0 mt-5.5 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Interests</p>
      <p className="m-0 mt-1 mb-3 text-[12.5px] text-fg-subtle">
        The same ones you picked when you joined. They shape what we invite you to.
      </p>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((interest) => (
          <SelectableChip key={interest} selected={interests.has(interest)} onToggle={() => toggleInterest(interest)}>
            {interest}
          </SelectableChip>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4.5 rounded-content border border-line bg-surface p-4.5">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13.5px] font-bold text-fg">Distance units</p>
          <p className="m-0 mt-0.5 text-xs text-fg-subtle">Used everywhere distances are shown</p>
        </div>
        <div className="flex gap-1 rounded-[11px] border border-line bg-surface-sunken p-1">
          <button
            type="button"
            aria-pressed={unit === "mi"}
            onClick={() => setUnit("mi")}
            className={cn(
              "rounded-[8px] px-4.5 py-2 text-[12.5px] font-bold transition-colors duration-150",
              unit === "mi" ? "bg-accent text-on-accent" : "text-fg-muted",
            )}
          >
            mi
          </button>
          <button
            type="button"
            aria-pressed={unit === "km"}
            onClick={() => setUnit("km")}
            className={cn(
              "rounded-[8px] px-4.5 py-2 text-[12.5px] font-bold transition-colors duration-150",
              unit === "km" ? "bg-accent text-on-accent" : "text-fg-muted",
            )}
          >
            km
          </button>
        </div>
      </div>
    </AccountShell>
  );
}
