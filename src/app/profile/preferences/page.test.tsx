import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FAVORITE_LOUNGES } from "@/lib/profile";

import PreferencesPage from "./page";

/**
 * Story 6.3 — "Favorite lounges list" y "Preferred amenities selection".
 * `Preferences.dc.html`.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/preferences",
}));

describe("lounges favoritos", () => {
  it("lista los lounges guardados", () => {
    render(<PreferencesPage />);

    for (const lounge of FAVORITE_LOUNGES) {
      expect(screen.getByText(lounge.name)).toBeInTheDocument();
    }
  });
});

describe("amenities preferidas", () => {
  it("permite activar y desactivar una amenity", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PreferencesPage />);

    const wifiChip = screen.getByRole("button", { name: "WiFi" });
    expect(wifiChip).toHaveAttribute("aria-pressed", "true");

    await user.click(wifiChip);
    expect(wifiChip).toHaveAttribute("aria-pressed", "false");
  });
});

describe("unidad de distancia", () => {
  it("cambia entre millas y kilómetros", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PreferencesPage />);

    const km = screen.getByRole("button", { name: "km" });
    await user.click(km);

    expect(km).toHaveAttribute("aria-pressed", "true");
  });
});
