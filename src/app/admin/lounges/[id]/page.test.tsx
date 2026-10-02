import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import LoungeEditPage from "./page";

/**
 * Epic 8 · LoungeLive.dc.html (17), LoungeEditConfirm (18) y
 * LoungeDraftPartners (19). Un lounge live se ve entero y bloqueado;
 * editarlo lo devuelve a borrador (sin cola de aprobación, decisión 29 sept
 * 2026). Story 10.1: los usuarios partner ya no se gestionan desde el
 * lounge, y publicar exige un partner activo.
 */

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
let currentId = "";
const params = { get id() { return currentId; } };

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges/x",
  useRouter: () => router,
  useParams: () => ({ id: params.id }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
const loungeIds: string[] = [];
const partnerIds: string[] = [];

async function createLounge(name: string, extra: Record<string, unknown> = {}) {
  const id = `test-lounge-edit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { error } = await admin.from("lounges").insert({
    id,
    name,
    neighborhood: "NoHo",
    city: "New York",
    city_id: "new-york",
    address: "27 Bond Street",
    phone: "+1 212 555 0148",
    email: "hello@thelarkspur.com",
    lat: 40.7262,
    lng: -73.9936,
    hours: "8 AM – 9 PM",
    bands: ["morning", "afternoon", "evening"],
    amenities: ["wifi"],
    weekly_hours: ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 10 PM"],
    booking_restrictions: ["Members only"],
    capacity: 20,
    ...extra,
  });
  if (error) throw error;
  loungeIds.push(id);
  currentId = id;
  return id;
}

async function activePartner() {
  const { data, error } = await admin
    .from("partners")
    .insert({ name: `Lounge Edit Partner ${stamp} ${partnerIds.length}`, status: "active" })
    .select("id")
    .single();
  if (error) throw error;
  partnerIds.push(data.id);
  return data.id as string;
}

async function liveLounge() {
  const id = await createLounge(`Live Lounge ${Date.now()}`);
  await admin.from("lounge_images").insert({ lounge_id: id, url: "https://example.com/main-room.jpg", caption: "Main room", position: 0 });
  render(<LoungeEditPage />);
  await screen.findByRole("heading", { name: /Live Lounge/ });
  return id;
}

/** Ajuste del 2 oct 2026 — el status se cambia con el selector de la cabecera. */
async function chooseStatus(user: ReturnType<typeof userEvent.setup>, status: string) {
  await user.click(await screen.findByRole("button", { name: /^Status:/ }));
  await user.click(await screen.findByRole("menuitemradio", { name: new RegExp(`^${status}`) }));
}

/** Con un popup abierto, Radix oculta el resto de la pantalla a la accesibilidad. */
async function dialogClosed() {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

async function contentStatus(id: string) {
  const { data } = await admin.from("lounges").select("content_status").eq("id", id).single();
  return data?.content_status;
}

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(createClient(), `lounge-edit-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await admin.from("lounges").delete().in("id", loungeIds);
  if (partnerIds.length) await admin.from("partners").delete().in("id", partnerIds);
});

