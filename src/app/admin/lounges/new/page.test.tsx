import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import NewLoungePage from "./page";

/**
 * Story 8.3 — "Add/edit/remove lounge profiles" y "Upload and manage lounge
 * images", alta de un lounge nuevo. Artboards 14 (LoungeNew.dc.html) y 15
 * (PhotoCaption.dc.html). La dirección sale de Google Places, que no carga
 * en jsdom: aquí se cubre todo lo que no depende de ella, y el alta/
 * publicación real contra Supabase vive en `lib/admin-lounge-draft.test.ts`.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges/new",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(createClient(), `new-lounge-admin-${Date.now()}@ensoleil-test.com`, "SupportDesk!24");
});

function image(name: string) {
  return new File(["fake-bytes"], name, { type: "image/jpeg" });
}

/** Story 10.10 — cada foto pasa por el editor ("Use photo") antes de subirse. */
async function renderWithPhotos(names: string[]) {
  const user = userEvent.setup({ delay: null });
  render(<NewLoungePage />);
  const input = await screen.findByLabelText("Add lounge photos");
  await user.upload(input, names.map(image));
  const accepted = names.slice(0, 3);
  for (const name of accepted) {
    const editor = await waitFor(() => {
      const dialog = screen.getByRole("dialog", { name: "Frame this photo" });
      expect(within(dialog).getByText(name)).toBeInTheDocument();
      return dialog;
    });
    await user.click(within(editor).getByRole("button", { name: "Use photo" }));
  }
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(screen.getAllByRole("button", { name: /^Edit photo/ })).toHaveLength(accepted.length), { timeout: 8000 });
  return user;
}

