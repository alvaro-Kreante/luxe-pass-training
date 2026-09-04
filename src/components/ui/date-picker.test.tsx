import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MonthCalendar } from "./date-picker";
import type { MonthDay } from "@/lib/booking";

/**
 * DESIGN-SYSTEM.md §4 — Date picker mensual (Fase 5).
 * Story 4.1 — "Date picker starting from today".
 */

const DAYS: MonthDay[] = [
  { dateIso: "2025-09-01", day: 1, status: "past" },
  { dateIso: "2025-09-02", day: 2, status: "past" },
  { dateIso: "2025-09-09", day: 9, status: "today" },
  { dateIso: "2025-09-10", day: 10, status: "open" },
  { dateIso: "2025-09-11", day: 11, status: "full" },
  { dateIso: "2025-09-12", day: 12, status: "closed" },
];

function setup(overrides: Partial<React.ComponentProps<typeof MonthCalendar>> = {}) {
  const onSelectDate = vi.fn();
  const onPrevMonth = vi.fn();
  const onNextMonth = vi.fn();

  render(
    <MonthCalendar
      monthLabel="September"
      days={DAYS}
      selectedDate={undefined}
      onSelectDate={onSelectDate}
      onPrevMonth={onPrevMonth}
      onNextMonth={onNextMonth}
      canGoPrev
      {...overrides}
    />,
  );

  return { onSelectDate, onPrevMonth, onNextMonth };
}

describe("navegación de mes", () => {
  it("llama a onNextMonth al pulsar el mes siguiente", async () => {
    const user = userEvent.setup({ delay: null });
    const { onNextMonth } = setup();

    await user.click(screen.getByRole("button", { name: "Next month" }));

    expect(onNextMonth).toHaveBeenCalledTimes(1);
  });

  it("deshabilita el mes anterior cuando el mes mostrado ya es el de hoy", () => {
    setup({ canGoPrev: false });

    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
  });

  it("el mes anterior es pulsable cuando no es el mes de hoy", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPrevMonth } = setup({ canGoPrev: true });

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    expect(onPrevMonth).toHaveBeenCalledTimes(1);
  });
});

describe("selección de día", () => {
  it("selecciona un día disponible", async () => {
    const user = userEvent.setup({ delay: null });
    const { onSelectDate } = setup();

    await user.click(screen.getByRole("button", { name: "10" }));

    expect(onSelectDate).toHaveBeenCalledWith("2025-09-10");
  });

  it("hoy también es seleccionable", async () => {
    const user = userEvent.setup({ delay: null });
    const { onSelectDate } = setup();

    await user.click(screen.getByRole("button", { name: "9" }));

    expect(onSelectDate).toHaveBeenCalledWith("2025-09-09");
  });

  it("no se puede seleccionar un día pasado, completo o cerrado", async () => {
    const user = userEvent.setup({ delay: null });
    const { onSelectDate } = setup();

    await user.click(screen.getByText("1"));
    await user.click(screen.getByText("11"));
    await user.click(screen.getByText("12"));

    expect(onSelectDate).not.toHaveBeenCalled();
  });
});