describe("un lounge live se ve entero y bloqueado", () => {
  it("muestra contacto, ubicación y restricciones como texto, sin campos editables", async () => {
    await liveLounge();

    expect(screen.getByText("+1 212 555 0148")).toBeInTheDocument();
    expect(screen.getByText(/27 Bond Street/)).toBeInTheDocument();
    expect(screen.getByText("Members only")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Lounge name" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  });

  it("las fotos se ven de verdad", async () => {
    await liveLounge();

    expect(screen.getByRole("img", { name: "Main room" })).toHaveAttribute("src", "https://example.com/main-room.jpg");
  });

  it("editar pide confirmación; quedarse live no cambia nada", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await liveLounge();

    await user.click(screen.getByRole("button", { name: "Edit lounge" }));
    const dialog = await screen.findByRole("dialog", { name: "Move to draft to edit?" });
    await user.click(within(dialog).getByRole("button", { name: "Keep it live" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await contentStatus(id)).toBe("live");
  });

  it("confirmar lo pasa a borrador y abre el formulario para publicar de nuevo", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await liveLounge();

    await user.click(screen.getByRole("button", { name: "Edit lounge" }));
    await user.click(await screen.findByRole("button", { name: "Move to draft and edit" }));

    expect(await screen.findByRole("button", { name: "Publish lounge" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Lounge name" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit for review" })).toBeNull();
    expect(await contentStatus(id)).toBe("draft");
  });
});

describe("suspender un lounge suelto (Story 10.4)", () => {
  it("pide confirmación y lo deja suspendido, sin editar ni volver a suspender", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await liveLounge();

    await chooseStatus(user, "Suspended");
    const dialog = await screen.findByRole("dialog", { name: "Suspend this lounge?" });
    await user.click(within(dialog).getByRole("button", { name: "Suspend lounge" }));

    expect(await screen.findByRole("button", { name: "Status: Suspended" })).toBeInTheDocument();
    expect(await contentStatus(id)).toBe("suspended");
    expect(screen.queryByRole("button", { name: "Edit lounge" })).toBeNull();
  });

  it("desde el selector, Draft en un lounge live pide la misma confirmación que editar", async () => {
    const user = userEvent.setup({ delay: null });
    await liveLounge();

    await chooseStatus(user, "Draft");

    expect(await screen.findByRole("dialog", { name: "Move to draft to edit?" })).toBeInTheDocument();
  });

  it("en un borrador, Live del selector lo publica", async () => {
    const user = userEvent.setup({ delay: null });
    const { data: partner } = await admin.from("partners").insert({ name: `Selector Owner ${stamp}`, status: "active" }).select("id").single();
    partnerIds.push(partner!.id);
    const id = await createLounge(`Draft Lounge ${Date.now()}`, { content_status: "draft", partner_id: partner!.id });
    render(<LoungeEditPage />);

    await chooseStatus(user, "Live");

    await screen.findByRole("dialog", { name: "The lounge is live" }, { timeout: 8000 });
    expect(await contentStatus(id)).toBe("live");
  });

  it("reactivarlo lo devuelve a borrador para publicarlo de nuevo", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await createLounge(`Live Lounge ${Date.now()}`, { content_status: "suspended", suspended_by: "admin" });
    render(<LoungeEditPage />);

    await chooseStatus(user, "Draft");

    expect(await screen.findByRole("button", { name: "Status: Draft" })).toBeInTheDocument();
    expect(await contentStatus(id)).toBe("draft");
  });
});

describe("un lounge en borrador", () => {
  it("se edita entero, ubicación incluida, y se publica — sin cola de revisión", async () => {
    await createLounge(`Draft Lounge ${Date.now()}`, { content_status: "draft" });
    render(<LoungeEditPage />);

    expect(await screen.findByRole("button", { name: "Status: Draft" })).toBeInTheDocument();
    expect(screen.getByLabelText("Address")).toHaveValue("27 Bond Street");
    expect(screen.getByRole("button", { name: "Publish lounge" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit for review" })).toBeNull();
  });

  it("publicar avisa y se queda en el lounge, ya live", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await createLounge(`Draft Lounge ${Date.now()}`, { content_status: "draft", partner_id: await activePartner() });
    render(<LoungeEditPage />);

    await user.click(await screen.findByRole("button", { name: "Publish lounge" }));

    const notice = await screen.findByRole("dialog", { name: "The lounge is live" }, { timeout: 8000 });
    expect(await contentStatus(id)).toBe("live");
    await user.click(within(notice).getByRole("button", { name: "Done" }));
    await dialogClosed();
    expect(screen.getByRole("button", { name: "Edit lounge" })).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("guardar el borrador avisa y sigue en el borrador", async () => {
    const user = userEvent.setup({ delay: null });
    await createLounge(`Draft Lounge ${Date.now()}`, { content_status: "draft" });
    render(<LoungeEditPage />);

    await user.click(await screen.findByRole("button", { name: "Save draft" }));

    const notice = await screen.findByRole("dialog", { name: "Draft saved" }, { timeout: 8000 });
    await user.click(within(notice).getByRole("button", { name: "Keep editing" }));
    await dialogClosed();
    expect(screen.getByRole("button", { name: "Publish lounge" })).toBeInTheDocument();
  });
});

describe("el partner del lounge (Story 10.5)", () => {
  async function partnerNamed(name: string, status: "draft" | "active") {
    const { data, error } = await admin.from("partners").insert({ name, status, city: "New York" }).select("id").single();
    if (error) throw error;
    partnerIds.push(data.id);
    return data.id as string;
  }

  it("en un borrador se elige entre los partners existentes, también los draft, y se guarda", async () => {
    const user = userEvent.setup({ delay: null });
    const draftName = `Solenne Pick ${stamp}`;
    const partnerId = await partnerNamed(draftName, "draft");
    const id = await createLounge(`Draft Lounge ${Date.now()}`, { content_status: "draft" });
    render(<LoungeEditPage />);

    await user.type(await screen.findByRole("combobox", { name: "Who runs this lounge" }), `Solenne Pick ${stamp}`);
    await user.click(await screen.findByRole("option", { name: new RegExp(draftName) }));
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await screen.findByRole("dialog", { name: "Draft saved" }, { timeout: 8000 });
    const { data } = await admin.from("lounges").select("partner_id").eq("id", id).single();
    expect(data?.partner_id).toBe(partnerId);
  });

  it("si el partner no existe, avisa de crearlo primero y enlaza a Partners", async () => {
    await createLounge(`Draft Lounge ${Date.now()}`, { content_status: "draft" });
    render(<LoungeEditPage />);

    expect(await screen.findByText(/Not listed\? Create the partner first/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Partners/ })).toHaveAttribute("href", "/admin/partners/new");
  });

  it("con un partner en draft no se puede publicar", async () => {
    const partnerId = await partnerNamed(`Draft Owner ${stamp}`, "draft");
    await createLounge(`Draft Lounge ${Date.now()}`, { content_status: "draft", partner_id: partnerId });
    render(<LoungeEditPage />);

    const checklist = await screen.findByRole("list", { name: "Before it can be published" });
    expect(within(checklist).getByRole("listitem", { name: /An active partner · pending/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish lounge" })).toBeDisabled();
  });

  it("un lounge live muestra su partner en solo lectura y enlaza a su detalle", async () => {
    const partnerId = await partnerNamed(`Halcyon Owner ${stamp}`, "active");
    await admin.from("partner_members").insert({ partner_id: partnerId, first_name: "Camille", last_name: "Duarte", email: `owner-rep-${stamp}@halcyon-test.com` });
    await createLounge(`Live Lounge ${Date.now()}`, { partner_id: partnerId });
    render(<LoungeEditPage />);

    const card = await screen.findByRole("region", { name: "Partner" });
    expect(within(card).getByText(`Halcyon Owner ${stamp}`)).toBeInTheDocument();
    expect(within(card).getByText("Camille Duarte")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /Open partner/ })).toHaveAttribute("href", `/admin/partners/${partnerId}`);
    expect(within(card).queryByRole("textbox")).toBeNull();
  });
});

describe("las fotos del lounge", () => {
  it("al hacer clic en una se abre a tamaño completo y se pasa a la siguiente", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await createLounge(`Live Lounge ${Date.now()}`);
    await admin.from("lounge_images").insert([
      { lounge_id: id, url: "https://example.com/main-room.jpg", caption: "Main room", position: 0 },
      { lounge_id: id, url: "https://example.com/bar.jpg", caption: "Bar", position: 1 },
    ]);
    render(<LoungeEditPage />);

    await user.click(await screen.findByRole("button", { name: "View photo Main room" }));

    const viewer = await screen.findByRole("dialog", { name: "Main room · 1 of 2" });
    expect(within(viewer).getByRole("img", { name: "Main room" })).toHaveAttribute("src", "https://example.com/main-room.jpg");
    await user.click(within(viewer).getByRole("button", { name: "Next photo" }));
    expect(await screen.findByRole("dialog", { name: "Bar · 2 of 2" })).toBeInTheDocument();
  });
});
