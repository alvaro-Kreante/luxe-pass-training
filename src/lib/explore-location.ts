import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Story 2.1 — "Current location detection with permission request".
 *
 * El miembro responde al permiso una vez por sesión: la respuesta se guarda
 * en `user_metadata.explore_location` atada al `session_id` del JWT, así que
 * sobrevive a navegar y a recargar, y caduca sola al volver a iniciar sesión
 * (sesión nueva, `session_id` nuevo). Vive en Supabase Auth, no en storage
 * del navegador.
 */
export type LocationChoice = { mode: "gps" } | { mode: "city"; cityId: string };

type StoredChoice = LocationChoice & { sessionId: string };

const KEY = "explore_location";

async function currentSessionId(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims();
  return (data?.claims.session_id as string | undefined) ?? null;
}

export async function rememberedLocation(
  supabase: SupabaseClient,
): Promise<LocationChoice | null> {
  const sessionId = await currentSessionId(supabase);
  if (!sessionId) return null;

  const { data } = await supabase.auth.getUser();
  const stored = data.user?.user_metadata?.[KEY] as StoredChoice | null | undefined;
  if (!stored || stored.sessionId !== sessionId) return null;

  return stored.mode === "city"
    ? { mode: "city", cityId: stored.cityId }
    : { mode: "gps" };
}

export async function rememberLocation(
  supabase: SupabaseClient,
  choice: LocationChoice,
): Promise<void> {
  const sessionId = await currentSessionId(supabase);
  if (!sessionId) return;

  await supabase.auth.updateUser({ data: { [KEY]: { ...choice, sessionId } } });
}
