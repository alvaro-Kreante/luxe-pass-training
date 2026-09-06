import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import { RequireSession } from "./require-session";

/**
 * Story 1.1 — el flujo de perfil (/onboarding/*) solo tiene sentido con una
 * sesión ya confirmada (viene de /auth/confirm). Sin sesión, no hay a quién
 * atribuirle la fila de `profiles` (RLS exige auth.uid()).
 */

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  replace.mockClear();
});

describe("RequireSession", () => {
  it("manda a /login cuando no hay sesión", async () => {
    render(
      <RequireSession>
        <p>Contenido protegido</p>
      </RequireSession>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });

  it("muestra el contenido cuando hay una sesión activa", async () => {
    const supabase = createClient();
    const email = `sesion-${Date.now()}@ensoleil-test.com`;
    await signUpConfirmedAndSignIn(supabase, email, "EnSoleil!2026");

    render(
      <RequireSession>
        <p>Contenido protegido</p>
      </RequireSession>,
    );

    await waitFor(() =>
      expect(screen.getByText("Contenido protegido")).toBeVisible(),
    );
    expect(replace).not.toHaveBeenCalled();

    await supabase.auth.signOut();
  });
});
