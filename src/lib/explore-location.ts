import type { SupabaseClient } from "@supabase/supabase-js";

import type { Coordinates } from "./distance";
import type { Place } from "./place-search";

/**
 * Story 2.1 — "Current location detection with permission request".
 *
 * El miembro responde al permiso una vez por sesión: la respuesta se guarda
 * en `user_metadata.explore_location` atada al `session_id` del JWT, así que
 * sobrevive a navegar y a recargar, y caduca sola al volver a iniciar sesión
 * (sesión nueva, `session_id` nuevo). Vive en Supabase Auth, no en storage
 * del navegador.
 *
 * Con GPS se guarda también la última posición conocida (`coords`): al volver
 * a Explore sirve de origen provisional mientras el navegador da la nueva, en
 * vez de la ciudad por defecto.
 *
 * La última ubicación escrita a mano (`explore_recent_place`) no caduca con
 * la sesión: es la que ManualLocation.dc.html propone bajo "Recent".
 */
export type LocationChoice =
  | { mode: "gps"; coords?: Coordinates }
  | { mode: "place"; place: Place };

type StoredChoice = LocationChoice & { sessionId: string };

const CHOICE_KEY = "explore_location";
const RECENT_KEY = "explore_recent_place";

async function currentSessionId(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims();
  return (data?.claims.session_id as string | undefined) ?? null;
}

async function metadata(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getUser();
  return data.user?.user_metadata ?? {};
}

export async function rememberedLocation(
  supabase: SupabaseClient,
): Promise<LocationChoice | null> {
  const sessionId = await currentSessionId(supabase);
  if (!sessionId) return null;

  const stored = (await metadata(supabase))[CHOICE_KEY] as StoredChoice | null | undefined;
  if (!stored || stored.sessionId !== sessionId) return null;

  if (stored.mode === "place") return { mode: "place", place: stored.place };
  if (stored.mode !== "gps") return null;
  return stored.coords ? { mode: "gps", coords: stored.coords } : { mode: "gps" };
}

export async function recentPlace(supabase: SupabaseClient): Promise<Place | null> {
  return ((await metadata(supabase))[RECENT_KEY] as Place | null | undefined) ?? null;
}

export async function rememberLocation(
  supabase: SupabaseClient,
  choice: LocationChoice,
): Promise<void> {
  const sessionId = await currentSessionId(supabase);
  if (!sessionId) return;

  await supabase.auth.updateUser({
    data: {
      [CHOICE_KEY]: { ...choice, sessionId },
      ...(choice.mode === "place" ? { [RECENT_KEY]: choice.place } : {}),
    },
  });
}
