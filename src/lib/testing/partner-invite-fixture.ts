import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Epic 7 · SetPassword.dc.html — un usuario partner invitado de verdad: un
 * partner activo con un lounge y un usuario cuya cuenta de Auth nace con el
 * enlace de invitación (`generateLink`, service role). Desde la Story 10.1
 * publicar un lounge ya no invita a nadie; la invitación real la manda
 * activar el partner (Story 10.4), así que el fixture la reproduce sin pasar
 * por el admin. El token solo vale mientras nadie lo haya aceptado: un
 * fixture por test.
 */
export interface InvitedPartner {
  loungeId: string;
  loungeName: string;
  partnerName: string;
  email: string;
  userId: string;
  /** Un token de invitación sin usar, como el del enlace del email. */
  token: string;
  cleanup: () => Promise<void>;
}

function isolatedClient(): SupabaseClient {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function invitePartnerForTest(label: string): Promise<InvitedPartner> {
  const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const loungeId = `test-lounge-${label}-${stamp}`;
  const loungeName = `Test Lounge ${label} ${stamp}`;
  const email = `${label}-${stamp}@thelarkspur-test.example`;
  let partnerId: string | null = null;
  let userId: string | null = null;

  const cleanup = async () => {
    if (userId) await service.auth.admin.deleteUser(userId);
    await service.from("lounges").delete().eq("id", loungeId);
    if (partnerId) await service.from("partners").delete().eq("id", partnerId);
  };

  try {
    const { data: partner, error: partnerError } = await service
      .from("partners")
      .insert({ name: `Test Partner ${label} ${stamp}`, contact_email: "hello@thelarkspur.example", status: "active" })
      .select("id")
      .single();
    if (partnerError) throw partnerError;
    partnerId = partner.id as string;

    const { error: loungeError } = await service.from("lounges").insert({
      id: loungeId,
      name: loungeName,
      address: "27 Bond Street",
      neighborhood: "NoHo",
      city: "New York",
      city_id: "new-york",
      lat: 40.7262,
      lng: -73.9936,
      hours: "Open until 9 PM",
      content_status: "draft",
      partner_id: partnerId,
    });
    if (loungeError) throw loungeError;

    const { error: memberError } = await service
      .from("partner_members")
      .insert({ partner_id: partnerId, first_name: "Camille", last_name: "Duarte", email, mobile: "+1 917 555 0163" });
    if (memberError) throw memberError;

    const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "invite", email });
    if (linkError) throw linkError;
    userId = link.user.id;

    await service.from("user_roles").insert({ user_id: userId, role: "partner" });
    const { error: linkMemberError } = await service.from("partner_members").update({ user_id: userId }).eq("email", email);
    if (linkMemberError) throw linkMemberError;

    return { loungeId, loungeName, partnerName: `Test Partner ${label} ${stamp}`, email, userId, token: link.properties.hashed_token, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export { isolatedClient };
