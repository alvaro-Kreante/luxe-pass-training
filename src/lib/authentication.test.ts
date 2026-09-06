import { describe, expect, it } from "vitest";

import { LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, REMEMBER_ME_DAYS } from "./authentication";

/** Story 1.2 — cifras de bloqueo y "remember me". El acceso en sí se cubre en `src/app/login/page.test.tsx` contra Supabase real. */

describe("constantes del acceso", () => {
  /**
   * Los tres valores salen literalmente de los criterios de la Story 1.2 y
   * deben coincidir con los que usan las funciones SQL de
   * `supabase/schemas/login_attempts.sql`. El test existe para que un cambio
   * de cifra sea deliberado y no un descuido.
   */
  it("fija las cifras que enuncian los criterios de aceptación", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(LOCKOUT_MINUTES).toBe(15);
    expect(REMEMBER_ME_DAYS).toBe(30);
  });
});
