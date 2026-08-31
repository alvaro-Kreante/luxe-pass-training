import { describe, expect, it } from "vitest";

import { availabilityLabel } from "./availability";

/**
 * Los tres estados que los artboards de la Fase 3 muestran en la card de
 * resultado: "Open now", "N slots today" y "Fully booked today".
 * DESIGN-SYSTEM.md §5 "Estados" — sin colores semánticos, solo la paleta cálida.
 */

describe("etiqueta de disponibilidad", () => {
  it("dice que está abierto cuando queda holgura", () => {
    expect(availabilityLabel({ openNow: true, slotsToday: 8 })).toBe("Open now");
  });

  it("cuenta las plazas cuando quedan pocas", () => {
    expect(availabilityLabel({ openNow: true, slotsToday: 3 })).toBe(
      "3 slots today",
    );
  });

  it("cuenta las plazas también si el lounge aún no ha abierto", () => {
    expect(availabilityLabel({ openNow: false, slotsToday: 5 })).toBe(
      "5 slots today",
    );
  });

  it("dice que está completo cuando no queda ninguna", () => {
    expect(availabilityLabel({ openNow: true, slotsToday: 0 })).toBe(
      "Fully booked today",
    );
  });

  it("habla en singular cuando solo queda una plaza", () => {
    expect(availabilityLabel({ openNow: true, slotsToday: 1 })).toBe(
      "1 slot today",
    );
  });
});
