import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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
const search = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => search.params,
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
  search.params = new URLSearchParams();
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

  /* Story 10.1 — el acceso suspendido. */
  it("al llegar desde el dashboard con el acceso suspendido, lo dice", async () => {
    search.params = new URLSearchParams("suspended=1");

    render(<PartnerLoginPage />);

    expect(await screen.findByText(/access to the Partner Dashboard is suspended/i)).toBeVisible();
  });

  it("al llegar con el acceso suspendido, cierra la sesión que siguiera abierta", async () => {
    const supabase = createClient();
    await supabase.auth.signInWithPassword({ email: PARTNER_EMAIL, password: PASSWORD });
    search.params = new URLSearchParams("suspended=1");

    render(<PartnerLoginPage />);

    await waitFor(async () => {
      const { data } = await supabase.auth.getSession();
      expect(data.session).toBeNull();
    });
  });

  it("un usuario suspendido no entra aunque su contraseña sea correcta", async () => {
    const user = userEvent.setup({ delay: null });
    const service = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await service.from("partner_members").update({ suspended_at: new Date().toISOString() }).eq("email", PARTNER_EMAIL.toLowerCase());
    render(<PartnerLoginPage />);

    await user.type(emailField(), PARTNER_EMAIL);
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    expect(await screen.findByText(/access to the Partner Dashboard is suspended/i)).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    await service.from("partner_members").update({ suspended_at: null }).eq("email", PARTNER_EMAIL.toLowerCase());
  });
});
