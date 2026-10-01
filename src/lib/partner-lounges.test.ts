import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TODAY } from "@/lib/availability";
import { loadPartnerContext, selectPartnerLounge } from "@/lib/partner-lounges";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

/**
 * Story 10.6 — el partner, el usuario y la elección de lounge del
 * dashboard. La elección se guarda en la cuenta (`partner_members`), no en
 * el navegador.
 */

const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const email = `switcher-${stamp}@halcyon-test.com`;
const password = "HalcyonFOH!24";
const partnerIds: string[] = [];
const loungeIds: string[] = [];
const userIds: string[] = [];
let session: SupabaseClient;
let towerA: string;
let towerB: string;

function isolatedClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}

async function lounge(partnerId: string, label: string, contentStatus = "live") {
  const id = `test-lounge-switcher-${label}-${stamp}`;
  const { error } = await service.from("lounges").insert({
    id,
    name: `Tower ${label} ${stamp}`,
    neighborhood: "Midtown East",
    city: "New York",
    city_id: "new-york",
    lat: 0,
    lng: 0,
    hours: "Open",
    content_status: contentStatus,
    partner_id: partnerId,
  });
  if (error) throw error;
  loungeIds.push(id);
  return id;
}

async function partner(name: string) {
  const { data, error } = await service.from("partners").insert({ name, status: "active" }).select("id").single();
  if (error) throw error;
  partnerIds.push(data.id);
  return data.id as string;
}

async function booking(loungeId: string, memberId: string) {
  const { error } = await service.from("bookings").insert({
    member_id: memberId,
    lounge_id: loungeId,
    date: TODAY,
    band: "morning",
    slot_time: "10:30 AM",
    status: "confirmed",
    special_requests: "",
  });
  if (error) throw error;
}

beforeAll(async () => {
  const halcyon = await partner(`Halcyon ${stamp}`);
  towerA = await lounge(halcyon, "a");
  towerB = await lounge(halcyon, "b", "draft");
  await service.from("partner_members").insert({ partner_id: halcyon, first_name: "Camille", last_name: "Duarte", email });

  session = isolatedClient();
  await signUpConfirmedAndSignIn(session, email, password);
  const {
    data: { user },
  } = await session.auth.getUser();
  userIds.push(user!.id);
  await service.from("user_roles").insert({ user_id: user!.id, role: "partner" });
  await service.from("partner_members").update({ user_id: user!.id }).eq("email", email);

  // Dos reservas en Tower A, una en Tower B.
  await booking(towerA, user!.id);
  await booking(towerA, user!.id);
  await booking(towerB, user!.id);
});

afterAll(async () => {
  await service.from("lounges").delete().in("id", loungeIds);
  await service.from("partners").delete().in("id", partnerIds);
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("el contexto del dashboard", () => {
  it("trae el partner y el usuario reales, y todos los lounges del partner", async () => {
    const context = await loadPartnerContext(session);

    expect(context?.partner.name).toBe(`Halcyon ${stamp}`);
    expect(context?.user).toEqual({ firstName: "Camille", lastName: "Duarte", suspended: false });
    expect(context?.lounges.map((l) => l.id).sort()).toEqual([towerA, towerB].sort());
  });

  it("sin elección guardada abre el primer lounge", async () => {
    const context = await loadPartnerContext(session);

    expect(context?.selectedLoungeId).toBe(context?.lounges[0].id);
    expect(context?.allLounges).toBe(false);
  });
});

describe("elegir lounge", () => {
  it("se guarda en la cuenta: otra sesión del mismo usuario abre ese lounge", async () => {
    await selectPartnerLounge(session, towerB);

    const otherDevice = isolatedClient();
    await otherDevice.auth.signInWithPassword({ email, password });
    const context = await loadPartnerContext(otherDevice);

    expect(context?.selectedLoungeId).toBe(towerB);
  });

  it("'All lounges' se guarda aparte y Today sigue teniendo un lounge concreto", async () => {
    await selectPartnerLounge(session, towerA);
    await selectPartnerLounge(session, null);

    const context = await loadPartnerContext(session);
    expect(context?.allLounges).toBe(true);
    expect(context?.selectedLoungeId).toBe(towerA);
  });

  it("no deja elegir el lounge de otro partner", async () => {
    const other = await partner(`Other ${stamp}`);
    const foreign = await lounge(other, "foreign");

    await expect(selectPartnerLounge(session, foreign)).rejects.toThrow(/not one of your lounges/i);
  });

  it("si el lounge guardado ya no es del partner, abre otro de sus lounges", async () => {
    await selectPartnerLounge(session, towerB);
    const other = await partner(`Moved ${stamp}`);
    await service.from("lounges").update({ partner_id: other }).eq("id", towerB);

    const context = await loadPartnerContext(session);
    await service.from("lounges").update({ partner_id: partnerIds[0] }).eq("id", towerB);

    expect(context?.selectedLoungeId).toBe(towerA);
  });
});

describe("la analítica por lounge o de todos", () => {
  it("un lounge cuenta solo sus reservas; sin lounge, las de todos", async () => {
    const { data: one } = await session.rpc("partner_analytics_summary", { p_from: TODAY, p_to: TODAY, p_lounge_id: towerA });
    const { data: all } = await session.rpc("partner_analytics_summary", { p_from: TODAY, p_to: TODAY, p_lounge_id: null });

    expect(one[0].bookings).toBe(2);
    expect(all[0].bookings).toBe(3);
  });

  it("un partner sin lounges tiene contexto, sin lounge elegido", async () => {
    const lonely = await partner(`Lonely ${stamp}`);
    const lonelyEmail = `lonely-${stamp}@halcyon-test.com`;
    await service.from("partner_members").insert({ partner_id: lonely, first_name: "Noor", last_name: "Haddad", email: lonelyEmail });
    const client = isolatedClient();
    await signUpConfirmedAndSignIn(client, lonelyEmail, password);
    const {
      data: { user },
    } = await client.auth.getUser();
    userIds.push(user!.id);
    await service.from("partner_members").update({ user_id: user!.id }).eq("email", lonelyEmail);

    const context = await loadPartnerContext(client);

    expect(context).toMatchObject({ partner: { name: `Lonely ${stamp}` }, lounges: [], selectedLoungeId: null });
  });
});
