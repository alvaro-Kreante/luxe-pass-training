import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import ResetPasswordPage from "./page";

/**
 * Story 1.2 — "Password reset via email with secure token", tramo final:
 * la sesión de recuperación (que deja /auth/confirm con type=recovery) ya
 * permite `updateUser`. Sin artboard propio — ver COMPONENT-MAP.md.
 * El nodo `PwdReset --> HomeScreen` de flow-onboarding.md fija el destino:
 * no hay un login de por medio.
 */

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
});

async function signedInSession() {
  const supabase = createClient();
  const email = `reset-password-${Date.now()}@ensoleil-test.com`;
  await signUpConfirmedAndSignIn(supabase, email, "EnSoleil!2026");
  return supabase;
}

describe("sin sesión", () => {
  it("manda a /login", async () => {
    render(<ResetPasswordPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});

describe("con sesión de recuperación", () => {
  it("actualiza la contraseña y navega a Home", async () => {
    const user = userEvent.setup({ delay: null });
    const supabase = await signedInSession();

    render(<ResetPasswordPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("New password")).toBeVisible(),
    );
    await user.type(screen.getByLabelText("New password"), "NuevaClave!2026");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "NuevaClave!2026",
    );
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));

    const { data } = await supabase.auth.getUser();
    expect(data.user).not.toBeNull();
    await supabase.auth.signOut();
  });

  it("exige que las dos contraseñas coincidan", async () => {
    const user = userEvent.setup({ delay: null });
    await signedInSession();

    render(<ResetPasswordPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("New password")).toBeVisible(),
    );
    await user.type(screen.getByLabelText("New password"), "NuevaClave!2026");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "OtraClave!2026",
    );
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Both passwords must match.")).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });

  it("exige la longitud mínima y el carácter especial", async () => {
    const user = userEvent.setup({ delay: null });
    await signedInSession();

    render(<ResetPasswordPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("New password")).toBeVisible(),
    );
    await user.type(screen.getByLabelText("New password"), "sinespecial1");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "sinespecial1",
    );
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(
      screen.getByText("Include at least one special character."),
    ).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });
});
