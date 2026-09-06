import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Story 1.1 — reglas de registro contra Supabase local (ver
 * CLAUDE.md §Supabase Local Development).
 */

/** Criterio de aceptación: "8+ chars, special characters". */
export const PASSWORD_MIN_LENGTH = 8;

const SPECIAL_CHARACTER = /[^A-Za-z0-9]/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DUPLICATE_EMAIL_MESSAGE =
  "An account already exists with this email. Log in instead, or reset your password.";

export interface PasswordCheck {
  hasMinLength: boolean;
  hasSpecialCharacter: boolean;
  isValid: boolean;
}

export function checkPassword(password: string): PasswordCheck {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasSpecialCharacter = SPECIAL_CHARACTER.test(password);
  return {
    hasMinLength,
    hasSpecialCharacter,
    isValid: hasMinLength && hasSpecialCharacter,
  };
}

export function isEmailShapeValid(email: string): boolean {
  return EMAIL_SHAPE.test(email.trim());
}

/**
 * Consulta el RPC `email_exists` (ver `supabase/schemas/email_exists.sql`):
 * Supabase Auth no revela por sí mismo si un email ya tiene cuenta cuando la
 * confirmación por correo está activa, así que este es el punto explícito
 * que cumple el AC de "clear error messaging".
 */
export async function emailExists(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("email_exists", {
    p_email: email.trim().toLowerCase(),
  });
  if (error) throw error;
  return data ?? false;
}

export interface SignUpValues {
  email: string;
  password: string;
  confirmPassword: string;
  termsAcceptedAt: string | null;
}

export type SignUpErrors = Partial<
  Record<"email" | "password" | "confirmPassword" | "terms", string>
>;

export function validateSignUp(values: SignUpValues): SignUpErrors {
  const errors: SignUpErrors = {};

  if (!values.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!isEmailShapeValid(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  const password = checkPassword(values.password);
  if (!values.password) {
    errors.password = "Choose a password.";
  } else if (!password.hasMinLength) {
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (!password.hasSpecialCharacter) {
    errors.password = "Include at least one special character.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Re-enter your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Both passwords must match.";
  }

  if (!values.termsAcceptedAt) {
    errors.terms = "Accept the Terms of Service and Privacy Policy to continue.";
  }

  return errors;
}
