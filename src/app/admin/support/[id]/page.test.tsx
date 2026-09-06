import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CaseDetailPage from "./page";

let currentId = "CS-4417";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/support/CS-4417",
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: currentId }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("Case detail (/admin/support/[id])", () => {
  it("shows the case subject, status and the full communication log", () => {
    render(<CaseDetailPage />);

    expect(screen.getByRole("heading", { name: "No-show fee disputed" })).toBeInTheDocument();
    expect(screen.getByText("New · unassigned")).toBeInTheDocument();
    expect(screen.getByText(/I did go\. I was at the door/)).toBeInTheDocument();
    expect(screen.getByText(/We were full from about 10:20/)).toBeInTheDocument();
  });

  it("assigns the case to the current agent", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await user.click(screen.getByRole("button", { name: "Assign to me" }));

    expect(screen.getByText("Assigned to Priya Raghunathan")).toBeInTheDocument();
  });

  it("escalates the case to the duty manager", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await user.click(screen.getByRole("button", { name: "Escalate" }));

    expect(screen.getByText(/Escalated to Dana Mbeki/)).toBeInTheDocument();
  });

  it("sends a reply to the member and appends it to the log", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await user.type(screen.getByRole("textbox", { name: /message/i }), "We are waiving the fee.");
    await user.click(screen.getByRole("button", { name: "Send reply" }));

    expect(screen.getByText("We are waiving the fee.")).toBeInTheDocument();
  });

  it("saves an internal note instead of replying when that mode is selected", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await user.click(screen.getByRole("button", { name: "Internal note" }));
    await user.type(screen.getByRole("textbox", { name: /message/i }), "Checking with the lounge.");
    await user.click(screen.getByRole("button", { name: "Save note" }));

    expect(screen.getByText("Checking with the lounge.")).toBeInTheDocument();
    expect(screen.getAllByText("Internal note · not sent to the member").length).toBeGreaterThan(0);
  });

  it("opens the refund modal from Waive and refund", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await user.click(screen.getByRole("button", { name: /Waive and refund \$35\.00/ }));

    expect(screen.getByRole("heading", { name: "Refund the no-show fee" })).toBeInTheDocument();
  });

  it("resolves the case and shows the fee was reversed after confirming the refund", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await user.click(screen.getByRole("button", { name: /Waive and refund \$35\.00/ }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Refund $35.00" }));

    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("does not offer a refund action for a case without a refundable charge", () => {
    currentId = "CS-4416";
    render(<CaseDetailPage />);
    currentId = "CS-4417";

    expect(screen.queryByText(/Waive and refund/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resolve case" })).toBeInTheDocument();
  });

  it("calls notFound for an unknown case id", () => {
    currentId = "CS-0000";
    expect(() => render(<CaseDetailPage />)).toThrow("NEXT_NOT_FOUND");
    currentId = "CS-4417";
  });
});
