import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { today, addDays } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn, signUpConfirmedPartnerAndSignIn } from "@/lib/testing/confirmed-user";

import RepeatGuestsPage from "./page";

/**
 * Story 7.3 — "Repeat guest identification: loyalty trackers" y
 * "downloadable reports in CSV". Artboard: RepeatGuests.dc.html.
 *
 * Backend real (22 sept 2026): `partner_repeat_guests`
 * (`supabase/schemas/partner_analytics.sql`). Mismo patrón que
 * `analytics/page.test.tsx` — un lounge efímero propio de este archivo para
 * que "N members visited" sea una cifra exacta y no acumule reservas de
 * otras corridas/lounges reales.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/partner/guests",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

beforeEach(() => {
  vi.clearAllMocks();
});

let regularName: string;
let returningName: string;
let firstVisitName: string;
let loungeId: string;
const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

afterAll(async () => {
  // Mismo motivo que en analytics/page.test.tsx: sin borrar el lounge
  // efímero, `lounge-directory.test.ts` cuenta una fila de más en el
  // catálogo compartido de Epic 2.
  if (!loungeId) return;
  // Story 10.1 — el lounge efímero trae su propio partner de test: se borra con él.
  const { data: lounge } = await admin.from("lounges").select("partner_id").eq("id", loungeId).maybeSingle();
  await admin.from("lounges").delete().eq("id", loungeId);
  if (lounge?.partner_id) await admin.from("partners").delete().eq("id", lounge.partner_id);
});

beforeAll(async () => {
  const stamp = Date.now();
  loungeId = `test-lounge-guests-${stamp}`;

  const { error: loungeError } = await admin.from("lounges").insert({
    id: loungeId,
    name: "Guests Test Lounge",
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
  });
  if (loungeError) throw loungeError;

  regularName = `Regular Guest ${stamp}`;
  returningName = `Returning Guest ${stamp}`;
  firstVisitName = `Elena FirstVisit ${stamp}`;

  async function createMemberWithVisits(name: string, visitCount: number) {
    const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@ensoleil-test.example`;
    const member = createClient();
    await signUpConfirmedMemberAndSignIn(member, email, "EnSoleil!2026");
    const {
      data: { user },
    } = await member.auth.getUser();
    await member.from("profiles").update({ full_name: name }).eq("id", user!.id);
    await member.auth.signOut();

    const rows = Array.from({ length: visitCount }, (_, i) => ({
      member_id: user!.id,
      lounge_id: loungeId,
      date: addDays(today(), -i),
      band: "morning",
      slot_time: "8:00 AM",
      status: "confirmed",
      no_show: false,
      special_requests: "",
    }));
    const { data, error } = await admin.from("bookings").insert(rows).select("id, date");
    if (error) throw error;
    return { memberId: user!.id, bookings: data! };
  }

  await createMemberWithVisits(regularName, 5);
  const returning = await createMemberWithVisits(returningName, 2);

  // Historial del drawer: un pase cobrado, un check-in, un no-show y una cancelación.
  const [paid, arrived] = returning.bookings;
  await admin.from("bookings").update({ checked_in_at: new Date().toISOString(), status: "in_progress" }).eq("id", arrived.id);
  const { error: paymentError } = await admin.from("payments").insert({
    member_id: returning.memberId,
    booking_id: paid.id,
    amount_cents: 8025,
    status: "succeeded",
  });
  if (paymentError) throw paymentError;
  const { error: extraError } = await admin.from("bookings").insert([
    { member_id: returning.memberId, lounge_id: loungeId, date: addDays(today(), -10), band: "morning", slot_time: "10:30 AM", status: "completed", no_show: true, special_requests: "" },
    { member_id: returning.memberId, lounge_id: loungeId, date: addDays(today(), -20), band: "morning", slot_time: "8:00 AM", status: "cancelled", no_show: false, special_requests: "" },
  ]);
  if (extraError) throw extraError;
  await createMemberWithVisits(firstVisitName, 1);

  const partner = createClient();
  await signUpConfirmedPartnerAndSignIn(partner, `guests-partner-${stamp}@theainsworth-test.example`, "AinsworthFOH!24", {
    businessName: "Guests Test Venue",
    loungeIds: [loungeId],
  });
});

describe("RepeatGuests.dc.html", () => {
  it("resume el total de miembros y la tasa de repetición", async () => {
    render(<RepeatGuestsPage />);

    expect(await screen.findByText("3 members visited")).toBeVisible();
    expect(screen.getByText("2 came back at least once")).toBeVisible();
    expect(screen.getByText("66.7% return rate")).toBeVisible();
  });

  it("marca el nivel de lealtad de cada invitado", async () => {
    render(<RepeatGuestsPage />);

    await screen.findByText(regularName);
    expect(screen.getAllByText("Regular").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Returning").length).toBeGreaterThan(0);
    expect(screen.getAllByText("First visit").length).toBeGreaterThan(0);
  });

  it("filtra por nombre", async () => {
    const user = userEvent.setup({ delay: null });
    render(<RepeatGuestsPage />);

    await screen.findByText(firstVisitName);
    await user.type(screen.getByLabelText("Search guests"), firstVisitName);

    expect(screen.getByText(firstVisitName)).toBeVisible();
    expect(screen.queryByText(regularName)).not.toBeInTheDocument();
  });

  it('"Came back" excluye a quien solo tiene una visita', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RepeatGuestsPage />);

    await screen.findByText(firstVisitName);
    await user.click(screen.getByRole("button", { name: "Came back" }));

    expect(screen.queryByText(firstVisitName)).not.toBeInTheDocument();
    expect(screen.getByText(regularName)).toBeVisible();
  });

  it('"Export CSV" descarga la lista de invitados recurrentes', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RepeatGuestsPage />);

    await screen.findByText(regularName);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toMatch(/\.csv$/);
  });
});

describe("Ficha del invitado (GuestDetail.dc.html reutilizado)", () => {
  it("al pulsar un invitado muestra su historial: lounge, importe cobrado y estado", async () => {
    const user = userEvent.setup({ delay: null });
    render(<RepeatGuestsPage />);

    await user.click(await screen.findByRole("button", { name: new RegExp(returningName) }));

    const drawer = await screen.findByRole("dialog", { name: returningName });
    const history = await within(drawer).findByRole("list", { name: "Visit history" });
    const items = within(history).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(history).getAllByText("Guests Test Lounge")).toHaveLength(4);
    expect(within(history).getByText("$80.25")).toBeVisible();
    expect(within(history).getByText("Arrived")).toBeVisible();
    expect(within(history).getByText("No-show")).toBeVisible();
    expect(within(history).getByText("Cancelled")).toBeVisible();
  });
});
