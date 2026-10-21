import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { featuredLounges } from "@/lib/lounges";
import { createClient } from "@/lib/supabase/client";
import {
  signUpConfirmedAndSignIn,
  signUpConfirmedMemberAndSignIn,
} from "@/lib/testing/confirmed-user";
import HomePage from "./page";

/**
 * Home del área de miembro (Home.dc.html, epic-1-onboarding). No pertenece a
 * ninguna historia: es la entrada al App shell que fija el Epic 2. Solo la ve
 * un miembro con sesión y perfil completo (flow-onboarding.md: sin perfil,
 * ProfileCreation).
 */

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace, push: vi.fn() }),
}));

beforeEach(async () => {
  replace.mockClear();
  await createClient().auth.signOut();
});

async function signInMember() {
  await signUpConfirmedMemberAndSignIn(
    createClient(),
    `home-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
}

describe("acceso al home", () => {
  it("manda a /login cuando no hay sesión", async () => {
    render(<HomePage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByRole("heading", { name: /hello/i })).not.toBeInTheDocument();
  });

  it("manda a completar el onboarding cuando hay sesión pero no perfil", async () => {
    await signUpConfirmedAndSignIn(
      createClient(),
      `home-sin-perfil-${Date.now()}@ensoleil-test.example`,
      "EnSoleil!2026",
    );

    render(<HomePage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/basics"));
    expect(screen.queryByRole("heading", { name: /hello/i })).not.toBeInTheDocument();
  });
});

describe("navegación desde el home", () => {
  it("lleva a Explore desde el enlace de la sección de destacados", async () => {
    await signInMember();
    render(<HomePage />);

    expect(await screen.findByRole("link", { name: /view all/i })).toHaveAttribute(
      "href",
      "/explore",
    );
  });

  it("ofrece un enlace a la ficha de cada lounge destacado", async () => {
    await signInMember();
    render(<HomePage />);

    await screen.findByRole("link", { name: /view all/i });
    for (const lounge of featuredLounges()) {
      expect(
        screen.getByRole("link", { name: `View details for ${lounge.name}` }),
      ).toHaveAttribute("href", `/lounges/${lounge.id}`);
    }
  });
});

describe("lounges destacados", () => {
  it("muestra los tres destacados del catálogo", async () => {
    const featured = featuredLounges();
    await signInMember();

    render(<HomePage />);

    await screen.findByRole("link", { name: /view all/i });
    expect(featured).toHaveLength(3);
    for (const lounge of featured) {
      expect(screen.getByText(lounge.name)).toBeInTheDocument();
    }
  });
});

describe("saludo", () => {
  it("saluda al miembro con sesión por su nombre real", async () => {
    await signInMember();

    render(<HomePage />);

    expect(await screen.findByRole("heading", { name: "Hello, Test" })).toBeInTheDocument();
  });

  it("no muestra nunca el nombre del miembro de muestra", async () => {
    await signInMember();

    render(<HomePage />);

    await screen.findByRole("heading", { name: "Hello, Test" });
    expect(screen.queryByRole("heading", { name: /alexandra/i })).not.toBeInTheDocument();
  });
});
