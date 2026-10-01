import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import {
  addLoungePartner,
  createLoungeDraft,
  deleteLoungePartner,
  getLoungePartners,
  publishLounge,
  reactivateLoungePartner,
  resendPartnerInvite,
  suspendLoungePartner,
  unpublishLounge,
  updateLoungeDraft,
} from "./admin-content";
import type { LoungeDraftInput, PartnerInviteInput } from "./lounge-draft";

/**
 * Epic 8 · artboards 16–22 — el lounge nace con uno o varios partners (se
 * invitan al publicar) y, ya publicado, se gestionan sin despublicarlo:
 * añadir, suspender, reactivar, eliminar y reenviar la invitación. Edge
 * Functions `admin-publish-lounge` y `admin-lounge-partners` (necesitan
 * `supabase functions serve`).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = createSupabaseClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const supabase = createClient();
const stamp = Date.now();
const created: string[] = [];
const emails: string[] = [];
const afterCleanup: string[] = [];

function isolated(): SupabaseClient {
  return createSupabaseClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function partner(firstName = "Camille"): PartnerInviteInput {
  const email = `${firstName.toLowerCase()}-${stamp}-${emails.length}@thelarkspur-test.com`;
  emails.push(email);
  return { firstName, lastName: "Duarte", email, mobile: "+1 917 555 0163" };
}

function draftInput(overrides: Partial<LoungeDraftInput> = {}): LoungeDraftInput {
  return {
    name: `Test Lounge Partners ${stamp} ${created.length}`,
    phone: "+1 212 555 0148",
    email: "hello@thelarkspur.com",
    website: "thelarkspur.com",
    location: { address: "27 Bond Street", neighborhood: "NoHo", city: "New York", lat: 40.7262, lng: -73.9936 },
    weeklyHours: ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 6 PM"],
    amenities: ["wifi"],
    capacity: 24,
    bookingRestrictions: [],
    partners: [partner()],
    ...overrides,
  };
}

async function create(overrides: Partial<LoungeDraftInput> = {}) {
  const id = await createLoungeDraft(supabase, draftInput(overrides));
  created.push(id);
  return id;
}

async function userIdOf(email: string) {
  const { data } = await service.from("partners").select("user_id").eq("contact_email", email).maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}

async function contentStatus(id: string) {
  const { data } = await service.from("lounges").select("content_status").eq("id", id).single();
  return data?.content_status;
}

/** El partner acepta la invitación: queda activo con contraseña. */
async function activate(email: string, password = "Larkspur2026") {
  const { data } = await service.auth.admin.generateLink({ type: "invite", email });
  const client = isolated();
  await client.auth.verifyOtp({ type: "invite", token_hash: data.properties!.hashed_token });
  await client.auth.updateUser({ password });
}

