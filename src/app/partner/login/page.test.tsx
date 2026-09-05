import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PARTNER_ACCOUNT } from "@/lib/partner";
import PartnerLoginPage from "./page";

/**
 * Flow: docs/specs/flows/flow-partner-experience.md — "Partner Login" →
 * "Partner Dashboard: daily overview screen". Sin historia dedicada (no hay
 * criterios de aceptación propios): es el punto de entrada que separa el
 * acceso de partner del login de miembro, per DESIGN-SYSTEM.md §6 Fase 2.
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  push.mockClear();
});

function emailField() {
  return screen.getByLabelText("Work email");
}

function passwordField() {
  return screen.getByLabelText("Password");
}

function submitButton() {
  return screen.getByRole("button", { name: "Sign in" });
}

describe("acceso de partner", () => {
  it("entra al dashboard con las credenciales correctas", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerLoginPage />);

    await user.type(emailField(), PARTNER_ACCOUNT.email);
    await user.type(passwordField(), PARTNER_ACCOUNT.password);
    await user.click(submitButton());

    expect(push).toHaveBeenCalledWith("/partner");
  });

  it("no navega con credenciales incorrectas y avisa", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerLoginPage />);

    await user.type(emailField(), PARTNER_ACCOUNT.email);
    await user.type(passwordField(), "wrong-password");
    await user.click(submitButton());

    expect(push).not.toHaveBeenCalled();
    expect(
      screen.getByText("We could not find a partner account with that email and password."),
    ).toBeVisible();
  });

  it("separa explícitamente el acceso de partner del login de miembro", () => {
    render(<PartnerLoginPage />);

    expect(screen.getByText(/Members sign in at/)).toBeVisible();
  });
});
