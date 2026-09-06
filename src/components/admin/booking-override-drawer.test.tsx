import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BookingOverrideDrawer } from "./booking-override-drawer";

const booking = {
  lounge: "Aurelia House",
  area: "NoMad",
  detail: "Friday, September 20 · arrive 9:30 AM · admission for one",
  reference: "LP-844021",
};

describe("BookingOverrideDrawer", () => {
  it("defaults to rescheduling with the arrival time slots visible", () => {
    render(
      <BookingOverrideDrawer open onOpenChange={() => {}} memberName="Camille Duforest" booking={booking} onApply={() => {}} />,
    );

    expect(screen.getByRole("radio", { name: "Date or arrival time" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: /9:00 AM/ })).toBeInTheDocument();
  });

  it("hides the arrival time slots when cancelling the booking instead", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <BookingOverrideDrawer open onOpenChange={() => {}} memberName="Camille Duforest" booking={booking} onApply={() => {}} />,
    );

    await user.click(screen.getByRole("radio", { name: "Cancel the booking" }));

    expect(screen.queryByRole("button", { name: /9:00 AM/ })).not.toBeInTheDocument();
    expect(screen.getByText(/cancels LP-844021/)).toBeInTheDocument();
  });

  it("blocks picking a full slot until the lounge override is switched on", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <BookingOverrideDrawer open onOpenChange={() => {}} memberName="Camille Duforest" booking={booking} onApply={() => {}} />,
    );

    await user.click(screen.getByRole("button", { name: /10:00 AM/ }));
    expect(screen.getByRole("button", { name: /9:00 AM/ })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("switch", { name: /override/i }));
    await user.click(screen.getByRole("button", { name: /10:00 AM/ }));
    expect(screen.getByRole("button", { name: /10:00 AM/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("applies the change and closes the drawer", async () => {
    const user = userEvent.setup({ delay: null });
    const onApply = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <BookingOverrideDrawer
        open
        onOpenChange={onOpenChange}
        memberName="Camille Duforest"
        booking={booking}
        onApply={onApply}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Apply change" }));

    expect(onApply).toHaveBeenCalledWith({ changeType: "reschedule", newTime: "9:00 AM", overrideApplied: false });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
