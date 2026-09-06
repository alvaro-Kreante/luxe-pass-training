import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AnalyticsPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/analytics",
  useRouter: () => ({ push }),
}));

describe("Network analytics (/admin/analytics)", () => {
  it("shows bookings, active members, no-show rate and net revenue", () => {
    render(<AnalyticsPage />);

    expect(screen.getByRole("heading", { name: "How the network is doing" })).toBeInTheDocument();
    expect(screen.getByText("1,208")).toBeInTheDocument();
    expect(screen.getByText("1,842")).toBeInTheDocument();
    expect(screen.getByText("5.1%")).toBeInTheDocument();
    expect(screen.getAllByText("$282,337.00").length).toBeGreaterThan(0);
  });

  it("charts all fourteen days of bookings", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText("Sun 1")).toBeInTheDocument();
    expect(screen.getByText("Sat 14")).toBeInTheDocument();
  });

  it("shows member acquisition and twelve-month retention", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText("+37")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
  });

  it("shows the revenue breakdown with gross and net", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText("$309,600.00")).toBeInTheDocument();
    expect(screen.getByText("$336,250.00")).toBeInTheDocument();
    expect(screen.getByText("−$53,913.00")).toBeInTheDocument();
  });

  it("sends revenue export to the export screen with the dataset preselected", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AnalyticsPage />);

    await user.click(screen.getByRole("button", { name: "Revenue by partner (CSV)" }));

    expect(push).toHaveBeenCalledWith("/admin/reports?dataset=revenue-by-partner");
  });

  it("sends the acquisition report link to the members dataset", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AnalyticsPage />);

    await user.click(screen.getByRole("button", { name: "Open the acquisition report" }));

    expect(push).toHaveBeenCalledWith("/admin/reports?dataset=members");
  });

  it("lets the period switch between 14 days, month and quarter", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AnalyticsPage />);

    expect(screen.getByRole("button", { name: "14 days" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
  });
});
