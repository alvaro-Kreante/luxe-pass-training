import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import AdminLoginPage from "./page";

/**
 * Epic 8 — sin artboard propio (ver el comentario de `page.tsx`), pero la
 * autenticación conecta contra Supabase Auth real + `has_role('admin')`
 * (`supabase/schemas/user_roles.sql`), mismo criterio que `/partner/login`.
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const PASSWORD = "SupportDesk!24";
const ADMIN_EMAIL = `admin-login-${Date.now()}@ensoleil-test.com`;
const MEMBER_EMAIL = `not-an-admin-${Date.now()}@ensoleil-test.com`;

beforeAll(async () => {
  const admin = createClient();
  await signUpConfirmedAdminAndSignIn(admin, ADMIN_EMAIL, PASSWORD);
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

describe("acceso de admin", () => {
  it("entra a la consola con las credenciales de una cuenta de admin real", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AdminLoginPage />);

    await user.type(emailField(), ADMIN_EMAIL);
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/support"));
  });

  it("no navega con credenciales incorrectas y avisa", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AdminLoginPage />);

    await user.type(emailField(), ADMIN_EMAIL);
    await user.type(passwordField(), "wrong-password");
    await user.click(submitButton());

    await waitFor(() =>
      expect(
        screen.getByText("We could not find an admin account with that email and password."),
      ).toBeVisible(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("rechaza una cuenta de miembro que no tiene rol de admin", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AdminLoginPage />);

    await user.type(emailField(), MEMBER_EMAIL);
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    await waitFor(() =>
      expect(
        screen.getByText("We could not find an admin account with that email and password."),
      ).toBeVisible(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("separa explícitamente el acceso de admin del login de miembro", () => {
    render(<AdminLoginPage />);

    expect(screen.getByText(/Members sign in at/)).toBeVisible();
  });
});
