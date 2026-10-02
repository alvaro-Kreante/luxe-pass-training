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

/** Ajuste del 2 oct 2026 — el status se cambia con el selector de la cabecera. */
async function chooseStatus(user: ReturnType<typeof userEvent.setup>, status: string) {
  await user.click(await screen.findByRole("button", { name: /^Status:/ }));
  await user.click(await screen.findByRole("menuitemradio", { name: new RegExp(`^${status}`) }));
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

    expect(screen.getByRole("button", { name: "Status: Draft" })).toBeInTheDocument();
    expect(screen.getByText("No email goes out until you activate the partner")).toBeInTheDocument();
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

/* Story 10.4 (llamadas reales a Auth vía Edge Function: con la suite en paralelo tardan) — activar, suspender y el acceso de cada usuario (PartnerActivate 5, PartnerActive 6, PartnerSuspend 7, PartnerSuspended 8). */

async function activePartner() {
  const { id, loungeId } = await draftPartner();
  const user = userEvent.setup({ delay: null });
  await chooseStatus(user, "Active");
  await user.click(within(await screen.findByRole("dialog", { name: "Activate this partner?" })).getByRole("button", { name: "Activate and invite" }));
  await screen.findByRole("button", { name: "Status: Active" }, { timeout: 30000 });
  return { id, loungeId, user };
}

async function accountIds(partnerId: string) {
  const { data } = await service.from("partner_members").select("user_id").eq("partner_id", partnerId);
  return (data ?? []).map((row) => row.user_id).filter(Boolean) as string[];
}

afterAll(async () => {
  const { data } = await service.from("partners").select("id").like("name", `Halcyon ${stamp} %`);
  for (const row of data ?? []) for (const userId of await accountIds(row.id)) await service.auth.admin.deleteUser(userId);
});

describe("activar el partner", () => {
  it("pide confirmación con la lista de quién recibe la invitación", async () => {
    const user = userEvent.setup({ delay: null });
    await draftPartner();

    await chooseStatus(user, "Active");

    const dialog = await screen.findByRole("dialog", { name: "Activate this partner?" });
    expect(within(dialog).getByText(`camille-${stamp}-${count}@halcyon-test.com`)).toBeInTheDocument();
    expect(within(dialog).getByText(`julian-${stamp}-${count}@halcyon-test.com`)).toBeInTheDocument();
  }, 90_000);

  it("al confirmar, el partner queda activo y sus usuarios invitados", async () => {
    const { id } = await activePartner();

    const { data } = await service.from("partners").select("status").eq("id", id).single();
    expect(data?.status).toBe("active");
    expect(within(userRow("Camille Duarte")).getByText("Invited")).toBeInTheDocument();
  }, 90_000);

  it("sin usuarios no se puede activar", async () => {
    const user = userEvent.setup({ delay: null });
    await draftPartner();

    await user.click(within(userRow("Julian Mercer")).getByRole("button", { name: "Delete Julian Mercer" }));
    await waitFor(() => expect(within(usersTable()).queryByRole("row", { name: /Julian/ })).toBeNull());
    await user.click(within(userRow("Camille Duarte")).getByRole("button", { name: "Delete Camille Duarte" }));
    await waitFor(() => expect(within(usersTable()).queryByRole("row", { name: /Camille/ })).toBeNull());

    await user.click(screen.getByRole("button", { name: "Status: Draft" }));
    expect(await screen.findByRole("menuitemradio", { name: /^Active/ })).toHaveAttribute("aria-disabled", "true");
  }, 90_000);
});

describe("el acceso de cada usuario de un partner activo", () => {
  it("a quien no ha creado su contraseña se le reenvía la invitación", async () => {
    const { user } = await activePartner();

    await user.click(within(userRow("Julian Mercer")).getByRole("button", { name: "Resend invitation to Julian Mercer" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/invitation sent/i);
  }, 90_000);

  it("suspender a un usuario pide confirmación y se puede reactivar", async () => {
    const { user } = await activePartner();

    await user.click(within(userRow("Julian Mercer")).getByRole("button", { name: "Suspend Julian Mercer" }));
    const dialog = await screen.findByRole("dialog", { name: "Suspend this user?" });
    await user.click(within(dialog).getByRole("button", { name: "Suspend user" }));

    await waitFor(() => expect(within(userRow("Julian Mercer")).getByText("Suspended")).toBeInTheDocument());
    await user.click(within(userRow("Julian Mercer")).getByRole("button", { name: "Reactivate Julian Mercer" }));
    await waitFor(() => expect(within(userRow("Julian Mercer")).getByText("Invited")).toBeInTheDocument());
  }, 90_000);

  it("borrar a un usuario con cuenta pide confirmación", async () => {
    const { user } = await activePartner();

    await user.click(within(userRow("Julian Mercer")).getByRole("button", { name: "Delete Julian Mercer" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this user?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete user" }));

    await waitFor(() => expect(within(usersTable()).queryByRole("row", { name: /Julian Mercer/ })).toBeNull());
  }, 90_000);
});

describe("suspender y reactivar el partner", () => {
  it("suspender pide confirmación, suspende sus lounges live y ofrece reactivarlo", async () => {
    const { id, user } = await activePartner();
    const liveId = `test-lounge-partner-detail-live-${stamp}-${count}`;
    await service.from("lounges").insert({ id: liveId, name: `Live ${stamp}`, neighborhood: "NoHo", city: "New York", city_id: "new-york", lat: 0, lng: 0, hours: "Open", content_status: "live", partner_id: id });
    loungeIds.push(liveId);

    await chooseStatus(user, "Suspended");
    const dialog = await screen.findByRole("dialog", { name: "Suspend this partner?" });
    await user.click(within(dialog).getByRole("button", { name: "Suspend partner" }));

    expect(await screen.findByRole("button", { name: "Status: Suspended" }, { timeout: 30000 })).toBeInTheDocument();
    const { data } = await service.from("lounges").select("content_status").eq("id", liveId).single();
    expect(data?.content_status).toBe("suspended");
    expect(screen.getByRole("list", { name: "When you reactivate" })).toBeInTheDocument();
  }, 90_000);

  it("reactivarlo lo deja activo otra vez", async () => {
    const { id, user } = await activePartner();
    await chooseStatus(user, "Suspended");
    await user.click(within(await screen.findByRole("dialog", { name: "Suspend this partner?" })).getByRole("button", { name: "Suspend partner" }));
    await screen.findByRole("button", { name: "Status: Suspended" }, { timeout: 30000 });

    await chooseStatus(user, "Active");

    await screen.findByRole("button", { name: "Status: Active" }, { timeout: 30000 });
    const { data } = await service.from("partners").select("status").eq("id", id).single();
    expect(data?.status).toBe("active");
  }, 90_000);
});
