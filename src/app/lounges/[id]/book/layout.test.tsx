import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBooking } from "@/components/booking/booking-context";

import BookLayout from "./layout";

/**
 * Bug: `covered` se recalculaba desde `useSearchParams()` en cada render del
 * layout. Al navegar de `/book?covered=1` a `/book/payment` (sin el query
 * string), el layout seguía montado pero `covered` volvía a `false` a mitad
 * de flujo — justo lo contrario de "el borrador de reserva es compartido por
 * los tres pasos".
 */
const params = vi.fn(() => ({ id: "the-ainsworth" }));
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => params(),
  useSearchParams: () => currentSearchParams,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

function CoveredProbe() {
  const { covered } = useBooking();
  return <p data-testid="covered">{String(covered)}</p>;
}

describe("covered persiste entre pasos", () => {
  it("no se pierde al navegar a una URL sin el query param", () => {
    currentSearchParams = new URLSearchParams("covered=1");
    const { rerender } = render(
      <BookLayout>
        <CoveredProbe />
      </BookLayout>,
    );

    expect(screen.getByTestId("covered")).toHaveTextContent("true");

    currentSearchParams = new URLSearchParams();
    rerender(
      <BookLayout>
        <CoveredProbe />
      </BookLayout>,
    );

    expect(screen.getByTestId("covered")).toHaveTextContent("true");
  });

  it("por defecto, sin el query param, la visita no está cubierta", () => {
    currentSearchParams = new URLSearchParams();
    render(
      <BookLayout>
        <CoveredProbe />
      </BookLayout>,
    );

    expect(screen.getByTestId("covered")).toHaveTextContent("false");
  });
});
