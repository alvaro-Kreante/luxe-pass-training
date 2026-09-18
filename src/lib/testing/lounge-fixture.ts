import type { SupabaseClient } from "@supabase/supabase-js";

import { TODAY, addDays } from "@/lib/availability";
import {
  fetchLoungeProfile,
  mondayOf,
  weeklyAvailability,
  type LoungeProfile,
  type WeekBandId,
} from "@/lib/lounge-profile";
import type { Lounge } from "@/lib/lounges";

/**
 * Story 4.1+ — todos los tests del flujo de booking usaban el mismo lounge
 * de muestra (`LOUNGES.find(... "the-ainsworth")`, catálogo mock). Conectado
 * a Supabase, `BookingProvider` espera un `LoungeProfile` real: este helper
 * evita repetir el fetch (y su comprobación de null) en cada archivo.
 */
export async function fetchAinsworthProfile(
  supabase: SupabaseClient,
): Promise<LoungeProfile> {
  const profile = await fetchLoungeProfile(supabase, "the-ainsworth");
  if (!profile) throw new Error("Seed missing: the-ainsworth (lounges)");

  return profile;
}

/** Uno de los cinco horarios fijos de `Main.dc.html` por franja (`SLOT_DEFS` en `booking.ts`). */
const TIME_BY_BAND: Record<WeekBandId, string> = {
  morning: "8:00 AM",
  afternoon: "3:30 PM",
  evening: "6:00 PM",
  late: "6:00 PM",
};

/**
 * Predice, con la misma fórmula determinista que sembró `lounge_availability`
 * (ver `weeklyAvailability`, legacy), una fecha/franja real con el `status`
 * pedido — para dar a un test un slot "available" (confirma de verdad) o
 * "full" (cae a la waitlist) sin depender de datos fijos que puedan rotar.
 *
 * `occurrence` (1 = el primero) evita que dos tests que confirman de verdad
 * (`confirm_booking` decrementa `seats_left`) elijan el mismo slot y se
 * pisen entre sí — cada test pide una ocurrencia distinta.
 */
export function findPredictedSlot(
  mockLounge: Lounge,
  status: "available" | "full",
  occurrence = 1,
  withinDays = 60,
): { dateIso: string; band: WeekBandId; time: string } {
  let seen = 0;

  for (let offset = 0; offset < withinDays; offset++) {
    const dateIso = addDays(TODAY, offset);
    const cells = weeklyAvailability(mockLounge, mondayOf(dateIso)).filter(
      (cellCandidate) => cellCandidate.dateIso === dateIso && cellCandidate.band !== "late",
    );
    const found = cells.find((cellCandidate) => cellCandidate.status === status);
    if (found) {
      seen++;
      if (seen === occurrence) {
        return { dateIso, band: found.band, time: TIME_BY_BAND[found.band] };
      }
    }
  }

  throw new Error(
    `No se encontró la ocurrencia ${occurrence} de un slot predicho como '${status}'`,
  );
}
