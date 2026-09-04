import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AINSWORTH_PASS } from "@/lib/passes";

import ReminderPage from "./page";

/**
 * Story 5.3 — "receive an email 24 hrs before the booking time". Sin
 * backend, se cubre visualmente como el resto de emails del proyecto
 * (`Receipt.dc.html`): la pantalla del email tal como llegaría.
 */
const replace = vi.fn();
const params = vi.fn(() => ({ reference: AINSWORTH_PASS.reference }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useParams: () => params(),
}));

beforeEach(() => {
  replace.mockClear();
  params.mockReturnValue({ reference: AINSWORTH_PASS.reference });
});

describe("guardia de entrada", () => {
  it("vuelve a My Pass si el número de confirmación no existe", () => {
    params.mockReturnValue({ reference: "LP-000000" });

    render(<ReminderPage />);

    expect(replace).toHaveBeenCalledWith("/my-pass");
  });
});

describe("con una reserva válida", () => {
  it("recuerda la hora de llegada y el número de confirmación", () => {
    render(<ReminderPage />);

    expect(
      screen.getByText(`Tomorrow at ${AINSWORTH_PASS.arrivalTime} — your visit at ${AINSWORTH_PASS.loungeName}`),
    ).toBeInTheDocument();
    expect(screen.getAllByText(AINSWORTH_PASS.reference).length).toBeGreaterThan(0);
  });

  it("avisa del plazo de cancelación gratuita", () => {
    render(<ReminderPage />);

    expect(screen.getByText(/cancel free of charge/i)).toBeInTheDocument();
  });
});
