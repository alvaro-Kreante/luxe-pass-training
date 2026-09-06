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
 */

const MAILPIT_URL = "http://127.0.0.1:54334";

async function findRecoveryEmail(email: string) {
  const listRes = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=to:${encodeURIComponent(email)}`,
  );
  const list = await listRes.json();
  return list.messages?.[0] as { Subject: string } | undefined;
}

describe("forgot-password", () => {
  it("exige un email con forma válida antes de pedir el reset", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email address"), "alexandra.rivas");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  });

  it("pide el reset de verdad (llega a Mailpit) y muestra el acuse de envío", async () => {
    const user = userEvent.setup({ delay: null });
    const email = `reset-${Date.now()}@ensoleil-test.com`;
    const supabase = createClient();
    await signUpConfirmedAndSignIn(supabase, email, "EnSoleil!2026");
    await supabase.auth.signOut();

    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email address"), email);
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => expect(screen.getByText(email)).toBeVisible());
    expect(screen.getByText("Check your inbox")).toBeVisible();

    await waitFor(async () => {
      const message = await findRecoveryEmail(email);
      expect(message?.Subject).toBe("Reset your LuxePass password");
    });
  });

  it("funciona igual para un email que no tiene cuenta (anti-enumeración)", async () => {
    const user = userEvent.setup({ delay: null });
    const email = `no-existe-${Date.now()}@ensoleil-test.com`;
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email address"), email);
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => expect(screen.getByText(email)).toBeVisible());
  });
});
