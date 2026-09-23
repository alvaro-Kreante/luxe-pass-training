import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import {
  signUpConfirmedAdminAndSignIn,
  signUpConfirmedMemberAndSignIn,
} from "@/lib/testing/confirmed-user";

import { RequireAdminSession } from "./require-admin-session";

/**
 * Epic 8 — todas las pantallas bajo `/admin` (salvo `/admin/login`) exigen
 * sesión de Supabase real Y rol `admin` (`has_role`, ver
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

describe("RequireAdminSession", () => {
  it("manda a /admin/login cuando no hay sesión", async () => {
    render(
      <RequireAdminSession>
        <p>Contenido de admin</p>
      </RequireAdminSession>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login"));
    expect(screen.queryByText("Contenido de admin")).not.toBeInTheDocument();
  });

  it("manda a /admin/login cuando la sesión es de un miembro sin rol de admin", async () => {
    const supabase = createClient();
    const email = `miembro-${Date.now()}@ensoleil-test.com`;
    await signUpConfirmedMemberAndSignIn(supabase, email, "EnSoleil!2026");

    render(
      <RequireAdminSession>
        <p>Contenido de admin</p>
      </RequireAdminSession>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login"));
    expect(screen.queryByText("Contenido de admin")).not.toBeInTheDocument();

    await supabase.auth.signOut();
  });

  it("muestra el contenido con una sesión de admin real", async () => {
    const supabase = createClient();
    const email = `admin-guard-${Date.now()}@ensoleil-test.com`;
    await signUpConfirmedAdminAndSignIn(supabase, email, "SupportDesk!24");

    render(
      <RequireAdminSession>
        <p>Contenido de admin</p>
      </RequireAdminSession>,
    );

    await waitFor(() => expect(screen.getByText("Contenido de admin")).toBeVisible());
    expect(replace).not.toHaveBeenCalled();

    await supabase.auth.signOut();
  });
});