async function canSignIn(email: string, password = "Larkspur2026") {
  const { error } = await isolated().auth.signInWithPassword({ email, password });
  return error === null;
}

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(supabase, `partners-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  for (const email of emails) {
    const userId = await userIdOf(email);
    if (userId) await service.auth.admin.deleteUser(userId);
  }
  for (const id of afterCleanup) await service.auth.admin.deleteUser(id);
  await service.from("lounges").delete().in("id", created);
});

describe("el borrador guarda varios partners", () => {
  it("los recuerda todos, pendientes de invitar al publicar", async () => {
    const first = partner("Camille");
    const second = partner("Julian");
    const id = await create({ partners: [first, second] });

    const partners = await getLoungePartners(supabase, id);

    expect(partners.map((p) => [p.email, p.status])).toEqual([
      [first.email, "on_publish"],
      [second.email, "on_publish"],
    ]);
  });

  it("editar el borrador sustituye los pendientes", async () => {
    const kept = partner("Camille");
    const id = await create({ partners: [kept, partner("Julian")] });

    await updateLoungeDraft(supabase, id, draftInput({ partners: [kept] }));

    expect((await getLoungePartners(supabase, id)).map((p) => p.email)).toEqual([kept.email]);
  });

  it("guardar no crea ninguna cuenta", async () => {
    const pending = partner();
    await create({ partners: [pending] });

    expect(await userIdOf(pending.email)).toBeNull();
  });

  it("guarda también las restricciones de reserva", async () => {
    const id = await create({ bookingRestrictions: ["Members only"] });

    const { data } = await service.from("lounges").select("booking_restrictions").eq("id", id).single();
    expect(data?.booking_restrictions).toEqual(["Members only"]);
  });
});

describe("un partner gestiona un solo lounge", () => {
  it("el email de un partner de otro lounge está en uso y el borrador no se guarda", async () => {
    const shared = partner("Camille");
    await publishLounge(supabase, await create({ partners: [shared] }));

    await expect(create({ partners: [{ ...shared }] })).rejects.toThrow(/already in use/i);
  });

  it("tampoco se puede repetir el de un partner pendiente en otro borrador", async () => {
    const shared = partner("Julian");
    await create({ partners: [shared] });

    await expect(create({ partners: [{ ...shared, email: shared.email.toUpperCase() }] })).rejects.toThrow(/already in use/i);
  });

  it("el email de una cuenta que no es de partner está en uso", async () => {
    const memberEmail = `member-${stamp}@ensoleil-test.com`;
    emails.push(memberEmail);
    const { data } = await service.auth.admin.createUser({ email: memberEmail, password: "EnSoleil!2026", email_confirm: true });
    afterCleanup.push(data.user!.id);

    await expect(create({ partners: [{ ...partner("Inés"), email: memberEmail }] })).rejects.toThrow(/already in use/i);
  });

  it("volver a guardar el mismo borrador con sus partners sí se puede", async () => {
    const own = partner("Rafael");
    const id = await create({ partners: [own] });

    await expect(updateLoungeDraft(supabase, id, draftInput({ partners: [own] }))).resolves.toBeUndefined();
  });

  it("añadir a un lounge live el partner de otro lounge se rechaza", async () => {
    const shared = partner("Noor");
    await publishLounge(supabase, await create({ partners: [shared] }));
    const live = await create({ partners: [partner("Camille")] });
    await publishLounge(supabase, live);

    await expect(addLoungePartner(supabase, live, { ...shared })).rejects.toThrow(/already in use/i);
  });

  it("la base no deja vincular un partner a un segundo lounge", async () => {
    const own = partner("Ines");
    const first = await create({ partners: [own] });
    await publishLounge(supabase, first);
    const second = await create({ partners: [partner("Julian")] });
    const { data } = await service.from("partners").select("id").eq("contact_email", own.email).single();

    const { error } = await service.from("partner_lounges").insert({ partner_id: data!.id, lounge_id: second });

    expect(error).not.toBeNull();
  });
});

describe("publicar invita a todos los partners", () => {
  it("crea una cuenta invitada por partner, vinculada al lounge", async () => {
    const first = partner("Camille");
    const second = partner("Julian");
    const id = await create({ partners: [first, second] });

    await publishLounge(supabase, id);

    expect(await contentStatus(id)).toBe("live");
    const partners = await getLoungePartners(supabase, id);
    expect(partners.map((p) => [p.email, p.status])).toEqual([
      [first.email, "invited"],
      [second.email, "invited"],
    ]);
  });

  it("sin partners no se puede publicar", async () => {
    const id = await create({ partners: [] });

    await expect(publishLounge(supabase, id)).rejects.toThrow(/partner/i);
    expect(await contentStatus(id)).toBe("draft");
  });

  it("la RPC de publicar no deja saltarse la invitación", async () => {
    const id = await create();

    const { error } = await supabase.rpc("admin_publish_lounge", { p_lounge_id: id });

    expect(error?.message).toMatch(/partner/i);
    expect(await contentStatus(id)).toBe("draft");
  });
});

describe("pasar un lounge live a draft", () => {
  it("vuelve a borrador y deja de verlo un miembro sin reserva, pero no su partner", async () => {
    const owner = partner("Camille");
    const id = await create({ partners: [owner] });
    await publishLounge(supabase, id);
    await activate(owner.email);

    await unpublishLounge(supabase, id);

    expect(await contentStatus(id)).toBe("draft");
    const member = isolated();
    const email = `unpublish-member-${stamp}@ensoleil-test.com`;
    await service.auth.admin.createUser({ email, password: "EnSoleil!2026", email_confirm: true });
    await member.auth.signInWithPassword({ email, password: "EnSoleil!2026" });
    expect((await member.from("lounges").select("id").eq("id", id)).data).toEqual([]);

    const partnerClient = isolated();
    await partnerClient.auth.signInWithPassword({ email: owner.email, password: "Larkspur2026" });
    expect((await partnerClient.from("lounges").select("id").eq("id", id)).data).toEqual([{ id }]);
  });

  it("un miembro con reserva sigue viendo el lounge de su pase", async () => {
    const id = await create();
    await publishLounge(supabase, id);
    const member = isolated();
    const email = `booked-member-${stamp}@ensoleil-test.com`;
    const { data: user } = await service.auth.admin.createUser({ email, password: "EnSoleil!2026", email_confirm: true });
    await service.from("bookings").insert({ member_id: user.user!.id, lounge_id: id, date: "2026-10-02", slot_time: "8:00 AM", band: "morning", status: "confirmed" });
    await member.auth.signInWithPassword({ email, password: "EnSoleil!2026" });

    await unpublishLounge(supabase, id);

    expect((await member.from("lounges").select("id").eq("id", id)).data).toEqual([{ id }]);
  });

  it("solo un lounge live se puede pasar a draft", async () => {
    const id = await create();

    await expect(unpublishLounge(supabase, id)).rejects.toThrow(/live/i);
  });
});

describe("gestionar los partners de un lounge live", () => {
  async function liveLounge(...partners: PartnerInviteInput[]) {
    const id = await create({ partners });
    await publishLounge(supabase, id);
    return id;
  }

  async function statusOf(id: string, email: string) {
    return (await getLoungePartners(supabase, id)).find((p) => p.email === email)?.status;
  }

  it("añadir un partner lo invita al momento, sin despublicar", async () => {
    const id = await liveLounge(partner("Camille"));
    const added = partner("Rafael");

    await addLoungePartner(supabase, id, added);

    expect(await contentStatus(id)).toBe("live");
    expect(await statusOf(id, added.email)).toBe("invited");
  });

  it("aceptada la invitación, el partner queda activo y ya no se le reenvía", async () => {
    const owner = partner("Camille");
    const id = await liveLounge(owner);
    await activate(owner.email);

    expect(await statusOf(id, owner.email)).toBe("active");
    await expect(resendPartnerInvite(supabase, id, (await userIdOf(owner.email))!)).rejects.toThrow(/already/i);
  });

  it("a un partner invitado se le puede reenviar la invitación", async () => {
    const owner = partner("Camille");
    const id = await liveLounge(owner);

    await expect(resendPartnerInvite(supabase, id, (await userIdOf(owner.email))!)).resolves.toBeUndefined();
  });

  it("suspender impide entrar; reactivar lo devuelve", async () => {
    const owner = partner("Camille");
    const other = partner("Julian");
    const id = await liveLounge(owner, other);
    await activate(other.email);
    const userId = (await userIdOf(other.email))!;

    await suspendLoungePartner(supabase, id, userId);
    expect(await statusOf(id, other.email)).toBe("suspended");
    expect(await canSignIn(other.email)).toBe(false);

    await reactivateLoungePartner(supabase, id, userId);
    expect(await statusOf(id, other.email)).toBe("active");
    expect(await canSignIn(other.email)).toBe(true);
  });

  it("no se puede suspender ni eliminar al último partner activo de un lounge live", async () => {
    const owner = partner("Camille");
    const id = await liveLounge(owner);
    const userId = (await userIdOf(owner.email))!;

    await expect(suspendLoungePartner(supabase, id, userId)).rejects.toThrow(/last/i);
    await expect(deleteLoungePartner(supabase, id, userId)).rejects.toThrow(/last/i);
  });

  it("eliminar borra la cuenta y lo quita de la lista", async () => {
    const owner = partner("Camille");
    const other = partner("Julian");
    const id = await liveLounge(owner, other);
    const userId = (await userIdOf(other.email))!;

    await deleteLoungePartner(supabase, id, userId);

    expect(await userIdOf(other.email)).toBeNull();
    expect((await getLoungePartners(supabase, id)).map((p) => p.email)).toEqual([owner.email]);
  });

  it("un miembro no puede gestionar partners", async () => {
    const id = await liveLounge(partner("Camille"));
    const member = isolated();
    const email = `partners-member-${stamp}@ensoleil-test.com`;
    await service.auth.admin.createUser({ email, password: "EnSoleil!2026", email_confirm: true });
    await member.auth.signInWithPassword({ email, password: "EnSoleil!2026" });

    await expect(addLoungePartner(member, id, partner("Rafael"))).rejects.toThrow(/not authorized/i);
  });
});
