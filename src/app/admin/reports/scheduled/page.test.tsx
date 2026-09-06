import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ScheduledReportsPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/reports/scheduled",
  useRouter: () => ({ push }),
}));

describe("Scheduled reports (/admin/reports/scheduled)", () => {
  it("lists the automated reports with their cadence and next run", () => {
    render(<ScheduledReportsPage />);

    expect(screen.getByRole("heading", { name: "Reports that send themselves" })).toBeInTheDocument();
    expect(screen.getAllByText("Daily operations digest").length).toBeGreaterThan(0);
    expect(screen.getByText("Every day 7:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow 7:00 AM")).toBeInTheDocument();
  });

  it("shows the amenity demand report already paused", () => {
    render(<ScheduledReportsPage />);

    expect(screen.getByRole("switch", { name: "Amenity demand" })).toHaveAttribute("aria-checked", "false");
  });

  it("can pause and resume a running report", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ScheduledReportsPage />);

    const toggle = screen.getByRole("switch", { name: "Daily operations digest" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("shows the recent delivery history in the rail", () => {
    render(<ScheduledReportsPage />);

    expect(screen.getByText("Delivered in the last 24 hours")).toBeInTheDocument();
    expect(screen.getByText(/Today 9:00 AM · 1 recipient · 11 rows/)).toBeInTheDocument();
  });

  it("sends New report to the export screen ready to schedule", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ScheduledReportsPage />);

    await user.click(screen.getByRole("button", { name: "New report" }));

    expect(push).toHaveBeenCalledWith("/admin/reports?delivery=schedule");
  });
});
