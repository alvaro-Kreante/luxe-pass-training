import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LOCKOUT_MINUTES, SAMPLE_ACCOUNT } from "@/lib/authentication";
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

/** Deja el formulario relleno con credenciales que no existen y falla `times` veces. */
async function failLogin(user: User, times: number) {
  await user.type(emailField(), SAMPLE_ACCOUNT.email);
  await user.type(passwordField(), "ClaveIncorrecta!1");

  for (let attempt = 0; attempt < times; attempt += 1) {
    await user.click(submitButton());
  }
}

describe("navegación", () => {
  it("entra al área de miembro con las credenciales correctas", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(emailField(), SAMPLE_ACCOUNT.email);
    await user.type(passwordField(), SAMPLE_ACCOUNT.password);
    await user.click(submitButton());

    expect(push).toHaveBeenCalledWith("/");
  });

  it("no navega cuando las credenciales no coinciden", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await failLogin(user, 1);

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

    await user.type(passwordField(), SAMPLE_ACCOUNT.password);
    await user.click(submitButton());

    expect(screen.getByText("Enter your email address.")).toBeVisible();
  });

  it("exige que el email tenga forma de dirección", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(emailField(), "alexandra.rivas");
    await user.type(passwordField(), SAMPLE_ACCOUNT.password);
    await user.click(submitButton());

    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  });

  it("exige la contraseña", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(emailField(), SAMPLE_ACCOUNT.email);
    await user.click(submitButton());

    expect(screen.getByText("Enter your password.")).toBeVisible();
  });
});

describe("credenciales incorrectas", () => {
  it("avisa de los intentos que quedan antes del bloqueo", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await failLogin(user, 1);

    expect(screen.getByText(/4 attempts left/)).toBeVisible();
  });

  it("usa el singular cuando queda un solo intento", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await failLogin(user, 4);

    expect(screen.getByText(/1 attempt left/)).toBeVisible();
    expect(screen.queryByText(/1 attempts left/)).not.toBeInTheDocument();
  });
});

describe("bloqueo tras cinco intentos fallidos", () => {
  it("avisa de que la cuenta ha quedado bloqueada", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await failLogin(user, 5);

    expect(screen.getByText("Account temporarily locked")).toBeVisible();
    expect(
      screen.getByText(new RegExp(`Try again in ${LOCKOUT_MINUTES} minutes`)),
    ).toBeVisible();
  });

  it("deshabilita el formulario", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await failLogin(user, 5);

    expect(emailField()).toBeDisabled();
    expect(passwordField()).toBeDisabled();
    expect(
      screen.getByRole("button", { name: `Locked for ${LOCKOUT_MINUTES} minutes` }),
    ).toBeDisabled();
  });

  it("deja de contar intentos y retira el aviso de los que quedaban", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await failLogin(user, 5);

    expect(screen.queryByText(/attempts left/)).not.toBeInTheDocument();
  });

  it("no deja entrar aunque después se acierten las credenciales", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await failLogin(user, 5);
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
