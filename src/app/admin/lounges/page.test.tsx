import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LoungesPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges",
  useRouter: () => ({ push }),
}));

describe("Lounges (/admin/lounges)", () => {
  it("lists lounges with their content status", () => {
    render(<LoungesPage />);

    expect(screen.getByRole("heading", { name: "Lounges" })).toBeInTheDocument();
    expect(screen.getByText("The Ainsworth")).toBeInTheDocument();
    expect(screen.getAllByText("Live").length).toBeGreaterThan(0);
    expect(screen.getByText("3 to approve")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("folds the remaining Miami and Los Angeles lounges", () => {
    render(<LoungesPage />);

    expect(screen.getByText(/4 more lounges · Miami and Los Angeles/)).toBeInTheDocument();
  });

  it("shows no bulk action bar until a lounge is selected", () => {
    render(<LoungesPage />);

    expect(screen.queryByText(/^\d+ lounges? selected$/)).not.toBeInTheDocument();
  });

  it("shows the bulk action bar once lounges are selected, and clears it", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungesPage />);

    await user.click(screen.getByRole("checkbox", { name: "Select The Ainsworth" }));
    expect(screen.getByText("1 lounge selected")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Select Bergdorf Lounge" }));
    expect(screen.getByText("2 lounges selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByText(/^\d+ lounges? selected$/)).not.toBeInTheDocument();
  });

  it("opens the lounge editor when a row is activated", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungesPage />);

    await user.click(screen.getByRole("button", { name: /Open The Vestry/ }));

    expect(push).toHaveBeenCalledWith("/admin/lounges/the-vestry");
  });
});
