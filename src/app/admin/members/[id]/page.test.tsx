import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { chargeSavedPaymentMethod, listSavedPaymentMethods } from "@/lib/stripe-payments";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { grantTestMembership } from "@/lib/testing/membership-fixture";
import { attachTestCard } from "@/lib/testing/stripe-fixture";

import MemberProfilePage from "./page";

/**
 * Story 8.1 — "Complete booking history view", "Payment transaction
 * details", "Account status and membership level" y "Booking modification
 * capabilities". Backend real (22 sept 2026):
 * `admin_member_profile`/`admin_member_bookings`/`admin_member_payments`
 * (`supabase/schemas/support_tickets.sql`).
 */

let currentId = "";
const params = { get id() { return currentId; } };

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/members/x",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: params.id }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function stripeCustomerIdFor(supabase: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  if (error) throw error;
  return data.stripe_customer_id as string;
}

let memberId: string;
let loungeId: string;
let adminEmail: string;
const ADMIN_PASSWORD = "SupportDesk!24";

async function signBackInAsAdmin() {
  const client = createClient();
  await client.auth.signInWithPassword({ email: adminEmail, password: ADMIN_PASSWORD });
}

const future = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const past = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

beforeAll(async () => {
  const stamp = Date.now();
  loungeId = `test-lounge-member-profile-${stamp}`;

  await admin.from("lounges").insert({
    id: loungeId,
    name: "Member Profile Test Lounge",
    neighborhood: "Test Neighborhood",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
  });

  const memberClient = createClient();
  const member = await signUpConfirmedMemberAndSignIn(
    memberClient,
    `member-profile-${stamp}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  memberId = member.id;
  // Desde Epic 9 un miembro nace sin membresía — "Active member" exige un
  // plan real en `memberships` (espejo en `profiles.membership_status`).
  await grantTestMembership(memberId, "annual");

  // Un pago real de Stripe (día pass, tarjeta guardada) — igual patrón que
  // stripe-payments.test.ts.
  await listSavedPaymentMethods(memberClient);
  const customerId = await stripeCustomerIdFor(memberClient, memberId);
  const paymentMethodId = await attachTestCard(customerId);
  const charge = await chargeSavedPaymentMethod(memberClient, {
    loungeId,
    dateIso: past,
    band: "morning",
    slotTime: "8:00 AM",
    specialRequests: "",
    paymentMethodId,
  });
  expect(charge.status).toBe("succeeded");
  await memberClient.auth.signOut();

  const { data: paidBooking } = await admin
    .from("bookings")
    .insert({
      member_id: memberId,
      lounge_id: loungeId,
      date: past,
      band: "morning",
      slot_time: "8:00 AM",
      status: "completed",
    })
    .select("id")
    .single();
  await admin.from("payments").update({ booking_id: paidBooking!.id }).eq("id", charge.paymentId);

  const { error: bookingsError } = await admin.from("bookings").insert([
    {
      member_id: memberId,
      lounge_id: loungeId,
      date: past,
      band: "afternoon",
      slot_time: "1:00 PM",
      status: "completed",
      no_show: true,
      cancellation_fee_cents: 3500,
    },
    {
      member_id: memberId,
      lounge_id: loungeId,
      date: future,
      band: "evening",
      slot_time: "6:00 PM",
      status: "confirmed",
      no_show: false,
      cancellation_fee_cents: null,
    },
  ]);
  if (bookingsError) throw bookingsError;

  adminEmail = `member-profile-admin-${stamp}@ensoleil-test.com`;
  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, adminEmail, ADMIN_PASSWORD);

  currentId = memberId;
});

afterAll(async () => {
  // Sin esto, `lounge-directory.test.ts` cuenta una fila de más en el
  // catálogo compartido de Epic 2 — mismo motivo que en
  // `booking-override-drawer.test.tsx`.
  await admin.from("lounges").delete().eq("id", loungeId);
});

describe("Member profile (/admin/members/[id])", () => {
  it("shows the membership level, account status and metric tiles", async () => {
    render(<MemberProfilePage />);

    expect(await screen.findByRole("heading", { name: "Test Member" })).toBeInTheDocument();
    expect(screen.getAllByText("Active member").length).toBeGreaterThan(0);
    // 3 bookings on file, none cancelled → 3 visits. La campana de la
    // topbar (patrón 21) también muestra un "3" decorativo fijo — se lee el
    // valor del tile por su propio label para no chocar con eso.
    expect(screen.getByText("Visits").nextElementSibling).toHaveTextContent("3");
    // Un no-show entre las tres.
    expect(screen.getByText("No-shows").nextElementSibling).toHaveTextContent("1");
    expect(screen.getAllByText("$81.66").length).toBeGreaterThan(0);
  });

  it("lists the complete booking history with status and charged amount", async () => {
    render(<MemberProfilePage />);

    await screen.findByRole("heading", { name: "Test Member" });
    expect(screen.getByText("No-show")).toBeInTheDocument();
    expect(screen.getByText("$35.00 fee")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("shows real Stripe payment transaction details in the rail, and a fee as recorded not charged", async () => {
    render(<MemberProfilePage />);

    await screen.findByRole("heading", { name: "Test Member" });
    expect(screen.getByText(/No-show fee · Member Profile Test Lounge/)).toBeInTheDocument();
    expect(screen.getByText(/recorded, not charged/)).toBeInTheDocument();
  });

  it("opens the booking override drawer from Modify booking", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MemberProfilePage />);

    await screen.findByRole("heading", { name: "Test Member" });
    await user.click(screen.getByRole("button", { name: "Modify booking" }));

    expect(screen.getByRole("heading", { name: "Modify booking" })).toBeInTheDocument();
  });

  it("exports the member's booking history as a CSV file", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MemberProfilePage />);

    await screen.findByRole("heading", { name: "Test Member" });
    await user.click(screen.getByRole("button", { name: "Export this member's history" }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename, csv] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toContain(memberId);
    expect(csv).toContain("confirmed");
  });

  it("hides Modify booking for a member without an upcoming confirmed visit", async () => {
    const stamp = Date.now();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: `no-upcoming-${stamp}@ensoleil-test.com`,
      password: "EnSoleil!2026",
      email_confirm: true,
    });
    if (createError) throw createError;
    await admin.from("profiles").insert({
      id: created.user.id,
      full_name: "No Upcoming Visits",
      phone: "+15555550199",
      city: "New York",
      industry: "Testing",
      terms_accepted_at: new Date().toISOString(),
    });
    await admin.from("bookings").insert({
      member_id: created.user.id,
      lounge_id: loungeId,
      date: past,
      band: "morning",
      slot_time: "8:00 AM",
      status: "completed",
    });
    await signBackInAsAdmin();
    currentId = created.user.id;

    render(<MemberProfilePage />);

    await screen.findByRole("heading", { name: "No Upcoming Visits" });
    expect(screen.queryByRole("button", { name: "Modify booking" })).not.toBeInTheDocument();
  });
});
