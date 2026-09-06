import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PlansPage from "./page";

/**
 * Story 9.1 — "Upgrade options to monthly subscribers and pricing (monthly →
 * yearly price)". `Plans.dc.html`.
 */
let query = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => query,
  usePathname: () => "/profile/membership/plans",
}));

beforeEach(() => {
  query = new URLSearchParams();
});

describe("comparación de planes", () => {
  it("muestra el precio mensual y el anual", () => {
    render(<PlansPage />);

    expect(screen.getByText("$249.00")).toBeInTheDocument();
    expect(screen.getAllByText("$2,400.00").length).toBeGreaterThan(0);
  });

  it("incluye la tabla comparativa con una fila de valor y la fila de total", () => {
    render(<PlansPage />);

    expect(screen.getByText("Included visits each month")).toBeInTheDocument();
    expect(screen.getByText("What twelve months costs")).toBeInTheDocument();
    expect(screen.getByText("$2,988.00")).toBeInTheDocument();
  });

  it("por defecto, Annual lleva el chip 'Your plan'", () => {
    render(<PlansPage />);

    expect(screen.getByText("Your plan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch to monthly" })).toBeInTheDocument();
  });

  it("con ?plan=monthly, el chip 'Your plan' se mueve a Monthly", () => {
    query = new URLSearchParams({ plan: "monthly" });
    render(<PlansPage />);

    expect(screen.getByText("Your plan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch to annual" })).toBeInTheDocument();
  });
});
