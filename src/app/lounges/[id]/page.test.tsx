import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoungeProfilePage from "./page";

/**
 * Story 3.1 — Detailed Lounge Information.
 * Criterios en
 * docs/specs/epic-3-lounge-profiles-details/story-3.1-detailed-lounge-information.md
 * y el segmento "Story 3.1" de flow-complete-booking-journey.md.
 *
 * El estado "Not available" (Story 3.2) vive en esta misma pantalla — la card
 * de disponibilidad del perfil, no una vista aparte — así que también se
 * cubre aquí, con Céleste Rooftop, que el catálogo ya trae sin plazas hoy.
 */

const params = vi.fn(() => ({ id: "the-ainsworth" }));
const searchParams = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useParams: () => params(),
  useSearchParams: () => searchParams(),
  usePathname: () => "/lounges/the-ainsworth",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

beforeEach(() => {
  params.mockReturnValue({ id: "the-ainsworth" });
  searchParams.mockReturnValue(new URLSearchParams());
});

describe("información básica del lounge", () => {
  it("muestra el nombre, la dirección y el teléfono", () => {
    render(<LoungeProfilePage />);

    expect(screen.getByRole("heading", { name: "The Ainsworth" })).toBeInTheDocument();
    expect(screen.getByText("122 E 45th St, New York, NY 10017")).toBeInTheDocument();
    expect(screen.getAllByText("+1 (212) 555-0184").length).toBeGreaterThan(0);
  });

  it("enlaza a la lista de resultados", () => {
    render(<LoungeProfilePage />);

    expect(screen.getByRole("link", { name: "Back to results" })).toHaveAttribute(
      "href",
      "/explore",
    );
  });
});

describe("carousel de fotos", () => {
  it("muestra al menos tres fotos y avanza con la flecha siguiente", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungeProfilePage />);

    expect(screen.getByText("1 / 6")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next photo" }));

    expect(screen.getByText("2 / 6")).toBeInTheDocument();
  });

  it("abre la galería a pantalla completa y se puede cerrar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungeProfilePage />);

    await user.click(screen.getByRole("button", { name: /View all \d photos/ }));

    const dialog = screen.getByRole("dialog", { name: /Photo gallery/ });
    expect(within(dialog).getByText("The Ainsworth")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close gallery" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("compartir el lounge", () => {
  it("abre la hoja de compartir desde las quick actions", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungeProfilePage />);

    await user.click(screen.getByRole("button", { name: "Share" }));

    const dialog = screen.getByRole("dialog", { name: "Share this lounge" });
    expect(within(dialog).getByText(/luxepass\.co\/l\/the-ainsworth/)).toBeInTheDocument();
  });

  it("copia el enlace al portapapeles", async () => {
    const user = userEvent.setup({ delay: null });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<LoungeProfilePage />);

    await user.click(screen.getByRole("button", { name: "Share" }));
    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("the-ainsworth"));
  });
});

describe("quick actions", () => {
  it("Call marca el teléfono y Directions abre Google Maps", () => {
    render(<LoungeProfilePage />);

    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute(
      "href",
      "tel:+12125550184",
    );
    expect(screen.getByRole("link", { name: "Directions" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://www.google.com/maps"),
    );
  });
});

describe("amenities", () => {
  it("lista cada amenity del lounge con su descripción", () => {
    render(<LoungeProfilePage />);

    expect(screen.getByText("High-speed WiFi")).toBeInTheDocument();
    expect(screen.getByText("1 Gbps, private member network")).toBeInTheDocument();
  });
});

describe("horario", () => {
  it("destaca el horario de hoy", () => {
    render(<LoungeProfilePage />);

    expect(screen.getByText(/· Today$/)).toBeInTheDocument();
  });
});

describe("valoración y reseñas", () => {
  it("enlaza el recuento de reseñas a la pantalla de reseñas", () => {
    render(<LoungeProfilePage />);

    expect(
      screen.getByRole("link", { name: "128 reviews" }),
    ).toHaveAttribute("href", "/lounges/the-ainsworth/reviews");
  });

  it("cuando el lounge no tiene reseñas, lo dice en vez de un recuento", () => {
    params.mockReturnValue({ id: "belmont-terrace" });
    render(<LoungeProfilePage />);

    expect(
      screen.getByRole("link", { name: "No reviews yet" }),
    ).toHaveAttribute("href", "/lounges/belmont-terrace/reviews");
  });
});

describe("disponibilidad en tiempo real", () => {
  it("muestra Available y el botón de reserva cuando hay plazas", () => {
    render(<LoungeProfilePage />);

    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book now" })).toBeInTheDocument();
  });

  it("enlaza la disponibilidad semanal", () => {
    render(<LoungeProfilePage />);

    expect(
      screen.getByRole("link", { name: "View weekly availability" }),
    ).toHaveAttribute("href", "/lounges/the-ainsworth/availability");
  });

  it("muestra Not available y una sugerencia cuando el lounge está completo hoy", () => {
    params.mockReturnValue({ id: "celeste-rooftop" });
    render(<LoungeProfilePage />);

    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.getByText("Fully booked today")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Book now" }),
    ).toBeNull();
  });

  it("muestra el sello de frescura", () => {
    render(<LoungeProfilePage />);

    expect(screen.getByText(/refreshes every 5 min/)).toBeInTheDocument();
  });
});

describe("carga", () => {
  it("muestra el estado de carga cuando ?loading=1", () => {
    searchParams.mockReturnValue(new URLSearchParams("loading=1"));
    render(<LoungeProfilePage />);

    expect(screen.getByText("Checking live availability…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "The Ainsworth" })).toBeNull();
  });
});
