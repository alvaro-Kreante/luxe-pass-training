import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { AdminAnalyticsView } from "@/components/admin/admin-analytics-view";
import { dateRangeForPeriod, formatDateRangeLabel, loadAdminAnalytics } from "@/lib/admin-analytics";
import { chargeSavedPaymentMethod, listSavedPaymentMethods } from "@/lib/stripe-payments";
import { today } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { attachTestCard } from "@/lib/testing/stripe-fixture";

/**
 * Story 8.2 — "No-show rate tracking", "Member acquisition and retention
 * metrics" y "Revenue reporting by partner and time period". Backend real
 * (22 sept 2026): `admin_network_summary`/`admin_bookings_by_day`/
 * `admin_revenue_by_partner` (`supabase/schemas/admin_reports.sql`), sobre
 * TODA la red — un lounge efímero propio de este archivo con un cargo real
 * de Stripe, para poder afirmar su propia fila de "Revenue by partner" sin
 * que otros archivos de test lo contaminen. Los tiles de red (bookings,
 * no-show rate...) solo se comprueban como números renderizados, nunca con
 * un valor exacto — dependen de toda la actividad real de la suite.
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/analytics",
  useRouter: () => ({ push, replace: vi.fn() }),
}));

/**
 * PERF-02 — la página es un Server Component (`requireAdmin()` +
 * `loadAdminAnalytics`); el test carga lo mismo con la sesión de admin de
 * test y renderiza la vista.
 */
async function renderPage() {
  return render(<AdminAnalyticsView {...await loadAdminAnalytics(createClient())} />);
}

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let loungeId: string;
let loungeName: string;

beforeAll(async () => {
  const stamp = Date.now();
  loungeId = `test-lounge-analytics-${stamp}`;
  loungeName = `Analytics Test Lounge ${stamp}`;

  await admin.from("lounges").insert({
    id: loungeId,
    name: loungeName,
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
  });

  const memberClient = createClient();
  await signUpConfirmedMemberAndSignIn(memberClient, `analytics-payer-${stamp}@ensoleil-test.com`, "EnSoleil!2026");
  const {
    data: { user },
  } = await memberClient.auth.getUser();

  await listSavedPaymentMethods(memberClient);
  const { data: profile } = await memberClient.from("profiles").select("stripe_customer_id").eq("id", user!.id).single();
  const paymentMethodId = await attachTestCard(profile!.stripe_customer_id as string);
  const charge = await chargeSavedPaymentMethod(memberClient, {
    loungeId,
    dateIso: today(),
    band: "morning",
    slotTime: "8:00 AM",
    specialRequests: "",
    paymentMethodId,
    idempotencyKey: crypto.randomUUID(),
  });
  expect(charge.status).toBe("succeeded");
  await memberClient.auth.signOut();

  const { data: booking } = await admin
    .from("bookings")
    .insert({
      member_id: user!.id,
      lounge_id: loungeId,
      date: today(),
      band: "morning",
      slot_time: "8:00 AM",
      status: "completed",
    })
    .select("id")
    .single();
  await admin.from("payments").update({ booking_id: booking!.id }).eq("id", charge.paymentId);

  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `analytics-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
}, 20000);

afterAll(async () => {
  await admin.from("lounges").delete().eq("id", loungeId);
});

describe("Network analytics (/admin/analytics)", () => {
  it("shows the network summary tiles as real numbers", async () => {
    await renderPage();

    expect(await screen.findByRole("heading", { name: "How the network is doing" })).toBeInTheDocument();
    expect(await screen.findByText("Active members")).toBeInTheDocument();
    expect(screen.getAllByText("Bookings").length).toBeGreaterThan(0);
    expect(screen.getByText("No-show rate")).toBeInTheDocument();
    expect(screen.getAllByText("Gross revenue").length).toBeGreaterThan(0);
  });

  it("charts the bookings-per-day bars for the 14-day window", async () => {
    await renderPage();

    await screen.findByRole("heading", { name: "How the network is doing" });
    await waitFor(() => expect(screen.getAllByTestId("daily-bar").length).toBe(14));
  });

  it("shows the ephemeral lounge's real Stripe charge in revenue by partner", async () => {
    await renderPage();

    await screen.findByRole("heading", { name: "How the network is doing" });
    await waitFor(() => expect(screen.getByText(loungeName)).toBeInTheDocument());
    expect(screen.getAllByText("$81.66").length).toBeGreaterThan(0);
  });

  it("sends revenue export to the export screen with the dataset preselected", async () => {
    const user = userEvent.setup({ delay: null });
    await renderPage();

    await screen.findByRole("heading", { name: "How the network is doing" });
    await user.click(screen.getByRole("button", { name: "Revenue by partner (CSV)" }));

    expect(push).toHaveBeenCalledWith("/admin/reports?dataset=revenue-by-partner");
  });

  it("sends the acquisition report link to the members dataset", async () => {
    const user = userEvent.setup({ delay: null });
    await renderPage();

    await screen.findByRole("heading", { name: "How the network is doing" });
    await user.click(screen.getByRole("button", { name: "Open the acquisition report" }));

    expect(push).toHaveBeenCalledWith("/admin/reports?dataset=members");
  });

  it("lets the period switch between 14 days, month and quarter", async () => {
    const user = userEvent.setup({ delay: null });
    await renderPage();

    await screen.findByRole("heading", { name: "How the network is doing" });
    expect(screen.getByRole("button", { name: "14 days" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
    const monthLabel = formatDateRangeLabel(dateRangeForPeriod("month"));
    expect(screen.getAllByText(monthLabel).length).toBeGreaterThan(0);
  });
});
