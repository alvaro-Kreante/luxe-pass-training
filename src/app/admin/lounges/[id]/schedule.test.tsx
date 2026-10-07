import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { addDays, today, weekdayOf } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import LoungeEditPage from "./page";
import { findDialog } from "@/lib/testing/find-dialog";

/**
 * Story 10.9 · SeasonalEmpty (17), SeasonalEdit (18), SeasonalOverlap (19),
 * ClosureEdit (20), ClosureBookingsWarning (21) y SeasonalFilled (22):
 * temporadas y cierres especiales desde el lounge, que se guardan al momento
 * y no lo sacan de live.
 */

let currentId = "";
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges/x",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: currentId }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const service = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
let count = 0;

async function openLounge(status: "live" | "draft" = "live") {
  count += 1;
  const id = `test-lounge-schedule-ui-${stamp}-${count}`;
  const { error } = await service.from("lounges").insert({
    id,
    name: `Schedule Lounge ${stamp} ${count}`,
    neighborhood: "Midtown East",
    city: "New York",
    city_id: "new-york",
    address: "122 E 45th St",
    lat: 40.75,
    lng: -73.97,
    hours: "Open until 10 PM",
    bands: ["morning", "afternoon", "evening"],
    amenities: ["wifi"],
    weekly_hours: ["10 AM – 10 PM", "8 AM – 10 PM", "8 AM – 10 PM", "8 AM – 10 PM", "8 AM – 10 PM", "8 AM – 10 PM", "10 AM – 10 PM"],
    capacity: 20,
    content_status: status,
  });
  if (error) throw error;
  await service.from("lounge_images").insert({ lounge_id: id, url: "https://example.com/main-room.jpg", caption: "Main room", position: 0 });
  currentId = id;
  return id;
}

async function renderLounge() {
  render(<LoungeEditPage />);
  return screen.findByRole("region", { name: "Seasonal hours" });
}

function seasons() {
  return screen.getByRole("region", { name: "Seasonal hours" });
}

function closures() {
  return screen.getByRole("region", { name: "Special closures" });
}

async function fill(input: HTMLElement, value: string, user: ReturnType<typeof userEvent.setup>) {
  await user.clear(input);
  await user.type(input, value);
}

