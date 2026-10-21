import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import PartnerDetailPage from "./page";
import { findDialog } from "@/lib/testing/find-dialog";

/**
 * Story 10.11 · PartnerBulkSelect (28) … PartnerBulkResult (34): elegir
 * varios lounges del partner y cambiarles a la vez el status, el horario,
 * una temporada o un cierre. Lo que no admite el cambio se salta con su
 * motivo y el resto se aplica. Story 10.12: la selección sobrevive a la
 * búsqueda.
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
const stamp = Date.now();
let count = 0;

const complete = {
  phone: "+1 212 555 0100",
  email: "hello@ainsworth-test.example",
  address: "1 Main St",
  capacity: 20,
  weekly_hours: Array(7).fill("8 AM – 10 PM"),
};

/** Partner activo con un live, un suspendido, dos borradores listos y uno incompleto. */
async function partnerWithLounges() {
  count += 1;
  const { data: partner, error } = await service
    .from("partners")
    .insert({ name: `Ainsworth Collection ${stamp} ${count}`, status: "active", contact_email: "hello@ainsworth-test.example" })
    .select("id")
    .single();
  if (error) throw error;
  const base = { neighborhood: "Midtown", city: "New York", city_id: "new-york", lat: 0, lng: 0, hours: "Open", bands: ["morning"], partner_id: partner.id };
  const id = (slug: string) => `test-lounge-bulk-ui-${stamp}-${count}-${slug}`;
  const rows = [
    { ...base, ...complete, id: id("ainsworth"), name: "The Ainsworth", content_status: "live" },
    { ...base, ...complete, id: id("hudson"), name: "Ainsworth Hudson Yards", content_status: "suspended", suspended_by: "admin" },
    { ...base, ...complete, id: id("tribeca"), name: "Ainsworth Tribeca", content_status: "draft" },
    { ...base, ...complete, id: id("soho"), name: "Ainsworth SoHo", capacity: 0, content_status: "draft" },
    { ...base, ...complete, id: id("brooklyn"), name: "Ainsworth Brooklyn Heights", city: "Brooklyn", content_status: "draft" },
  ];
  const { error: loungeError } = await service.from("lounges").insert(rows);
  if (loungeError) throw loungeError;
  currentId = partner.id;
  render(<PartnerDetailPage />);
  await screen.findByRole("listitem", { name: /Ainsworth Brooklyn Heights/ });
  return { partnerId: partner.id as string, id };
}

function lounges() {
  return screen.getByRole("list", { name: "Lounges" });
}

function row(name: string) {
  return within(lounges()).getByRole("listitem", { name: new RegExp(name) });
}

async function select(user: ReturnType<typeof userEvent.setup>, ...names: string[]) {
  for (const name of names) await user.click(within(row(name)).getByRole("checkbox", { name: `Select ${name}` }));
}

async function status(id: string) {
  const { data } = await service.from("lounges").select("content_status").eq("id", id).single();
  return data?.content_status;
}

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(createClient(), `bulk-ui-admin-${stamp}@ensoleil-test.example`, "SupportDesk!24");
});

afterAll(async () => {
  await service.from("lounges").delete().like("id", `test-lounge-bulk-ui-${stamp}-%`);
  await service.from("partners").delete().like("name", `Ainsworth Collection ${stamp} %`);
});

