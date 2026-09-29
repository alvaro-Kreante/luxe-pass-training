import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import { createLoungeDraft, getLoungePartnerInvite, publishLounge, updateLoungeDraft } from "./admin-content";
import type { LoungeDraftInput, PartnerInviteInput } from "./lounge-draft";

/**
 * Epic 8 · artboard 16 "Add a lounge with its partner" — el lounge nace con
 * la persona que lo gestiona. Guardar el borrador solo recuerda sus datos;
 * publicar crea la cuenta de partner y le envía la invitación (Edge Function
 * `admin-publish-lounge`, necesita `supabase functions serve`).
 */

const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const supabase = createClient();
const stamp = Date.now();
const created: string[] = [];
const invitedEmails: string[] = [];

function partnerInput(overrides: Partial<PartnerInviteInput> = {}): PartnerInviteInput {
  const email = `camille-${stamp}-${created.length}-${Math.random().toString(36).slice(2, 6)}@thelarkspur-test.com`;
  invitedEmails.push(email);
  return { firstName: "Camille", lastName: "Duarte", email, mobile: "+1 917 555 0163", ...overrides };
}

function draftInput(overrides: Partial<LoungeDraftInput> = {}): LoungeDraftInput {
  return {
    name: `Larkspur Partner ${stamp} ${created.length}`,
    phone: "+1 212 555 0148",
    email: "hello@thelarkspur.com",
    website: "thelarkspur.com",
    location: { address: "27 Bond Street", neighborhood: "NoHo", city: "New York", lat: 40.7262, lng: -73.9936 },
    weeklyHours: ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 6 PM"],
    amenities: ["wifi"],
    capacity: 24,
    partner: partnerInput(),
    ...overrides,
  };
}

async function create(overrides: Partial<LoungeDraftInput> = {}) {
  const id = await createLoungeDraft(supabase, draftInput(overrides));
  created.push(id);
  return id;
}

async function partnerAccountFor(email: string) {
  const { data } = await service
    .from("partners")
    .select("id, user_id, first_name, last_name, contact_email, contact_phone, business_name, partner_lounges(lounge_id)")
    .eq("contact_email", email)
    .maybeSingle();
  return data;
}

async function contentStatus(id: string) {
  const { data } = await service.from("lounges").select("content_status").eq("id", id).single();
  return data?.content_status;
}

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(supabase, `partner-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  for (const email of invitedEmails) {
    const account = await partnerAccountFor(email);
    if (account) await service.auth.admin.deleteUser(account.user_id);
  }
  await service.from("lounges").delete().in("id", created);
});

describe("el borrador recuerda al partner", () => {
  it("guarda nombre, apellido, email y móvil junto al lounge", async () => {
    const partner = partnerInput();
    const id = await create({ partner });

    expect(await getLoungePartnerInvite(supabase, id)).toEqual(partner);
  });

  it("editar el borrador actualiza los datos del partner", async () => {
    const id = await create();
    const partner = partnerInput({ firstName: "Camila" });

    await updateLoungeDraft(supabase, id, draftInput({ partner }));

    expect(await getLoungePartnerInvite(supabase, id)).toEqual(partner);
  });

  it("guardar un borrador no crea ninguna cuenta ni invita a nadie", async () => {
    const partner = partnerInput();
    await create({ partner });

    expect(await partnerAccountFor(partner.email)).toBeNull();
  });

  it("un miembro no puede leer los datos del partner de un borrador", async () => {
    const id = await create();
    const member = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    const email = `partner-member-${stamp}@ensoleil-test.com`;
    await service.auth.admin.createUser({ email, password: "EnSoleil!2026", email_confirm: true });
    await member.auth.signInWithPassword({ email, password: "EnSoleil!2026" });

    const { data } = await member.from("lounge_partner_invites").select("*").eq("lounge_id", id);
    expect(data ?? []).toEqual([]);
  });
});

describe("publicar crea al partner", () => {
  it("abre la cuenta de partner vinculada al lounge con los datos del admin", async () => {
    const partner = partnerInput();
    const id = await create({ partner });

    await publishLounge(supabase, id);

    expect(await contentStatus(id)).toBe("live");
    const account = await partnerAccountFor(partner.email);
    expect(account).toMatchObject({
      first_name: "Camille",
      last_name: "Duarte",
      contact_phone: "+1 917 555 0163",
      partner_lounges: [{ lounge_id: id }],
    });
    const { data: roles } = await service.from("user_roles").select("role").eq("user_id", account!.user_id);
    expect(roles).toEqual([{ role: "partner" }]);
  });

  it("la cuenta queda invitada, sin contraseña hasta que el partner la crea", async () => {
    const partner = partnerInput();
    const id = await create({ partner });

    await publishLounge(supabase, id);

    const account = await partnerAccountFor(partner.email);
    const { data } = await service.auth.admin.getUserById(account!.user_id);
    expect(data.user?.invited_at).toBeTruthy();
    expect(data.user?.email_confirmed_at).toBeFalsy();
  });

  it("sin partner no se puede publicar y el lounge sigue en borrador", async () => {
    const id = await create({ partner: null });

    await expect(publishLounge(supabase, id)).rejects.toThrow(/partner/i);
    expect(await contentStatus(id)).toBe("draft");
  });

  it("un email que ya tiene cuenta se rechaza y el lounge sigue en borrador", async () => {
    const taken = partnerInput();
    const first = await create({ partner: taken });
    await publishLounge(supabase, first);
    const second = await create({ partner: { ...partnerInput(), email: taken.email } });

    await expect(publishLounge(supabase, second)).rejects.toThrow(/already/i);
    expect(await contentStatus(second)).toBe("draft");
    expect(await partnerAccountFor(taken.email)).toMatchObject({ partner_lounges: [{ lounge_id: first }] });
  });

  it("la RPC de publicar no deja saltarse la invitación", async () => {
    const id = await create();

    const { error } = await supabase.rpc("admin_publish_lounge", { p_lounge_id: id });

    expect(error?.message).toMatch(/partner/i);
    expect(await contentStatus(id)).toBe("draft");
  });
});
