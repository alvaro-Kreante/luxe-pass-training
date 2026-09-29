import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { createLoungeDraft, publishLounge } from "@/lib/admin-content";

import { signUpConfirmedAdminAndSignIn } from "./confirmed-user";

/**
 * Epic 7 · SetPassword.dc.html — un partner invitado de verdad: un admin da
 * de alta el lounge con su partner y lo publica (Edge Function
 * `admin-publish-lounge`, necesita `supabase functions serve`). El token del
 * email no se puede leer en un test (el dominio de test no recibe nada), así
 * que se pide otro para el mismo usuario invitado con `generateLink` — solo
 * vale mientras nadie lo haya aceptado: un fixture por test.
 */
export interface InvitedPartner {
  loungeId: string;
  loungeName: string;
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
  const admin = isolatedClient();
  const adminUser = await signUpConfirmedAdminAndSignIn(admin, `${label}-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");

  const loungeName = `Larkspur ${label} ${stamp}`;
  const email = `${label}-${stamp}@thelarkspur-test.com`;
  const loungeId = await createLoungeDraft(admin, {
    name: loungeName,
    phone: "+1 212 555 0148",
    email: "hello@thelarkspur.com",
    website: "thelarkspur.com",
    location: { address: "27 Bond Street", neighborhood: "NoHo", city: "New York", lat: 40.7262, lng: -73.9936 },
    weeklyHours: ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 6 PM"],
    amenities: ["wifi"],
    capacity: 24,
    partner: { firstName: "Camille", lastName: "Duarte", email, mobile: "+1 917 555 0163" },
  });
  // Publicado, el lounge lo ven los miembros: si algo falla antes de
  // devolver el fixture (Auth local es intermitente con la suite en
  // paralelo, PENDIENTES §4.10) se borra aquí, o descuadra Explore.
  const cleanup = async () => {
    const { data: partner } = await service.from("partners").select("user_id").eq("contact_email", email).maybeSingle();
    if (partner) await service.auth.admin.deleteUser(partner.user_id);
    await service.auth.admin.deleteUser(adminUser.id);
    await service.from("lounges").delete().eq("id", loungeId);
  };

  try {
    await publishLounge(admin, loungeId);
    const { data: partner } = await service.from("partners").select("user_id").eq("contact_email", email).single();
    const { data: link, error } = await service.auth.admin.generateLink({ type: "invite", email });
    if (error) throw error;

    return {
      loungeId,
      loungeName,
      email,
      userId: partner!.user_id as string,
      token: link.properties.hashed_token,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export { isolatedClient };