describe("seleccionar lounges", () => {
  it("una casilla por lounge, seleccionar todos los que se ven, y la selección sobrevive a la búsqueda (Story 10.12)", async () => {
    const user = userEvent.setup({ delay: null });
    await partnerWithLounges();

    await select(user, "Ainsworth Tribeca", "Ainsworth Brooklyn Heights");
    expect(screen.getByText("2 lounges selected")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Search this partner's lounges" }), "new york");
    expect(screen.getByText("2 lounges selected")).toBeInTheDocument();
    expect(screen.getByText("1 hidden by the search")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Select all shown/ }));
    expect(screen.getByText("5 lounges selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByText(/lounges? selected/)).toBeNull();
  });
});

describe("cambiar el status", () => {
  it("publicar avisa de los que no pueden, confirma y aplica al resto; los saltados siguen seleccionados", async () => {
    const user = userEvent.setup({ delay: null });
    const { id } = await partnerWithLounges();
    await select(user, "Ainsworth Tribeca", "Ainsworth SoHo", "Ainsworth Brooklyn Heights");

    await user.click(screen.getByRole("button", { name: "Change status" }));
    const modal = await findDialog({ name: "Set a new status" });
    await user.click(within(modal).getByRole("radio", { name: /^Live/ }));
    expect(within(modal).getByText(/2 ready to publish/)).toBeInTheDocument();
    expect(within(modal).getByText(/1 can't publish/)).toBeInTheDocument();
    await user.click(within(modal).getByRole("button", { name: "Review change" }));

    const confirm = await findDialog({ name: "Publish 2 of 3 lounges?" });
    expect(within(confirm).getByText(/Won't publish: checklist incomplete · Seats per time slot/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole("button", { name: "Publish 2 lounges" }));

    const result = await findDialog({ name: "Published in 2 of 3" }, { timeout: 10000 });
    expect(within(result).getByRole("link", { name: /Open lounge/ })).toHaveAttribute("href", `/admin/lounges/${id("soho")}`);
    await user.click(within(result).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    expect(await status(id("tribeca"))).toBe("live");
    expect(await status(id("brooklyn"))).toBe("live");
    expect(await status(id("soho"))).toBe("draft");
    expect(screen.getByText("1 lounge selected")).toBeInTheDocument();
    expect(within(row("Ainsworth SoHo")).getByRole("checkbox", { name: "Select Ainsworth SoHo" })).toBeChecked();
  });

  it("suspender aplica a los live y se salta los demás", async () => {
    const user = userEvent.setup({ delay: null });
    const { id } = await partnerWithLounges();
    await select(user, "The Ainsworth", "Ainsworth Tribeca");

    await user.click(screen.getByRole("button", { name: "Change status" }));
    const modal = await findDialog({ name: "Set a new status" });
    await user.click(within(modal).getByRole("radio", { name: /^Suspended/ }));
    await user.click(within(modal).getByRole("button", { name: "Review change" }));
    const confirm = await findDialog({ name: "Suspend 1 of 2 lounges?" });
    await user.click(within(confirm).getByRole("button", { name: "Suspend 1 lounge" }));

    await findDialog({ name: "Suspended in 1 of 2" }, { timeout: 10000 });
    expect(await status(id("ainsworth"))).toBe("suspended");
    expect(await status(id("tribeca"))).toBe("draft");
  });
});

describe("el mismo horario", () => {
  it("sustituye la semana habitual de todos los seleccionados", async () => {
    const user = userEvent.setup({ delay: null });
    const { id } = await partnerWithLounges();
    await select(user, "The Ainsworth", "Ainsworth Tribeca");

    await user.click(screen.getByRole("button", { name: "Set hours" }));
    const modal = await findDialog({ name: "Same weekly hours" });
    await user.selectOptions(within(modal).getByLabelText("Mon opens at"), "7:00 AM");
    await user.click(within(modal).getByRole("button", { name: "Review change" }));
    const confirm = await findDialog({ name: "Set hours in 2 lounges?" });
    await user.click(within(confirm).getByRole("button", { name: "Set hours in 2 lounges" }));

    await findDialog({ name: "Hours set in 2 of 2" }, { timeout: 10000 });
    for (const slug of ["ainsworth", "tribeca"]) {
      const { data } = await service.from("lounges").select("weekly_hours, content_status").eq("id", id(slug)).single();
      expect((data!.weekly_hours as string[])[1]).toBe("7:00 AM – 10:00 PM");
    }
    expect(await status(id("ainsworth"))).toBe("live");
  });
});

describe("la misma temporada", () => {
  it("se añade a los que no tienen una que choque y se salta el que sí", async () => {
    const user = userEvent.setup({ delay: null });
    const { id } = await partnerWithLounges();
    await service.from("lounge_seasons").insert({ lounge_id: id("brooklyn"), name: "Holiday season", starts_on: "2025-12-20", ends_on: "2026-01-04", weekly_hours: Array(7).fill("10 AM – 6 PM") });
    await select(user, "Ainsworth Tribeca", "Ainsworth Brooklyn Heights");

    await user.click(screen.getByRole("button", { name: "Add season" }));
    const modal = await findDialog({ name: "Same season everywhere" });
    await user.type(within(modal).getByLabelText("Name · optional"), "Holiday hours");
    await user.type(within(modal).getByLabelText("From"), "2025-12-22");
    await user.type(within(modal).getByLabelText("To"), "2026-01-02");
    expect(await within(modal).findByText(/Clashes with a season in 1 lounge/)).toBeInTheDocument();
    expect(within(modal).getByText(/Adds to 1 · skips 1/)).toBeInTheDocument();
    await user.click(within(modal).getByRole("button", { name: "Review change" }));
    const confirm = await findDialog({ name: "Add the season to 1 of 2 lounges?" });
    await user.click(within(confirm).getByRole("button", { name: "Add to 1 lounge" }));

    await findDialog({ name: "Season added in 1 of 2" }, { timeout: 10000 });
    const { data } = await service.from("lounge_seasons").select("lounge_id, name").in("lounge_id", [id("tribeca"), id("brooklyn")]).order("name");
    expect(data).toEqual([
      { lounge_id: id("tribeca"), name: "Holiday hours" },
      { lounge_id: id("brooklyn"), name: "Holiday season" },
    ]);
  });
});

describe("el mismo cierre", () => {
  it("avisa de las reservas confirmadas de cada lounge y lo añade a todos", async () => {
    const user = userEvent.setup({ delay: null });
    const { id } = await partnerWithLounges();
    const { data: member } = await service.auth.admin.createUser({ email: `bulk-ui-member-${stamp}-${count}@ensoleil-test.example`, email_confirm: true });
    await service.from("profiles").insert({ id: member.user!.id, full_name: "Alexandra Rivas", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
    await service.from("bookings").insert({ member_id: member.user!.id, lounge_id: id("ainsworth"), date: "2025-09-12", band: "morning", slot_time: "10:30 AM" });
    await select(user, "The Ainsworth", "Ainsworth Tribeca");

    await user.click(screen.getByRole("button", { name: "Add closure" }));
    const modal = await findDialog({ name: "Same closure everywhere" });
    await user.type(within(modal).getByLabelText("From"), "2025-09-12");
    await user.type(within(modal).getByLabelText("To"), "2025-09-13");
    await user.type(within(modal).getByLabelText("Reason · members see it"), "Private event");
    expect(await within(modal).findByText("1 confirmed booking falls in this closure")).toBeInTheDocument();
    expect(within(modal).getByText("Alexandra Rivas")).toBeInTheDocument();
    await user.click(within(modal).getByRole("button", { name: "Review change" }));
    const confirm = await findDialog({ name: "Add the closure to 2 lounges?" });
    await user.click(within(confirm).getByRole("button", { name: "Add to 2 lounges" }));

    await findDialog({ name: "Closure added in 2 of 2" }, { timeout: 10000 });
    const { data } = await service.from("lounge_closures").select("lounge_id, reason").in("lounge_id", [id("ainsworth"), id("tribeca")]);
    expect(data).toHaveLength(2);
  });
});
