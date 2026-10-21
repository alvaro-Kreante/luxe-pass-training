import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { today } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn, signUpConfirmedPartnerAndSignIn } from "@/lib/testing/confirmed-user";

import ReportsPage from "./page";

/**
 * Story 7.3 — "downloadable reports in CSV". Artboard: Reports.dc.html.
 *
 * Todos los informes salen de datos reales del lounge efímero de este
 * archivo: el rango y las columnas del rail cambian el CSV, "Email it to the
 * team" lo envía de verdad (`send-partner-report`) y "Downloaded recently"
 * es el registro real (`partner_report_exports`).
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/partner/reports",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
let loungeId: string;

beforeAll(async () => {
  const stamp = Date.now();
  loungeId = `test-lounge-reports-${stamp}`;
  const { error: loungeError } = await admin.from("lounges").insert({
    id: loungeId,
    name: "Reports Test Lounge",
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
  });
  if (loungeError) throw loungeError;

  const member = createClient();
  await signUpConfirmedMemberAndSignIn(member, `reports-member-${stamp}@ensoleil-test.example`, "EnSoleil!2026");
  const {
    data: { user },
  } = await member.auth.getUser();
  await member.auth.signOut();

  const { error } = await admin.from("bookings").insert(
    [
      { slot_time: "8:00 AM", status: "in_progress", no_show: false, checked_in_at: new Date().toISOString() },
      { slot_time: "10:30 AM", status: "completed", no_show: true, no_show_reason: "never-arrived", cancellation_fee_cents: 3500 },
      { slot_time: "1:00 PM", status: "cancelled", no_show: false },
    ].map((row) => ({ member_id: user!.id, lounge_id: loungeId, date: today(), band: "morning", special_requests: "", ...row })),
  );
  if (error) throw error;

  const partner = createClient();
  await signUpConfirmedPartnerAndSignIn(partner, `reports-partner-${stamp}@theainsworth-test.example`, "AinsworthFOH!24", {
    businessName: "Reports Test Venue",
    loungeIds: [loungeId],
  });
});

afterAll(async () => {
  if (!loungeId) return;
  const { data: lounge } = await admin.from("lounges").select("partner_id").eq("id", loungeId).maybeSingle();
  await admin.from("lounges").delete().eq("id", loungeId);
  if (lounge?.partner_id) await admin.from("partners").delete().eq("id", lounge.partner_id);
});

beforeEach(() => {
  vi.clearAllMocks();
});

function lastCsv(): string {
  const calls = vi.mocked(downloadTextFile).mock.calls;
  return calls[calls.length - 1][1];
}

describe("Reports.dc.html", () => {
  it("lista los seis informes, con 'Monthly booking volume' preseleccionado", async () => {
    render(<ReportsPage />);

    expect(await screen.findByRole("radio", { name: /Monthly booking volume/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Daily guest list/ })).not.toBeChecked();
    expect(screen.getByText("Repeat guests")).toBeVisible();
    expect(screen.getByText("No-show log")).toBeVisible();
  });

  it("solo ofrece descargar ahora o enviarlo al equipo", async () => {
    render(<ReportsPage />);

    const delivery = await screen.findByRole("radiogroup", { name: "How you want it" });
    expect(within(delivery).getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByText("Send it every month")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scheduled reports" })).not.toBeInTheDocument();
  });
});

describe("Download CSV — datos reales", () => {
  it("el volumen mensual cuenta las reservas reales del lounge", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReportsPage />);

    await user.click(await screen.findByRole("button", { name: "Download CSV" }));

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));
    const [filename, csv] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toContain("monthly-booking-volume");
    const [header, ...rows] = csv.split("\n");
    expect(header).toContain("Bookings made");
    expect(header).toContain("Guests who arrived");
    expect(rows.join("\n")).toMatch(/"3","1","1","1"/);
  });

  it("una columna desmarcada no sale en el CSV", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReportsPage />);

    await user.click(await screen.findByRole("checkbox", { name: "Guests who arrived" }));
    await user.click(screen.getByRole("button", { name: "Download CSV" }));

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));
    expect(lastCsv().split("\n")[0]).not.toContain("Guests who arrived");
  });

  it("el registro de no-shows trae cada no-show con su motivo", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReportsPage />);

    await user.click(await screen.findByRole("radio", { name: /No-show log/ }));
    await user.click(screen.getByRole("button", { name: "Download CSV" }));

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));
    const rows = lastCsv().split("\n");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain("Never arrived");
    expect(rows[1]).toContain("Reports Test Lounge");
  });

  it("lo descargado aparece en 'Downloaded recently' y se puede volver a descargar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReportsPage />);

    await user.click(await screen.findByRole("radio", { name: /Repeat guests/ }));
    await user.click(screen.getByRole("button", { name: "Download CSV" }));
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));

    const recent = await screen.findByRole("list", { name: "Downloaded recently" });
    const item = await within(recent).findByText(/partner-repeat-guests/);
    await user.click(within(item.closest("li")!).getByRole("button", { name: "Download again" }));

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(2));
    expect(vi.mocked(downloadTextFile).mock.calls[1][0]).toContain("repeat-guests");
  });
});

describe("Email it to the team", () => {
  it("cambia el botón y envía el informe en vez de descargarlo", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReportsPage />);

    await user.click(await screen.findByRole("radio", { name: /Email it to the team/ }));
    expect(screen.queryByRole("button", { name: "Download CSV" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Email report" }));

    expect(await screen.findByText(/Sent to 1 person/, {}, { timeout: 15000 })).toBeVisible();
    expect(downloadTextFile).not.toHaveBeenCalled();
  });
});
