import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ApprovalsPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges/approvals",
  useRouter: () => ({ push }),
}));

describe("Approvals queue (/admin/lounges/approvals)", () => {
  it("lists the three pending changes for The Vestry", () => {
    render(<ApprovalsPage />);

    expect(screen.getByRole("heading", { name: "Approve before members see it" })).toBeInTheDocument();
    expect(screen.getByText("Showers added")).toBeInTheDocument();
    expect(screen.getByText("Friday hours to 11 PM")).toBeInTheDocument();
    expect(screen.getByText("Shower suite photo")).toBeInTheDocument();
  });

  it("compares what is live now against what is proposed", () => {
    render(<ApprovalsPage />);

    expect(screen.getByText("Live now")).toBeInTheDocument();
    expect(screen.getByText("Proposed")).toBeInTheDocument();
    expect(screen.getByText("Open until 9 PM")).toBeInTheDocument();
    expect(screen.getByText("Open until 11 PM")).toBeInTheDocument();
  });

  it("shows the impact of approving", () => {
    render(<ApprovalsPage />);

    expect(screen.getByText("62% of searches")).toBeInTheDocument();
    expect(screen.getByText("10 more seats")).toBeInTheDocument();
  });

  it("opens the lounge editor from the queue", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ApprovalsPage />);

    await user.click(screen.getByRole("button", { name: "Open the lounge editor" }));

    expect(push).toHaveBeenCalledWith("/admin/lounges/the-vestry");
  });

  it("approves and publishes, leaving the queue empty", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ApprovalsPage />);

    await user.click(screen.getByRole("button", { name: "Approve and publish" }));

    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });

  it("sends the changes back with a note, leaving the queue empty", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ApprovalsPage />);

    await user.click(screen.getByRole("button", { name: "Send back with a note" }));

    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });
});
