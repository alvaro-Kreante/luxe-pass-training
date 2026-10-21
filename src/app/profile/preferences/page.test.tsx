import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { addFavoriteLounge, fetchInterests, fetchPreferredAmenities } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import PreferencesPage from "./page";

/**
 * Story 6.3 — "Favorite lounges list" y "Preferred amenities selection".
 * `Preferences.dc.html`, backend real: autoguarda cada cambio.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/preferences",
  useRouter: () => ({ replace: vi.fn() }),
}));

async function signUpFreshMember(label: string) {
  const supabase = createClient();
  await signUpConfirmedMemberAndSignIn(
    supabase,
    `preferences-${Date.now()}-${label}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  return supabase;
}

describe("lounges favoritos", () => {
  it("AC 'Favorite lounges list' — lista los lounges guardados de verdad", async () => {
    const supabase = await signUpFreshMember("list");
    await addFavoriteLounge(supabase, "the-ainsworth");

    render(<PreferencesPage />);

    await waitFor(() => expect(screen.getByText("The Ainsworth")).toBeInTheDocument());
  });

  it("quitar el corazón de un favorito lo elimina de verdad", async () => {
    const supabase = await signUpFreshMember("remove");
    await addFavoriteLounge(supabase, "the-ainsworth");
    const user = userEvent.setup({ delay: null });

    render(<PreferencesPage />);
    await screen.findByText("The Ainsworth");

    await user.click(screen.getByRole("button", { name: /remove the ainsworth from favorites/i }));

    await waitFor(() => expect(screen.queryByText("The Ainsworth")).not.toBeInTheDocument());
  });
});

describe("amenities preferidas", () => {
  it("AC 'Preferred amenities selection' — nace sin ninguna marcada y persiste el cambio", async () => {
    const supabase = await signUpFreshMember("amenities");
    const user = userEvent.setup({ delay: null });

    render(<PreferencesPage />);

    const wifiChip = await screen.findByRole("button", { name: "WiFi" });
    expect(wifiChip).toHaveAttribute("aria-pressed", "false");

    await user.click(wifiChip);
    expect(wifiChip).toHaveAttribute("aria-pressed", "true");

    await waitFor(async () => {
      expect(await fetchPreferredAmenities(supabase)).toEqual(["wifi"]);
    });
  });
});

describe("intereses", () => {
  it("permite activar y desactivar un interés, y persiste el cambio", async () => {
    const supabase = await signUpFreshMember("interests");
    const user = userEvent.setup({ delay: null });

    render(<PreferencesPage />);

    const chip = await screen.findByRole("button", { name: "Fine dining" });
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");

    await waitFor(async () => {
      expect(await fetchInterests(supabase)).toEqual(["Fine dining"]);
    });
  });
});

describe("unidad de distancia", () => {
  it("cambia entre millas y kilómetros", async () => {
    await signUpFreshMember("distance-unit");
    const user = userEvent.setup({ delay: null });
    render(<PreferencesPage />);

    await screen.findByRole("button", { name: "WiFi" });
    const km = screen.getByRole("button", { name: "km" });
    await user.click(km);

    expect(km).toHaveAttribute("aria-pressed", "true");
  });
});
