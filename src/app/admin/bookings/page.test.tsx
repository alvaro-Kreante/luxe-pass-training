import { render, screen, waitFor, within } from "@testing-library/react";
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
// Las reservas que cambian de status van a la franja de tarde-noche (6:00 PM),
// fuera de lo que comprueban los tests de lista y aforo.
const fay = `Fay Overview ${stamp}`;
const gus = `Gus Overview ${stamp}`;
const hal = `Hal Overview ${stamp}`;
const ivy = `Ivy Overview ${stamp}`;
const partnerName = `Bookings Partner ${stamp}`;
const refs: Record<string, string> = {};

async function createMember(name: string) {
  const client = createClient();
  const user = await signUpConfirmedMemberAndSignIn(
    client,
    `bookings-overview-${name.split(" ")[0].toLowerCase()}-${stamp}@ensoleil-test.example`,
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
  const { data: partner, error: partnerError } = await admin.from("partners").insert({ name: partnerName }).select("id").single();
  if (partnerError) throw partnerError;
  const { error } = await admin.from("lounges").insert([
    { id: loungeA, name: loungeAName, ...lounge },
    { id: loungeB, name: loungeBName, partner_id: partner.id, ...lounge },
  ]);
  if (error) throw error;

  await book(ada, { lounge_id: loungeA, date: day, band: "morning", slot_time: "8:00 AM", status: "confirmed" });
  await book(ben, { lounge_id: loungeA, date: day, band: "morning", slot_time: "10:30 AM", status: "in_progress", checked_in_at: new Date().toISOString() });
  await book(cleo, { lounge_id: loungeA, date: day, band: "afternoon", slot_time: "1:00 PM", status: "cancelled", cancelled_at: new Date().toISOString() });
  await book(dora, { lounge_id: loungeB, date: day, band: "morning", slot_time: "8:00 AM", status: "completed", no_show: true });
  await book(eli, { lounge_id: loungeA, date: nextDay, band: "evening", slot_time: "6:00 PM", status: "confirmed" });
  const evening = { lounge_id: loungeA, date: day, band: "evening", slot_time: "6:00 PM" };
  await book(fay, { ...evening, status: "confirmed" });
  await book(gus, { ...evening, status: "confirmed" });
  await book(hal, { ...evening, status: "completed", no_show: true, cancellation_fee_cents: 3500 });
  await book(ivy, { ...evening, status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_fee_cents: 3500 });

  await signUpConfirmedAdminAndSignIn(createClient(), `bookings-overview-admin-${stamp}@ensoleil-test.example`, "SupportDesk!24");
});

afterAll(async () => {
  await createClient().auth.signOut();
});

type User = ReturnType<typeof userEvent.setup>;

/** El lounge se elige escribiendo su nombre y pulsando la sugerencia. */
async function chooseLounge(user: User, name: string) {
  const field = screen.getByRole("combobox", { name: "Lounge" });
  await user.clear(field);
  if (name !== "All lounges") await user.type(field, name);
  else await user.click(field);
  await user.click(await screen.findByRole("option", { name }));
}

async function renderPage() {
  const user = userEvent.setup({ delay: null });
  render(<AdminBookingsPage />);
  await screen.findByRole("heading", { name: "Who is coming" });
  await chooseLounge(user, loungeAName);
  await screen.findByText(ada);
  return user;
}

async function openBooking(user: User, name: string) {
  await user.click(screen.getByRole("button", { name: new RegExp(refs[name]) }));
  await screen.findByRole("heading", { name: "Modify booking" });
}

async function changeStatus(user: User, status: string) {
  await user.click(screen.getByRole("radio", { name: "Change the status" }));
  await user.click(screen.getByRole("radio", { name: new RegExp(`^${status}`) }));
  await user.click(screen.getByRole("button", { name: "Apply change" }));
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Modify booking" })).not.toBeInTheDocument());
}

async function bookingOwner(name: string): Promise<string> {
  const { data } = await admin.from("bookings").select("member_id").eq("confirmation_code", refs[name]).single();
  return data!.member_id;
}

async function bookingRow(name: string) {
  const { data } = await admin
    .from("bookings")
    .select("id, status, no_show, checked_in_at, cancelled_at, cancellation_fee_cents")
    .eq("confirmation_code", refs[name])
    .single();
  return data!;
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

    await chooseLounge(user, "All lounges");
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

  it("finds a lounge by typing part of its name", async () => {
    const user = await renderPage();
    const field = screen.getByRole("combobox", { name: "Lounge" });

    await user.clear(field);
    await user.type(field, `lounge b ${stamp}`);
    expect(screen.getByRole("option", { name: loungeBName })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: loungeAName })).not.toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: loungeBName }));
    expect(await screen.findByText(dora)).toBeInTheDocument();
    expect(screen.queryByText(ada)).not.toBeInTheDocument();
  });

  it("filters by partner", async () => {
    const user = await renderPage();

    await chooseLounge(user, "All lounges");
    await screen.findByText(dora);
    await user.selectOptions(screen.getByRole("combobox", { name: "Partner" }), partnerName);
    expect(screen.getByText(dora)).toBeInTheDocument();
    expect(screen.queryByText(ada)).not.toBeInTheDocument();
  });
});

