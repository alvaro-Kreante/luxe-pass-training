import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import {
  createLoungeDraft,
  getLoungeContentDetail,
  publishLounge,
  setDraftLoungePhotos,
  updateLoungeDraft,
} from "./admin-content";
import type { LoungeDraftInput } from "./lounge-draft";

/**
 * Story 8.3 — "Add/edit/remove lounge profiles": alta de un lounge nuevo
 * (artboards 14 y 15 de Epic 8). Backend real: `admin_create_lounge`/
 * `admin_update_draft_lounge`/`admin_set_draft_lounge_photos`/
 * `admin_publish_lounge` (`supabase/schemas/admin_content.sql`).
 */

const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const supabase = createClient();
const stamp = Date.now();
const created: string[] = [];

function draftInput(overrides: Partial<LoungeDraftInput> = {}): LoungeDraftInput {
  return {
    name: `Test Lounge Draft ${stamp} ${created.length}`,
    phone: "+1 212 555 0148",
    email: "hello@thelarkspur.com",
    website: "thelarkspur.com",
    location: { address: "27 Bond Street", neighborhood: "NoHo", city: "New York", lat: 40.7262, lng: -73.9936 },
    weeklyHours: ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 6 PM"],
    amenities: ["wifi", "co-working"],
    capacity: 24,
    bookingRestrictions: [],
    ...overrides,
  };
}

let activePartnerId: string;

/** Story 10.1 — publicar exige un partner activo; hasta la Story 10.5 el admin aún no lo elige desde el formulario. */
async function create(overrides: Partial<LoungeDraftInput> = {}, partnerId: string | null = activePartnerId) {
  const id = await createLoungeDraft(supabase, draftInput(overrides));
  created.push(id);
  if (partnerId) {
    const { error } = await service.from("lounges").update({ partner_id: partnerId }).eq("id", id);
    if (error) throw error;
  }
  return id;
}

async function createPartner(status: "draft" | "active") {
  const { data, error } = await service
    .from("partners")
    .insert({ name: `Draft Test Partner ${status} ${stamp}`, status })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Un miembro cualquiera, con su propia sesión (sin tocar la del admin). */
async function memberClient() {
  const client = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const email = `draft-member-${stamp}-${Math.random().toString(36).slice(2, 7)}@ensoleil-test.com`;
  await service.auth.admin.createUser({ email, password: "EnSoleil!2026", email_confirm: true });
  await client.auth.signInWithPassword({ email, password: "EnSoleil!2026" });
  return client;
}

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(supabase, `draft-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
  activePartnerId = await createPartner("active");
});

afterAll(async () => {
  await service.from("lounges").delete().in("id", created);
  await service.from("partners").delete().like("name", `Draft Test Partner % ${stamp}`);
});

describe("dar de alta un lounge", () => {
  it("nace como borrador con su contacto, ubicación, horario y plazas", async () => {
    const id = await create();

    const detail = await getLoungeContentDetail(supabase, id);
    expect(detail).toMatchObject({
      contentStatus: "draft",
      phone: "+1 212 555 0148",
      email: "hello@thelarkspur.com",
      address: "27 Bond Street",
      neighborhood: "NoHo",
      city: "New York",
      lat: 40.7262,
      lng: -73.9936,
      capacity: 24,
      closedWeekdays: [0],
      amenities: ["wifi", "co-working"],
    });
  });

  it("el id sale del nombre, y dos lounges con el mismo nombre no chocan", async () => {
    const name = `Twin Lounge ${stamp}`;
    const first = await create({ name });
    const second = await create({ name });

    expect(first).toBe(`twin-lounge-${stamp}`);
    expect(second).not.toBe(first);
  });

  it("un borrador no aparece a los miembros", async () => {
    const id = await create();
    const member = await memberClient();

    const { data } = await member.from("lounges").select("id").eq("id", id);
    expect(data).toEqual([]);
  });

  it("un miembro no puede dar de alta un lounge", async () => {
    const member = await memberClient();

    await expect(createLoungeDraft(member, draftInput())).rejects.toThrow(/Not authorized/);
  });
});

describe("editar un borrador", () => {
  it("la dirección se puede cambiar mientras es borrador", async () => {
    const id = await create();

    await updateLoungeDraft(
      supabase,
      id,
      draftInput({
        location: { address: "1 Dock Street", neighborhood: "DUMBO", city: "Brooklyn", lat: 40.7033, lng: -73.9903 },
      }),
    );

    const detail = await getLoungeContentDetail(supabase, id);
    expect(detail).toMatchObject({ address: "1 Dock Street", city: "Brooklyn", lat: 40.7033 });
  });

  it("un lounge publicado ya no se edita por esta vía", async () => {
    const id = await create();
    await publishLounge(supabase, id);

    await expect(updateLoungeDraft(supabase, id, draftInput())).rejects.toThrow(/only drafts/i);
  });

  it("las fotos guardan su nombre y detalle, y la principal queda primera", async () => {
    const id = await create();

    await setDraftLoungePhotos(supabase, id, [
      { url: "https://example.com/main.jpg", caption: "main room", detail: null },
      { url: "https://example.com/shower.jpg", caption: "Shower suite", detail: "Rainfall shower" },
    ]);

    const detail = await getLoungeContentDetail(supabase, id);
    expect(detail?.images.map((image) => [image.position, image.caption, image.detail])).toEqual([
      [0, "main room", null],
      [1, "Shower suite", "Rainfall shower"],
    ]);
  });

  it("no admite más de 3 fotos", async () => {
    const id = await create();
    const four = Array.from({ length: 4 }, (_, index) => ({ url: `https://example.com/${index}.jpg`, caption: `p${index}`, detail: null }));

    await expect(setDraftLoungePhotos(supabase, id, four)).rejects.toThrow(/up to 3/i);
  });
});

describe("publicar", () => {
  it("publica el borrador y los miembros lo ven, reservable desde ya", async () => {
    const id = await create();

    await publishLounge(supabase, id);

    const member = await memberClient();
    const { data } = await member.from("lounges").select("id, content_status").eq("id", id);
    expect(data).toEqual([{ id, content_status: "live" }]);

    const { data: seats } = await member.rpc("lounge_availability_range", {
      p_lounge_id: id,
      p_from: "2026-10-01",
      p_to: "2026-10-01",
    });
    expect(seats).toContainEqual({ date: "2026-10-01", band: "morning", seats_left: 24 });
  });

  it("sin partner no se puede publicar", async () => {
    const id = await create({}, null);

    await expect(publishLounge(supabase, id)).rejects.toThrow(/active partner/i);
  });

  it("con un partner todavía en draft no se puede publicar", async () => {
    const id = await create({}, await createPartner("draft"));

    await expect(publishLounge(supabase, id)).rejects.toThrow(/active partner/i);
  });

  it("el servidor rechaza publicar un borrador incompleto", async () => {
    const id = await create({ phone: "" });

    await expect(publishLounge(supabase, id)).rejects.toThrow(/incomplete/i);
  });
});
