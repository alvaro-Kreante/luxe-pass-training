import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { uploadProfilePhoto } from "@/lib/profile-photo";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import { AppShell } from "./app-shell";

/**
 * Patrón 3 del design system — fija la navegación del área de miembro para los
 * Epics 2–6. Lo que se prueba aquí es a dónde lleva cada item y cuál queda
 * marcado como actual, no su geometría.
 */

const pathname = vi.fn(() => "/");

vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe("navegación del área de miembro", () => {
  it("ofrece los cuatro destinos del área de miembro", () => {
    render(<AppShell>contenido</AppShell>);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute(
      "href",
      "/explore",
    );
    expect(screen.getByRole("link", { name: "My Pass" })).toHaveAttribute(
      "href",
      "/my-pass",
    );
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });

  it("marca como actual el destino de la ruta que se está viendo", () => {
    pathname.mockReturnValue("/explore");

    render(<AppShell>contenido</AppShell>);

    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marca Explore como actual también en sus sub-rutas", () => {
    pathname.mockReturnValue("/explore/list");

    render(<AppShell>contenido</AppShell>);

    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marca Explore como actual dentro del perfil de un lounge", () => {
    pathname.mockReturnValue("/lounges/the-ainsworth");

    render(<AppShell>contenido</AppShell>);

    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("no marca Home como actual desde otra sección, pese a ser el prefijo de todas", () => {
    pathname.mockReturnValue("/explore");

    render(<AppShell>contenido</AppShell>);

    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("muestra el contenido de la pantalla que envuelve", () => {
    pathname.mockReturnValue("/");

    render(
      <AppShell>
        <h1>Hello, Alexandra</h1>
      </AppShell>,
    );

    expect(
      screen.getByRole("heading", { name: "Hello, Alexandra" }),
    ).toBeInTheDocument();
  });
});

describe("bloque de usuario de la sidebar", () => {
  it("muestra el nombre real del miembro con sesión, no el de muestra", async () => {
    const supabase = createClient();
    await signUpConfirmedMemberAndSignIn(
      supabase,
      `app-shell-${Date.now()}@ensoleil-test.com`,
      "EnSoleil!2026",
    );

    render(<AppShell>contenido</AppShell>);

    await waitFor(() => expect(screen.getByText("Test Member")).toBeInTheDocument());
    expect(screen.getByText("TM")).toBeInTheDocument();
    expect(screen.getByText(/^(Annual|Monthly|Free) member$/)).toBeInTheDocument();
    expect(screen.queryByText("Alexandra Rivas")).not.toBeInTheDocument();
    expect(screen.queryByText("Annual member")).not.toBeInTheDocument();
  });

  it("muestra la foto de perfil del miembro en vez de sus iniciales", async () => {
    const supabase = createClient();
    const user = await signUpConfirmedMemberAndSignIn(
      supabase,
      `app-shell-photo-${Date.now()}@ensoleil-test.com`,
      "EnSoleil!2026",
    );
    const path = await uploadProfilePhoto(supabase, new File(["x"], "me.png", { type: "image/png" }));
    await supabase.from("profiles").update({ photo_url: path }).eq("id", user.id);

    render(<AppShell>contenido</AppShell>);

    const photo = await screen.findByAltText("Test Member");
    expect(photo.getAttribute("src")).toContain("/object/sign/profile-photos/");
    expect(screen.queryByText("TM")).not.toBeInTheDocument();
  });
});

describe("logout del miembro", () => {
  it("es un botón que cierra sesión, no un enlace que solo navega", () => {
    render(<AppShell>contenido</AppShell>);

    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log out" })).not.toBeInTheDocument();
  });
});
