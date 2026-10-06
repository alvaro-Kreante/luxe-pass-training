import { describe, expect, it } from "vitest";

import { emailSkipReason, isTestRecipient } from "../../supabase/functions/_shared/test-recipient";

/**
 * Los tests crean usuarios con dominios de prueba; en local, las Edge
 * Functions no deben gastar la cuota diaria de Brevo enviándoles emails.
 */
describe("isTestRecipient", () => {
  it("reconoce los dominios que usan los tests", () => {
    expect(isTestRecipient("draft-admin-1@ensoleil-test.com")).toBe(true);
    expect(isTestRecipient("dana@theainsworth-test.com")).toBe(true);
    expect(isTestRecipient("someone@example.com")).toBe(true);
    expect(isTestRecipient("camille@email.com")).toBe(true);
  });

  it("no confunde un email real con uno de test", () => {
    expect(isTestRecipient("dev02@kreante.co")).toBe(false);
    expect(isTestRecipient("hello@test.com.co")).toBe(false);
    expect(isTestRecipient("owner@contest.com")).toBe(false);
  });
});

/**
 * Los emails solo salen de verdad desde un ambiente con nombre (LOCAL,
 * STAGING, PROD). El runner de GitHub Actions no define `APP_ENV`: ahí
 * nada se envía, sea quien sea el destinatario.
 */
describe("emailSkipReason", () => {
  it("sin ambiente (CI de GitHub) no se envía nada", () => {
    expect(emailSkipReason(undefined, "dev02@kreante.co")).toBe("no-environment");
    expect(emailSkipReason("", "camille@thelarkspur-test.com")).toBe("no-environment");
  });

  it("en local se omiten los destinatarios de test y se envía al resto", () => {
    expect(emailSkipReason("LOCAL", "camille@thelarkspur-test.com")).toBe("test-recipient");
    expect(emailSkipReason("LOCAL", "dev02@kreante.co")).toBeNull();
  });

  it("en local, mientras corre la suite no sale ningún email, tampoco a buzones reales", () => {
    expect(emailSkipReason("LOCAL", "dana.okafor@theainsworth.com", { testsRunning: true })).toBe("tests-running");
    expect(emailSkipReason("LOCAL", "dana.okafor@theainsworth.com", { testsRunning: false })).toBeNull();
  });

  it("la pausa de la suite local no afecta a staging ni a producción", () => {
    expect(emailSkipReason("STAGING", "dev02@kreante.co", { testsRunning: true })).toBeNull();
  });

  it("en staging y producción se envía siempre", () => {
    expect(emailSkipReason("STAGING", "camille@thelarkspur-test.com")).toBeNull();
    expect(emailSkipReason("PROD", "dev02@kreante.co")).toBeNull();
  });
});
