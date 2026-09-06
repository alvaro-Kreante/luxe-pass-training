import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";

import SignUpPage from "./page";

/**
 * Story 1.1 — User Registration.
 * Los criterios que cubre están en
 * docs/specs/epic-1-user-onboarding-authentication/story-1.1-user-registration.md
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

type User = ReturnType<typeof userEvent.setup>;

const NEW_EMAIL = `nueva.socia-${Date.now()}@ensoleil-test.com`;
const DUPLICATE_EMAIL = `ya-existe-${Date.now()}@ensoleil-test.com`;
const VALID_PASSWORD = "EnSoleil!2026";

beforeAll(async () => {
  const supabase = createClient();
  await supabase.auth.signUp({
    email: DUPLICATE_EMAIL,
    password: VALID_PASSWORD,
  });
});

beforeEach(() => {
  push.mockClear();
});

function submitButton() {
  return screen.getByRole("button", { name: "Create account" });
}

/** Abre el modal legal, marca los dos documentos y acepta. */
async function acceptTerms(user: User) {
  await user.click(screen.getByRole("button", { name: "Terms of Service" }));
  await user.click(
    screen.getByRole("checkbox", { name: /accept the Terms of Service/ }),
  );
  await user.click(
    screen.getByRole("checkbox", { name: /accept the Privacy Policy/ }),
  );
  await user.click(screen.getByRole("button", { name: "Accept & continue" }));
}

interface FormValues {
  email?: string;
  password?: string;
  confirm?: string;
}

/** Rellena el formulario; por defecto con datos que pasan la validación. */
async function fillForm(user: User, values: FormValues = {}) {
  const {
    email = NEW_EMAIL,
    password = VALID_PASSWORD,
    confirm = password,
  } = values;

  if (email) await user.type(screen.getByLabelText("Email address"), email);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  if (confirm) {
    await user.type(screen.getByLabelText("Confirm password"), confirm);
  }
}

describe("navegación", () => {
  it("lleva a verificar el email cuando el alta es válida", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);
    await fillForm(user);
    await user.click(submitButton());

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        `/verify-email?email=${encodeURIComponent(NEW_EMAIL)}`,
      ),
    );
  });

  it("no navega cuando el formulario tiene errores", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);
    await fillForm(user, { email: "nueva.socia" });
    await user.click(submitButton());

    expect(push).not.toHaveBeenCalled();
  });

  it("ofrece la vuelta al acceso desde arriba y desde el pie", () => {
    render(<SignUpPage />);

    expect(
      screen.getByRole("link", { name: "Back to log in" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});

describe("aceptación de términos", () => {
  it("mantiene el alta deshabilitada mientras no se acepten", () => {
    render(<SignUpPage />);

    expect(submitButton()).toBeDisabled();
    expect(
      screen.getByText("Disabled until the terms are accepted."),
    ).toBeVisible();
  });

  it("habilita el alta al aceptar los dos documentos", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);

    expect(submitButton()).toBeEnabled();
  });

  it("exige marcar las dos casillas antes de poder aceptar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await user.click(screen.getByRole("button", { name: "Terms of Service" }));
    await user.click(
      screen.getByRole("checkbox", { name: /accept the Terms of Service/ }),
    );

    expect(
      screen.getByRole("button", { name: "Accept & continue" }),
    ).toBeDisabled();
  });

  it("no registra la aceptación si se cierra el modal con Decline", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await user.click(screen.getByRole("button", { name: "Terms of Service" }));
    await user.click(
      screen.getByRole("checkbox", { name: /accept the Terms of Service/ }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /accept the Privacy Policy/ }),
    );
    await user.click(screen.getByRole("button", { name: "Decline" }));

    expect(submitButton()).toBeDisabled();
  });

  it("revoca la aceptación al desmarcar la casilla del formulario", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);
    await user.click(
      screen.getByRole("checkbox", { name: /agree to the Terms of Service/ }),
    );

    expect(submitButton()).toBeDisabled();
  });
});

describe("validación del formulario", () => {
  it("exige el email", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);
    await fillForm(user, { email: "" });
    await user.click(submitButton());

    expect(screen.getByText("Enter your email address.")).toBeVisible();
  });

  it("exige que el email tenga forma de dirección", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);
    await fillForm(user, { email: "nueva.socia" });
    await user.click(submitButton());

    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  });

  it("impide dar de alta un email que ya tiene cuenta", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);
    await fillForm(user, { email: DUPLICATE_EMAIL });
    await user.click(submitButton());

    await waitFor(() =>
      expect(screen.getByText(/An account already exists/)).toBeVisible(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("exige la longitud mínima de la contraseña", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);
    await fillForm(user, { password: "Ab!2" });
    await user.click(submitButton());

    expect(screen.getByText("Use at least 8 characters.")).toBeVisible();
  });

  it("exige un carácter especial en la contraseña", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);
    await fillForm(user, { password: "EnSoleil2026" });
    await user.click(submitButton());

    expect(
      screen.getByText("Include at least one special character."),
    ).toBeVisible();
  });

  it("exige que las dos contraseñas coincidan", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);
    await fillForm(user, { confirm: "EnSoleil!2027" });
    await user.click(submitButton());

    expect(screen.getByText("Both passwords must match.")).toBeVisible();
  });

  it("marca como inválido solo el campo que falla", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    await acceptTerms(user);
    await fillForm(user, { email: "nueva.socia" });
    await user.click(submitButton());

    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });
});

describe("mostrar contraseña", () => {
  it("revela los dos campos de contraseña a la vez", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignUpPage />);

    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );

    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
      "type",
      "text",
    );
  });
});
