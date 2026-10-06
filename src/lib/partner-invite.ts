import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveProfilePhotoUrl, uploadProfilePhoto } from "@/lib/profile-photo";

/**
 * Epic 7 · SetPassword.dc.html — /partner/welcome. El enlace del email trae
 * un token de invitación de Supabase Auth; al verificarlo el usuario queda
 * con sesión y puede leer su fila de `partner_members` y los lounges de su
 * partner (Story 10.1).
 */

export interface PartnerWelcome {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  photoUrl: string | null;
  /** Story 10.1 — el partner (la organización) al que se une. */
  partnerName: string;
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
    .from("partner_members")
    .select("first_name, last_name, email, mobile, photo_path, partner_id")
    .maybeSingle();
  if (error || !data) return null;

  const { data: partner } = await supabase.from("partners").select("name").eq("id", data.partner_id).maybeSingle();
  const { data: lounges } = await supabase
    .from("lounges")
    .select("name, address, neighborhood")
    .eq("partner_id", data.partner_id)
    .order("name");

  return {
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    mobile: data.mobile,
    photoUrl: await resolveProfilePhotoUrl(supabase, data.photo_path),
    partnerName: partner?.name ?? "",
    lounges: (lounges ?? []).map((lounge) => ({
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
    .from("partner_members")
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      mobile: input.mobile.trim(),
      ...(photoPath ? { photo_path: photoPath } : {}),
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
