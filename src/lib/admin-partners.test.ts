import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addPartnerMember,
  createPartnerDraft,
  deletePartnerMember,
  getAdminPartner,
  setPartnerRepresentative,
  updatePartner,
  updatePartnerMember,
  type PartnerDetailsInput,
} from "@/lib/admin-partners";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

/**
 * Story 10.3 — crear y editar un partner con sus usuarios. Corre contra las
 * RPC reales de `supabase/schemas/admin_partners.sql` con un admin de test.
 */

const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const created: string[] = [];
let admin: SupabaseClient;

function isolatedClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}

function details(overrides: Partial<PartnerDetailsInput> = {}): PartnerDetailsInput {
  return {
    name: `Solenne Spa ${stamp} ${created.length}`,
    contactEmail: "hello@solenne.com",
    addressLine1: "1200 Collins Avenue",
    addressLine2: "",
    city: "Miami Beach",
    region: "FL",
    postalCode: "33139",
    country: "United States",
    ...overrides,
  };
}

async function create(overrides: Partial<PartnerDetailsInput> = {}) {
  const id = await createPartnerDraft(admin, details(overrides));
  created.push(id);
  return id;
}

let emailCount = 0;
function user(first: string) {
  emailCount += 1;
  return { firstName: first, lastName: "Haddad", email: `${first.toLowerCase()}-${stamp}-${emailCount}@solenne-test.com`, mobile: "+1 305 555 0110" };
}

