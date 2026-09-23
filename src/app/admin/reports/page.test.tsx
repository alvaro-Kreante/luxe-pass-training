import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TODAY } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import ExportPage from "./page";

/**
 * Story 8.2 — "User data export (anonymized for privacy)", "Booking data
 * export with date range selection" y "Data export in CSV format". Backend
 * real (22 sept 2026): `admin_export_*` (`supabase/schemas/admin_reports.sql`).
 * Un lounge/reserva efímeros propios de este archivo para poder afirmar que
 * el CSV descargado trae de verdad esa fila, sin depender de cuántas otras
 * reservas existan en la base.
 */

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/reports",
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let loungeId: string;
let confirmationCode: string;

beforeAll(async () => {
  const stamp = Date.now();
  loungeId = `test-lounge-export-${stamp}`;

  await admin.from("lounges").insert({
    id: loungeId,
    name: "Export Test Lounge",
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
  });

  const { data: created, error } = await admin.auth.admin.createUser({
    email: `export-member-${stamp}@ensoleil-test.com`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (error) throw error;

  const { data: booking } = await admin
    .from("bookings")
    .insert({
      member_id: created.user.id,
      lounge_id: loungeId,
      date: TODAY,
      band: "morning",
      slot_time: "8:00 AM",
      status: "confirmed",
    })
    .select("confirmation_code")
    .single();
  confirmationCode = booking!.confirmation_code;

  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `export-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await admin.from("lounges").delete().eq("id", loungeId);
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Export data (/admin/reports)", () => {
  it("defaults to the Bookings dataset with 9 columns selected and no personal data", async () => {
    render(<ExportPage />);

    expect(await screen.findByRole("heading", { name: "Export data" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Bookings/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/9 of 12 selected/)).toBeInTheDocument();
  });

  it("resets the column selection when a different dataset is chosen", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    await screen.findByRole("heading", { name: "Export data" });
    await user.click(screen.getByRole("radio", { name: /^Members/ }));

    expect(screen.getByText(/3 of 6 selected/)).toBeInTheDocument();
  });

  it("preselects the dataset from the ?dataset= query param", async () => {
    searchParams = new URLSearchParams("dataset=revenue-by-partner");
    render(<ExportPage />);

    // `RequireAdminSession` no monta `ExportScreen` (y su lectura de
    // `useSearchParams()`) hasta que la comprobación async de rol resuelve
    // — resetear `searchParams` antes de eso hacía que el mount real ya no
    // viera el "?dataset=" (mismo bug real ya encontrado en `/admin/members`).
    await screen.findByRole("heading", { name: "Export data" });
    searchParams = new URLSearchParams();
    expect(screen.getByRole("radio", { name: /Revenue by partner/ })).toHaveAttribute("aria-checked", "true");
  });

  it("requires a reason before a personal column can be included", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    await screen.findByRole("heading", { name: "Export data" });
    await user.click(screen.getByRole("checkbox", { name: "Member name" }));

    expect(screen.getByRole("textbox", { name: /reason/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download CSV" })).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /reason/i }), "Finance audit request");

    expect(screen.getByRole("button", { name: "Download CSV" })).toBeEnabled();
  });

  it("downloads a real CSV that includes the ephemeral booking's reference", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    await screen.findByRole("heading", { name: "Export data" });
    await user.click(screen.getByRole("button", { name: "Download CSV" }));

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));
    const [filename, csv] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toContain("bookings");
    expect(csv).toContain("Booking reference");
    expect(csv).toContain(confirmationCode);
  });

  it("changes the primary action label with the delivery method", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    await screen.findByRole("heading", { name: "Export data" });
    await user.click(screen.getByRole("radio", { name: /Save as a scheduled report/ }));
    expect(screen.getByRole("button", { name: "Save scheduled report" })).toBeInTheDocument();
  });

  it("keeps Email it to me disabled — send-admin-report needs a Vault secret the browser can't hold", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    await screen.findByRole("heading", { name: "Export data" });
    const emailOption = screen.getByRole("radio", { name: /Email it to me/ });
    expect(emailOption).toHaveAttribute("aria-disabled", "true");

    await user.click(emailOption);
    expect(emailOption).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("button", { name: "Download CSV" })).toBeInTheDocument();
  });

  it("preselects Save as a scheduled report from ?delivery=schedule", async () => {
    searchParams = new URLSearchParams("delivery=schedule");
    render(<ExportPage />);

    await screen.findByRole("heading", { name: "Export data" });
    searchParams = new URLSearchParams();
    expect(screen.getByRole("radio", { name: /Save as a scheduled report/ })).toHaveAttribute("aria-checked", "true");
  });

  it("saves a real scheduled report and navigates to the scheduled list", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    await screen.findByRole("heading", { name: "Export data" });
    await user.click(screen.getByRole("radio", { name: /Save as a scheduled report/ }));
    await user.click(screen.getByRole("button", { name: "Save scheduled report" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/reports/scheduled"));

    const { data } = await admin.from("scheduled_reports").select("id, dataset, cadence").eq("dataset", "bookings");
    expect(data!.length).toBeGreaterThan(0);
    await admin.from("scheduled_reports").delete().eq("dataset", "bookings");
  });
});
