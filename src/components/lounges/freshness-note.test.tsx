import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FreshnessNote } from "./freshness-note";

/**
 * Story 3.2 — "Last updated timestamp for availability data" y "Automatic
 * refresh every 5 minutes". Sin red que consultar, el refresco es un
 * contador local que vuelve a "just now" cada 5 minutos.
 */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("sello de frescura", () => {
  it("empieza diciendo que se actualizó justo ahora", () => {
    render(<FreshnessNote />);

    expect(screen.getByText(/Updated just now/)).toBeInTheDocument();
  });

  it("cuenta los minutos que pasan", () => {
    render(<FreshnessNote />);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText(/Updated 1 min ago/)).toBeInTheDocument();
  });

  it("se refresca solo a los 5 minutos, volviendo a 'just now'", () => {
    render(<FreshnessNote />);

    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });

    expect(screen.getByText(/Updated just now/)).toBeInTheDocument();
  });
});
