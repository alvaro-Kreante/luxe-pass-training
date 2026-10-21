import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import ForgotPasswordPage from "./page";

/**
 * Story 1.2 — "Password reset via email with secure token".
 * `resetPasswordForEmail` es anti-enumeración por diseño (igual que
 * `signUp`), así que la copy "If an account exists for…" ya es la correcta
 * exista o no la cuenta — no hace falta el RPC-excepción de `email_exists`.
 * El envío real va vía Brevo (Auth Hook `send_email`, ver CLAUDE.md §Envío
 * de email transaccional): no hay Mailpit/Inbucket que inspeccionar aquí,
 * el acuse de "Check your inbox" es lo único observable desde el test.
 */

describe("forgot-password", () => {
  it("exige un email con forma válida antes de pedir el reset", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email address"), "alexandra.rivas");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  });

  it("pide el reset de verdad contra Supabase y muestra el acuse de envío", async () => {
    const user = userEvent.setup({ delay: null });
    const email = `reset-${Date.now()}@ensoleil-test.example`;
    const supabase = createClient();
    await signUpConfirmedAndSignIn(supabase, email, "EnSoleil!2026");
    await supabase.auth.signOut();

    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email address"), email);
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => expect(screen.getByText(email)).toBeVisible());
    expect(screen.getByText("Check your inbox")).toBeVisible();
  });

  it("funciona igual para un email que no tiene cuenta (anti-enumeración)", async () => {
    const user = userEvent.setup({ delay: null });
    const email = `no-existe-${Date.now()}@ensoleil-test.example`;
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email address"), email);
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => expect(screen.getByText(email)).toBeVisible());
  });
});
