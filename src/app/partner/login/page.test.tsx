import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn, signUpConfirmedPartnerAndSignIn } from "@/lib/testing/confirmed-user";

import PartnerLoginPage from "./page";

/**
 * Flow: docs/specs/flows/flow-partner-experience.md — "Partner Login" →
 * "Partner Dashboard: daily overview screen". Sin historia dedicada, pero
 * ahora conecta contra Supabase Auth real + la tabla `user_roles`
 * (docs/DATA-MODEL-MAP.md "decisión abierta... en cuanto se empiece Epic 7").
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const PASSWORD = "AinsworthFOH!24";
const PARTNER_EMAIL = `partner-login-${Date.now()}@theainsworth-test.com`;
const MEMBER_EMAIL = `not-a-partner-${Date.now()}@ensoleil-test.com`;

beforeAll(async () => {
  const admin = createClient();
  await signUpConfirmedPartnerAndSignIn(admin, PARTNER_EMAIL, PASSWORD, {
    businessName: "The Ainsworth",
    loungeIds: ["the-ainsworth"],
  });
  await admin.auth.signOut();

  const memberClient = createClient();
  await signUpConfirmedMemberAndSignIn(memberClient, MEMBER_EMAIL, PASSWORD);
  await memberClient.auth.signOut();
});

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
  it("entra al dashboard con las credenciales de una cuenta de partner real", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerLoginPage />);

    await user.type(emailField(), PARTNER_EMAIL);
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/partner"));
  });

  it("no navega con credenciales incorrectas y avisa", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerLoginPage />);

    await user.type(emailField(), PARTNER_EMAIL);
    await user.type(passwordField(), "wrong-password");
    await user.click(submitButton());

    await waitFor(() =>
      expect(
        screen.getByText("We could not find a partner account with that email and password."),
      ).toBeVisible(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("rechaza una cuenta de miembro que no tiene rol de partner", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerLoginPage />);

    await user.type(emailField(), MEMBER_EMAIL);
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    await waitFor(() =>
      expect(
        screen.getByText("We could not find a partner account with that email and password."),
      ).toBeVisible(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("separa explícitamente el acceso de partner del login de miembro", () => {
    render(<PartnerLoginPage />);

    expect(screen.getByText(/Members sign in at/)).toBeVisible();
  });
});
