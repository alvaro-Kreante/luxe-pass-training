import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "./app-shell";

/**
 * Patrón 3 del design system — fija la navegación del área de miembro para los
 * Epics 2–6. Lo que se prueba aquí es a dónde lleva cada item y cuál queda
 * marcado como actual, no su geometría.
 */

const pathname = vi.fn(() => "/");

vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
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
