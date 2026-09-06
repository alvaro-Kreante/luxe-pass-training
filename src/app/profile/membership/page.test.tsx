import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MEMBERSHIP_BENEFITS } from "@/lib/membership";

import MembershipPage from "./page";

/**
 * Story 9.1 — "Clear membership display in profile (active/inactive)",
 * "Benefits explanation", "Upgrade options to monthly subscribers and
 * pricing (monthly → yearly price)" y "Renewal date and auto-renewal
 * settings". `Main.dc.html` (Alexandra, anual) / `MonthlyPlan.dc.html`
 * (Naomi, mensual, alcanzado por `?plan=monthly`).
 */
let query = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => query,
  usePathname: () => "/profile/membership",
}));

beforeEach(() => {
  query = new URLSearchParams();
});

describe("estado de la membresía", () => {
  it("muestra el plan anual activo por defecto", () => {
    render(<MembershipPage />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Annual")).toBeInTheDocument();
  });

  it("explica los seis beneficios de la membresía", () => {
    render(<MembershipPage />);

    for (const benefit of MEMBERSHIP_BENEFITS) {
      expect(screen.getByText(benefit.title)).toBeInTheDocument();
    }
  });
});

describe("suscriptor mensual (?plan=monthly)", () => {
  beforeEach(() => {
    query = new URLSearchParams({ plan: "monthly" });
  });

  it("muestra el plan mensual de Naomi Feldstein y la oferta de subir a anual", () => {
    render(<MembershipPage />);

    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText(/Save \$588\.00 a year/)).toBeInTheDocument();
  });

  it("al pulsar Switch to annual, abre el modal con el importe prorrateado", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MembershipPage />);

    await user.click(screen.getByRole("button", { name: "Switch to annual" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Confirm your new plan")).toBeInTheDocument();
    expect(within(dialog).getByText("$2,217.40")).toBeInTheDocument();
  });

  it("confirmar en el modal lo cierra", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MembershipPage />);

    await user.click(screen.getByRole("button", { name: "Switch to annual" }));
    await user.click(screen.getByRole("button", { name: /Pay \$2,217\.40 and switch/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("renovación y auto-renovación", () => {
  it("muestra la fecha de renovación", () => {
    render(<MembershipPage />);

    expect(screen.getByText("November 3, 2026")).toBeInTheDocument();
  });

  it("abrir Manage renewal muestra el diálogo con las consecuencias de apagarla", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MembershipPage />);

    await user.click(screen.getByRole("button", { name: "Manage renewal" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Turn off auto-renewal?")).toBeInTheDocument();
    expect(within(dialog).getByText(/Pause for up to 3 months/)).toBeInTheDocument();
  });

  it('"Turn it off" apaga el switch de auto-renovación del rail', async () => {
    const user = userEvent.setup({ delay: null });
    render(<MembershipPage />);

    await user.click(screen.getByRole("button", { name: "Manage renewal" }));
    await user.click(screen.getByRole("button", { name: "Turn it off" }));

    expect(screen.getByRole("switch", { name: "Auto-renewal" })).toHaveAttribute("aria-checked", "false");
  });
});
