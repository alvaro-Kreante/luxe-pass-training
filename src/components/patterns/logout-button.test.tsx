import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import { LogoutButton } from "./logout-button";

/**
 * Ticket 002 §4–5 — un solo clic cierra la sesión de Supabase y lleva al
 * login de cada shell (miembro, partner, admin).
 */

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

beforeEach(() => {
  replace.mockClear();
});

describe("cerrar sesión", () => {
  it("cierra la sesión activa y aterriza en el login indicado", async () => {
    const supabase = createClient();
    await signUpConfirmedMemberAndSignIn(
      supabase,
      `logout-${Date.now()}@ensoleil-test.example`,
      "EnSoleil!2026",
    );
    const user = userEvent.setup({ delay: null });

    render(<LogoutButton redirectTo="/partner/login" />);
    await user.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/partner/login"));
    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });
});
