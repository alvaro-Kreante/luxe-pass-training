import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import ReceptionPage from "./page";

/**
 * Story 5.2 (Lounge Check-In Process) — "Instant verification of booking
 * validity" y "Emergency contact information accessible to staff".
 * `Reception.dc.html` (válido) y `CheckInError.dc.html` (no encontrado) son
 * dos estados de la misma consola: se alcanzan tecleando el número, no por
 * query param, porque es una interacción real del usuario.
 */
describe("al entrar", () => {
  it("muestra la reserva válida de muestra con el contacto de emergencia", () => {
    render(<ReceptionPage />);

    expect(screen.getByRole("heading", { name: "Alexandra Rivas" })).toBeInTheDocument();
    expect(screen.getByText("Valid booking")).toBeInTheDocument();
    expect(screen.getByText(/miriam rivas/i)).toBeInTheDocument();
  });

  it("marca en el campo de búsqueda cuándo se escaneó el código", () => {
    render(<ReceptionPage />);

    expect(screen.getByText(/scanned \d{1,2}:\d{2} (AM|PM)/i)).toBeInTheDocument();
  });
});

describe("al buscar un número que no existe hoy", () => {
  it("bloquea el check-in y ofrece las coincidencias cercanas", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReceptionPage />);

    const field = screen.getByRole("textbox", { name: /confirmation number/i });
    await user.clear(field);
    await user.type(field, "LP-000000");
    await user.click(screen.getByRole("button", { name: /look up/i }));

    expect(
      screen.getByRole("heading", { name: "No booking matches this code" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Check-in blocked")).toBeInTheDocument();
    expect(screen.getByText(/marcus vidal/i)).toBeInTheDocument();
  });
});

describe("al confirmar el check-in", () => {
  it("marca la reserva como ya recibida", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReceptionPage />);

    await user.click(screen.getByRole("button", { name: /check in alexandra/i }));

    expect(screen.getByRole("button", { name: /checked in/i })).toBeDisabled();
  });
});
