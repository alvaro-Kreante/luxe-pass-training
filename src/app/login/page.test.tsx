import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LOCKOUT_MINUTES } from "@/lib/authentication";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import LoginPage from "./page";

/**
 * Story 1.2 — User Login & Authentication.
 * Los criterios que cubre están en
 * docs/specs/epic-1-user-onboarding-authentication/story-1.2-user-login-authentication.md
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

type User = ReturnType<typeof userEvent.setup>;

const PASSWORD = "EnSoleil!2026";
const CONFIRMED_EMAIL = `login-${Date.now()}@ensoleil-test.com`;
const UNCONFIRMED_EMAIL = `sin-confirmar-${Date.now()}@ensoleil-test.com`;

beforeAll(async () => {
  const admin = createClient();
  await signUpConfirmedAndSignIn(admin, CONFIRMED_EMAIL, PASSWORD);
  await admin.auth.signOut();

  const plain = createClient();
  await plain.auth.signUp({ email: UNCONFIRMED_EMAIL, password: PASSWORD });
});

beforeEach(() => {
  push.mockClear();
});

function emailField() {
  return screen.getByLabelText("Email address");
}

function passwordField() {
  return screen.getByLabelText("Password");
}

function submitButton() {
  return screen.getByRole("button", { name: "Log in" });
}

/** Deja el formulario relleno con un email real y una contraseña equivocada, y falla `times` veces. */
async function failLogin(user: User, email: string, times: number) {
  for (let attempt = 0; attempt < times; attempt += 1) {
    await user.clear(emailField());
    await user.type(emailField(), email);
    await user.clear(passwordField());
    await user.type(passwordField(), "ClaveIncorrecta!1");
    await user.click(submitButton());
    await waitFor(() =>
      expect(screen.queryByText(/attempt/)).toBeInTheDocument(),
    );
  }
}

describe("navegación", () => {
  it("entra al área de miembro con las credenciales correctas", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(emailField(), CONFIRMED_EMAIL);
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("no navega cuando las credenciales no coinciden", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(emailField(), CONFIRMED_EMAIL);
    await user.type(passwordField(), "ClaveIncorrecta!1");
    await user.click(submitButton());

    await waitFor(() =>
      expect(screen.getByText(/could not find an account/)).toBeVisible(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("no navega cuando el formulario está incompleto", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.click(submitButton());

    expect(push).not.toHaveBeenCalled();
  });

  it("ofrece la salida a recuperar contraseña y a crear cuenta", () => {
    render(<LoginPage />);

    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });
});

describe("validación de los campos", () => {
  it("exige el email", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    expect(screen.getByText("Enter your email address.")).toBeVisible();
  });

  it("exige que el email tenga forma de dirección", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(emailField(), "alexandra.rivas");
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  });

  it("exige la contraseña", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(emailField(), CONFIRMED_EMAIL);
    await user.click(submitButton());

    expect(screen.getByText("Enter your password.")).toBeVisible();
  });
});

describe("email sin confirmar", () => {
  it("no cuenta como intento fallido y manda a verificar el email", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(emailField(), UNCONFIRMED_EMAIL);
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    await waitFor(() =>
      expect(screen.getByText(/confirm your email/i)).toBeVisible(),
    );
    expect(screen.queryByText(/attempts? left/)).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("credenciales incorrectas y bloqueo", () => {
  it("avisa de los intentos que quedan antes del bloqueo", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await failLogin(user, `intentos-${Date.now()}@ensoleil-test.com`, 1);

    expect(screen.getByText(/4 attempts left/)).toBeVisible();
  });

  it("bloquea la cuenta tras el quinto intento fallido y deshabilita el formulario", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);
    const email = `bloqueo-${Date.now()}@ensoleil-test.com`;

    await failLogin(user, email, 5);

    await waitFor(() =>
      expect(screen.getByText("Account temporarily locked")).toBeVisible(),
    );
    expect(
      screen.getByText(new RegExp(`Try again in ${LOCKOUT_MINUTES} minutes`)),
    ).toBeVisible();
    expect(emailField()).toBeDisabled();
    expect(passwordField()).toBeDisabled();

    // El bloqueo es real (RPC), así que sigue activo tras un submit más.
    await user.click(
      screen.getByRole("button", { name: `Locked for ${LOCKOUT_MINUTES} minutes` }),
    );
    expect(push).not.toHaveBeenCalled();
  });
});

describe("mostrar contraseña", () => {
  it("alterna entre ocultar y revelar lo escrito", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    expect(passwordField()).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordField()).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordField()).toHaveAttribute("type", "password");
  });
});
