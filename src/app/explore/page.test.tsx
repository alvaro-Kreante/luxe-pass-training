import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { renderToString } from "react-dom/server";
import { __resetModuleState } from "@vis.gl/react-google-maps";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import ExplorePage from "./page";

/**
 * Story 2.1 — Map-Based Lounge Discovery.
 * Criterios en
 * docs/specs/epic-2-location-discovery-search/story-2.1-map-based-lounge-discovery.md
 * y nodos del subgrafo "Story 2.1" de flow-location-discovery-search.md.
 *
 * Backend real (Supabase local): /explore exige sesión (`RequireSession`,
 * igual que /onboarding) y el catálogo viene de la tabla `public.lounges`, no
 * de un mock en memoria — ver docs/design/COMPONENT-MAP.md "Backend real —
 * Epic 2". Una sola sesión para todo el archivo (se persiste en el mismo
 * jsdom, igual que `require-session.test.tsx`); `navigator.geolocation` no
 * existe en jsdom, así que se sustituye por completo (no es un relleno de
 * plataforma como `IntersectionObserver`, es la única forma de controlar qué
 * responde el navegador).
 */

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/explore",
  useRouter: () => ({ replace }),
}));

/** El centroide de Nueva York (lib/location.ts): mismo punto para el "GPS"
 * concedido y para la ubicación por defecto, así que las distancias no
 * dependen de qué camino tomó el test. */
