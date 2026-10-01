// Epic 8 · artboards 16–22 — alta de cuentas de partner, compartida por
// `admin-publish-lounge` (al publicar) y `admin-lounge-partners` (añadir o
// reenviar en un lounge live).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import { sendBrevoEmail } from "./brevo.ts";
import { renderPartnerInvite } from "./partner-invite-email.ts";

const appUrl = Deno.env.get("APP_URL") as string;

export interface PartnerDetails {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
}

export interface LoungeSummary {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  city: string;
}

export interface LinkedPartner {
  partnerId: string;
  userId: string;
  /** Hay que enviarle la invitación con este token. */
  tokenHash: string;
}

/** Un error con el código HTTP que la function debe devolver. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function isCompletePartner(partner: Partial<PartnerDetails> | undefined): partner is PartnerDetails {
  return Boolean(partner?.first_name?.trim() && partner?.last_name?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partner?.email?.trim() ?? ""));
}

/**
 * Crea la cuenta invitada del partner y la vincula al lounge: el usuario con
 * `generateLink` — que no envía nada — más su rol y su fila en `partners`.
 * Un partner gestiona un solo lounge (LoungePartnersMain.dc.html, 23): un
 * email que ya tiene cuenta, de partner o de cualquier otro rol, está en uso.
 */
export async function linkOrInvitePartner(
  service: SupabaseClient,
  partner: PartnerDetails,
  lounge: LoungeSummary,
): Promise<LinkedPartner> {
  const email = partner.email.trim().toLowerCase();

  // `generateLink` reutiliza un usuario que ya exista con ese email.
  const { data: taken } = await service.rpc("email_exists", { p_email: email });
  if (taken) throw new HttpError(409, `${email} is already in use`);

  const { data: link, error: linkError } = await service.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { first_name: partner.first_name, last_name: partner.last_name } },
  });
  if (linkError || !link.user) throw new HttpError(500, linkError?.message ?? "Could not invite the partner");
  const userId = link.user.id;

  try {
    const { error: roleError } = await service.from("user_roles").insert({ user_id: userId, role: "partner" });
    if (roleError) throw roleError;
    const { data: created, error: partnerError } = await service
      .from("partners")
      .insert({
        user_id: userId,
        business_name: lounge.name,
        contact_email: email,
        contact_phone: partner.mobile.trim(),
        first_name: partner.first_name.trim(),
        last_name: partner.last_name.trim(),
      })
      .select("id")
      .single();
    if (partnerError) throw partnerError;
    const { error: loungeError } = await service.from("partner_lounges").insert({ partner_id: created.id, lounge_id: lounge.id });
    if (loungeError) throw loungeError;
    return { partnerId: created.id, userId, tokenHash: link.properties.hashed_token };
  } catch (error) {
    await service.auth.admin.deleteUser(userId);
    throw error;
  }
}

/** Un enlace nuevo para un partner que aún no ha creado su contraseña. */
export async function freshInviteToken(service: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await service.auth.admin.generateLink({ type: "invite", email });
  if (error) throw new HttpError(500, error.message);
  return data.properties.hashed_token;
}

export async function sendPartnerInvite(
  service: SupabaseClient,
  partner: PartnerDetails,
  lounge: LoungeSummary,
  tokenHash: string,
  invitedById: string,
): Promise<void> {
  const { data: admin } = await service.from("profiles").select("full_name").eq("id", invitedById).maybeSingle();
  const welcomeUrl = `${appUrl}/partner/welcome?token_hash=${tokenHash}&type=invite`;
  await sendBrevoEmail(
    partner.email,
    `You're invited to run ${lounge.name} on LuxePass`,
    renderPartnerInvite({
      firstName: partner.first_name,
      lastName: partner.last_name,
      email: partner.email,
      mobile: partner.mobile,
      loungeName: lounge.name,
      loungeAddress: [lounge.address, lounge.neighborhood, lounge.city].filter(Boolean).join(" · "),
      invitedBy: admin?.full_name || "En Soleil",
      welcomeUrl,
    }),
  );
}
