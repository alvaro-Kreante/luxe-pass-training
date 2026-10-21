import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { signUpConfirmedAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

/**
 * Story 10.1 — un partner es una organización (hotel, spa, club…) con varios
 * lounges y varios usuarios. Corre contra Supabase local: lo que se prueba
 * son las reglas del servidor (tablas, RLS, triggers), no la interfaz.
 */

const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function isolatedClient(): SupabaseClient {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const userIds: string[] = [];
const partnerIds: string[] = [];
const loungeIds: string[] = [];

async function createPartner(name: string, status: "draft" | "active" | "suspended" = "active") {
  const { data, error } = await service
    .from("partners")
    .insert({ name, contact_email: `hello-${stamp}@example.com`, city: "New York", status })
    .select("id, status, representative_id")
    .single();
  if (error) throw error;
  partnerIds.push(data.id);
  return data;
}

async function createLounge(label: string, partnerId: string | null, contentStatus: "live" | "draft" = "draft") {
  const id = `test-partner-org-${label}-${stamp}`;
  const { error } = await service.from("lounges").insert({
    id,
    name: `Partner Org ${label}`,
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    content_status: contentStatus,
    partner_id: partnerId,
  });
  if (error) throw error;
  loungeIds.push(id);
  return id;
}

async function addMember(partnerId: string, label: string, userId: string | null = null) {
  const { data, error } = await service
    .from("partner_members")
    .insert({
      partner_id: partnerId,
      user_id: userId,
      first_name: "Test",
      last_name: label,
      email: `${label}-${stamp}@partner-test.example`,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Un usuario partner con sesión: cuenta de Auth + rol + fila en `partner_members`. */
async function signInAsMemberOf(partnerId: string, label: string) {
  const client = isolatedClient();
  await signUpConfirmedAndSignIn(client, `${label}-${stamp}@partner-test.example`, "PartnerOrg!24");
  const {
    data: { user },
  } = await client.auth.getUser();
  userIds.push(user!.id);
  await service.from("user_roles").insert({ user_id: user!.id, role: "partner" });
  const { error } = await service
    .from("partner_members")
    .update({ user_id: user!.id })
    .eq("email", `${label}-${stamp}@partner-test.example`);
  if (error) throw error;
  return { client, userId: user!.id };
}

afterAll(async () => {
  if (loungeIds.length) await service.from("lounges").delete().in("id", loungeIds);
  for (const id of partnerIds) await service.from("partners").delete().eq("id", id);
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("a partner is an organization", () => {
  it("is born as a draft", async () => {
    const { data, error } = await service
      .from("partners")
      .insert({ name: `Draft by default ${stamp}`, contact_email: "hello@example.com" })
      .select("id, status")
      .single();
    if (error) throw error;
    partnerIds.push(data.id);

    expect(data.status).toBe("draft");
  });

  it("rejects a status other than draft, active or suspended", async () => {
    const { error } = await service.from("partners").insert({ name: `Bad status ${stamp}`, status: "archived" });

    expect(error).not.toBeNull();
  });

  it("owns several lounges, each lounge with at most one partner", async () => {
    const partner = await createPartner(`Halcyon ${stamp}`);
    const towerA = await createLounge("tower-a", partner.id);
    const towerB = await createLounge("tower-b", partner.id);

    const { data } = await service.from("lounges").select("id").eq("partner_id", partner.id).order("id");

    expect(data!.map((row) => row.id)).toEqual([towerA, towerB].sort());
  });

  it("can have a lounge without a partner while it is a draft", async () => {
    const loungeId = await createLounge("no-partner", null);

    const { data } = await service.from("lounges").select("partner_id").eq("id", loungeId).single();

    expect(data!.partner_id).toBeNull();
  });
});

describe("partner users", () => {
  it("can be added before they have an account", async () => {
    const partner = await createPartner(`No accounts yet ${stamp}`, "draft");

    const memberId = await addMember(partner.id, "no-account-yet");

    expect(memberId).toBeTruthy();
  });

  it("each belong to a single partner", async () => {
    const first = await createPartner(`First ${stamp}`);
    const second = await createPartner(`Second ${stamp}`);
    await addMember(first.id, "only-one-partner");
    const { userId } = await signInAsMemberOf(first.id, "only-one-partner");

    const { error } = await service
      .from("partner_members")
      .insert({ partner_id: second.id, user_id: userId, first_name: "Test", last_name: "Twice", email: `twice-${stamp}@partner-test.example` });

    expect(error).not.toBeNull();
  });

  it("refuses an email already used by another partner user", async () => {
    const first = await createPartner(`Email first ${stamp}`);
    const second = await createPartner(`Email second ${stamp}`);
    await addMember(first.id, "same-email");

    const { error } = await service.from("partner_members").insert({
      partner_id: second.id,
      first_name: "Test",
      last_name: "Same",
      email: `SAME-EMAIL-${stamp}@partner-test.example`,
    });

    expect(error).not.toBeNull();
  });

  it("refuses an email that already belongs to any account, member or admin", async () => {
    const partner = await createPartner(`Taken email ${stamp}`);
    const member = isolatedClient();
    const memberEmail = `existing-member-${stamp}@ensoleil-test.example`;
    const user = await signUpConfirmedMemberAndSignIn(member, memberEmail, "EnSoleil!2026");
    userIds.push(user.id);

    const { error } = await service
      .from("partner_members")
      .insert({ partner_id: partner.id, first_name: "Test", last_name: "Taken", email: memberEmail });

    expect(error?.message).toMatch(/already in use/i);
  });
});

describe("the representative", () => {
  it("is the first user added to the partner", async () => {
    const partner = await createPartner(`Rep first ${stamp}`, "draft");
    const firstId = await addMember(partner.id, "rep-first");
    await addMember(partner.id, "rep-second");

    const { data } = await service.from("partners").select("representative_id").eq("id", partner.id).single();

    expect(data!.representative_id).toBe(firstId);
  });

  it("can be handed to another user of the same partner", async () => {
    const partner = await createPartner(`Rep handover ${stamp}`, "draft");
    await addMember(partner.id, "handover-first");
    const secondId = await addMember(partner.id, "handover-second");

    const { error } = await service.from("partners").update({ representative_id: secondId }).eq("id", partner.id);

    expect(error).toBeNull();
  });

  it("can't be a user of another partner", async () => {
    const partner = await createPartner(`Rep own ${stamp}`, "draft");
    await addMember(partner.id, "rep-own");
    const other = await createPartner(`Rep other ${stamp}`, "draft");
    const outsiderId = await addMember(other.id, "rep-outsider");

    const { error } = await service.from("partners").update({ representative_id: outsiderId }).eq("id", partner.id);

    expect(error).not.toBeNull();
  });

  it("can't be deleted while other users remain", async () => {
    const partner = await createPartner(`Rep delete ${stamp}`, "draft");
    const repId = await addMember(partner.id, "rep-delete-first");
    await addMember(partner.id, "rep-delete-second");

    const { error } = await service.from("partner_members").delete().eq("id", repId);

    expect(error?.message).toMatch(/new representative/i);
  });

  it("can be deleted when it is the only user, leaving the partner without one", async () => {
    const partner = await createPartner(`Rep alone ${stamp}`, "draft");
    const repId = await addMember(partner.id, "rep-alone");

    const { error } = await service.from("partner_members").delete().eq("id", repId);
    const { data } = await service.from("partners").select("representative_id").eq("id", partner.id).single();

    expect(error).toBeNull();
    expect(data!.representative_id).toBeNull();
  });
});

describe("what a partner user can see", () => {
  let halcyon: string;
  let otherPartner: string;
  let ownLounges: string[];
  let foreignLounge: string;
  let session: SupabaseClient;

  beforeAll(async () => {
    halcyon = (await createPartner(`Sees all ${stamp}`)).id;
    otherPartner = (await createPartner(`Sees none ${stamp}`)).id;
    ownLounges = [await createLounge("own-live", halcyon, "live"), await createLounge("own-draft", halcyon, "draft")];
    foreignLounge = await createLounge("foreign", otherPartner, "draft");
    await addMember(halcyon, "sees-all");
    session = (await signInAsMemberOf(halcyon, "sees-all")).client;
  });

  it("sees every lounge of its partner, drafts included", async () => {
    const { data } = await session.rpc("partner_lounge_ids");

    expect([...(data as string[])].sort()).toEqual([...ownLounges].sort());
  });

  it("doesn't see the lounges of another partner", async () => {
    const { data } = await session.from("lounges").select("id").eq("id", foreignLounge);

    expect(data).toEqual([]);
  });

  it("can't change anything in a lounge — that is the admin's job", async () => {
    await session.from("lounges").update({ name: "Renamed by partner" }).eq("id", ownLounges[0]);

    const { data } = await service.from("lounges").select("name").eq("id", ownLounges[0]).single();
    expect(data!.name).toBe("Partner Org own-live");
  });

  it("loses every lounge while the partner is suspended", async () => {
    const suspended = (await createPartner(`Suspended ${stamp}`, "active")).id;
    await createLounge("suspended-own", suspended, "live");
    await addMember(suspended, "suspended-user");
    const { client } = await signInAsMemberOf(suspended, "suspended-user");
    await service.from("partners").update({ status: "suspended" }).eq("id", suspended);

    const { data } = await client.rpc("partner_lounge_ids");

    expect(data).toEqual([]);
  });

  it("loses every lounge while the user is suspended", async () => {
    const partner = (await createPartner(`User suspended ${stamp}`, "active")).id;
    await createLounge("user-suspended-own", partner, "live");
    await addMember(partner, "user-suspended");
    const { client, userId } = await signInAsMemberOf(partner, "user-suspended");
    await service.from("partner_members").update({ suspended_at: new Date().toISOString() }).eq("user_id", userId);

    const { data } = await client.rpc("partner_lounge_ids");

    expect(data).toEqual([]);
  });

  it("can correct its own name but not its email", async () => {
    const { error: nameError } = await session.from("partner_members").update({ first_name: "Renamed" }).eq("email", `sees-all-${stamp}@partner-test.example`);
    const { error: emailError } = await session.from("partner_members").update({ email: `hijack-${stamp}@partner-test.example` }).eq("email", `sees-all-${stamp}@partner-test.example`);

    expect(nameError).toBeNull();
    expect(emailError).not.toBeNull();
  });
});

describe("what a member can see", () => {
  let member: SupabaseClient;
  let partnerId: string;
  let liveLounge: string;

  beforeAll(async () => {
    partnerId = (await createPartner(`Visible name ${stamp}`)).id;
    liveLounge = await createLounge("member-visible", partnerId, "live");
    await addMember(partnerId, "member-cant-see");
    member = isolatedClient();
    const user = await signUpConfirmedMemberAndSignIn(member, `partner-org-member-${stamp}@ensoleil-test.example`, "EnSoleil!2026");
    userIds.push(user.id);
  });

  it("reads the name of the partner behind a live lounge", async () => {
    const { data, error } = await member.from("lounges").select("id, partners(name)").eq("id", liveLounge).single();

    expect(error).toBeNull();
    expect((data!.partners as unknown as { name: string }).name).toBe(`Visible name ${stamp}`);
  });

  it("can't read the partner's contact email", async () => {
    const { error } = await member.from("partners").select("contact_email").eq("id", partnerId);

    expect(error).not.toBeNull();
  });

  it("can't read the partner's users", async () => {
    const { data } = await member.from("partner_members").select("email").eq("partner_id", partnerId);

    expect(data).toEqual([]);
  });
});
