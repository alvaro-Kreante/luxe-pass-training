/**
 * Story 1.2 — reglas de acceso.
 *
 * Sin backend: las credenciales se comparan contra una cuenta de muestra y el
 * bloqueo por intentos fallidos vive en localStorage, para que el estado se
 * pueda ver y probar en la pantalla. Nada de esto es seguridad — es lo que
 * permite que `/login` muestre sus estados reales.
 *
 * Cuando exista la API, `attemptLogin` es el único punto que cambia.
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

const LOCKOUT_KEY = "luxepass:login-lockout";

export interface LockoutState {
  failedAttempts: number;
  /** Epoch ms en que expira el bloqueo, o null si no está bloqueada. */
  lockedUntil: number | null;
}

export const NO_LOCKOUT: LockoutState = {
  failedAttempts: 0,
  lockedUntil: null,
};

export function readLockout(): LockoutState {
  try {
    const stored = window.localStorage.getItem(LOCKOUT_KEY);
    if (!stored) return NO_LOCKOUT;

    const parsed = JSON.parse(stored) as LockoutState;

    // Un bloqueo caducado se descarta junto con el contador de intentos.
    if (parsed.lockedUntil && parsed.lockedUntil <= Date.now()) {
      window.localStorage.removeItem(LOCKOUT_KEY);
      return NO_LOCKOUT;
    }
    return parsed;
  } catch {
    return NO_LOCKOUT;
  }
}

function writeLockout(state: LockoutState): LockoutState {
  try {
    if (state.failedAttempts === 0 && !state.lockedUntil) {
      window.localStorage.removeItem(LOCKOUT_KEY);
    } else {
      window.localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
    }
  } catch {
    // Un almacenamiento bloqueado no debe impedir el acceso.
  }
  return state;
}

export function isLockedOut(state: LockoutState): boolean {
  return state.lockedUntil !== null && state.lockedUntil > Date.now();
}

/** Minutos que faltan para que expire el bloqueo, redondeados hacia arriba. */
export function minutesRemaining(state: LockoutState): number {
  if (!state.lockedUntil) return 0;
  return Math.max(1, Math.ceil((state.lockedUntil - Date.now()) / 60000));
}

export type LoginOutcome =
  | { status: "success" }
  | { status: "invalid"; attemptsLeft: number; lockout: LockoutState }
  | { status: "locked"; lockout: LockoutState };

export function attemptLogin(email: string, password: string): LoginOutcome {
  const current = readLockout();

  if (isLockedOut(current)) {
    return { status: "locked", lockout: current };
  }

  const matches =
    email.trim().toLowerCase() === SAMPLE_ACCOUNT.email &&
    password === SAMPLE_ACCOUNT.password;

  if (matches) {
    return { status: "success" };
  }

  const failedAttempts = current.failedAttempts + 1;

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockout = writeLockout({
      failedAttempts,
      lockedUntil: Date.now() + LOCKOUT_MINUTES * 60_000,
    });
    return { status: "locked", lockout };
  }

  const lockout = writeLockout({ failedAttempts, lockedUntil: null });
  return {
    status: "invalid",
    attemptsLeft: MAX_FAILED_ATTEMPTS - failedAttempts,
    lockout,
  };
}

/** Tras un acceso correcto se limpia el historial de intentos. */
export function clearLockout(): void {
  writeLockout(NO_LOCKOUT);
}
