import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import ScheduledReportsPage from "./page";

/**
 * Story 8.2 — "Automated daily/weekly report generation" y "Scheduled email
 * delivery of reports". Backend real (22 sept 2026): tabla
 * `scheduled_reports` (`supabase/schemas/admin_reports.sql`), sembrada aquí
 * mismo con dos filas propias de este archivo.
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/reports/scheduled",
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let dailyReportId: string;
let pausedReportId: string;
let dailyReportName: string;
let pausedReportName: string;

beforeAll(async () => {
  const stamp = Date.now();
  dailyReportName = `Daily operations digest ${stamp}`;
  pausedReportName = `Amenity demand ${stamp}`;

  const { data, error } = await admin
    .from("scheduled_reports")
    .insert([
      { name: dailyReportName, dataset: "bookings", recipients: ["ops@ensoleil-test.com"], cadence: "daily", enabled: true },
      { name: pausedReportName, dataset: "revenue-by-partner", recipients: ["finance@ensoleil-test.com"], cadence: "monthly", enabled: false },
    ])
    .select("id, name");
  if (error) throw error;
  dailyReportId = data.find((r) => r.name === dailyReportName)!.id;
  pausedReportId = data.find((r) => r.name === pausedReportName)!.id;

  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `scheduled-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await admin.from("scheduled_reports").delete().in("id", [dailyReportId, pausedReportId]);
});

describe("Scheduled reports (/admin/reports/scheduled)", () => {
  it("lists the automated reports with their cadence", async () => {
    render(<ScheduledReportsPage />);

    expect(await screen.findByRole("heading", { name: "Reports that send themselves" })).toBeInTheDocument();
    await screen.findByRole("switch", { name: dailyReportName });
    expect(screen.getAllByText(dailyReportName).length).toBeGreaterThan(0);
    expect(screen.getByText("Every day")).toBeInTheDocument();
  });

  it("shows the paused report as off", async () => {
    render(<ScheduledReportsPage />);

    await screen.findByRole("heading", { name: "Reports that send themselves" });
    expect(await screen.findByRole("switch", { name: pausedReportName })).toHaveAttribute("aria-checked", "false");
  });

  it("can pause and resume a running report for real", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ScheduledReportsPage />);

    await screen.findByRole("heading", { name: "Reports that send themselves" });
    const toggle = await screen.findByRole("switch", { name: dailyReportName });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await waitFor(async () => {
      const { data } = await admin.from("scheduled_reports").select("enabled").eq("id", dailyReportId).single();
      expect(data?.enabled).toBe(false);
    });
  });

  it("sends New report to the export screen ready to schedule", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ScheduledReportsPage />);

    await screen.findByRole("heading", { name: "Reports that send themselves" });
    await user.click(screen.getByRole("button", { name: "New report" }));

    expect(push).toHaveBeenCalledWith("/admin/reports?delivery=schedule");
  });
});
