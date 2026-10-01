import { createClient as createAdminClient } from "@supabase/supabase-js";
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

  /* Story 10.1 — un usuario de un partner suspendido, o suspendido él mismo, no entra al dashboard. */
  async function partnerUser(label: string) {
    const service = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: partner } = await service.from("partners").insert({ name: `Guard ${label} ${stamp}`, status: "active" }).select("id").single();
    const loungeId = `test-lounge-guard-${label}-${stamp}`;
    await service.from("lounges").insert({ id: loungeId, name: "Guard Lounge", neighborhood: "Test", city: "Test City", city_id: "test-city", lat: 0, lng: 0, hours: "Open", content_status: "draft", partner_id: partner!.id });
    const supabase = createClient();
    await signUpConfirmedPartnerAndSignIn(supabase, `guard-${label}-${stamp}@halcyon-test.com`, "HalcyonFOH!24", { businessName: "unused", loungeIds: [loungeId] });
    const cleanup = async () => {
      await supabase.auth.signOut();
      await service.from("lounges").delete().eq("id", loungeId);
      await service.from("partners").delete().eq("id", partner!.id);
    };
    return { service, partnerId: partner!.id as string, email: `guard-${label}-${stamp}@halcyon-test.com`, cleanup };
  }

  it("manda a /partner/login si su partner está suspendido", async () => {
    const { service, partnerId, cleanup } = await partnerUser("partner");
    await service.from("partners").update({ status: "suspended" }).eq("id", partnerId);

    render(
      <RequirePartnerSession>
        <p>Contenido de partner</p>
      </RequirePartnerSession>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/partner/login?suspended=1"));
    expect(screen.queryByText("Contenido de partner")).not.toBeInTheDocument();
    await cleanup();
  });

  it("manda a /partner/login si el usuario está suspendido", async () => {
    const { service, email, cleanup } = await partnerUser("user");
    await service.from("partner_members").update({ suspended_at: new Date().toISOString() }).eq("email", email);

    render(
      <RequirePartnerSession>
        <p>Contenido de partner</p>
      </RequirePartnerSession>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/partner/login?suspended=1"));
    expect(screen.queryByText("Contenido de partner")).not.toBeInTheDocument();
    await cleanup();
  });
});
