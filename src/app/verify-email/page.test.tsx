import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";

import VerifyEmailPage from "./page";

/**
 * Story 1.1 — "Email verification required before account activation",
 * segmento "Waiting for verification, resend option available" del flow.
 */

const EMAIL = `verificar-${Date.now()}@ensoleil-test.com`;
const EMAIL_FROM_LOGIN = `verificar-login-${Date.now()}@ensoleil-test.com`;
// Auth rechaza (429) un segundo correo al mismo email antes de
// `max_frequency` (1s en config.toml) — el signup ya mandó el primero.
const AUTH_EMAIL_MAX_FREQUENCY_MS = 1100;
const push = vi.fn();
const replace = vi.fn();

let searchParams = new URLSearchParams({ email: EMAIL });

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push, replace }),
}));

beforeAll(async () => {
  const supabase = createClient();
  await supabase.auth.signUp({ email: EMAIL, password: "EnSoleil!2026" });
  await supabase.auth.signUp({ email: EMAIL_FROM_LOGIN, password: "EnSoleil!2026" });
  await new Promise((resolve) => setTimeout(resolve, AUTH_EMAIL_MAX_FREQUENCY_MS));
});

describe("verify-email", () => {
  it("muestra el email al que se envió el enlace", () => {
    render(<VerifyEmailPage />);

    expect(screen.getByText(EMAIL)).toBeVisible();
  });

  it("reenvía el correo de verificación y arranca el cooldown", async () => {
    const user = userEvent.setup({ delay: null });
    render(<VerifyEmailPage />);

    await user.click(screen.getByRole("button", { name: "Resend email" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Resend in \d+s/ }),
      ).toBeDisabled(),
    );
  });

  it("ya no ofrece el atajo manual de verificación", () => {
    render(<VerifyEmailPage />);

    expect(
      screen.queryByRole("link", { name: "I have verified my email" }),
    ).not.toBeInTheDocument();
  });

  it("ofrece la vuelta al login", () => {
    render(<VerifyEmailPage />);

    expect(screen.getByRole("link", { name: "Back to log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("reenvía solo al llegar desde el login con resend=1", async () => {
    searchParams = new URLSearchParams({ email: EMAIL_FROM_LOGIN, resend: "1" });
    render(<VerifyEmailPage />);
    searchParams = new URLSearchParams({ email: EMAIL });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Resend in \d+s/ }),
      ).toBeDisabled(),
    );
  });

  it("avisa si el reenvío falla en vez de arrancar el cooldown", async () => {
    searchParams = new URLSearchParams({ email: "no-es-un-email" });
    const user = userEvent.setup({ delay: null });
    render(<VerifyEmailPage />);
    searchParams = new URLSearchParams({ email: EMAIL });

    await user.click(screen.getByRole("button", { name: "Resend email" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not resend/i,
    );
    expect(screen.getByRole("button", { name: "Resend email" })).toBeEnabled();
  });

  it("deshabilita el reenvío si no llegó un email por query param", () => {
    searchParams = new URLSearchParams();
    render(<VerifyEmailPage />);
    searchParams = new URLSearchParams({ email: EMAIL });

    expect(screen.getByRole("button", { name: "Resend email" })).toBeDisabled();
  });
});

describe("email confirmado", () => {
  beforeEach(() => {
    push.mockClear();
    searchParams = new URLSearchParams({
      verified: "1",
      next: "/onboarding/basics",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    searchParams = new URLSearchParams({ email: EMAIL });
  });

  it("muestra la confirmación en vez de la espera", () => {
    render(<VerifyEmailPage />);

    expect(screen.getByText("Email confirmed")).toBeVisible();
    expect(screen.queryByText("Check your inbox")).not.toBeInTheDocument();
  });

  it("el botón Continue lleva al siguiente paso", async () => {
    const user = userEvent.setup({ delay: null });
    render(<VerifyEmailPage />);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(push).toHaveBeenCalledWith("/onboarding/basics");
  });

  it("continúa sola pasado un momento", () => {
    vi.useFakeTimers();
    render(<VerifyEmailPage />);

    expect(push).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);

    expect(push).toHaveBeenCalledWith("/onboarding/basics");
  });

  it("usa /onboarding/basics si no llega el destino", () => {
    searchParams = new URLSearchParams({ verified: "1" });
    vi.useFakeTimers();
    render(<VerifyEmailPage />);
    vi.advanceTimersByTime(3000);

    expect(push).toHaveBeenCalledWith("/onboarding/basics");
  });
});
