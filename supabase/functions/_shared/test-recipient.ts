// Dominios de los usuarios que crean los tests (`src/lib/testing/`) — nunca
// son buzones reales. Sin dependencias de Deno para poder testearlo con
// Vitest (`src/lib/test-recipient.test.ts`).
const TEST_RECIPIENT = /@([a-z0-9-]+-test\.com|example\.(com|org|net)|email\.com)$/i;

export function isTestRecipient(email: string): boolean {
  return TEST_RECIPIENT.test(email.trim());
}

export type EmailSkipReason = "no-environment" | "tests-running" | "test-recipient";

/**
 * Por qué no se envía un email, o null si se envía. Sin `APP_ENV` (el runner
 * de GitHub Actions no lo define) no sale nada: los tests solo mandan
 * emails desde local. En LOCAL se omiten además los destinatarios de test
 * (la suite agotaba la cuota diaria de Brevo) y, mientras corre la suite
 * (`testsRunning`, ver `public.email_pause`), cualquier destinatario: los
 * tests reservan en lounges sembrados y avisarían a sus partners reales. En
 * STAGING/PROD, todo sale.
 */
export function emailSkipReason(
  envLabel: string | undefined,
  to: string,
  { testsRunning = false }: { testsRunning?: boolean } = {},
): EmailSkipReason | null {
  if (!envLabel) return "no-environment";
  if (envLabel === "LOCAL" && testsRunning) return "tests-running";
  if (envLabel === "LOCAL" && isTestRecipient(to)) return "test-recipient";
  return null;
}
