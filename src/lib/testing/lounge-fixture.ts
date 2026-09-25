import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";

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
 * Una fecha/franja abierta de verdad del lounge (su banda existe y el día no
 * cierra), elegida con la fórmula determinista legacy (`weeklyAvailability`)
 * solo como generador de slots distintos entre sí: las celdas que esa
 * fórmula marcaba "available" y las que marcaba "full" nunca coinciden, así
 * que un test que confirma y otro que llena una franja (con `fillSlot`) no
 * se pisan. La disponibilidad real se calcula en vivo — la fórmula ya no
 * predice plazas.
 *
 * `occurrence` (1 = el primero) evita que dos tests que confirman de verdad
 * elijan el mismo slot — cada test pide una ocurrencia distinta.
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

/**
 * Llena una franja con reservas reales (`confirmed`) hasta dejarla sin
 * plazas — la disponibilidad es `capacity` − reservas, así que "full" solo
 * existe si hay reservas de verdad. Las pone a nombre de un usuario de test
 * desechable; `vitest.global-setup.ts` las borra antes de la siguiente
 * corrida.
 */
export async function fillSlot(loungeId: string, dateIso: string, band: WeekBandId): Promise<void> {
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: cells, error: rangeError } = await admin.rpc("lounge_availability_range", {
    p_lounge_id: loungeId,
    p_from: dateIso,
    p_to: dateIso,
  });
  if (rangeError) throw rangeError;
  const seatsLeft = (cells as { band: string; seats_left: number }[]).find((c) => c.band === band)?.seats_left ?? 0;
  if (seatsLeft === 0) return;

  const { data: filler, error: userError } = await admin.auth.admin.createUser({
    email: `slot-filler-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ensoleil-test.com`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (userError) throw userError;

  const { error } = await admin.from("bookings").insert(
    Array.from({ length: seatsLeft }, () => ({
      member_id: filler.user.id,
      lounge_id: loungeId,
      date: dateIso,
      band,
      slot_time: TIME_BY_BAND[band],
      status: "confirmed",
    })),
  );
  if (error) throw error;
}
