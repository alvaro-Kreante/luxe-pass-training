import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import LoungeProfilePage from "@/app/lounges/[id]/page";

import { today } from "@/lib/availability";
import { fetchLounges } from "@/lib/lounge-directory";
import { fetchLoungeProfile } from "@/lib/lounge-profile";
import { fetchDigitalPass, fetchUpcomingBookings } from "@/lib/passes";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

vi.mock("next/navigation", () => ({
  usePathname: () => "/lounges/the-pelham-room",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "the-pelham-room" }),
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

/**
 * Story 10.8 — el miembro ve a qué partner pertenece un lounge, y nada más
 * del partner. `the-pelham-room` es un lounge sembrado que ningún otro test
 * usa: se le asigna un partner de test y se le quita al terminar, sin crear
 * lounges live nuevos (descuadrarían el catálogo de los demás tests).
 */

const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const LOUNGE = "the-pelham-room";
const WITHOUT_PARTNER = "the-ironbound-salon";
const partnerName = `Pelham Hotels ${stamp}`;
let partnerId: string;
let originalPartner: string | null;
let member: SupabaseClient;
let reference: string;
let memberId: string;

beforeAll(async () => {
  const { data: lounge } = await service.from("lounges").select("partner_id").eq("id", LOUNGE).single();
  originalPartner = lounge?.partner_id ?? null;
  const { data: partner } = await service
    .from("partners")
    .insert({ name: partnerName, status: "active", contact_email: `secret-${stamp}@pelham-test.com` })
    .select("id")
    .single();
  partnerId = partner!.id;
  await service.from("lounges").update({ partner_id: partnerId }).eq("id", LOUNGE);

  member = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const user = await signUpConfirmedMemberAndSignIn(member, `pelham-member-${stamp}@ensoleil-test.com`, "EnSoleil!2026");
  memberId = user.id;
  const { data: booking, error } = await service
    .from("bookings")
    .insert({ member_id: user.id, lounge_id: LOUNGE, date: today(), band: "morning", slot_time: "10:30 AM", status: "confirmed", special_requests: "" })
    .select("confirmation_code")
    .single();
  if (error) throw error;
  reference = booking.confirmation_code;
});

afterAll(async () => {
  await service.from("bookings").delete().eq("member_id", memberId);
  await service.from("lounges").update({ partner_id: originalPartner }).eq("id", LOUNGE);
  await service.from("partners").delete().eq("id", partnerId);
  await service.auth.admin.deleteUser(memberId);
});

describe("el nombre del partner llega al miembro", () => {
  it("en el catálogo de /explore", async () => {
    const lounges = await fetchLounges(member);

    expect(lounges.find((l) => l.id === LOUNGE)?.partnerName).toBe(partnerName);
  });

  it("en la ficha del lounge", async () => {
    const profile = await fetchLoungeProfile(member, LOUNGE);

    expect(profile?.partnerName).toBe(partnerName);
  });

  it("en el pase y en sus próximas reservas", async () => {
    const pass = await fetchDigitalPass(member, reference);
    const upcoming = await fetchUpcomingBookings(member);

    expect(pass?.partnerName).toBe(partnerName);
    expect(upcoming.find((b) => b.reference === reference)?.partnerName).toBe(partnerName);
  });
});

describe("la ficha del lounge", () => {
  it("muestra el partner bajo el nombre", async () => {
    await createClient().auth.signInWithPassword({ email: `pelham-member-${stamp}@ensoleil-test.com`, password: "EnSoleil!2026" });

    render(<LoungeProfilePage />);

    expect(await screen.findByText(partnerName)).toBeInTheDocument();
  });
});

describe("un lounge sin partner", () => {
  it("se muestra sin ese dato", async () => {
    const { data } = await service.from("lounges").select("partner_id").eq("id", WITHOUT_PARTNER).single();
    if (data?.partner_id) return; // en local el seed puede habérselo dado; en CI no tiene

    const profile = await fetchLoungeProfile(member, WITHOUT_PARTNER);

    expect(profile?.partnerName).toBeNull();
  });
});

describe("nada más del partner", () => {
  it("el miembro no lee su email de contacto ni sus usuarios", async () => {
    const { error } = await member.from("partners").select("contact_email").eq("id", partnerId);
    const { data: users } = await member.from("partner_members").select("email").eq("partner_id", partnerId);

    expect(error).not.toBeNull();
    expect(users).toEqual([]);
  });
});
