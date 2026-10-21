import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import ReviewsPage from "./page";

/**
 * Story 3.1 — "User ratings and review count (if available)".
 * Reviews.dc.html (con reseñas) y NoRatings.dc.html (sin reseñas todavía).
 */

const params = vi.fn(() => ({ id: "the-ainsworth" }));

vi.mock("next/navigation", () => ({
  useParams: () => params(),
  usePathname: () => "/lounges/the-ainsworth/reviews",
  useRouter: () => ({ replace: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `lounge-reviews-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
});

beforeEach(() => {
  params.mockReturnValue({ id: "the-ainsworth" });
});

describe("con reseñas", () => {
  it("muestra la valoración media, el recuento y las reseñas", async () => {
    render(<ReviewsPage />);

    await waitFor(() => expect(screen.getByText("4.9")).toBeInTheDocument());
    expect(screen.getByText("128 member reviews")).toBeInTheDocument();
    expect(screen.getByText("Marcus C.")).toBeInTheDocument();
    expect(screen.getByText(/Showing 3 of 128 reviews/)).toBeInTheDocument();
  });

  it("muestra el reparto por estrellas y las menciones frecuentes", async () => {
    render(<ReviewsPage />);

    await waitFor(() =>
      expect(screen.getByText("What members mention")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Quiet/)).toBeInTheDocument();
  });
});

describe("sin reseñas todavía", () => {
  beforeEach(() => {
    params.mockReturnValue({ id: "belmont-terrace" });
  });

  it("dice que no hay reseñas y ofrece ver disponibilidad o reservar", async () => {
    render(<ReviewsPage />);

    await waitFor(() => expect(screen.getByText("No reviews yet")).toBeInTheDocument());
    expect(
      screen.getByRole("link", { name: "See availability" }),
    ).toHaveAttribute("href", "/lounges/belmont-terrace/availability");
    expect(screen.getByRole("link", { name: "Book a visit" })).toHaveAttribute(
      "href",
      "/lounges/belmont-terrace/book",
    );
  });

  it("no muestra el reparto de estrellas cuando no hay reseñas", async () => {
    render(<ReviewsPage />);

    await waitFor(() => expect(screen.getByText("No reviews yet")).toBeInTheDocument());
    expect(screen.queryByText("What members mention")).toBeNull();
  });
});
