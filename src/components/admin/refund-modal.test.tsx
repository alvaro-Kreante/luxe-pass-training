import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RefundModal } from "./refund-modal";

const charge = {
  title: "No-show fee — The Ainsworth, September 14",
  amount: 35,
  cardLabel: "Visa 4242",
  dateLabel: "Charged Sat Sep 14, 4:02 PM",
  chargeId: "ch_3PkR2f8Q",
};

describe("RefundModal", () => {
  it("defaults to a full refund of the charge", () => {
    render(<RefundModal open onOpenChange={() => {}} charge={charge} onConfirm={() => {}} />);

    expect(screen.getByRole("radio", { name: /Full refund — \$35\.00/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Refund $35.00" })).toBeInTheDocument();
    expect(screen.getByText(/no manager needed under \$100\.00/)).toBeInTheDocument();
  });

  it("switches to a partial amount and updates the confirm button", async () => {
    const user = userEvent.setup({ delay: null });
    render(<RefundModal open onOpenChange={() => {}} charge={charge} onConfirm={() => {}} />);

    await user.click(screen.getByRole("radio", { name: /Partial refund/ }));
    await user.type(screen.getByRole("spinbutton", { name: /partial refund amount/i }), "20");

    expect(screen.getByRole("button", { name: "Refund $20.00" })).toBeInTheDocument();
  });

  it("flags that a manager is needed once the amount exceeds $100", async () => {
    const user = userEvent.setup({ delay: null });
    const bigCharge = { ...charge, amount: 250 };
    render(<RefundModal open onOpenChange={() => {}} charge={bigCharge} onConfirm={() => {}} />);

    await user.click(screen.getByRole("radio", { name: /Partial refund/ }));
    await user.type(screen.getByRole("spinbutton", { name: /partial refund amount/i }), "150");

    expect(screen.getByText(/needs a manager over \$100\.00/)).toBeInTheDocument();
  });

  it("confirms the refund with the chosen amount and closes", async () => {
    const user = userEvent.setup({ delay: null });
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<RefundModal open onOpenChange={onOpenChange} charge={charge} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Refund $35.00" }));

    expect(onConfirm).toHaveBeenCalledWith(35);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
