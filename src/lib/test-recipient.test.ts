import { describe, expect, it } from "vitest";

import { isTestRecipient } from "../../supabase/functions/_shared/test-recipient";

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
