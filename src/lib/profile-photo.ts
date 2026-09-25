import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Story 1.1 / 6.3 — foto de perfil. El bucket `profile-photos` es privado
 * (una carpeta por miembro, ver `supabase/schemas/storage.sql`): su URL
 * pública no sirve la imagen. `profiles.photo_url` guarda la ruta del
 * objeto y se firma cada vez que se muestra.
 */
const BUCKET = "profile-photos";
const SIGNED_URL_SECONDS = 60 * 60;

/** Sube (o reemplaza) la foto del miembro y devuelve la ruta a guardar en `profiles.photo_url`. */
export async function uploadProfilePhoto(supabase: SupabaseClient, file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${extension}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) throw error;
  return path;
}

/** Las filas anteriores a este arreglo guardaron la URL pública completa; de ahí se rescata la ruta. */
function objectPathOf(stored: string): string {
  const marker = `/${BUCKET}/`;
  const index = stored.indexOf(marker);
  return index === -1 ? stored : stored.slice(index + marker.length);
}

export async function resolveProfilePhotoUrl(
  supabase: SupabaseClient,
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectPathOf(stored), SIGNED_URL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}