const NY_ORIGIN = { latitude: 40.7595, longitude: -73.97 };

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `explora-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
});

beforeEach(() => {
  replace.mockClear();
  /**
   * Solo se sustituye `navigator.geolocation` (que no existe en jsdom), nunca
   * `navigator` entero: `user-event` simula punteros a partir de otras
   * propiedades reales del navegador, y reemplazarlo con `vi.stubGlobal`
   * rompe esa simulación (los clics dejan de llegar a los botones).
   */
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((onSuccess: PositionCallback) => {
        onSuccess({ coords: NY_ORIGIN } as GeolocationPosition);
      }),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error -- solo para tests, ver el comentario de arriba.
  delete navigator.geolocation;
});

function resultsPanel() {
  return screen.getByRole("region", { name: "Results" });
}

/**
 * Radix bloquea el `<body>` entero con `pointer-events: none` mientras hay un
 * diálogo abierto (`DismissableLayer`) y solo libera el propio contenido del
 * diálogo (`pointer-events: auto`) una vez que su registro de "capa más alta"
 * termina de asentarse — un efecto más, después del primer render en el que
 * `findBy*` ya puede haber encontrado el botón. Sin esperar a que ESE
 * elemento (no el body, que se queda en `none` a propósito) resuelva a
 * `auto`, el primer clic tras un `findBy*` llega demasiado pronto.
 */
async function waitForDialogReady(element: HTMLElement) {
  await waitFor(() => {
    expect(getComputedStyle(element).pointerEvents).not.toBe("none");
  });
}

/** Concede el permiso y deja la pantalla en el mapa, con los lounges cargados. */
async function allowLocation(user: ReturnType<typeof userEvent.setup>) {
  const button = await screen.findByRole("button", {
    name: "Allow location access",
  });
  await waitForDialogReady(button);
  await user.click(button);
  await within(resultsPanel()).findByText("The Ainsworth");
}

async function clickEnterManually(user: ReturnType<typeof userEvent.setup>) {
  const button = await screen.findByRole("button", {
    name: "Enter a location instead",
  });
  await waitForDialogReady(button);
  await user.click(button);
}

describe("permiso de ubicación", () => {
  it("pide permiso antes de mostrar ningún lounge", async () => {
    render(<ExplorePage />);

    expect(
      await screen.findByRole("heading", { name: "Let LuxePass use your location" }),
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

    await clickEnterManually(user);

    expect(
      screen.getByRole("heading", { name: "Enter your location" }),
    ).toBeInTheDocument();
  });

  it("lista los lounges de la ciudad elegida a mano", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await clickEnterManually(user);
    await user.type(screen.getByLabelText("City or address"), "Newark");
    await user.click(await screen.findByRole("option", { name: /Newark/ }));
    await user.click(screen.getByRole("button", { name: "Use this location" }));

    expect(
      await within(resultsPanel()).findByText("The Ironbound Salon"),
    ).toBeInTheDocument();
    expect(within(resultsPanel()).queryByText("The Ainsworth")).toBeNull();
  });

  it("no deja confirmar mientras no se haya elegido una ciudad", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await clickEnterManually(user);

    expect(
      screen.getByRole("button", { name: "Use this location" }),
    ).toBeDisabled();
  });

  it("vuelve a pedir el GPS desde la entrada manual", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await clickEnterManually(user);
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

    expect(
      within(resultsPanel()).getAllByText(/^\d+(\.\d)? mi$/).length,
    ).toBeGreaterThan(0);
  });

  it("pasa todas las distancias a kilómetros cuando se cambia la unidad", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await allowLocation(user);

    await user.click(screen.getByRole("button", { name: "km" }));

    expect(
      within(resultsPanel()).getAllByText(/^\d+(\.\d)? km$/).length,
    ).toBeGreaterThan(0);
    expect(within(resultsPanel()).queryByText(/^\d+(\.\d)? mi$/)).toBeNull();
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

  it("cierra el detalle al hacer clic fuera, en el fondo del mapa", async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = render(<ExplorePage />);
    await allowLocation(user);

    await user.click(
      within(resultsPanel()).getByRole("button", { name: /Belmont Terrace/ }),
    );
    screen.getByRole("group", { name: "Selected lounge" });

    const background = container.querySelector(
      '[data-stub-map-canvas="true"]',
    );
    expect(background).not.toBeNull();
    await user.click(background as HTMLElement);

    expect(
      screen.queryByRole("group", { name: "Selected lounge" }),
    ).toBeNull();
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
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Simula que el script real de Google nunca terminó de cargar.
   *
   * Borrar `globalThis.google` no basta por sí solo: `@vis.gl/react-google-maps`
   * guarda si la API "ya cargó" en una variable de módulo, no por instancia
   * — sin `__resetModuleState()` (su propia API, pensada "for testing
   * purposes only"), un `<APIProvider>` nuevo se da por cargado al instante
   * con el resultado del test anterior (el que sí montó el mapa de verdad en
   * `allowLocation`), real `google` o no. Tampoco basta con borrar `google`
   * sobre el `CityMap` que ya cargó: su `useMapLoadStatus` ya vio `onLoad` y
   * dejó `loadedRef` en `true` para siempre, así que hace falta un `CityMap`
   * montado desde cero — se consigue pasando por la vista de lista y
   * volviendo a la de mapa — para que su temporizador nazca ya bajo
   * `vi.useFakeTimers()` y sin el stub.
   */
  async function triggerMapLoadFailure(user: ReturnType<typeof userEvent.setup>) {
    await allowLocation(user);
    await user.click(screen.getByRole("button", { name: "List" }));

    const realGoogle = (globalThis as { google?: unknown }).google;
    try {
      // @ts-expect-error -- se borra a propósito para simular un script que nunca carga.
      delete globalThis.google;
      __resetModuleState();

      vi.useFakeTimers();
      /**
       * `userEvent.click` se cuelga bajo `vi.useFakeTimers()` en esta
       * combinación de versiones (user-event 14.6.6 + vitest 4.1.11) — mismo
       * gotcha documentado en `use-map-load-status.test.tsx`. `fireEvent` no
       * pierde cobertura real: el clic es un evento síncrono simple.
       */
      fireEvent.click(screen.getByRole("button", { name: "Map" }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      vi.useRealTimers();
    } finally {
      /**
       * `globalThis.google` se instala una sola vez para todo el archivo
       * (`vitest.setup.ts`), no por test — si algo de lo de arriba lanza, el
       * `finally` es lo único que evita que el resto de tests de este
       * archivo (`modo offline`, `drawer de filtros`, `vista de lista`…)
       * hereden un `google` borrado y fallen en cascada por una razón que no
       * tiene nada que ver con ellos.
       */
      (globalThis as { google?: unknown }).google = realGoogle;
    }
  }

  it("propone reintentar o seguir en la lista", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await triggerMapLoadFailure(user);

    expect(
      await screen.findByRole("heading", { name: "The map isn't loading" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Use list view" }),
    ).toBeInTheDocument();
  });

  it("mantiene los resultados a la vista mientras el mapa falla", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await triggerMapLoadFailure(user);

    expect(
      await within(resultsPanel()).findByText("The Ainsworth"),
    ).toBeInTheDocument();
  });

  it("pasa a la lista sin perder los resultados", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await triggerMapLoadFailure(user);

    await user.click(
      await screen.findByRole("button", { name: "Use list view" }),
    );

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
  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("avisa de que los lounges vienen de la última visita", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(<ExplorePage />);

    expect(await screen.findByText("You're offline")).toBeInTheDocument();
    expect(
      await within(resultsPanel()).findByText("The Ainsworth"),
    ).toBeInTheDocument();
  });

  it("deshabilita la búsqueda, que necesita conexión", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(<ExplorePage />);

    expect(await screen.findByLabelText("Search lounges")).toBeDisabled();
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
  /**
   * Los cuatro filtros del artboard `NoResults.dc.html`. Con el catálogo real
   * (distancia calculada desde el centroide de Nueva York), WiFi+Co-working
   * dentro de 1 mi son The Ainsworth y Belmont Terrace — los dos cerrados los
   * domingos —, así que la fecha ya los deja en cero sin necesitar la franja.
   */
  async function filterUntilEmpty(user: ReturnType<typeof userEvent.setup>) {
    await openFilters(user);
    await user.click(screen.getByRole("button", { name: "WiFi" }));
    await user.click(screen.getByRole("button", { name: "Co-working" }));
    await user.click(screen.getByRole("button", { name: "< 1 mi" }));
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

    const names = await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings.length).toBeGreaterThan(0);
      return headings.map((heading) => heading.textContent);
    });
    expect(names[0]).toBe("The Ainsworth");
    expect(names[1]).toBe("Belmont Terrace");
  });

  it("cada lounge lleva a su ficha", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await showList(user);

    expect(
      await screen.findByRole("link", { name: "View details for The Ainsworth" }),
    ).toHaveAttribute("href", "/lounges/the-ainsworth");
  });

  it("dice cuántos lounges se están viendo de cuántos", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await showList(user);

    expect(await screen.findByText("Showing 4 of 12")).toBeInTheDocument();
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

    expect(await screen.findByText("Showing 4 of 12")).toBeInTheDocument();

    await act(async () => observer.scrollToEnd());

    expect(screen.getByText("Showing 8 of 12")).toBeInTheDocument();
  });

  it("deja de anunciar que quedan más cuando ya están todos", async () => {
    const observer = observeIntersections();
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await showList(user);

    await screen.findByText("Showing 4 of 12");
    await act(async () => observer.scrollToEnd());
    await act(async () => observer.scrollToEnd());

    expect(screen.getByText("Showing 12 of 12")).toBeInTheDocument();
    expect(screen.queryByText("Loading more lounges…")).toBeNull();
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

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("difumina la pantalla mientras se pide el permiso", async () => {
    render(<ExplorePage />);

    await screen.findByRole("heading", { name: "Let LuxePass use your location" });
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

    await clickEnterManually(user);
    await user.type(screen.getByLabelText("City or address"), "Newark");
    await user.click(await screen.findByRole("option", { name: /Newark/ }));
    await user.click(screen.getByRole("button", { name: "Use this location" }));

    expect(shell().className).not.toContain("blur");
  });

  it("no difumina nada en los estados que entran con la ubicación resuelta", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(<ExplorePage />);

    await screen.findByText("You're offline");
    expect(shell().className).not.toContain("blur");
  });
});

/**
 * El diálogo vive en un portal, que el servidor no puede renderizar. Si el
 * desenfoque sí viaja en el HTML, la pantalla llega borrosa y sin nada que lo
 * explique — y así se queda si el JavaScript tarda o no llega.
 *
 * `RequireSession` no renderiza nada hasta comprobar la sesión (tampoco en el
 * servidor, que no tiene cookies que leer aquí), así que el HTML inicial no
 * trae ni el diálogo ni el desenfoque.
 */
describe("lo que manda el servidor", () => {
  it("no difumina la pantalla en el HTML inicial", () => {
    const html = renderToString(<ExplorePage />);

    expect(html).not.toContain("blur");
  });
});
