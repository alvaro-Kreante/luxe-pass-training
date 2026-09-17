import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FreshnessNote } from "./freshness-note";

/**
 * Story 3.2 — "Last updated timestamp for availability data" y "Automatic
 * refresh every 5 minutes". `lastUpdatedAt` es el instante real en que la
 * página trajo la disponibilidad (ver `/lounges/[id]/availability`, que
 * refetchea cada 5 min y le pasa un `lastUpdatedAt` nuevo cada vez).
 */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("sello de frescura", () => {
  it("dice que se actualizó justo ahora cuando lastUpdatedAt es el instante actual", () => {
    render(<FreshnessNote lastUpdatedAt={new Date().toISOString()} />);

    expect(screen.getByText(/Updated just now/)).toBeInTheDocument();
  });

  it("cuenta los minutos que pasan desde lastUpdatedAt", () => {
    const lastUpdatedAt = new Date().toISOString();
    render(<FreshnessNote lastUpdatedAt={lastUpdatedAt} />);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText(/Updated 1 min ago/)).toBeInTheDocument();
  });

  it("vuelve a 'just now' cuando el padre refresca lastUpdatedAt", () => {
    const first = new Date();
    const { rerender } = render(
      <FreshnessNote lastUpdatedAt={first.toISOString()} />,
    );

    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(screen.getByText(/Updated 5 min ago/)).toBeInTheDocument();

    rerender(<FreshnessNote lastUpdatedAt={new Date().toISOString()} />);

    expect(screen.getByText(/Updated just now/)).toBeInTheDocument();
  });
});
