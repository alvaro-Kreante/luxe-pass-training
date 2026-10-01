import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import LoungeEditPage from "./page";

/**
 * Epic 8 · LoungeLive.dc.html (17), LoungeEditConfirm (18),
 * LoungeDraftPartners (19), PartnerAdd (20), PartnerSuspend (21) y
 * PartnerDelete (22). Un lounge live se ve entero y bloqueado; editarlo lo
 * devuelve a borrador (sin cola de aprobación, decisión 29 sept 2026). Los
 * partners se gestionan sin despublicar. Las acciones sobre partners pasan
 * por la Edge Function `admin-lounge-partners` (necesita `supabase
 * functions serve`).
 */

let currentId = "";
const params = { get id() { return currentId; } };

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges/x",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: params.id }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
const loungeIds: string[] = [];
const userIds: string[] = [];

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

/** Un partner vinculado al lounge: `active` ya creó su contraseña, `invited` todavía no. */
async function linkPartner(loungeId: string, firstName: string, state: "active" | "invited") {
  const email = `${firstName.toLowerCase()}-${stamp}-${Math.random().toString(36).slice(2, 6)}@thelarkspur-test.com`;
  const userId =
    state === "active"
      ? (await admin.auth.admin.createUser({ email, password: "Larkspur2026", email_confirm: true })).data.user!.id
      : (await admin.auth.admin.generateLink({ type: "invite", email })).data.user!.id;
  userIds.push(userId);
  await admin.from("user_roles").insert({ user_id: userId, role: "partner" });
  const { data: partner } = await admin
    .from("partners")
    .insert({ user_id: userId, business_name: "The Larkspur", contact_email: email, first_name: firstName, last_name: "Duarte" })
    .select("id")
    .single();
  await admin.from("partner_lounges").insert({ partner_id: partner!.id, lounge_id: loungeId });
  await admin
    .from("lounge_partner_invites")
    .insert({ lounge_id: loungeId, first_name: firstName, last_name: "Duarte", email, partner_id: partner!.id });
  return { email, userId };
}

async function liveLoungeWithPartners({ onlyCamille = false } = {}) {
  const id = await createLounge(`Live Lounge ${Date.now()}`);
  await admin.from("lounge_images").insert({ lounge_id: id, url: "https://example.com/main-room.jpg", caption: "Main room", position: 0 });
  await linkPartner(id, "Camille", "active");
  if (!onlyCamille) await linkPartner(id, "Julian", "invited");
  render(<LoungeEditPage />);
  await screen.findByRole("heading", { name: /Live Lounge/ });
  return id;
}

function partnersList() {
  return screen.getByRole("list", { name: "Partners" });
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
  const { data: created } = await admin
    .from("partners")
    .select("user_id, partner_lounges!inner(lounge_id)")
    .in("partner_lounges.lounge_id", loungeIds);
  for (const userId of [...userIds, ...(created ?? []).map((p) => p.user_id)]) await admin.auth.admin.deleteUser(userId);
  await admin.from("lounges").delete().in("id", loungeIds);
});