describe("choosing a date", () => {
  it("jumps to a specific date picked from the calendar", async () => {
    const user = await renderPage();

    await user.click(screen.getByRole("button", { name: /Choose a date/ }));
    if (nextDay.slice(0, 7) !== day.slice(0, 7)) await user.click(screen.getByRole("button", { name: "Next month" }));
    await user.click(screen.getByRole("button", { name: String(Number(nextDay.slice(8))) }));

    expect(await screen.findByText(eli)).toBeInTheDocument();
    expect(screen.queryByText(fay)).not.toBeInTheDocument();
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

    await chooseLounge(user, "All lounges");
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

  it("applies a reschedule to the opened booking", async () => {
    const user = await renderPage();

    await user.click(screen.getByRole("button", { name: new RegExp(refs[ada]) }));
    await screen.findByRole("heading", { name: "Modify booking" });
    await user.click(await screen.findByRole("button", { name: /^3:30 PM/ }));
    await user.click(screen.getByRole("button", { name: "Apply change" }));

    expect(await screen.findByRole("group", { name: /3:30 PM/ })).toHaveTextContent(ada);
    expect(screen.queryByText(/Booking not found/)).not.toBeInTheDocument();
  });
});

describe("changing the status", () => {
  it("marks a confirmed booking as checked in", async () => {
    const user = await renderPage();

    await openBooking(user, fay);
    await changeStatus(user, "Checked in");

    expect(await within(rowOf(fay)).findByText("Checked in")).toBeInTheDocument();
    const row = await bookingRow(fay);
    expect(row.status).toBe("in_progress");
    expect(row.checked_in_at).not.toBeNull();
  });

  it("marks a no-show without recording a fee or opening a support case", async () => {
    const user = await renderPage();

    await openBooking(user, gus);
    await changeStatus(user, "No-show");

    expect(await within(rowOf(gus)).findByText("No-show")).toBeInTheDocument();
    const row = await bookingRow(gus);
    expect(row.no_show).toBe(true);
    expect(row.cancellation_fee_cents).toBeNull();
    const { data: tickets } = await admin.from("support_tickets").select("id").eq("booking_id", row.id);
    expect(tickets).toHaveLength(0);
  });

  it("clears the no-show fee when a no-show goes back to confirmed", async () => {
    const user = await renderPage();

    await openBooking(user, hal);
    await changeStatus(user, "Confirmed");

    expect(await within(rowOf(hal)).findByText("Confirmed")).toBeInTheDocument();
    const row = await bookingRow(hal);
    expect(row.status).toBe("confirmed");
    expect(row.no_show).toBe(false);
    expect(row.cancellation_fee_cents).toBeNull();
  });

  it("brings a cancelled booking back to confirmed and clears its fee", async () => {
    const user = await renderPage();

    await openBooking(user, ivy);
    await changeStatus(user, "Confirmed");

    expect(await within(rowOf(ivy)).findByText("Confirmed")).toBeInTheDocument();
    const row = await bookingRow(ivy);
    expect(row.status).toBe("confirmed");
    expect(row.cancelled_at).toBeNull();
    expect(row.cancellation_fee_cents).toBeNull();
  });

  it("refuses to bring a cancelled booking back into a full band without the override", async () => {
    const client = createClient();
    const { data: lounge } = await admin.from("lounges").select("capacity").eq("id", loungeA).single();
    await admin.from("lounges").update({ capacity: 0 }).eq("id", loungeA);
    const { data: cancelled } = await admin
      .from("bookings")
      .insert({ member_id: (await bookingOwner(cleo)), lounge_id: loungeA, date: day, band: "evening", slot_time: "6:00 PM", status: "cancelled" })
      .select("id")
      .single();

    const refused = await client.rpc("admin_set_booking_status", { p_booking_id: cancelled!.id, p_status: "confirmed", p_override: false });
    const forced = await client.rpc("admin_set_booking_status", { p_booking_id: cancelled!.id, p_status: "confirmed", p_override: true });
    await admin.from("lounges").update({ capacity: lounge!.capacity }).eq("id", loungeA);

    expect(refused.error?.message).toMatch(/No seats left/);
    expect(forced.error).toBeNull();
  });
});

describe("a booking that no longer exists", () => {
  it("reloads the list and says so instead of failing silently", async () => {
    const user = await renderPage();

    await openBooking(user, ada);
    await admin.from("bookings").delete().eq("confirmation_code", refs[ada]);
    await user.click(screen.getByRole("button", { name: "Apply change" }));

    expect(await screen.findByText(/no longer exists/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Modify booking" })).not.toBeInTheDocument());
    expect(screen.queryByText(ada)).not.toBeInTheDocument();
  });
});

describe("access", () => {
  it("refuses the bookings list to a member", async () => {
    const client = createClient();
    await signUpConfirmedMemberAndSignIn(client, `bookings-overview-intruder-${stamp}@ensoleil-test.example`, "EnSoleil!2026");

    const { error } = await client.rpc("admin_bookings_on", { p_date: day });
    expect(error?.message).toMatch(/Not authorized/);

    await client.auth.signInWithPassword({ email: `bookings-overview-admin-${stamp}@ensoleil-test.example`, password: "SupportDesk!24" });
  });
});
