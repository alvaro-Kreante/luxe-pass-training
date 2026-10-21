import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { today } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import DemandPage from "./page";

/**
 * Story 8.2 — "Most popular lounges and amenities report" y "Geographic
 * usage patterns". Backend real (22 sept 2026): `admin_lounge_popularity`/
 * `admin_amenity_demand`/`admin_city_demand`
 * (`supabase/schemas/admin_reports.sql`), sobre TODA la red — un lounge
 * efímero propio de este archivo, con reservas fechadas en `TODAY` (dentro
 * del rango por defecto de 14 días), para poder afirmar su propia fila sin
 * que las reservas reales de otros archivos de test lo contaminen.
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/analytics/demand",
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let loungeId: string;
let loungeName: string;

beforeAll(async () => {
  const stamp = Date.now();
  loungeId = `test-lounge-demand-${stamp}`;
  loungeName = `Demand Test Lounge ${stamp}`;

  await admin.from("lounges").insert({
    id: loungeId,
    name: loungeName,
    neighborhood: "Test Neighborhood",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    amenities: ["wifi"],
  });

  const { data: created, error } = await admin.auth.admin.createUser({
    email: `demand-member-${stamp}@ensoleil-test.example`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (error) throw error;

  await admin.from("bookings").insert([
    {
      member_id: created.user.id,
      lounge_id: loungeId,
      date: today(),
      band: "morning",
      slot_time: "8:00 AM",
      status: "completed",
      no_show: true,
    },
    {
      member_id: created.user.id,
      lounge_id: loungeId,
      date: today(),
      band: "afternoon",
      slot_time: "1:00 PM",
      status: "completed",
      no_show: false,
    },
  ]);

  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `demand-admin-${stamp}@ensoleil-test.example`, "SupportDesk!24");
});

afterAll(async () => {
  await admin.from("lounges").delete().eq("id", loungeId);
});

describe("Demand / popularity (/admin/analytics/demand)", () => {
  it("lista el lounge efímero con sus reservas y no-shows reales", async () => {
    render(<DemandPage />);

    expect(await screen.findByRole("heading", { name: "Where the demand is" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(loungeName)).toBeInTheDocument());
    const row = screen.getByText(loungeName).closest("div")!.parentElement!;
    expect(row).toHaveTextContent("2");
    expect(row).toHaveTextContent("1 no-shows");
  });

  it("muestra la demanda de amenities y ciudades como porcentajes reales", async () => {
    render(<DemandPage />);

    await screen.findByRole("heading", { name: "Where the demand is" });
    expect(await screen.findByText("Test City")).toBeInTheDocument();
  });

  it("sends Export CSV to the export screen", async () => {
    const user = userEvent.setup({ delay: null });
    render(<DemandPage />);

    await screen.findByRole("heading", { name: "Where the demand is" });
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(push).toHaveBeenCalledWith("/admin/reports");
  });
});
