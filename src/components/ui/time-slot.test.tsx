import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TimeSlotGrid } from "./time-slot";
import type { BookingSlot } from "@/lib/booking";

/**
 * DESIGN-SYSTEM.md §4 — Slot de hora (Fase 5). Story 4.1 — slots de llegada
 * con las plazas restantes.
 */
const SLOTS: BookingSlot[] = [
  { time: "8:00 AM", band: "morning", seatsLeft: 6, status: "open" },
  { time: "10:30 AM", band: "morning", seatsLeft: 4, status: "open" },
  { time: "1:00 PM", band: "afternoon", seatsLeft: 2, status: "open" },
  { time: "3:30 PM", band: "afternoon", seatsLeft: 5, status: "open" },
  { time: "6:00 PM", band: "evening", seatsLeft: 0, status: "full" },
];

describe("selección de slot", () => {
  it("selecciona un slot abierto", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelect = vi.fn();
    render(<TimeSlotGrid slots={SLOTS} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /8:00 AM/ }));

    expect(onSelect).toHaveBeenCalledWith(SLOTS[0]);
  });

  it("no se puede seleccionar un slot completo", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelect = vi.fn();
    render(<TimeSlotGrid slots={SLOTS} onSelect={onSelect} />);

    await user.click(screen.getByText("6:00 PM"));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("muestra las plazas restantes de cada slot abierto", () => {
    render(<TimeSlotGrid slots={SLOTS} onSelect={vi.fn()} />);

    expect(screen.getByText("6 spots")).toBeInTheDocument();
    expect(screen.getByText("Fully booked")).toBeInTheDocument();
  });

  it("marca el slot seleccionado", () => {
    render(<TimeSlotGrid slots={SLOTS} selectedTime="3:30 PM" onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: /3:30 PM/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
