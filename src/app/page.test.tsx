import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { featuredLounges } from "@/lib/lounges";
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
