import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import DemandPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/analytics/demand",
  useRouter: () => ({ push }),
}));

describe("Demand / popularity (/admin/analytics/demand)", () => {
  it("lists the most popular lounges with their booking share", () => {
    render(<DemandPage />);

    expect(screen.getByRole("heading", { name: "Where the demand is" })).toBeInTheDocument();
    expect(screen.getByText("The Ainsworth")).toBeInTheDocument();
    expect(screen.getByText("187")).toBeInTheDocument();
    expect(screen.getByText("15.5%")).toBeInTheDocument();
  });

  it("folds the remaining Miami and Los Angeles lounges into one line", () => {
    render(<DemandPage />);

    expect(screen.getByText(/4 more lounges in Miami and Los Angeles/)).toBeInTheDocument();
  });

  it("shows the amenities members filter for", () => {
    render(<DemandPage />);

    expect(screen.getByText("Showers")).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();
  });

  it("shows geographic usage patterns by city", () => {
    render(<DemandPage />);

    expect(screen.getByText("New York")).toBeInTheDocument();
    expect(screen.getByText("77.6%")).toBeInTheDocument();
    expect(screen.getByText("Miami")).toBeInTheDocument();
    expect(screen.getByText("Los Angeles")).toBeInTheDocument();
  });

  it("sends Export CSV to the export screen", async () => {
    const user = userEvent.setup({ delay: null });
    render(<DemandPage />);

    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(push).toHaveBeenCalledWith("/admin/reports");
  });
});
