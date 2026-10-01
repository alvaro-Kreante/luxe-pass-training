import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { TODAY } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import PartnerAnalyticsPage from "./analytics/page";
import PartnerTodayPage from "./page";

/**
 * Story 10.6 — el selector de lounge de la cabecera de /partner
 * (PartnerToday 13, PartnerLoungeMenu 14, PartnerAnalyticsAll 15,
 * PartnerNoLounges 16 · Fase 10). Un partner propio con dos lounges y un
 * invitado distinto en cada uno.
 */

const pathname = vi.hoisted(() => ({ current: "/partner" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const service = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = `${Date.now()}`;
const partnerIds: string[] = [];
const loungeIds: string[] = [];
const userIds: string[] = [];
const towerA = `test-lounge-switch-ui-a-${stamp}`;
const towerB = `test-lounge-switch-ui-b-${stamp}`;
const partnerName = `Halcyon Switch ${stamp}`;
const partnerEmail = `switch-ui-${stamp}@halcyon-test.com`;

async function lounge(id: string, name: string, partnerId: string) {
  await service.from("lounges").insert({ id, name, neighborhood: "Midtown East", city: "New York", city_id: "new-york", lat: 0, lng: 0, hours: "Open", partner_id: partnerId });
  loungeIds.push(id);
}

async function guestAt(loungeId: string, name: string) {
  const client = createClient();
  const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${stamp}@ensoleil-test.com`;
  const user = await signUpConfirmedMemberAndSignIn(client, email, "EnSoleil!2026", { fullName: name });
  userIds.push(user.id);
  await client.auth.signOut();
  await service.from("bookings").insert({ member_id: user.id, lounge_id: loungeId, date: TODAY, band: "morning", slot_time: "10:30 AM", status: "confirmed", special_requests: "" });
}

/** Un usuario partner con sesión en el cliente de la app. */
async function signInPartnerUser(partnerId: string, email: string, first: string) {
  await service.from("partner_members").insert({ partner_id: partnerId, first_name: first, last_name: "Duarte", email });
  await signUpConfirmedAndSignIn(createClient(), email, "HalcyonFOH!24");
  const {
    data: { user },
  } = await createClient().auth.getUser();
  userIds.push(user!.id);
  await service.from("user_roles").insert({ user_id: user!.id, role: "partner" });
  await service.from("partner_members").update({ user_id: user!.id }).eq("email", email);
}

async function selection() {
  const { data } = await service.from("partner_members").select("selected_lounge_id, all_lounges").eq("email", partnerEmail).single();
  return data;
}

beforeAll(async () => {
  const { data: partner } = await service.from("partners").insert({ name: partnerName, status: "active" }).select("id").single();
  partnerIds.push(partner!.id);
  await lounge(towerA, `Tower A ${stamp}`, partner!.id);
  await lounge(towerB, `Tower B ${stamp}`, partner!.id);
  await guestAt(towerA, `Alpha Guest ${stamp}`);
  await guestAt(towerB, `Beta Guest ${stamp}`);
  await signInPartnerUser(partner!.id, partnerEmail, "Camille");
});

afterAll(async () => {
  await service.from("lounges").delete().in("id", loungeIds);
  await service.from("partners").delete().in("id", partnerIds);
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("la cabecera de /partner", () => {
  it("muestra el partner y el usuario reales", async () => {
    pathname.current = "/partner";
    render(<PartnerTodayPage />);

    expect(await screen.findByText("Camille Duarte")).toBeInTheDocument();
    expect(screen.getAllByText(partnerName).length).toBeGreaterThan(0);
    expect(screen.queryByText("The Ainsworth")).toBeNull();
  });

  it("el desplegable lista los lounges del partner; en Today no hay 'All lounges' ni se cambia de partner", async () => {
    const user = userEvent.setup({ delay: null });
    pathname.current = "/partner";
    render(<PartnerTodayPage />);

    await user.click(await screen.findByRole("button", { name: /^Lounge:/ }));

    const menu = await screen.findByRole("menu", { name: "Lounges" });
    expect(within(menu).getByRole("menuitemradio", { name: new RegExp(`Tower A ${stamp}`) })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitemradio", { name: new RegExp(`Tower B ${stamp}`) })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitemradio", { name: /All lounges/ })).toBeNull();
  });
});

describe("cambiar de lounge", () => {
  it("Today pasa a la lista del lounge elegido y la elección queda guardada en la cuenta", async () => {
    const user = userEvent.setup({ delay: null });
    pathname.current = "/partner";
    render(<PartnerTodayPage />);
    await screen.findByText(`Alpha Guest ${stamp}`);

    await user.click(screen.getByRole("button", { name: /^Lounge:/ }));
    await user.click(await screen.findByRole("menuitemradio", { name: new RegExp(`Tower B ${stamp}`) }));

    expect(await screen.findByText(`Beta Guest ${stamp}`)).toBeInTheDocument();
    expect(screen.queryByText(`Alpha Guest ${stamp}`)).toBeNull();
    await waitFor(async () => expect(await selection()).toMatchObject({ selected_lounge_id: towerB, all_lounges: false }));
  });

  it("Analytics ofrece 'All lounges' y lo guarda aparte", async () => {
    const user = userEvent.setup({ delay: null });
    pathname.current = "/partner/analytics";
    render(<PartnerAnalyticsPage />);

    await user.click(await screen.findByRole("button", { name: /^Lounge:/ }));
    await user.click(await screen.findByRole("menuitemradio", { name: /All lounges/ }));

    await waitFor(async () => expect((await selection())?.all_lounges).toBe(true));
    expect(await screen.findByRole("button", { name: "Lounge: All lounges" })).toBeInTheDocument();
  });
});

describe("un partner sin lounges", () => {
  it("ve un estado vacío en lugar de un error", async () => {
    const { data: lonely } = await service.from("partners").insert({ name: `Lonely ${stamp}`, status: "active" }).select("id").single();
    partnerIds.push(lonely!.id);
    await signInPartnerUser(lonely!.id, `lonely-ui-${stamp}@halcyon-test.com`, "Noor");
    pathname.current = "/partner";
    render(<PartnerTodayPage />);

    expect(await screen.findByRole("heading", { name: "No lounges yet" })).toBeInTheDocument();
  });
});
