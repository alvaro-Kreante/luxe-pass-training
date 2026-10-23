import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Rating } from "./rating";

/**
 * Story 3.1 — "User ratings and review count (if available)": la nota sale
 * de reseñas reales (1–5), así que 0 solo significa "sin reseñas todavía".
 */
describe("Rating", () => {
  it("muestra la nota media cuando hay reseñas", () => {
    render(<Rating value={4.5} />);

    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("sin reseñas no inventa un 0.0", () => {
    render(<Rating value={0} />);

    expect(screen.queryByText("0.0")).toBeNull();
    expect(screen.getByText("New")).toBeInTheDocument();
  });
});
