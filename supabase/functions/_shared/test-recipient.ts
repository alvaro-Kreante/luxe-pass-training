// Dominios de los usuarios que crean los tests (`src/lib/testing/`) — nunca
// son buzones reales. Sin dependencias de Deno para poder testearlo con
// Vitest (`src/lib/test-recipient.test.ts`).
const TEST_RECIPIENT = /@([a-z0-9-]+-test\.com|example\.(com|org|net)|email\.com)$/i;

export function isTestRecipient(email: string): boolean {
  return TEST_RECIPIENT.test(email.trim());
}
