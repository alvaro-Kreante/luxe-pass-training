"use client";

import * as React from "react";

import { AvailabilityCard, type AvailabilityCardProps } from "@/components/lounges/availability-card";
import { fetchTodayAvailability, type LoungeProfile, type TodayAvailability } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";

const REFRESH_INTERVAL_MS = 5 * 60_000;

/**
 * Story 3.2 — "real-time availability": la card del perfil arranca con lo
 * que cargó el servidor y se refresca cada 5 minutos en el navegador. Isla
 * cliente de `/lounges/[id]` (PERF-02).
 */
export function LiveAvailabilityCard({
  lounge,
  initial,
  hoursToday,
  closedToday,
}: {
  lounge: LoungeProfile;
  initial: TodayAvailability;
  hoursToday: AvailabilityCardProps["hoursToday"];
  closedToday: AvailabilityCardProps["closedToday"];
}) {
  const [today, setToday] = React.useState(initial);

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;
    const interval = setInterval(async () => {
      const availability = await fetchTodayAvailability(supabase, lounge);
      if (active) setToday(availability);
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [lounge]);

  return (
    <AvailabilityCard
      loungeId={lounge.id}
      capacity={lounge.capacity}
      bookingRestrictions={lounge.bookingRestrictions}
      hoursToday={hoursToday}
      available={today.available}
      todaySeatsLeft={today.seatsLeft}
      nextAvailable={today.nextAvailable}
      lastUpdatedAt={today.lastUpdatedAt}
      closedToday={closedToday}
    />
  );
}
