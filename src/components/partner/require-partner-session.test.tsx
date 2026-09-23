import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import {
  signUpConfirmedMemberAndSignIn,
  signUpConfirmedPartnerAndSignIn,
} from "@/lib/testing/confirmed-user";

import { RequirePartnerSession } from "./require-partner-session";

/**
 * Epic 7 — todas las pantallas bajo `/partner` (salvo `/partner/login`)
 * exigen sesión de Supabase real Y rol `partner` (`has_role`, ver
 * `supabase/schemas/user_roles.sql`) — una cuenta de miembro con sesión
 * activa pero sin ese rol se trata igual que si no hubiera sesión.
 */

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  replace.mockClear();
});

describe("RequirePartnerSession", () => {
  it("manda a /partner/login cuando no hay sesión", async () => {
    render(
      <RequirePartnerSession>
        <p>Contenido de partner</p>
      </RequirePartnerSession>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/partner/login"));
    expect(screen.queryByText("Contenido de partner")).not.toBeInTheDocument();
  });

  it("manda a /partner/login cuando la sesión es de un miembro sin rol de partner", async () => {
    const supabase = createClient();
    const email = `miembro-${Date.now()}@ensoleil-test.com`;
    await signUpConfirmedMemberAndSignIn(supabase, email, "EnSoleil!2026");

    render(
      <RequirePartnerSession>
        <p>Contenido de partner</p>
      </RequirePartnerSession>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/partner/login"));
    expect(screen.queryByText("Contenido de partner")).not.toBeInTheDocument();

    await supabase.auth.signOut();
  });

  it("muestra el contenido con una sesión de partner real", async () => {
    const supabase = createClient();
    const email = `partner-guard-${Date.now()}@theainsworth-test.com`;
    await signUpConfirmedPartnerAndSignIn(supabase, email, "AinsworthFOH!24", {
      businessName: "The Ainsworth",
      loungeIds: ["the-ainsworth"],
    });

    render(
      <RequirePartnerSession>
        <p>Contenido de partner</p>
      </RequirePartnerSession>,
    );

    await waitFor(() => expect(screen.getByText("Contenido de partner")).toBeVisible());
    expect(replace).not.toHaveBeenCalled();

    await supabase.auth.signOut();
  });
});
