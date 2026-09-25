import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { featuredLounges } from "@/lib/lounges";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import HomePage from "./page";

/**
 * Home del área de miembro (Home.dc.html, epic-1-onboarding). No pertenece a
 * ninguna historia: es la entrada al App shell que fija el Epic 2.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("navegación desde el home", () => {
  it("lleva a Explore desde el enlace de la sección de destacados", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute(
      "href",
      "/explore",
    );
  });

  it("ofrece un enlace a la ficha de cada lounge destacado", () => {
    render(<HomePage />);

    for (const lounge of featuredLounges()) {
      expect(
        screen.getByRole("link", { name: `View details for ${lounge.name}` }),
      ).toHaveAttribute("href", `/lounges/${lounge.id}`);
    }
  });
});

describe("lounges destacados", () => {
  it("muestra los tres destacados del catálogo", () => {
    const featured = featuredLounges();

    render(<HomePage />);

    expect(featured).toHaveLength(3);
    for (const lounge of featured) {
      expect(screen.getByText(lounge.name)).toBeInTheDocument();
    }
  });
});

describe("saludo", () => {
  it("saluda al miembro con sesión por su nombre real", async () => {
    const supabase = createClient();
    await signUpConfirmedMemberAndSignIn(
      supabase,
      `home-${Date.now()}@ensoleil-test.com`,
      "EnSoleil!2026",
    );

    render(<HomePage />);

    expect(await screen.findByRole("heading", { name: "Hello, Test" })).toBeInTheDocument();
  });
});
