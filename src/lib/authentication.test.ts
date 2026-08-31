import { describe, expect, it } from "vitest";

import {
  credentialsMatch,
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
  REMEMBER_ME_DAYS,
  SAMPLE_ACCOUNT,
} from "./authentication";

/** Story 1.2 — credenciales, bloqueo tras 5 intentos y "remember me". */

describe("credentialsMatch", () => {
  it("acepta las credenciales de la cuenta de muestra", () => {
    expect(
      credentialsMatch(SAMPLE_ACCOUNT.email, SAMPLE_ACCOUNT.password),
    ).toBe(true);
  });

  it("ignora las mayúsculas del email", () => {
    expect(credentialsMatch("Alexandra.Rivas@Email.com", SAMPLE_ACCOUNT.password)).toBe(
      true,
    );
  });

  it("ignora los espacios alrededor del email", () => {
    expect(
      credentialsMatch("  alexandra.rivas@email.com  ", SAMPLE_ACCOUNT.password),
    ).toBe(true);
  });

  it("distingue mayúsculas en la contraseña", () => {
    expect(credentialsMatch(SAMPLE_ACCOUNT.email, "ensoleil!2026")).toBe(false);
  });

  it("rechaza una contraseña incorrecta", () => {
    expect(credentialsMatch(SAMPLE_ACCOUNT.email, "OtraClave!2026")).toBe(false);
  });

  it("rechaza un email desconocido aunque la contraseña sea la correcta", () => {
    expect(credentialsMatch("desconocida@email.com", SAMPLE_ACCOUNT.password)).toBe(
      false,
    );
  });
});

describe("constantes del acceso", () => {
  /**
   * Los tres valores salen literalmente de los criterios de la Story 1.2.
   * El test existe para que un cambio de cifra sea deliberado y no un descuido.
   */
  it("fija las cifras que enuncian los criterios de aceptación", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(LOCKOUT_MINUTES).toBe(15);
    expect(REMEMBER_ME_DAYS).toBe(30);
  });
});
