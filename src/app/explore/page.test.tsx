import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderToString } from "react-dom/server";

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

afterEach(() => {
  vi.unstubAllGlobals();
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

/**
 * Story 2.2 — Lounge Filtering & Search.
 * Criterios en
 * docs/specs/epic-2-location-discovery-search/story-2.2-lounge-filtering-search.md
 */

/** Deja la pantalla con el permiso concedido y el drawer de filtros abierto. */
async function openFilters(user: ReturnType<typeof userEvent.setup>) {
  await allowLocation(user);
  await user.click(screen.getByRole("button", { name: "Filters" }));
}

describe("drawer de filtros", () => {
  it("se abre desde la topbar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await openFilters(user);

    expect(
      screen.getByRole("heading", { name: "Filters" }),
    ).toBeInTheDocument();
  });

  it("actualiza los resultados sin cerrarse", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await openFilters(user);

    await user.click(screen.getByRole("button", { name: "Spa" }));

    expect(within(resultsPanel()).queryByText("Belmont Terrace")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Filters" }),
    ).toBeInTheDocument();
  });

  it("dice cuántos lounges quedan en el botón de confirmar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await openFilters(user);

    await user.click(screen.getByRole("button", { name: "< 1 mi" }));

    expect(
      screen.getByRole("button", { name: "Show 3 lounges" }),
    ).toBeInTheDocument();
  });
});

describe("chips de filtros activos", () => {
  it("aparece un chip por cada filtro elegido", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await openFilters(user);

    await user.click(screen.getByRole("button", { name: "Spa" }));
    await user.click(screen.getByRole("button", { name: "< 2 mi" }));
    await user.click(screen.getByRole("button", { name: /^Show/ }));

    expect(screen.getByText("Spa")).toBeInTheDocument();
    expect(screen.getByText("Within 2 mi")).toBeInTheDocument();
  });

  it("quitar un chip devuelve los lounges que ese filtro descartaba", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await openFilters(user);
    await user.click(screen.getByRole("button", { name: "Spa" }));
    await user.click(screen.getByRole("button", { name: /^Show/ }));

    expect(within(resultsPanel()).queryByText("Belmont Terrace")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Remove Spa" }));

    expect(
      within(resultsPanel()).getByText("Belmont Terrace"),
    ).toBeInTheDocument();
  });

  it("'Clear all' deja la búsqueda como estaba al empezar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await openFilters(user);
    await user.click(screen.getByRole("button", { name: "Spa" }));
    await user.click(screen.getByRole("button", { name: "< 2 mi" }));
    await user.click(screen.getByRole("button", { name: /^Show/ }));

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(screen.queryByText("Within 2 mi")).toBeNull();
    expect(
      within(resultsPanel()).getByText("Belmont Terrace"),
    ).toBeInTheDocument();
  });
});

describe("búsqueda por texto", () => {
  it("filtra mientras se escribe", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await allowLocation(user);

    await user.type(screen.getByLabelText("Search lounges"), "ainsworth");

    expect(within(resultsPanel()).getByText("The Ainsworth")).toBeInTheDocument();
    expect(within(resultsPanel()).queryByText("Belmont Terrace")).toBeNull();
  });
});

describe("sin resultados", () => {
  /** Los cuatro filtros del artboard `NoResults.dc.html`. */
  async function filterUntilEmpty(user: ReturnType<typeof userEvent.setup>) {
    await openFilters(user);
    await user.click(screen.getByRole("button", { name: "WiFi" }));
    await user.click(screen.getByRole("button", { name: "Co-working" }));
    await user.click(screen.getByRole("button", { name: "< 2 mi" }));
    await user.click(screen.getByRole("button", { name: "14" }));
    await user.click(screen.getByRole("button", { name: "2–6 PM" }));
    await user.click(screen.getByRole("button", { name: /^Show/ }));
  }

  it("deja de listar lounges", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await filterUntilEmpty(user);

    expect(screen.queryByText("The Ainsworth")).toBeNull();
  });

  it("propone cambios y dice cuántos lounges devolvería cada uno", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await filterUntilEmpty(user);

    const proposals = screen.getAllByRole("button", { name: /would match/ });
    expect(proposals.length).toBeGreaterThan(0);
  });

  it("aplicar una sugerencia devuelve resultados", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await filterUntilEmpty(user);

    await user.click(screen.getAllByRole("button", { name: /would match/ })[0]);

    expect(screen.queryAllByRole("button", { name: /would match/ })).toEqual([]);
    expect(within(resultsPanel()).getAllByRole("button").length).toBeGreaterThan(
      0,
    );
  });

  it("ofrece limpiar todos los filtros desde el propio estado vacío", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await filterUntilEmpty(user);

    await user.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(
      within(resultsPanel()).getByText("The Ainsworth"),
    ).toBeInTheDocument();
  });
});

