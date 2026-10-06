import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { listAdminPartners } from "@/lib/admin-partners";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import PartnersPage from "./page";

/**
 * Story 10.2 — listado de partners en el admin (Partners.dc.html, Fase 10 ·
 * 1). Partners efímeros propios de este archivo; todos llevan el mismo
 * `stamp` en el nombre y la búsqueda los aísla del resto de la base.
 */

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/partners",
  useRouter: () => router,
}));

const service = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = `${Date.now()}`;
const partnerIds: string[] = [];
const loungeIds: string[] = [];

const halcyon = `Halcyon ${stamp}`;
const solenne = `Solenne ${stamp}`;
const bergdorf = `Bergdorf ${stamp}`;

async function createPartner(name: string, status: string, city: string, createdAt: number) {
  const { data, error } = await service
    .from("partners")
    .insert({ name, status, city, contact_email: `hello-${name.split(" ")[0].toLowerCase()}@example.com`, created_at: new Date(createdAt).toISOString() })
    .select("id")
    .single();
  if (error) throw error;
  partnerIds.push(data.id);
  return data.id as string;
}

async function addLounge(partnerId: string, label: string) {
  const id = `test-lounge-partner-list-${label}-${stamp}`;
  const { error } = await service.from("lounges").insert({
    id,
    name: `Partner List ${label}`,
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    content_status: "draft",
    partner_id: partnerId,
  });
  if (error) throw error;
  loungeIds.push(id);
}

async function searchFor(text: string) {
  const user = userEvent.setup({ delay: null });
  render(<PartnersPage />);
  await user.type(await screen.findByRole("searchbox", { name: "Search partners" }), text);
  return user;
}

function rowOf(name: string) {
  return screen.getByRole("row", { name: new RegExp(name) });
}

beforeAll(async () => {
  const now = Date.now();
  const halcyonId = await createPartner(halcyon, "active", "New York", now - 3_000);
  await createPartner(solenne, "draft", "Miami", now - 1_000);
  await createPartner(bergdorf, "suspended", "Los Angeles", now - 2_000);
  await addLounge(halcyonId, "tower-a");
  await addLounge(halcyonId, "tower-b");
  await service.from("partner_members").insert([
    { partner_id: halcyonId, first_name: "Camille", last_name: "Duarte", email: `camille-${stamp}@halcyon-test.com` },
    { partner_id: halcyonId, first_name: "Julian", last_name: "Mercer", email: `julian-${stamp}@halcyon-test.com` },
  ]);

  await signUpConfirmedAdminAndSignIn(createClient(), `partners-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

beforeEach(() => {
  router.push.mockClear();
});

afterAll(async () => {
  await service.from("lounges").delete().in("id", loungeIds);
  await service.from("partners").delete().in("id", partnerIds);
});

describe("la pestaña Partners", () => {
  it("está en el menú del admin y lleva al listado", async () => {
    render(<PartnersPage />);

    const link = await screen.findByRole("link", { name: "Partners" });
    expect(link).toHaveAttribute("href", "/admin/partners");
  });
});

describe("el listado", () => {
  it("muestra nombre, status, lounges, representante y ciudad principal de cada partner", async () => {
    await searchFor(halcyon);

    const row = await waitFor(() => rowOf(halcyon));
    expect(within(row).getByText("Active")).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "2" })).toBeInTheDocument();
    expect(within(row).getByText("Camille Duarte")).toBeInTheDocument();
    expect(within(row).getByText(`camille-${stamp}@halcyon-test.com`)).toBeInTheDocument();
    expect(within(row).getByText("New York")).toBeInTheDocument();
  });

  it("un partner sin usuarios muestra el representante vacío sin romper la fila", async () => {
    await searchFor(solenne);

    const row = await waitFor(() => rowOf(solenne));
    expect(within(row).getByText("No users yet")).toBeInTheDocument();
    expect(within(row).getByText("Draft")).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "0" })).toBeInTheDocument();
  });

  it("el más nuevo va primero", async () => {
    await searchFor(stamp);

    await waitFor(() => expect(screen.getAllByRole("row", { name: new RegExp(stamp) })).toHaveLength(3));
    const names = screen.getAllByRole("row", { name: new RegExp(stamp) }).map((row) => row.getAttribute("aria-label"));
    expect(names).toEqual([solenne, bergdorf, halcyon]);
  });
});

describe("buscar y filtrar", () => {
  it("busca por nombre de partner", async () => {
    await searchFor(`solenne ${stamp}`);

    await waitFor(() => expect(screen.getAllByRole("row", { name: new RegExp(stamp) })).toHaveLength(1));
    expect(rowOf(solenne)).toBeInTheDocument();
  });

  it("filtra por status; pulsar otra vez el mismo filtro lo quita", async () => {
    const user = await searchFor(stamp);
    await waitFor(() => expect(screen.getAllByRole("row", { name: new RegExp(stamp) })).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: /^Suspended/ }));
    expect(screen.getAllByRole("row", { name: new RegExp(stamp) }).map((row) => row.getAttribute("aria-label"))).toEqual([bergdorf]);

    await user.click(screen.getByRole("button", { name: /^Suspended/ }));
    expect(screen.getAllByRole("row", { name: new RegExp(stamp) })).toHaveLength(3);
  });

  it("los filtros Draft y Active también filtran", async () => {
    const user = await searchFor(stamp);
    await waitFor(() => expect(screen.getAllByRole("row", { name: new RegExp(stamp) })).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: /^Draft/ }));
    expect(screen.getAllByRole("row", { name: new RegExp(stamp) }).map((row) => row.getAttribute("aria-label"))).toEqual([solenne]);

    await user.click(screen.getByRole("button", { name: /^Active/ }));
    expect(screen.getAllByRole("row", { name: new RegExp(stamp) }).map((row) => row.getAttribute("aria-label"))).toEqual([halcyon]);
  });
});

describe("desde el listado", () => {
  it("se crea un partner nuevo", async () => {
    render(<PartnersPage />);

    expect(await screen.findByRole("link", { name: /Add partner/ })).toHaveAttribute("href", "/admin/partners/new");
  });

  it("al hacer clic en una fila se abre el detalle del partner", async () => {
    const user = await searchFor(halcyon);

    await user.click(await screen.findByRole("button", { name: `Open ${halcyon}` }));

    expect(router.push).toHaveBeenCalledWith(`/admin/partners/${partnerIds[0]}`);
  });

  it("un clic en cualquier celda de la fila abre el detalle (ticket 002)", async () => {
    const user = await searchFor(halcyon);

    const row = await waitFor(() => rowOf(halcyon));
    await user.click(within(row).getByText("New York"));

    expect(router.push).toHaveBeenCalledWith(`/admin/partners/${partnerIds[0]}`);
  });

  it("la flecha es un botón 'View <nombre>' que abre el detalle (ticket 002)", async () => {
    const user = await searchFor(halcyon);

    await user.click(await screen.findByRole("button", { name: `View ${halcyon}` }));

    expect(router.push).toHaveBeenCalledWith(`/admin/partners/${partnerIds[0]}`);
  });
});

describe("quién puede listar partners", () => {
  it("un miembro no", async () => {
    const member = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    await signUpConfirmedMemberAndSignIn(member, `partners-member-${stamp}@ensoleil-test.com`, "EnSoleil!2026");

    await expect(listAdminPartners(member)).rejects.toThrow(/Not authorized/);
  });
});
