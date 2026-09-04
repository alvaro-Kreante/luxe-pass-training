import { describe, expect, it } from "vitest";

import {
  AINSWORTH_PASS,
  PASS_LIFECYCLE_STATES,
  RECEPTION_CLOSE_MATCHES,
  findReceptionBooking,
  isPassLifecycleState,
} from "./passes";

/**
 * Story 5.1 (Digital Pass Generation) y Story 5.2 (Lounge Check-In Process).
 * Sin backend: el pase, la lista de "My Pass" y la consola de recepción son
 * datos de muestra deterministas, igual que `registration.ts` o
 * `lounge-profile.ts`.
 */

describe("AINSWORTH_PASS", () => {
  it("tiene un número de confirmación LP único con el formato del resto de la app", () => {
    expect(AINSWORTH_PASS.reference).toMatch(/^LP-\d{6}$/);
  });
});

describe("isPassLifecycleState", () => {
  it("acepta los cuatro estados del pase", () => {
    for (const state of PASS_LIFECYCLE_STATES) {
      expect(isPassLifecycleState(state)).toBe(true);
    }
  });

  it("rechaza cualquier otro valor, incluido null", () => {
    expect(isPassLifecycleState("cancelled")).toBe(false);
    expect(isPassLifecycleState(null)).toBe(false);
  });
});

describe("findReceptionBooking", () => {
  it("encuentra la reserva válida por su número LP", () => {
    const booking = findReceptionBooking("LP-842193");

    expect(booking?.memberName).toBe("Alexandra Rivas");
  });

  it("no distingue mayúsculas ni espacios sobrantes", () => {
    const booking = findReceptionBooking("  lp-842193  ");

    expect(booking?.memberName).toBe("Alexandra Rivas");
  });

  it("devuelve undefined para un número que no existe hoy en este lounge", () => {
    expect(findReceptionBooking("LP-842917")).toBeUndefined();
  });
});

describe("RECEPTION_CLOSE_MATCHES", () => {
  it("no incluye el número que ya se buscó sin éxito", () => {
    const references = RECEPTION_CLOSE_MATCHES.map((match) => match.reference);

    expect(references).not.toContain("LP-842917");
  });
});
