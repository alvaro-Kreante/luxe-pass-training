import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMapLoadStatus } from "./use-map-load-status";

function Harness({ onLoadError }: { onLoadError: () => void }) {
  const { handleLoad } = useMapLoadStatus(onLoadError, 3000);
  return (
    <button type="button" onClick={handleLoad}>
      simulate load
    </button>
  );
}

describe("useMapLoadStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("llama a onLoadError si no carga en el tiempo dado", async () => {
    vi.useFakeTimers();
    const onLoadError = vi.fn();
    render(<Harness onLoadError={onLoadError} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(onLoadError).toHaveBeenCalledOnce();
  });

  it("no llama a onLoadError si carga antes del tiempo dado", async () => {
    vi.useFakeTimers();
    const onLoadError = vi.fn();
    render(<Harness onLoadError={onLoadError} />);

    // fireEvent en vez de userEvent: userEvent.click cuelga bajo
    // vi.useFakeTimers() en esta combinación de versiones (user-event
    // 14.6.6 + vitest 4.1.11), reproducido también fuera de este hook. El
    // click es un evento síncrono simple, así que fireEvent no pierde
    // cobertura real.
    fireEvent.click(screen.getByRole("button", { name: "simulate load" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(onLoadError).not.toHaveBeenCalled();
  });
});