beforeAll(async () => {
  admin = isolatedClient();
  await signUpConfirmedAdminAndSignIn(admin, `partner-crud-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  if (created.length) await service.from("partners").delete().in("id", created);
});

describe("crear un partner", () => {
  it("nace en draft con sus datos y el edificio central en texto", async () => {
    const id = await create({ name: `Draft Partner ${stamp}` });

    const partner = await getAdminPartner(admin, id);
    expect(partner).toMatchObject({
      name: `Draft Partner ${stamp}`,
      status: "draft",
      contactEmail: "hello@solenne.com",
      addressLine1: "1200 Collins Avenue",
      city: "Miami Beach",
      users: [],
      lounges: [],
    });
  });

  it("se guarda junto a su primer usuario, que queda como representante", async () => {
    const id = await createPartnerDraft(admin, details(), [user("Noor")]);
    created.push(id);

    const partner = await getAdminPartner(admin, id);
    expect(partner?.users).toEqual([expect.objectContaining({ firstName: "Noor", isRepresentative: true })]);
  });

  it("si su primer usuario no vale, no queda ningún partner a medias", async () => {
    const name = `Half Partner ${stamp}`;
    await expect(
      createPartnerDraft(admin, details({ name }), [{ ...user("Taken"), email: `partner-crud-admin-${stamp}@ensoleil-test.com` }]),
    ).rejects.toThrow(/already in use/i);

    const { data } = await service.from("partners").select("id").eq("name", name);
    expect(data).toEqual([]);
  });

  it("necesita un nombre", async () => {
    await expect(createPartnerDraft(admin, details({ name: "  " }))).rejects.toThrow(/needs a name/i);
  });

  it("un miembro no puede crear partners", async () => {
    const member = isolatedClient();
    await signUpConfirmedMemberAndSignIn(member, `partner-crud-member-${stamp}@ensoleil-test.com`, "EnSoleil!2026");

    await expect(createPartnerDraft(member, details())).rejects.toThrow(/Not authorized/);
  });
});

describe("editar sus datos", () => {
  it("guarda nombre, contacto y dirección; la ciudad es la ciudad principal", async () => {
    const id = await create();

    await updatePartner(admin, id, details({ name: `Renamed ${stamp}`, city: "Miami" }));

    const partner = await getAdminPartner(admin, id);
    expect(partner).toMatchObject({ name: `Renamed ${stamp}`, city: "Miami" });
  });
});

describe("sus usuarios", () => {
  it("se añaden en draft sin cuenta todavía, con el estado 'On activation'", async () => {
    const id = await create();

    await addPartnerMember(admin, id, user("Noor"));

    const partner = await getAdminPartner(admin, id);
    expect(partner?.users).toEqual([
      expect.objectContaining({ firstName: "Noor", lastName: "Haddad", status: "on_activation", isRepresentative: true }),
    ]);
  });

  it("añadirlos en draft no crea ninguna cuenta (no sale ningún email)", async () => {
    const id = await create();
    const noor = user("Noor");

    await addPartnerMember(admin, id, noor);

    const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
    expect(data.users.some((account) => account.email === noor.email)).toBe(false);
  });

  it("piden nombre, apellido y un email válido", async () => {
    const id = await create();

    await expect(addPartnerMember(admin, id, { ...user("Noor"), lastName: "" })).rejects.toThrow(/first name, last name/i);
    await expect(addPartnerMember(admin, id, { ...user("Noor"), email: "noor" })).rejects.toThrow(/valid email/i);
  });

  it("un email que ya usa otro usuario partner se rechaza", async () => {
    const first = await create();
    const second = await create();
    const noor = user("Noor");
    await addPartnerMember(admin, first, noor);

    await expect(addPartnerMember(admin, second, { ...noor, email: noor.email.toUpperCase() })).rejects.toThrow(/already in use/i);
  });

  it("un email que ya tiene cuenta (miembro, partner o admin) se rechaza", async () => {
    const id = await create();

    await expect(addPartnerMember(admin, id, { ...user("Taken"), email: `partner-crud-admin-${stamp}@ensoleil-test.com` })).rejects.toThrow(
      /already in use/i,
    );
  });

  it("el lápiz cambia nombre, apellido y móvil, nunca el email", async () => {
    const id = await create();
    const noor = user("Noor");
    const memberId = await addPartnerMember(admin, id, noor);

    await updatePartnerMember(admin, memberId, { firstName: "Nour", lastName: "Haddad Saleh", mobile: "" });

    const partner = await getAdminPartner(admin, id);
    expect(partner?.users[0]).toMatchObject({ firstName: "Nour", lastName: "Haddad Saleh", mobile: "", email: noor.email });
  });
});

describe("el representante", () => {
  it("es el primero que se añade y se puede cambiar a otro", async () => {
    const id = await create();
    await addPartnerMember(admin, id, user("Noor"));
    const secondId = await addPartnerMember(admin, id, user("Leila"));

    await setPartnerRepresentative(admin, id, secondId);

    const partner = await getAdminPartner(admin, id);
    expect(partner?.users.find((u) => u.isRepresentative)?.firstName).toBe("Leila");
  });

  it("no se puede borrar mientras queden otros usuarios", async () => {
    const id = await create();
    const repId = await addPartnerMember(admin, id, user("Noor"));
    await addPartnerMember(admin, id, user("Leila"));

    await expect(deletePartnerMember(admin, repId)).rejects.toThrow(/new representative/i);
  });

  it("los demás usuarios sí se borran", async () => {
    const id = await create();
    await addPartnerMember(admin, id, user("Noor"));
    const otherId = await addPartnerMember(admin, id, user("Leila"));

    await deletePartnerMember(admin, otherId);

    const partner = await getAdminPartner(admin, id);
    expect(partner?.users.map((u) => u.firstName)).toEqual(["Noor"]);
  });
});

describe("sus lounges", () => {
  it("se listan con su status para abrirlos", async () => {
    const id = await create();
    const loungeId = `test-lounge-partner-crud-${stamp}`;
    await service.from("lounges").insert({
      id: loungeId,
      name: `Partner CRUD Lounge ${stamp}`,
      neighborhood: "South Beach",
      city: "Miami",
      city_id: "miami",
      lat: 0,
      lng: 0,
      hours: "Open 24 hours",
      content_status: "draft",
      partner_id: id,
    });

    const partner = await getAdminPartner(admin, id);
    await service.from("lounges").delete().eq("id", loungeId);

    expect(partner?.lounges).toEqual([
      { id: loungeId, name: `Partner CRUD Lounge ${stamp}`, area: "South Beach, Miami", address: "", city: "Miami", contentStatus: "draft", suspendedBy: null, capacity: 40, checklistMissing: expect.any(Array), weeklyHours: expect.any(Array) },
    ]);
  });
});
