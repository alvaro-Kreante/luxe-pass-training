/**
 * Story 1.2 — constantes del acceso.
 *
 * El acceso y el bloqueo son reales (Supabase Auth + RPC `login_attempts`,
 * ver `supabase/schemas/login_attempts.sql`); estas cifras solo alimentan la
 * copy de `/login` y deben coincidir con las que usan las funciones SQL.
 */

/** Criterio: "Account lockout after 5 failed attempts (15min timeout)". */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

/** Criterio: "Automatic logout after 30 days of inactivity". */
export const REMEMBER_ME_DAYS = 30;
