/**
 * Story 1.2 — datos de muestra para el acceso.
 *
 * Solo lo justo para que `/login` pueda mostrar sus estados: credenciales
 * correctas, credenciales inválidas y cuenta bloqueada. No hay sesión, ni
 * persistencia, ni caducidad real — el bloqueo es un estado de pantalla que se
 * alcanza fallando cinco veces y se limpia recargando.
 */

/** Criterio: "Account lockout after 5 failed attempts (15min timeout)". */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

/** Criterio: "Automatic logout after 30 days of inactivity". */
export const REMEMBER_ME_DAYS = 30;

/** Cuenta de muestra para recorrer el flujo de acceso. */
export const SAMPLE_ACCOUNT = {
  email: "alexandra.rivas@email.com",
  password: "EnSoleil!2026",
};

export function credentialsMatch(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === SAMPLE_ACCOUNT.email &&
    password === SAMPLE_ACCOUNT.password
  );
}
