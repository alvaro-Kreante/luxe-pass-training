import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import PartnerDetailPage from "./page";

/**
 * Story 10.3 — detalle de un partner en draft (PartnerDetail.dc.html 3 y
 * PartnerUserEdit.dc.html 4, Fase 10): sus datos, la tabla de usuarios con
 * lápiz y representante, y sus lounges.
 */

let currentId = "";
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/partners/x",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: currentId }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const service = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = `${Date.now()}`;
const loungeIds: string[] = [];
let count = 0;

/** Un partner en draft con dos usuarios (Camille es la representante) y un lounge. */
async function draftPartner() {
  count += 1;
  const { data: partner, error } = await service
    .from("partners")
    .insert({ name: `Halcyon ${stamp} ${count}`, contact_email: "reservations@halcyon.com", address_line1: "445 Park Avenue", city: "New York" })
    .select("id")
    .single();
  if (error) throw error;
  await service.from("partner_members").insert({ partner_id: partner.id, first_name: "Camille", last_name: "Duarte", email: `camille-${stamp}-${count}@halcyon-test.com`, mobile: "+1 212 555 0148" });
  await service.from("partner_members").insert({ partner_id: partner.id, first_name: "Julian", last_name: "Mercer", email: `julian-${stamp}-${count}@halcyon-test.com` });
  const loungeId = `test-lounge-partner-detail-${stamp}-${count}`;
  await service.from("lounges").insert({
    id: loungeId,
    name: `Tower A ${stamp}`,
    neighborhood: "Midtown East",
    city: "New York",
    city_id: "new-york",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    content_status: "draft",
    partner_id: partner.id,
  });
  loungeIds.push(loungeId);
  currentId = partner.id;
  render(<PartnerDetailPage />);
  await screen.findByRole("heading", { name: `Halcyon ${stamp} ${count}` });
  return { id: partner.id as string, loungeId };
}

function usersTable() {
  return screen.getByRole("table", { name: "Partner users" });
}

