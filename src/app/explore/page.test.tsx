import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExplorePage from "./page";

/**
 * Story 2.1 — Map-Based Lounge Discovery.
 * Criterios en
 * docs/specs/epic-2-location-discovery-search/story-2.1-map-based-lounge-discovery.md
 * y nodos del subgrafo "Story 2.1" de flow-location-discovery-search.md.
 */

const searchParams = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  usePathname: () => "/explore",
  useSearchParams: () => searchParams(),
}));

beforeEach(() => {
  searchParams.mockReturnValue(new URLSearchParams());
});

function resultsPanel() {
  return screen.getByRole("region", { name: "Results" });
}

/** Concede el permiso y deja la pantalla en el mapa. */
async function allowLocation(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Allow location access" }));
}

describe("permiso de ubicación", () => {
  it("pide permiso antes de mostrar ningún lounge", () => {
    render(<ExplorePage />);

    expect(
      screen.getByRole("heading", { name: "Let LuxePass use your location" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Results" })).toBeNull();
  });

  it("muestra los lounges cercanos cuando el miembro concede el permiso", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await allowLocation(user);

    expect(
      screen.queryByRole("heading", { name: "Let LuxePass use your location" }),
    ).toBeNull();
    expect(
      within(resultsPanel()).getByText("The Ainsworth"),
    ).toBeInTheDocument();
  });

  it("sitúa al miembro en el mapa una vez concedido el permiso", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await allowLocation(user);

    expect(screen.getByText("You are here")).toBeInTheDocument();
  });
});

describe("entrada manual de ubicación", () => {
  it("ofrece escribir una ubicación en lugar de usar el GPS", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await user.click(
      screen.getByRole("button", { name: "Enter a location instead" }),
    );

    expect(
      screen.getByRole("heading", { name: "Enter your location" }),
    ).toBeInTheDocument();
  });

  it("lista los lounges de la ciudad elegida a mano", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await user.click(
      screen.getByRole("button", { name: "Enter a location instead" }),
    );
    await user.type(screen.getByLabelText("City or address"), "Newark");
    await user.click(screen.getByRole("option", { name: /Newark/ }));
    await user.click(screen.getByRole("button", { name: "Use this location" }));

    expect(
      within(resultsPanel()).getByText("The Ironbound Salon"),
    ).toBeInTheDocument();
    expect(within(resultsPanel()).queryByText("The Ainsworth")).toBeNull();
  });

  it("no deja confirmar mientras no se haya elegido una ciudad", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await user.click(
      screen.getByRole("button", { name: "Enter a location instead" }),
    );

    expect(
      screen.getByRole("button", { name: "Use this location" }),
    ).toBeDisabled();
  });

  it("vuelve a pedir el GPS desde la entrada manual", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await user.click(
      screen.getByRole("button", { name: "Enter a location instead" }),
    );
    await user.click(screen.getByRole("button", { name: "Try GPS again" }));

    expect(
      screen.getByRole("heading", { name: "Let LuxePass use your location" }),
    ).toBeInTheDocument();
  });
});

describe("unidades de distancia", () => {
  it("empieza en las millas del ajuste del teléfono", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await allowLocation(user);

    expect(within(resultsPanel()).getByText("0.3 mi")).toBeInTheDocument();
  });

  it("pasa todas las distancias a kilómetros cuando se cambia la unidad", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await allowLocation(user);

    await user.click(screen.getByRole("button", { name: "km" }));

    expect(within(resultsPanel()).getByText("0.5 km")).toBeInTheDocument();
    expect(within(resultsPanel()).queryByText("0.3 mi")).toBeNull();
  });
});

describe("selección de un lounge", () => {
  it("abre el detalle del lounge elegido en el mapa", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await allowLocation(user);

    await user.click(
      within(resultsPanel()).getByRole("button", { name: /Belmont Terrace/ }),
    );

    const callout = screen.getByRole("group", { name: "Selected lounge" });
    expect(within(callout).getByText("Belmont Terrace")).toBeInTheDocument();
    expect(within(callout).getByRole("link", { name: /View details/ })).toHaveAttribute(
      "href",
      "/lounges/belmont-terrace",
    );
  });
});

describe("zoom del mapa", () => {
  it("deja de alejar cuando el mapa ya está en su vista más amplia", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await allowLocation(user);

    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Zoom in" }));

    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();
  });
});

describe("el mapa no carga", () => {
  it("propone reintentar o seguir en la lista", () => {
    searchParams.mockReturnValue(new URLSearchParams("map=error"));

    render(<ExplorePage />);

    expect(
      screen.getByRole("heading", { name: "The map isn't loading" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Use list view" }),
    ).toBeInTheDocument();
  });

  it("mantiene los resultados a la vista mientras el mapa falla", () => {
    searchParams.mockReturnValue(new URLSearchParams("map=error"));

    render(<ExplorePage />);

    expect(
      within(resultsPanel()).getByText("The Ainsworth"),
    ).toBeInTheDocument();
  });

  it("pasa a la lista sin perder los resultados", async () => {
    const user = userEvent.setup({ delay: null });
    searchParams.mockReturnValue(new URLSearchParams("map=error"));
    render(<ExplorePage />);

    await user.click(screen.getByRole("button", { name: "Use list view" }));

    expect(
      screen.queryByRole("heading", { name: "The map isn't loading" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("modo offline", () => {
  it("avisa de que los lounges vienen de la última visita", () => {
    searchParams.mockReturnValue(new URLSearchParams("offline=1"));

    render(<ExplorePage />);

    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(
      within(resultsPanel()).getByText("The Ainsworth"),
    ).toBeInTheDocument();
  });

  it("deshabilita la búsqueda, que necesita conexión", () => {
    searchParams.mockReturnValue(new URLSearchParams("offline=1"));

    render(<ExplorePage />);

    expect(screen.getByLabelText("Search lounges")).toBeDisabled();
  });
});
