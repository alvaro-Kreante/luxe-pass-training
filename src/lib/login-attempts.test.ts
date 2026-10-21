import { describe, expect, it } from "vitest";

import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 1.2 — "Account lockout after 5 failed attempts (15min timeout)".
 * SEC-03 (docs/audit/seguridad-y-datos.md): el contador de un email solo lo
 * reinicia quien acaba de iniciar sesión con ese mismo email; antes
 * cualquiera, sin sesión, podía limpiar el bloqueo de otra cuenta.
 */

async function lockEmail(email: string) {
  const anonymous = isolatedClient();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await anonymous.rpc("record_failed_login", { p_email: email });
  }
}

async function isLocked(email: string): Promise<boolean> {
  const { data } = await isolatedClient().rpc("check_login_lock", { p_email: email });
  return Boolean(data?.[0]?.locked);
}

describe("reset_login_attempts", () => {
  it("sin sesión no puede reiniciar el bloqueo de una cuenta", async () => {
    const email = `lockout-anon-${Date.now()}@ensoleil-test.example`;
    await lockEmail(email);

    await isolatedClient().rpc("reset_login_attempts", { p_email: email });

    expect(await isLocked(email)).toBe(true);
  });

  it("un miembro con sesión no puede reiniciar el bloqueo de otra cuenta", async () => {
    const victim = `lockout-victim-${Date.now()}@ensoleil-test.example`;
    await lockEmail(victim);
    const attacker = isolatedClient();
    await signUpConfirmedMemberAndSignIn(attacker, `lockout-attacker-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026");

    await attacker.rpc("reset_login_attempts", { p_email: victim });

    expect(await isLocked(victim)).toBe(true);
  });

  it("quien inicia sesión con ese email reinicia su propio contador", async () => {
    const email = `lockout-owner-${Date.now()}@ensoleil-test.example`;
    const owner = isolatedClient();
    await signUpConfirmedMemberAndSignIn(owner, email, "EnSoleil!2026");
    await lockEmail(email);

    const { error } = await owner.rpc("reset_login_attempts", { p_email: email });

    expect(error).toBeNull();
    expect(await isLocked(email)).toBe(false);
  });
});

/**
 * SEC-03: el bloqueo lo aplica Supabase Auth (hook "Password Verification
 * Attempt"), no la pantalla — quien llama a `/auth/v1/token` directamente
 * también lo sufre.
 */
describe("bloqueo en el servidor", () => {
  const PASSWORD = "EnSoleil!2026";

  async function confirmedEmail(prefix: string) {
    const email = `${prefix}-${Date.now()}@ensoleil-test.example`;
    const client = isolatedClient();
    await signUpConfirmedMemberAndSignIn(client, email, PASSWORD);
    await client.auth.signOut();
    return email;
  }

  async function failDirectly(email: string, times: number) {
    for (let attempt = 0; attempt < times; attempt += 1) {
      await isolatedClient().auth.signInWithPassword({ email, password: "ClaveIncorrecta!1" });
    }
  }

  it("tras 5 fallos directos contra Auth, la contraseña correcta tampoco entra", async () => {
    const email = await confirmedEmail("lockout-direct");
    await failDirectly(email, 5);

    const { data, error } = await isolatedClient().auth.signInWithPassword({ email, password: PASSWORD });

    expect(data.session).toBeNull();
    expect(error).not.toBeNull();
    expect(await isLocked(email)).toBe(true);
  });

  it("con menos de 5 fallos la contraseña correcta entra y reinicia el contador", async () => {
    const email = await confirmedEmail("lockout-reset");
    await failDirectly(email, 4);

    const { data } = await isolatedClient().auth.signInWithPassword({ email, password: PASSWORD });
    await failDirectly(email, 4);

    expect(data.session).not.toBeNull();
    expect(await isLocked(email)).toBe(false);
  });

  it("un fallo que ya contó Auth no lo vuelve a contar la pantalla", async () => {
    const email = await confirmedEmail("lockout-single-count");
    const client = isolatedClient();

    await client.auth.signInWithPassword({ email, password: "ClaveIncorrecta!1" });
    const { data } = await client.rpc("record_failed_login", { p_email: email });

    expect(data?.[0]?.failed_count).toBe(1);
  });
});
