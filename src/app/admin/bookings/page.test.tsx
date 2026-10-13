import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { addDays, today } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import AdminBookingsPage from "./page";

/**
 * Story 8.4 — Bookings Overview. Backend real: `admin_bookings_on`
 * (`supabase/schemas/support_tickets.sql`). Corre contra el Supabase local;
 * los lounges `test-…` aíslan los datos de esta corrida de los del seed.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/bookings",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const stamp = Date.now();
const day = today();
const nextDay = addDays(day, 1);
const loungeA = `test-lounge-bookings-a-${stamp}`;
const loungeB = `test-lounge-bookings-b-${stamp}`;
const loungeAName = `Bookings Lounge A ${stamp}`;
const loungeBName = `Bookings Lounge B ${stamp}`;
const ada = `Ada Overview ${stamp}`;
const ben = `Ben Overview ${stamp}`;
const cleo = `Cleo Overview ${stamp}`;
const dora = `Dora Overview ${stamp}`;
const eli = `Eli Overview ${stamp}`;
const refs: Record<string, string> = {};

async function createMember(name: string) {
  const client = createClient();
  const user = await signUpConfirmedMemberAndSignIn(
    client,
    `bookings-overview-${name.split(" ")[0].toLowerCase()}-${stamp}@ensoleil-test.com`,
    "EnSoleil!2026",
    { fullName: name },
  );
  await client.auth.signOut();
  return user.id;
}

async function book(name: string, fields: Record<string, unknown>) {
  const { data, error } = await admin
    .from("bookings")
    .insert({ member_id: await createMember(name), ...fields })
    .select("confirmation_code")
    .single();
  if (error) throw error;
  refs[name] = data.confirmation_code;
}

beforeAll(async () => {
  const lounge = { neighborhood: "Test Neighborhood", city: "Test City", city_id: "test-city", lat: 0, lng: 0, hours: "Open 24 hours", bands: ["morning", "afternoon", "evening"], capacity: 40 };
  const { error } = await admin.from("lounges").insert([
    { id: loungeA, name: loungeAName, ...lounge },
    { id: loungeB, name: loungeBName, ...lounge },
  ]);
  if (error) throw error;

  await book(ada, { lounge_id: loungeA, date: day, band: "morning", slot_time: "8:00 AM", status: "confirmed" });
  await book(ben, { lounge_id: loungeA, date: day, band: "morning", slot_time: "10:30 AM", status: "in_progress", checked_in_at: new Date().toISOString() });
  await book(cleo, { lounge_id: loungeA, date: day, band: "afternoon", slot_time: "1:00 PM", status: "cancelled", cancelled_at: new Date().toISOString() });
  await book(dora, { lounge_id: loungeB, date: day, band: "morning", slot_time: "8:00 AM", status: "completed", no_show: true });
  await book(eli, { lounge_id: loungeA, date: nextDay, band: "evening", slot_time: "6:00 PM", status: "confirmed" });

  await signUpConfirmedAdminAndSignIn(createClient(), `bookings-overview-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await createClient().auth.signOut();
});

async function renderPage() {
  const user = userEvent.setup({ delay: null });
  render(<AdminBookingsPage />);
  await screen.findByRole("heading", { name: "Who is coming" });
  await screen.findByRole("option", { name: loungeAName });
  await user.selectOptions(screen.getByRole("combobox", { name: "Lounge" }), loungeA);
  await screen.findByText(ada);
  return user;
}

function rowOf(name: string) {
  return screen.getByText(name).closest("[data-booking-row]") as HTMLElement;
}

describe("the day's bookings", () => {
  it("opens on today and lists that day's bookings with time, member, reference, lounge and status", async () => {
    await renderPage();

    expect(screen.getByText(/Today/)).toBeInTheDocument();
    const row = rowOf(ada);
    expect(within(row).getByText(refs[ada])).toBeInTheDocument();
    expect(within(row).getByText(loungeAName)).toBeInTheDocument();
    expect(within(row).getByText("Confirmed")).toBeInTheDocument();
    expect(within(rowOf(ben)).getByText("Checked in")).toBeInTheDocument();
    expect(within(rowOf(cleo)).getByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByText(eli)).not.toBeInTheDocument();
  });

  it("groups bookings by arrival time with a count for each", async () => {
    await renderPage();

    const group = screen.getByRole("group", { name: /8:00 AM/ });
    expect(within(group).getByText(ada)).toBeInTheDocument();
    expect(group).toHaveTextContent(/AM1 booking(?!s)/);
    expect(within(screen.getByRole("group", { name: /10:30 AM/ })).getByText(ben)).toBeInTheDocument();
  });

  it("moves to the next and previous day", async () => {
    const user = await renderPage();

    await user.click(screen.getByRole("button", { name: "Next day" }));
    expect(await screen.findByText(eli)).toBeInTheDocument();
    expect(screen.queryByText(ada)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous day" }));
    expect(await screen.findByText(ada)).toBeInTheDocument();
  });
});

describe("filters", () => {
  it("shows every lounge's bookings with All lounges", async () => {
    const user = await renderPage();

    await user.selectOptions(screen.getByRole("combobox", { name: "Lounge" }), "");
    expect(await screen.findByText(dora)).toBeInTheDocument();
    expect(within(rowOf(dora)).getByText("No-show")).toBeInTheDocument();
    expect(screen.getByText(ada)).toBeInTheDocument();
  });

  it("keeps only the chosen lounge's bookings", async () => {
    await renderPage();

    expect(screen.queryByText(dora)).not.toBeInTheDocument();
  });

  it("filters by status", async () => {
    const user = await renderPage();

    await user.click(screen.getByRole("button", { name: /^Checked in/ }));
    expect(screen.getByText(ben)).toBeInTheDocument();
    expect(screen.queryByText(ada)).not.toBeInTheDocument();
    expect(screen.queryByText(cleo)).not.toBeInTheDocument();
  });

  it("searches by member name or booking reference", async () => {
    const user = await renderPage();
    const search = screen.getByRole("searchbox", { name: "Member name or LP reference" });

    await user.type(search, "cleo overview");
    expect(screen.getByText(cleo)).toBeInTheDocument();
    expect(screen.queryByText(ada)).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, refs[ben]);
    expect(screen.getByText(ben)).toBeInTheDocument();
    expect(screen.queryByText(cleo)).not.toBeInTheDocument();
  });
});

describe("capacity", () => {
  it("shows seats taken against capacity for each band when one lounge is selected", async () => {
    await renderPage();

    // Ada (confirmed) y Ben (in progress) ocupan plaza de mañana; Cleo canceló.
    expect(await screen.findByText(/Morning · 2 of 40/)).toBeInTheDocument();
    expect(screen.getByText(/Afternoon · 0 of 40/)).toBeInTheDocument();
  });

  it("hides band capacity with All lounges", async () => {
    const user = await renderPage();

    await user.selectOptions(screen.getByRole("combobox", { name: "Lounge" }), "");
    await screen.findByText(dora);
    expect(screen.queryByText(/Morning · \d+ of/)).not.toBeInTheDocument();
  });
});

describe("acting on a booking", () => {
  it("opens the booking modification drawer from a booking", async () => {
    const user = await renderPage();

    await user.click(screen.getByRole("button", { name: new RegExp(refs[ada]) }));
    expect(await screen.findByRole("heading", { name: "Modify booking" })).toBeInTheDocument();
  });
});

describe("access", () => {
  it("refuses the bookings list to a member", async () => {
    const client = createClient();
    await signUpConfirmedMemberAndSignIn(client, `bookings-overview-intruder-${stamp}@ensoleil-test.com`, "EnSoleil!2026");

    const { error } = await client.rpc("admin_bookings_on", { p_date: day });
    expect(error?.message).toMatch(/Not authorized/);

    await client.auth.signInWithPassword({ email: `bookings-overview-admin-${stamp}@ensoleil-test.com`, password: "SupportDesk!24" });
  });
});
