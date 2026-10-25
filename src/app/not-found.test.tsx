import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "./not-found";

describe("Página 404", () => {
  it("avisa de que la página no existe", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/404/)).toBeInTheDocument();
  });

  it("lleva de vuelta a home y a darse de alta", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /join luxepass/i })).toHaveAttribute("href", "/signup");
  });
});
