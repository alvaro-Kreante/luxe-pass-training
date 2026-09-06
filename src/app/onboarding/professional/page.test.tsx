import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProfileDraftProvider,
  useProfileDraft,
} from "@/components/onboarding/profile-context";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import ProfileProfessionalPage from "./page";

/**
 * Story 1.1 — "Profile creation includes: name*, phone*, ... location*,
 * ... Industry*, Company..." y el nodo del flow "AllFields -> WelcomeScreen":
 * al completar el paso 3, el perfil se guarda de verdad en `public.profiles`.
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function Harness() {
  const { update } = useProfileDraft();
  React.useEffect(() => {
    update({
      fullName: "Ada Lovelace",
      phone: "+1 555 010 2000",
      city: "New York, USA",
    });
  }, [update]);
  return <ProfileProfessionalPage />;
}

async function renderReadyPage() {
  const supabase = createClient();
  const email = `perfil-${Date.now()}@ensoleil-test.com`;
  await signUpConfirmedAndSignIn(supabase, email, "EnSoleil!2026");

  render(
    <ProfileDraftProvider>
      <Harness />
    </ProfileDraftProvider>,
  );

  return supabase;
}

describe("ProfileProfessionalPage", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("guarda el perfil en Supabase y navega a /welcome", async () => {
    const user = userEvent.setup({ delay: null });
    const supabase = await renderReadyPage();

    await user.selectOptions(
      screen.getByLabelText("Industry *"),
      "Technology",
    );
    await user.click(screen.getByRole("button", { name: "Complete profile" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/welcome"));

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, phone, city, industry")
      .eq("id", authUser!.id)
      .single();

    expect(error).toBeNull();
    expect(profile).toMatchObject({
      full_name: "Ada Lovelace",
      phone: "+1 555 010 2000",
      city: "New York, USA",
      industry: "Technology",
    });

    await supabase.auth.signOut();
  });

  it("exige elegir una industria antes de guardar", async () => {
    const user = userEvent.setup({ delay: null });
    const supabase = await renderReadyPage();

    await user.click(screen.getByRole("button", { name: "Complete profile" }));

    expect(screen.getByText("Select your industry.")).toBeVisible();
    expect(push).not.toHaveBeenCalled();

    await supabase.auth.signOut();
  });
});
