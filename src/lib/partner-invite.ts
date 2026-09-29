import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveProfilePhotoUrl, uploadProfilePhoto } from "@/lib/profile-photo";

/**
 * Epic 7 · SetPassword.dc.html — /partner/welcome. El enlace del email trae
 * un token de invitación de Supabase Auth; al verificarlo el partner queda
 * con sesión y puede leer su propia fila de `partners` y sus lounges.
 */

export interface PartnerWelcome {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  photoUrl: string | null;
  lounges: { name: string; address: string }[];
}

export interface PartnerInviteCompletion {
  firstName: string;
  lastName: string;
  mobile: string;
  password: string;
  photo?: File | null;
}

/** Verifica el token del enlace. null = usado, caducado o inventado (InviteExpired.dc.html). */
export async function acceptPartnerInvite(supabase: SupabaseClient, tokenHash: string): Promise<PartnerWelcome | null> {
  const { error } = await supabase.auth.verifyOtp({ type: "invite", token_hash: tokenHash });
  if (error) return null;
  return loadPartnerWelcome(supabase);
}

export async function loadPartnerWelcome(supabase: SupabaseClient): Promise<PartnerWelcome | null> {
  const { data, error } = await supabase
    .from("partners")
    .select("first_name, last_name, contact_email, contact_phone, photo_path, partner_lounges(lounges(name, address, neighborhood))")
    .maybeSingle();
  if (error || !data) return null;

  type LoungeRow = { name: string; address: string; neighborhood: string };
  const links = (data.partner_lounges ?? []) as unknown as { lounges: LoungeRow | null }[];
  return {
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.contact_email,
    mobile: data.contact_phone,
    photoUrl: await resolveProfilePhotoUrl(supabase, data.photo_path),
    lounges: links
      .map((link) => link.lounges)
      .filter((lounge): lounge is LoungeRow => lounge !== null)
      .map((lounge) => ({
        name: lounge.name,
        address: [lounge.address, lounge.neighborhood].filter(Boolean).join(", "),
      })),
  };
}

/** Guarda nombre, móvil y foto, y fija la contraseña — la cuenta queda lista para /partner/login. */
export async function completePartnerInvite(supabase: SupabaseClient, input: PartnerInviteCompletion): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("This invitation link has expired");

  const photoPath = input.photo ? await uploadProfilePhoto(supabase, input.photo) : undefined;

  const { error: detailsError } = await supabase
    .from("partners")
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      contact_phone: input.mobile.trim(),
      ...(photoPath ? { photo_path: photoPath } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (detailsError) throw new Error(detailsError.message);

  const { error: passwordError } = await supabase.auth.updateUser({ password: input.password });
  if (passwordError) throw new Error(passwordError.message);
}

export interface PasswordRules {
  length: boolean;
  number: boolean;
  match: boolean;
}

/** Las tres marcas bajo los campos de contraseña del artboard. */
export function passwordRules(password: string, confirmation: string): PasswordRules {
  return {
    length: password.length >= 8,
    number: /\d/.test(password),
    match: password.length > 0 && password === confirmation,
  };
}