function userRow(name: string) {
  return within(usersTable()).getByRole("row", { name: new RegExp(name) });
}

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(createClient(), `partner-detail-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await service.from("lounges").delete().in("id", loungeIds);
  await service.from("partners").delete().like("name", `Halcyon ${stamp} %`);
});

describe("el detalle de un partner en draft", () => {
  it("muestra sus datos editables y que sus usuarios aún no están invitados", async () => {
    await draftPartner();

    expect(screen.getByText(/Draft · users not invited yet/)).toBeInTheDocument();
    expect(screen.getByLabelText("Partner name")).toHaveValue(`Halcyon ${stamp} ${count}`);
    expect(screen.getByLabelText("Street address")).toHaveValue("445 Park Avenue");
  });

  it("guardar cambia sus datos", async () => {
    const user = userEvent.setup({ delay: null });
    const { id } = await draftPartner();

    await user.clear(screen.getByLabelText("City"));
    await user.type(screen.getByLabelText("City"), "Brooklyn");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const { data } = await service.from("partners").select("city").eq("id", id).single();
      expect(data?.city).toBe("Brooklyn");
    });
  });

  it("la lista para activar marca datos, usuarios y representante", async () => {
    await draftPartner();

    const checklist = screen.getByRole("list", { name: "Ready to activate" });
    expect(within(checklist).getByRole("listitem", { name: /At least one user · done/ })).toBeInTheDocument();
    expect(within(checklist).getByRole("listitem", { name: /A representative · done/ })).toBeInTheDocument();
  });
});

describe("la tabla de usuarios", () => {
  it("lista nombre, email, móvil y acceso de cada uno", async () => {
    await draftPartner();

    const camille = userRow("Camille Duarte");
    expect(within(camille).getByText(`camille-${stamp}-${count}@halcyon-test.com`)).toBeInTheDocument();
    expect(within(camille).getByText("+1 212 555 0148")).toBeInTheDocument();
    expect(within(camille).getByText("On activation")).toBeInTheDocument();
    expect(within(camille).getByText("Representative")).toBeInTheDocument();
  });

  it("se añaden más con el mismo formulario del lounge", async () => {
    const user = userEvent.setup({ delay: null });
    await draftPartner();

    await user.click(screen.getByRole("button", { name: "Add user" }));
    await user.type(screen.getByLabelText("First name"), "Rafael");
    await user.type(screen.getByLabelText("Last name"), "Ortiz");
    await user.type(screen.getByLabelText("Work email"), `rafael-${stamp}-${count}@halcyon-test.com`);
    await user.click(screen.getByRole("button", { name: "Save user" }));

    expect(await within(usersTable()).findByRole("row", { name: /Rafael Ortiz/ })).toBeInTheDocument();
  });

  it("no deja guardar sin nombre, apellido y un email válido", async () => {
    const user = userEvent.setup({ delay: null });
    await draftPartner();

    await user.click(screen.getByRole("button", { name: "Add user" }));
    await user.type(screen.getByLabelText("First name"), "Rafael");
    await user.type(screen.getByLabelText("Work email"), "rafael");

    expect(screen.getByRole("button", { name: "Save user" })).toBeDisabled();
  });

  it("el lápiz edita nombre, apellido y móvil; el email no se puede tocar", async () => {
    const user = userEvent.setup({ delay: null });
    const { id } = await draftPartner();

    await user.click(within(userRow("Julian Mercer")).getByRole("button", { name: "Edit Julian Mercer" }));
    expect(screen.getByLabelText("Work email")).toHaveAttribute("readonly");
    await user.clear(screen.getByLabelText("Last name"));
    await user.type(screen.getByLabelText("Last name"), "Mercer Ross");
    await user.click(screen.getByRole("button", { name: "Save changes to Julian" }));

    expect(await within(usersTable()).findByRole("row", { name: /Julian Mercer Ross/ })).toBeInTheDocument();
    const { data } = await service.from("partner_members").select("last_name").eq("partner_id", id).eq("first_name", "Julian").single();
    expect(data?.last_name).toBe("Mercer Ross");
  });

  it("'Make representative' pasa el papel a otro usuario", async () => {
    const user = userEvent.setup({ delay: null });
    await draftPartner();

    await user.click(within(userRow("Julian Mercer")).getByRole("button", { name: "Make Julian Mercer the representative" }));

    await waitFor(() => expect(within(userRow("Julian Mercer")).getByText("Representative")).toBeInTheDocument());
    expect(within(userRow("Camille Duarte")).queryByText("Representative")).toBeNull();
  });

  it("borrar al representante con otros usuarios avisa y no borra", async () => {
    const user = userEvent.setup({ delay: null });
    await draftPartner();

    await user.click(within(userRow("Camille Duarte")).getByRole("button", { name: "Delete Camille Duarte" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Camille Duarte is the representative/);
    expect(userRow("Camille Duarte")).toBeInTheDocument();
  });

  it("los demás usuarios se borran", async () => {
    const user = userEvent.setup({ delay: null });
    await draftPartner();

    await user.click(within(userRow("Julian Mercer")).getByRole("button", { name: "Delete Julian Mercer" }));

    await waitFor(() => expect(within(usersTable()).queryByRole("row", { name: /Julian Mercer/ })).toBeNull());
  });
});

describe("sus lounges", () => {
  it("se listan con su status y se abren en la vista del lounge", async () => {
    const { loungeId } = await draftPartner();

    const lounges = screen.getByRole("list", { name: "Lounges" });
    const item = within(lounges).getByRole("listitem", { name: new RegExp(`Tower A ${stamp}`) });
    expect(within(item).getByText("Draft")).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: /Open lounge/ })).toHaveAttribute("href", `/admin/lounges/${loungeId}`);
  });
});
