import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AINSWORTH_PASS } from "@/lib/passes";

import PassDetailPage from "./page";

/**
 * Story 5.1 — el pase digital y su expiración automática al cerrar la
 * ventana de la reserva. `Main` (upcoming) · `ArrivalDay` (today) ·
 * `CheckedIn` · `Expired.dc.html` son cuatro estados de la misma pantalla;
 * sin backend, se alcanzan por `?state=` como el resto de estados de borde
 * del proyecto (`?covered=1`, `?map=error`).
 */
const replace = vi.fn();
const params = vi.fn(() => ({ reference: AINSWORTH_PASS.reference }));
let query = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useParams: () => params(),
  useSearchParams: () => query,
  usePathname: () => "/my-pass/LP-842193",
}));

beforeEach(() => {
  replace.mockClear();
  params.mockReturnValue({ reference: AINSWORTH_PASS.reference });
  query = new URLSearchParams();
});

describe("guardia de entrada", () => {
  it("vuelve a My Pass si el número de confirmación no existe", () => {
    params.mockReturnValue({ reference: "LP-000000" });

    render(<PassDetailPage />);

    expect(replace).toHaveBeenCalledWith("/my-pass");
  });
});

describe("estado por defecto (upcoming)", () => {
  it("muestra el pase con el nombre del miembro, el lounge y la fecha", () => {
    render(<PassDetailPage />);

    expect(screen.getByRole("heading", { name: "Your digital pass" })).toBeInTheDocument();
    expect(screen.getAllByText(AINSWORTH_PASS.reference).length).toBeGreaterThan(0);
  });
});

describe("?state=today", () => {
  it("muestra la cuenta atrás del día de la reserva", () => {
    query = new URLSearchParams("state=today");

    render(<PassDetailPage />);

    expect(screen.getByRole("heading", { name: "You are expected today" })).toBeInTheDocument();
  });
});

describe("?state=checked-in", () => {
  it("confirma el check-in en la app del miembro", () => {
    query = new URLSearchParams("state=checked-in");

    render(<PassDetailPage />);

    expect(screen.getByRole("heading", { name: "You are checked in" })).toBeInTheDocument();
  });
});

describe("?state=expired", () => {
  it("explica que la reserva expiró automáticamente al cerrar la ventana", () => {
    query = new URLSearchParams("state=expired");

    render(<PassDetailPage />);

    expect(screen.getByRole("heading", { name: "This pass has expired" })).toBeInTheDocument();
    expect(screen.getByText(/checked in at reception/i)).toBeInTheDocument();
  });
});