/**
 * Story 2.3 — List View Alternative.
 * Criterios en
 * docs/specs/epic-2-location-discovery-search/story-2.3-list-view-alternative.md
 */

/**
 * jsdom no implementa IntersectionObserver. Se sustituye por un doble que
 * guarda el callback para poder simular que el centinela entra en pantalla:
 * es una API del navegador que falta, no una pieza del proyecto.
 */
function observeIntersections() {
  const callbacks: IntersectionObserverCallback[] = [];

  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  return {
    scrollToEnd() {
      for (const callback of callbacks) {
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      }
    },
  };
}

async function showList(user: ReturnType<typeof userEvent.setup>) {
  await allowLocation(user);
  await user.click(screen.getByRole("button", { name: "List" }));
}

describe("vista de lista", () => {
  it("lista los lounges de más cerca a más lejos", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await showList(user);

    const names = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(names[0]).toBe("The Ainsworth");
    expect(names[1]).toBe("Belmont Terrace");
  });

  it("cada lounge lleva a su ficha", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await showList(user);

    expect(
      screen.getByRole("link", { name: "View details for The Ainsworth" }),
    ).toHaveAttribute("href", "/lounges/the-ainsworth");
  });

  it("dice cuántos lounges se están viendo de cuántos", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await showList(user);

    expect(screen.getByText("Showing 4 of 12")).toBeInTheDocument();
  });

  it("conserva los filtros al venir del mapa", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await openFilters(user);
    await user.click(screen.getByRole("button", { name: "Spa" }));
    await user.click(screen.getByRole("button", { name: /^Show/ }));

    await user.click(screen.getByRole("button", { name: "List" }));

    expect(
      screen.getByRole("button", { name: "Remove Spa" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "View details for Belmont Terrace" }),
    ).toBeNull();
  });
});

describe("scroll infinito", () => {
  it("carga más lounges al llegar al final de la lista", async () => {
    const observer = observeIntersections();
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await showList(user);

    expect(screen.getByText("Showing 4 of 12")).toBeInTheDocument();

    await act(async () => observer.scrollToEnd());

    expect(screen.getByText("Showing 8 of 12")).toBeInTheDocument();
  });

  it("deja de anunciar que quedan más cuando ya están todos", async () => {
    const observer = observeIntersections();
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await showList(user);

    await act(async () => observer.scrollToEnd());
    await act(async () => observer.scrollToEnd());

    expect(screen.getByText("Showing 12 of 12")).toBeInTheDocument();
    expect(screen.queryByText("Loading more lounges…")).toBeNull();
  });
});

describe("la lista mientras carga", () => {
  it("no lista ningún lounge todavía", () => {
    searchParams.mockReturnValue(new URLSearchParams("list=loading"));

    render(<ExplorePage />);

    expect(screen.getByText("Finding lounges near you")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });
});

/**
 * Regresión: `/explore` se quedaba difuminada.
 *
 * El desenfoque del patrón 4 acompaña a un diálogo abierto; si sobrevive al
 * diálogo, la pantalla queda borrosa sin nada que lo explique ni forma de
 * quitarlo. Se comprueba la clase porque aquí el desenfoque no es decoración:
 * es lo que impide leer la pantalla.
 */
describe("desenfoque de la pantalla de fondo", () => {
  function shell() {
    return document.querySelector("[data-app-shell]")!;
  }

  it("difumina la pantalla mientras se pide el permiso", () => {
    render(<ExplorePage />);

    expect(shell().className).toContain("blur");
  });

  it("deja de difuminar en cuanto se concede el permiso", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await allowLocation(user);

    expect(shell().className).not.toContain("blur");
  });

  it("deja de difuminar al elegir una ubicación a mano", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await user.click(
      screen.getByRole("button", { name: "Enter a location instead" }),
    );
    await user.type(screen.getByLabelText("City or address"), "Newark");
    await user.click(screen.getByRole("option", { name: /Newark/ }));
    await user.click(screen.getByRole("button", { name: "Use this location" }));

    expect(shell().className).not.toContain("blur");
  });

  it("no difumina nada en los estados que entran con la ubicación resuelta", () => {
    searchParams.mockReturnValue(new URLSearchParams("offline=1"));

    render(<ExplorePage />);

    expect(shell().className).not.toContain("blur");
  });
});

/**
 * El diálogo vive en un portal, que el servidor no puede renderizar. Si el
 * desenfoque sí viaja en el HTML, la pantalla llega borrosa y sin nada que lo
 * explique — y así se queda si el JavaScript tarda o no llega.
 */
describe("lo que manda el servidor", () => {
  it("no difumina la pantalla en el HTML inicial", () => {
    const html = renderToString(<ExplorePage />);

    expect(html).not.toContain("blur");
  });
});