describe("fotos del lounge nuevo", () => {
  it("sube varias a la vez, cada una nombrada como su archivo sin extensión ni guiones", async () => {
    await renderWithPhotos(["una-foto-cualquiera.jpg", "main_room.png"]);

    expect(screen.getByRole("button", { name: "Edit photo una foto cualquiera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit photo main room" })).toBeInTheDocument();
  });

  it("no pasa de 3 fotos aunque se elijan más", async () => {
    await renderWithPhotos(["a.jpg", "b.jpg", "c.jpg", "d.jpg"]);

    expect(screen.getAllByRole("button", { name: /^Edit photo/ })).toHaveLength(3);
    expect(screen.getByText(/up to 3 photos/i)).toBeInTheDocument();
  });

  it("la primera foto subida es la principal", async () => {
    await renderWithPhotos(["bar.jpg", "terrace.jpg"]);

    const photos = screen.getAllByRole("button", { name: /^Edit photo/ });
    expect(within(photos[0]).getByText("Main")).toBeInTheDocument();
    expect(within(photos[1]).queryByText("Main")).toBeNull();
  });

  it("al hacer clic en una foto se abre el popup para ponerle nombre y detalle", async () => {
    const user = await renderWithPhotos(["img-2041.jpg"]);

    await user.click(screen.getByRole("button", { name: "Edit photo img 2041" }));
    const dialog = await screen.findByRole("dialog", { name: "What does this photo show?" });
    const area = within(dialog).getByLabelText("Area");
    expect(area).toHaveValue("img 2041");

    await user.clear(area);
    await user.type(area, "Shower suite");
    await user.type(within(dialog).getByLabelText(/Detail/), "Rainfall shower");
    await user.click(within(dialog).getByRole("button", { name: "Save photo" }));

    expect(screen.getByRole("button", { name: "Edit photo Shower suite" })).toBeInTheDocument();
  });

  it("los atajos del popup rellenan el área", async () => {
    const user = await renderWithPhotos(["x.jpg"]);

    await user.click(screen.getByRole("button", { name: "Edit photo x" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Terrace" }));

    expect(within(dialog).getByLabelText("Area")).toHaveValue("Terrace");
  });

  it("solo hay una principal: elegir otra quita la marca a la anterior", async () => {
    const user = await renderWithPhotos(["bar.jpg", "terrace.jpg"]);

    await user.click(screen.getByRole("button", { name: "Edit photo terrace" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("checkbox", { name: /Main photo/ }));
    await user.click(within(dialog).getByRole("button", { name: "Save photo" }));

    const photos = screen.getAllByRole("button", { name: /^Edit photo/ });
    expect(photos[0]).toHaveAccessibleName("Edit photo terrace");
    expect(within(photos[0]).getByText("Main")).toBeInTheDocument();
    expect(screen.getAllByText("Main")).toHaveLength(1);
  });

  it("quitar una foto desde el popup la saca del listado", async () => {
    const user = await renderWithPhotos(["bar.jpg", "terrace.jpg"]);

    await user.click(screen.getByRole("button", { name: "Edit photo bar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove photo" }));

    expect(screen.getAllByRole("button", { name: /^Edit photo/ })).toHaveLength(1);
    expect(within(screen.getByRole("button", { name: "Edit photo terrace" })).getByText("Main")).toBeInTheDocument();
  });
});

describe("antes de poder guardar o publicar", () => {
  it("sin dirección elegida del mapa, ni se guarda el borrador ni se publica", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NewLoungePage />);

    await user.type(await screen.findByLabelText("Lounge name"), "The Larkspur");

    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Publish lounge" })).toBeDisabled();
  });

  it("la lista de requisitos marca lo que ya está y lo que falta", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NewLoungePage />);

    await user.type(await screen.findByLabelText("Lounge name"), "The Larkspur");
    await user.type(screen.getByLabelText("Phone"), "+1 212 555 0148");
    await user.type(screen.getByLabelText("Email"), "hello@thelarkspur.com");

    const checklist = screen.getByRole("list", { name: "Before it can be published" });
    expect(within(checklist).getByRole("listitem", { name: /Name and contact · done/ })).toBeInTheDocument();
    expect(within(checklist).getByRole("listitem", { name: /Address on the map · pending/ })).toBeInTheDocument();
  });
});

describe("horario de apertura", () => {
  it("cada día se abre con su interruptor y las horas se eligen en desplegables", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NewLoungePage />);

    await user.click(await screen.findByRole("switch", { name: "Mon open" }));
    await user.selectOptions(screen.getByLabelText("Mon opens at"), "9:00 AM");
    await user.selectOptions(screen.getByLabelText("Mon closes at"), "6:00 PM");

    expect(screen.getByRole("switch", { name: "Mon open" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Mon closes at")).toHaveValue("6:00 PM");
    const checklist = screen.getByRole("list", { name: "Before it can be published" });
    expect(within(checklist).getByRole("listitem", { name: /Operating hours · done/ })).toBeInTheDocument();
  });

  it("un día cerrado no muestra horas", async () => {
    render(<NewLoungePage />);

    expect(await screen.findByRole("switch", { name: "Sun open" })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByLabelText("Sun opens at")).toBeNull();
  });

  it("la semana empieza el lunes", async () => {
    render(<NewLoungePage />);

    const switches = await screen.findAllByRole("switch", { name: / open$/ });
    expect(switches.map((s) => s.getAttribute("aria-label"))).toEqual([
      "Mon open", "Tue open", "Wed open", "Thu open", "Fri open", "Sat open", "Sun open",
    ]);
  });

  it("copia el horario del lunes a todos los días", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NewLoungePage />);

    await user.click(await screen.findByRole("switch", { name: "Mon open" }));
    await user.selectOptions(screen.getByLabelText("Mon opens at"), "9:00 AM");
    await user.click(screen.getByRole("button", { name: "Copy Monday to every day" }));

    expect(screen.getByRole("switch", { name: "Sun open" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Sat opens at")).toHaveValue("9:00 AM");
  });
});

/** Story 10.9 — también al crear el lounge; se guardan con él la primera vez. */
describe("temporadas y cierres del lounge nuevo", () => {
  it("se añaden antes de guardar y quedan en la lista", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NewLoungePage />);

    const seasons = await screen.findByRole("region", { name: "Seasonal hours" });
    await user.click(within(seasons).getByRole("button", { name: "Add season" }));
    const season = within(seasons).getByRole("group", { name: "New season" });
    await user.type(within(season).getByLabelText("Name · optional"), "Summer hours");
    await user.type(within(season).getByLabelText("From"), "2026-06-01");
    await user.type(within(season).getByLabelText("To"), "2026-08-31");
    await user.click(within(season).getByRole("button", { name: "Add season" }));
    expect(await within(seasons).findByRole("listitem", { name: /Summer hours/ })).toBeInTheDocument();

    const closures = screen.getByRole("region", { name: "Special closures" });
    await user.click(within(closures).getByRole("button", { name: "Add closure" }));
    const closure = within(closures).getByRole("group", { name: "New closure" });
    await user.type(within(closure).getByLabelText("From"), "2026-12-24");
    await user.type(within(closure).getByLabelText("To"), "2026-12-25");
    await user.type(within(closure).getByLabelText("Reason · members see it"), "Holidays");
    await user.click(within(closure).getByRole("button", { name: "Add closure" }));
    expect(await within(closures).findByRole("listitem", { name: /Holidays/ })).toBeInTheDocument();
  });
});
