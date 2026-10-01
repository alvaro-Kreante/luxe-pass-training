import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  activatePartner,
  addPartnerMember,
  createPartnerDraft,
  deletePartnerMember,
  getAdminPartner,
  reactivateLounge,
  reactivatePartner,
  reactivatePartnerMember,
  resendPartnerMemberInvite,
  suspendLounge,
  suspendPartner,
  suspendPartnerMember,
  type PartnerMemberInput,
} from "@/lib/admin-partners";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

/**
 * Story 10.4 — activar, suspender y gestionar el acceso de un partner. Las
 * cuentas de Auth las crea y banea la Edge Function `admin-partners`
 * (necesita `supabase functions serve`); el estado de partner y lounges, las
 * RPC de `admin_partners.sql`. Los emails van a dominios `*-test.com`, que
 * Brevo nunca recibe en local (`_shared/test-recipient.ts`).
 */

const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const partnerIds: string[] = [];
const loungeIds: string[] = [];
let admin: SupabaseClient;
let emails = 0;

function isolatedClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}

function person(first: string): PartnerMemberInput {
  emails += 1;
  return { firstName: first, lastName: "Duarte", email: `${first.toLowerCase()}-${stamp}-${emails}@halcyon-test.com`, mobile: "" };
}

async function draft(users: PartnerMemberInput[] = []) {
  const id = await createPartnerDraft(
    admin,
    { name: `Access ${stamp} ${partnerIds.length}`, contactEmail: "", addressLine1: "", addressLine2: "", city: "New York", region: "", postalCode: "", country: "" },
    users,
  );
  partnerIds.push(id);
  return id;
}

