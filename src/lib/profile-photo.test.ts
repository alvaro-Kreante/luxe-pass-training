import { describe, expect, it } from "vitest";

import { resolveProfilePhotoUrl, uploadProfilePhoto } from "./profile-photo";
import { createClient } from "./supabase/client";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";

/**
 * Story 1.1 / 6.3 — foto de perfil. El bucket `profile-photos` es privado:
 * una URL pública no sirve la imagen, así que se guarda la ruta del objeto y
 * se firma al mostrarla. Corre contra Supabase local real.
 */
async function signUpFreshMember(label: string) {
  const supabase = createClient();
  await signUpConfirmedMemberAndSignIn(
    supabase,
    `profile-photo-${Date.now()}-${label}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  return { supabase };
}

const PNG_BYTES = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),
  (c) => c.charCodeAt(0),
);

describe("foto de perfil", () => {
  it("la foto subida se puede ver de verdad con la URL resuelta", async () => {
    const { supabase } = await signUpFreshMember("upload");
    const file = new File([PNG_BYTES], "me.png", { type: "image/png" });

    const stored = await uploadProfilePhoto(supabase, file);
    const url = await resolveProfilePhotoUrl(supabase, stored);

    expect(url).not.toBeNull();
    const response = await fetch(url!);
    expect(response.status).toBe(200);
  });

  it("también resuelve las fotos guardadas antes como URL pública del bucket", async () => {
    const { supabase } = await signUpFreshMember("legacy");
    const file = new File([PNG_BYTES], "me.png", { type: "image/png" });
    const path = await uploadProfilePhoto(supabase, file);
    const legacy = supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;

    const url = await resolveProfilePhotoUrl(supabase, legacy);

    const response = await fetch(url!);
    expect(response.status).toBe(200);
  });

  it("sin foto no hay URL", async () => {
    const { supabase } = await signUpFreshMember("none");
    expect(await resolveProfilePhotoUrl(supabase, null)).toBeNull();
  });
});
