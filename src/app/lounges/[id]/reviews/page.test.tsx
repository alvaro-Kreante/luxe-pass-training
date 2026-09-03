import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReviewsPage from "./page";

/**
 * Story 3.1 — "User ratings and review count (if available)".
 * Reviews.dc.html (con reseñas) y NoRatings.dc.html (sin reseñas todavía).
 */

const params = vi.fn(() => ({ id: "the-ainsworth" }));

vi.mock("next/navigation", () => ({
  useParams: () => params(),
  usePathname: () => "/lounges/the-ainsworth/reviews",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

beforeEach(() => {
  params.mockReturnValue({ id: "the-ainsworth" });
});

describe("con reseñas", () => {
  it("muestra la valoración media, el recuento y las reseñas", () => {
    render(<ReviewsPage />);

    expect(screen.getByText("4.9")).toBeInTheDocument();
    expect(screen.getByText("128 member reviews")).toBeInTheDocument();
    expect(screen.getByText("Marcus C.")).toBeInTheDocument();
    expect(screen.getByText(/Showing 3 of 128 reviews/)).toBeInTheDocument();
  });

  it("muestra el reparto por estrellas y las menciones frecuentes", () => {
    render(<ReviewsPage />);

    expect(screen.getByText("What members mention")).toBeInTheDocument();
    expect(screen.getByText(/Quiet/)).toBeInTheDocument();
  });
});

describe("sin reseñas todavía", () => {
  beforeEach(() => {
    params.mockReturnValue({ id: "belmont-terrace" });
  });

  it("dice que no hay reseñas y ofrece ver disponibilidad o reservar", () => {
    render(<ReviewsPage />);

    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See availability" }),
    ).toHaveAttribute("href", "/lounges/belmont-terrace/availability");
    expect(screen.getByRole("link", { name: "Book a visit" })).toHaveAttribute(
      "href",
      "/lounges/belmont-terrace/book",
    );
  });

  it("no muestra el reparto de estrellas cuando no hay reseñas", () => {
    render(<ReviewsPage />);

    expect(screen.queryByText("What members mention")).toBeNull();
  });
});
