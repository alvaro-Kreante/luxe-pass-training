import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SupportDeskPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/support",
  useRouter: () => ({ push }),
}));

describe("Support desk (/admin/support)", () => {
  it("lists open cases with member, subject and status", () => {
    render(<SupportDeskPage />);

    expect(screen.getByRole("heading", { name: "Support desk" })).toBeInTheDocument();
    expect(screen.getByText("Camille Duforest")).toBeInTheDocument();
    expect(screen.getByText("No-show fee disputed — LP-840388")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("shows how many of the total cases are displayed", () => {
    render(<SupportDeskPage />);

    expect(
      screen.getByText("Showing 8 of 30 cases · 22 open, 5 waiting on member, 3 escalated"),
    ).toBeInTheDocument();
  });

  it("opens a case when its row is activated", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SupportDeskPage />);

    await user.click(screen.getByRole("button", { name: /CS-4417/ }));

    expect(push).toHaveBeenCalledWith("/admin/support/CS-4417");
  });

  it("sends a non-empty search to the member lookup", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SupportDeskPage />);

    await user.type(screen.getByRole("searchbox", { name: /search members/i }), "duforest{enter}");

    expect(push).toHaveBeenCalledWith("/admin/members?q=duforest");
  });
});