async function lounge(partnerId: string, label: string, contentStatus: "live" | "draft") {
  const id = `test-lounge-access-${label}-${stamp}-${loungeIds.length}`;
  const { error } = await service.from("lounges").insert({
    id,
    name: `Access ${label}`,
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

async function statusOf(loungeId: string) {
  const { data } = await service.from("lounges").select("content_status").eq("id", loungeId).single();
  return data?.content_status;
}

async function accountOf(email: string) {
  const { data } = await service.from("partner_members").select("user_id").eq("email", email).single();
  if (!data?.user_id) return null;
  const { data: user } = await service.auth.admin.getUserById(data.user_id);
  return user.user;
}

/** Simula que el usuario ya creó su contraseña desde el enlace. */
async function acceptInvite(email: string) {
  const account = await accountOf(email);
  await service.auth.admin.updateUserById(account!.id, { email_confirm: true, password: "Halcyon2026" });
}

function isBanned(account: { banned_until?: string | null } | null) {
  return Boolean(account?.banned_until && new Date(account.banned_until) > new Date());
}

beforeAll(async () => {
  admin = isolatedClient();
  await signUpConfirmedAdminAndSignIn(admin, `access-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  for (const id of partnerIds) {
    const { data } = await service.from("partner_members").select("user_id").eq("partner_id", id);
    for (const row of data ?? []) if (row.user_id) await service.auth.admin.deleteUser(row.user_id);
  }
  if (loungeIds.length) await service.from("lounges").delete().in("id", loungeIds);
  if (partnerIds.length) await service.from("partners").delete().in("id", partnerIds);
});

describe("activar un partner", () => {
  it("sin usuarios no se puede activar", async () => {
    const id = await draft();

    await expect(activatePartner(admin, id)).rejects.toThrow(/at least one user/i);
    expect((await getAdminPartner(admin, id))?.status).toBe("draft");
  });

  it("crea la cuenta de cada usuario, con su invitación pendiente, y deja el partner activo", async () => {
    const camille = person("Camille");
    const julian = person("Julian");
    const id = await draft([camille, julian]);

    await activatePartner(admin, id);

    const partner = await getAdminPartner(admin, id);
    expect(partner?.status).toBe("active");
    expect(partner?.users.map((u) => u.status)).toEqual(["invited", "invited"]);
    const account = await accountOf(camille.email);
    expect(account?.email).toBe(camille.email);
    const { data: role } = await service.from("user_roles").select("role").eq("user_id", account!.id).single();
    expect(role?.role).toBe("partner");
  });

  it("un usuario añadido a un partner ya activo recibe la invitación al momento", async () => {
    const id = await draft([person("Camille")]);
    await activatePartner(admin, id);
    const noor = person("Noor");

    await addPartnerMember(admin, id, noor);

    const partner = await getAdminPartner(admin, id);
    expect(partner?.users.find((u) => u.firstName === "Noor")?.status).toBe("invited");
    expect(await accountOf(noor.email)).not.toBeNull();
  });

  it("un miembro no puede activar partners", async () => {
    const id = await draft([person("Camille")]);
    const member = isolatedClient();
    await signUpConfirmedMemberAndSignIn(member, `access-member-${stamp}@ensoleil-test.com`, "EnSoleil!2026");

    await expect(activatePartner(member, id)).rejects.toThrow(/Not authorized/i);
  });
});

describe("el acceso de cada usuario", () => {
  async function activeWith(...people: PartnerMemberInput[]) {
    const id = await draft(people);
    await activatePartner(admin, id);
    const partner = await getAdminPartner(admin, id);
    return { id, users: partner!.users };
  }

  it("se reenvía la invitación a quien aún no creó su contraseña", async () => {
    const { users } = await activeWith(person("Camille"));

    await expect(resendPartnerMemberInvite(admin, users[0].id)).resolves.toBeUndefined();
  });

  it("no se reenvía a quien ya creó su contraseña", async () => {
    const camille = person("Camille");
    const { users } = await activeWith(camille);
    await acceptInvite(camille.email);

    await expect(resendPartnerMemberInvite(admin, users[0].id)).rejects.toThrow(/already set a password/i);
  });

  it("suspender bloquea la cuenta y reactivar la desbloquea — también al representante", async () => {
    const camille = person("Camille");
    const { id, users } = await activeWith(camille);

    await suspendPartnerMember(admin, users[0].id);
    expect((await getAdminPartner(admin, id))?.users[0].status).toBe("suspended");
    expect(isBanned(await accountOf(camille.email))).toBe(true);

    await reactivatePartnerMember(admin, users[0].id);
    expect((await getAdminPartner(admin, id))?.users[0].status).toBe("invited");
    expect(isBanned(await accountOf(camille.email))).toBe(false);
  });

  it("borrar a un usuario con cuenta borra también su cuenta", async () => {
    const julian = person("Julian");
    const { id, users } = await activeWith(person("Camille"), julian);
    const account = await accountOf(julian.email);

    await deletePartnerMember(admin, users[1].id);

    expect((await getAdminPartner(admin, id))?.users.map((u) => u.firstName)).toEqual(["Camille"]);
    const { data } = await service.auth.admin.getUserById(account!.id);
    expect(data.user).toBeNull();
  });

  it("al representante no se le borra mientras queden otros", async () => {
    const camille = person("Camille");
    const { users } = await activeWith(camille, person("Julian"));

    await expect(deletePartnerMember(admin, users[0].id)).rejects.toThrow(/new representative/i);
    expect(await accountOf(camille.email)).not.toBeNull();
  });

  it("un partner activo puede quedarse sin usuarios", async () => {
    const { id, users } = await activeWith(person("Camille"));

    await deletePartnerMember(admin, users[0].id);

    const partner = await getAdminPartner(admin, id);
    expect(partner).toMatchObject({ status: "active", users: [] });
  });
});

describe("suspender y reactivar el partner", () => {
  it("suspenderlo suspende sus lounges publicados, deja los borradores y bloquea a sus usuarios", async () => {
    const camille = person("Camille");
    const id = await draft([camille]);
    await activatePartner(admin, id);
    const live = await lounge(id, "live", "live");
    const drafted = await lounge(id, "draft", "draft");

    await suspendPartner(admin, id);

    expect((await getAdminPartner(admin, id))?.status).toBe("suspended");
    expect(await statusOf(live)).toBe("suspended");
    expect(await statusOf(drafted)).toBe("draft");
    expect(isBanned(await accountOf(camille.email))).toBe(true);
  });

  it("reactivarlo: lo que era live vuelve a draft, lo suspendido a mano sigue suspendido y el draft sigue en draft", async () => {
    const camille = person("Camille");
    const julian = person("Julian");
    const id = await draft([camille, julian]);
    await activatePartner(admin, id);
    const wasLive = await lounge(id, "was-live", "live");
    const byAdmin = await lounge(id, "by-admin", "live");
    const drafted = await lounge(id, "stays-draft", "draft");
    await suspendLounge(admin, byAdmin);
    const users = (await getAdminPartner(admin, id))!.users;
    await suspendPartnerMember(admin, users[1].id);
    await suspendPartner(admin, id);

    await reactivatePartner(admin, id);

    expect((await getAdminPartner(admin, id))?.status).toBe("active");
    expect(await statusOf(wasLive)).toBe("draft");
    expect(await statusOf(byAdmin)).toBe("suspended");
    expect(await statusOf(drafted)).toBe("draft");
    expect(isBanned(await accountOf(camille.email))).toBe(false);
    expect(isBanned(await accountOf(julian.email))).toBe(true);
  });

  it("solo se suspende un partner activo y solo se reactiva uno suspendido", async () => {
    const id = await draft([person("Camille")]);

    await expect(suspendPartner(admin, id)).rejects.toThrow(/only an active partner/i);
    await expect(reactivatePartner(admin, id)).rejects.toThrow(/only a suspended partner/i);
  });
});

describe("suspender un lounge suelto", () => {
  it("lo saca del catálogo y no acepta reservas; reactivarlo lo devuelve a draft", async () => {
    const id = await draft([person("Camille")]);
    await activatePartner(admin, id);
    const loungeId = await lounge(id, "single", "live");
    const member = isolatedClient();
    await signUpConfirmedMemberAndSignIn(member, `access-booker-${stamp}@ensoleil-test.com`, "EnSoleil!2026", { membership: "annual" });

    await suspendLounge(admin, loungeId);

    expect(await statusOf(loungeId)).toBe("suspended");
    const { data: visible } = await member.from("lounges").select("id").eq("id", loungeId);
    expect(visible).toEqual([]);
    const { error } = await member.rpc("confirm_booking", {
      p_lounge_id: loungeId,
      p_date: "2025-09-12",
      p_band: "morning",
      p_slot_time: "10:30 AM",
    });
    expect(error?.message).toMatch(/not taking bookings/i);

    await reactivateLounge(admin, loungeId);
    expect(await statusOf(loungeId)).toBe("draft");
  });

  it("un lounge suspendido por su partner no se reactiva suelto", async () => {
    const id = await draft([person("Camille")]);
    await activatePartner(admin, id);
    const loungeId = await lounge(id, "by-partner", "live");
    await suspendPartner(admin, id);

    await expect(reactivateLounge(admin, loungeId)).rejects.toThrow(/reactivate the partner/i);
  });
});