describe("un lounge live se ve entero y bloqueado", () => {
  it("muestra contacto, ubicación y restricciones como texto, sin campos editables", async () => {
    await liveLoungeWithPartners();

    expect(screen.getByText("+1 212 555 0148")).toBeInTheDocument();
    expect(screen.getByText(/27 Bond Street/)).toBeInTheDocument();
    expect(screen.getByText("Members only")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Lounge name" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  });

  it("las fotos se ven de verdad", async () => {
    await liveLoungeWithPartners();

    expect(screen.getByRole("img", { name: "Main room" })).toHaveAttribute("src", "https://example.com/main-room.jpg");
  });

  it("editar pide confirmación; quedarse live no cambia nada", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await liveLoungeWithPartners();

    await user.click(screen.getByRole("button", { name: "Edit lounge" }));
    const dialog = await screen.findByRole("dialog", { name: "Move to draft to edit?" });
    await user.click(within(dialog).getByRole("button", { name: "Keep it live" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await contentStatus(id)).toBe("live");
  });

  it("confirmar lo pasa a borrador y abre el formulario para publicar de nuevo", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await liveLoungeWithPartners();

    await user.click(screen.getByRole("button", { name: "Edit lounge" }));
    await user.click(await screen.findByRole("button", { name: "Move to draft and edit" }));

    expect(await screen.findByRole("button", { name: "Publish lounge" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Lounge name" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit for review" })).toBeNull();
    expect(await contentStatus(id)).toBe("draft");
  });
});

describe("partners de un lounge live", () => {
  it("lista cada partner con su estado", async () => {
    await liveLoungeWithPartners();

    const list = await waitFor(() => partnersList());
    expect(within(list).getByRole("listitem", { name: "Camille Duarte · Active" })).toBeInTheDocument();
    expect(within(list).getByRole("listitem", { name: "Julian Duarte · Invited" })).toBeInTheDocument();
  });

  it("solo a quien no ha creado su contraseña se le reenvía la invitación", async () => {
    const user = userEvent.setup({ delay: null });
    await liveLoungeWithPartners();
    await waitFor(() => partnersList());

    expect(screen.queryByRole("button", { name: "Resend invitation to Camille Duarte" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Resend invitation to Julian Duarte" }));

    expect(await screen.findByText(/Invitation sent to/)).toBeInTheDocument();
  });

  it("añadir un partner lo invita sin despublicar", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await liveLoungeWithPartners();

    await user.click(await screen.findByRole("button", { name: "Add partner" }));
    const dialog = await screen.findByRole("dialog", { name: "Add a partner" });
    await user.type(within(dialog).getByLabelText("First name"), "Rafael");
    await user.type(within(dialog).getByLabelText("Last name"), "Ortiz");
    await user.type(within(dialog).getByLabelText("Work email"), `rafael-${stamp}@thelarkspur-test.com`);
    await user.click(within(dialog).getByRole("button", { name: "Send invitation" }));
    await dialogClosed();

    expect(await within(partnersList()).findByRole("listitem", { name: "Rafael Ortiz · Invited" })).toBeInTheDocument();
    expect(await contentStatus(id)).toBe("live");
  });

  it("suspender pide confirmación y se puede reactivar", async () => {
    const user = userEvent.setup({ delay: null });
    await liveLoungeWithPartners();

    await user.click(await screen.findByRole("button", { name: "Suspend Julian Duarte" }));
    const dialog = await screen.findByRole("dialog", { name: "Suspend this account?" });
    await user.click(within(dialog).getByRole("button", { name: "Suspend account" }));
    await dialogClosed();

    expect(await within(partnersList()).findByRole("listitem", { name: "Julian Duarte · Suspended" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reactivate Julian Duarte" }));
    expect(await within(partnersList()).findByRole("listitem", { name: "Julian Duarte · Invited" })).toBeInTheDocument();
  });

  it("eliminar exige marcar que no se puede deshacer", async () => {
    const user = userEvent.setup({ delay: null });
    await liveLoungeWithPartners();

    await user.click(await screen.findByRole("button", { name: "Delete Julian Duarte" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this account?" });
    const confirm = within(dialog).getByRole("button", { name: "Delete account" });
    expect(confirm).toBeDisabled();
    await user.click(within(dialog).getByRole("checkbox", { name: "I understand this cannot be undone" }));
    await user.click(confirm);
    await dialogClosed();

    await waitFor(() => expect(within(partnersList()).queryByRole("listitem", { name: /Julian Duarte/ })).toBeNull());
  });

  it("no deja suspender al último partner activo", async () => {
    const user = userEvent.setup({ delay: null });
    await liveLoungeWithPartners({ onlyCamille: true });

    await user.click(await screen.findByRole("button", { name: "Suspend Camille Duarte" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Suspend account" }));

    expect(await screen.findByText(/last active partner/i)).toBeInTheDocument();
  });
});

describe("un lounge en borrador", () => {
  it("se edita entero, ubicación incluida, y se publica — sin cola de revisión", async () => {
    await createLounge(`Draft Lounge ${Date.now()}`, { content_status: "draft" });
    render(<LoungeEditPage />);

    expect(await screen.findByText(/Draft · not visible to members/)).toBeInTheDocument();
    expect(screen.getByLabelText("Address")).toHaveValue("27 Bond Street");
    expect(screen.getByRole("button", { name: "Publish lounge" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit for review" })).toBeNull();
  });

  it("admite varios partners pendientes, y quitar uno antes de publicar", async () => {
    const user = userEvent.setup({ delay: null });
    await createLounge(`Draft Lounge ${Date.now()}`, { content_status: "draft" });
    render(<LoungeEditPage />);
    await screen.findByText(/Draft · not visible to members/);

    for (const name of ["Camille", "Julian"]) {
      await user.type(screen.getByLabelText("First name"), name);
      await user.type(screen.getByLabelText("Last name"), "Duarte");
      await user.type(screen.getByLabelText("Work email"), `${name.toLowerCase()}-${stamp}@thelarkspur-test.com`);
      await user.click(screen.getByRole("button", { name: "Add partner" }));
    }

    const list = partnersList();
    expect(within(list).getByRole("listitem", { name: "Camille Duarte · On publish" })).toBeInTheDocument();
    expect(within(list).getByRole("listitem", { name: "Julian Duarte · On publish" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Julian Duarte" }));
    expect(within(list).queryByRole("listitem", { name: /Julian/ })).toBeNull();
  });

  it("publicar invita a los partners y deja el lounge live", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await createLounge(`Draft Lounge ${Date.now()}`, { content_status: "draft" });
    await admin
      .from("lounge_partner_invites")
      .insert({ lounge_id: id, first_name: "Camille", last_name: "Duarte", email: `publish-${stamp}@thelarkspur-test.com` });
    render(<LoungeEditPage />);

    await user.click(await screen.findByRole("button", { name: "Publish lounge" }));

    await waitFor(async () => expect(await contentStatus(id)).toBe("live"), { timeout: 5000 });
  });
});