async function contentStatus(id: string) {
  const { data } = await service.from("lounges").select("content_status").eq("id", id).single();
  return data?.content_status;
}

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(createClient(), `schedule-ui-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await service.from("lounges").delete().like("id", `test-lounge-schedule-ui-${stamp}-%`);
});

describe("sin temporadas ni cierres", () => {
  it("las dos secciones lo dicen y ofrecen añadir", async () => {
    await openLounge();
    await renderLounge();

    expect(within(seasons()).getByText("No seasons")).toBeInTheDocument();
    expect(within(seasons()).getByRole("button", { name: "Add season" })).toBeInTheDocument();
    expect(within(closures()).getByText("No special closures")).toBeInTheDocument();
    expect(within(closures()).getByRole("button", { name: "Add closure" })).toBeInTheDocument();
  });
});

describe("temporadas", () => {
  it("se añade una temporada con su horario semanal y el lounge sigue live", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await openLounge();
    await renderLounge();

    await user.click(within(seasons()).getByRole("button", { name: "Add season" }));
    const editor = within(seasons()).getByRole("group", { name: "New season" });
    await user.type(within(editor).getByLabelText("Name · optional"), "Summer hours");
    await fill(within(editor).getByLabelText("From"), "2026-06-01", user);
    await fill(within(editor).getByLabelText("To"), "2026-08-31", user);
    // Parte del horario habitual; el lunes abre a las 7 AM.
    await user.selectOptions(within(editor).getByLabelText("Mon opens at"), "7:00 AM");
    await user.click(within(editor).getByRole("button", { name: "Add season" }));

    const row = await within(seasons()).findByRole("listitem", { name: /Summer hours/ });
    expect(within(row).getByText(/Jun 1 – Aug 31, 2026/)).toBeInTheDocument();
    expect(within(row).getByText(/Mon 7 AM – 10 PM/)).toBeInTheDocument();
    const { data } = await service.from("lounge_seasons").select("name, starts_on, ends_on, weekly_hours").eq("lounge_id", id);
    expect(data).toEqual([expect.objectContaining({ name: "Summer hours", starts_on: "2026-06-01", ends_on: "2026-08-31" })]);
    expect((data![0].weekly_hours as string[])[1]).toBe("7:00 AM – 10:00 PM");
    expect(await contentStatus(id)).toBe("live");
  });

  it("una temporada que se solapa o termina antes de empezar no se puede añadir", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await openLounge();
    await service.from("lounge_seasons").insert({ lounge_id: id, name: "Summer hours", starts_on: "2026-06-01", ends_on: "2026-08-31", weekly_hours: Array(7).fill("9 AM – 11 PM") });
    await renderLounge();

    await user.click(within(seasons()).getByRole("button", { name: "Add season" }));
    const editor = within(seasons()).getByRole("group", { name: "New season" });
    await fill(within(editor).getByLabelText("From"), "2026-08-20", user);
    await fill(within(editor).getByLabelText("To"), "2026-08-05", user);

    expect(within(editor).getByText("Overlaps Summer hours")).toBeInTheDocument();
    expect(within(editor).getByText("Ends before it starts")).toBeInTheDocument();
    expect(within(editor).getByRole("button", { name: "Add season" })).toBeDisabled();

    await fill(within(editor).getByLabelText("From"), "2026-09-01", user);
    await fill(within(editor).getByLabelText("To"), "2026-09-30", user);
    expect(within(editor).queryByText(/Overlaps/)).toBeNull();
    expect(within(editor).getByRole("button", { name: "Add season" })).toBeEnabled();
  });

  it("se edita y se borra", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await openLounge();
    await service.from("lounge_seasons").insert({ lounge_id: id, name: "Summer hours", starts_on: "2026-06-01", ends_on: "2026-08-31", weekly_hours: Array(7).fill("9 AM – 11 PM") });
    await renderLounge();

    const row = await within(seasons()).findByRole("listitem", { name: /Summer hours/ });
    await user.click(within(row).getByRole("button", { name: "Edit Summer hours" }));
    const editor = within(seasons()).getByRole("group", { name: "Edit season" });
    await fill(within(editor).getByLabelText("Name · optional"), "Summer 2026", user);
    await user.click(within(editor).getByRole("button", { name: "Save season" }));
    await within(seasons()).findByRole("listitem", { name: /Summer 2026/ });

    await user.click(within(seasons()).getByRole("button", { name: "Delete Summer 2026" }));
    await within(seasons()).findByText("No seasons");
    const { data } = await service.from("lounge_seasons").select("id").eq("lounge_id", id);
    expect(data).toEqual([]);
  });
});

describe("cierres especiales", () => {
  it("se añade un cierre con motivo y reapertura, con la vista previa del miembro", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await openLounge();
    await renderLounge();

    await user.click(within(closures()).getByRole("button", { name: "Add closure" }));
    const editor = within(closures()).getByRole("group", { name: "New closure" });
    await fill(within(editor).getByLabelText("From"), "2025-09-12", user);
    await fill(within(editor).getByLabelText("To"), "2025-09-13", user);
    // Por defecto reabre el siguiente día abierto, a su hora de apertura.
    expect(within(editor).getByLabelText("Reopens on")).toHaveValue("2025-09-14");
    expect(within(editor).getByLabelText("Reopens at")).toHaveValue("10:00 AM");
    await user.type(within(editor).getByLabelText("Reason · members see it"), "Private event");
    expect(within(editor).getByText(/Closed Fri Sep 12 – Sat Sep 13 for Private event/)).toBeInTheDocument();
    await user.click(within(editor).getByRole("button", { name: "Add closure" }));

    const row = await within(closures()).findByRole("listitem", { name: /Private event/ });
    expect(within(row).getByText(/Reopens Sun Sep 14 at 10:00 AM/)).toBeInTheDocument();
    const { data } = await service.from("lounge_closures").select("starts_on, ends_on, reason, reopens_label").eq("lounge_id", id);
    expect(data).toEqual([{ starts_on: "2025-09-12", ends_on: "2025-09-13", reason: "Private event", reopens_label: "Reopens Sun Sep 14 at 10:00 AM" }]);
    expect(await contentStatus(id)).toBe("live");
  });

  it("si cae sobre reservas confirmadas, avisa con la lista y solo guarda al confirmar", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await openLounge();
    const { data: member } = await service.auth.admin.createUser({ email: `schedule-ui-member-${stamp}@ensoleil-test.com`, email_confirm: true });
    await service.from("profiles").insert({ id: member.user!.id, full_name: "Marcus Bell", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
    await service.from("bookings").insert({ member_id: member.user!.id, lounge_id: id, date: "2025-09-12", band: "afternoon", slot_time: "3:30 PM" });
    await renderLounge();

    await user.click(within(closures()).getByRole("button", { name: "Add closure" }));
    const editor = within(closures()).getByRole("group", { name: "New closure" });
    await fill(within(editor).getByLabelText("From"), "2025-09-12", user);
    await fill(within(editor).getByLabelText("To"), "2025-09-13", user);
    await user.type(within(editor).getByLabelText("Reason · members see it"), "Private event");
    await user.click(within(editor).getByRole("button", { name: "Add closure" }));

    const dialog = await findDialog({ name: "1 confirmed booking falls in this closure" });
    expect(within(dialog).getByText("Marcus Bell")).toBeInTheDocument();
    expect(within(dialog).getByText(/Fri Sep 12 · 3:30 PM/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await service.from("lounge_closures").select("id").eq("lounge_id", id)).data).toEqual([]);

    // Radix devuelve los eventos de puntero a la página un instante después de cerrar.
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"));
    const again = await waitFor(() => within(closures()).getByRole("button", { name: "Add closure" }));
    await user.click(again);
    await user.click(within(await findDialog()).getByRole("button", { name: "Save anyway" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await within(closures()).findByRole("listitem", { name: /Private event/ });
    expect((await service.from("lounge_closures").select("id").eq("lounge_id", id)).data).toHaveLength(1);
  });

  it("se borra", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await openLounge();
    await service.from("lounge_closures").insert({ lounge_id: id, starts_on: "2025-09-12", ends_on: "2025-09-13", reason: "Works", reopens_label: "", posted_on: "2025-09-09" });
    await renderLounge();

    await user.click(await within(closures()).findByRole("button", { name: "Delete Works" }));
    await within(closures()).findByText("No special closures");
  });
});

/** El horario semanal de `openLounge`, domingo primero. */
const HOURS = ["10 AM – 10 PM", "8 AM – 10 PM", "8 AM – 10 PM", "8 AM – 10 PM", "8 AM – 10 PM", "8 AM – 10 PM", "10 AM – 10 PM"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Fri 12", como nombra cada fila de "Next 7 days". */
const dayName = (iso: string) => new RegExp(`${WEEKDAYS[weekdayOf(iso)]} ${Number(iso.slice(8))}(?!\\d)`);

describe("los próximos días", () => {
  it("muestra qué horario usa cada día: cierre, temporada o el habitual", async () => {
    const id = await openLounge();
    /** Cierre de dos días a partir de pasado mañana, con el reloj real. */
    const todayIso = today();
    const closedFrom = addDays(todayIso, 3);
    const reopensOn = addDays(todayIso, 5);
    await service.from("lounge_closures").insert({ lounge_id: id, starts_on: closedFrom, ends_on: addDays(todayIso, 4), reason: "Private event", reopens_label: "", posted_on: todayIso });
    await renderLounge();

    const week = screen.getByRole("list", { name: "Next 7 days" });
    await waitFor(() => expect(within(week).getByRole("listitem", { name: dayName(closedFrom) })).toHaveTextContent(/Closed.*Private event/));
    expect(within(week).getByRole("listitem", { name: dayName(todayIso) })).toHaveTextContent(HOURS[weekdayOf(todayIso)]);
    expect(within(week).getByRole("listitem", { name: dayName(reopensOn) })).toHaveTextContent(new RegExp(`${HOURS[weekdayOf(reopensOn)]}.*Reopens`));
  });
});

describe("en un borrador", () => {
  it("también se gestionan temporadas y cierres", async () => {
    await openLounge("draft");
    await renderLounge();
    expect(within(seasons()).getByRole("button", { name: "Add season" })).toBeInTheDocument();
    expect(within(closures()).getByRole("button", { name: "Add closure" })).toBeInTheDocument();
  });
});
