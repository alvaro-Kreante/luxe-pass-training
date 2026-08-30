/**
 * Story 1.1 — reglas de registro.
 *
 * Sin backend todavía: la comprobación de email duplicado consulta una lista
 * de muestra. Cuando exista la API, `findExistingAccount` es el único punto
 * que cambia — la pantalla ya trata el caso.
 */

/** Criterio de aceptación: "8+ chars, special characters". */
export const PASSWORD_MIN_LENGTH = 8;

const SPECIAL_CHARACTER = /[^A-Za-z0-9]/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cuentas de muestra que disparan el error de email duplicado. */
const REGISTERED_EMAILS = [
  "alexandra.rivas@email.com",
  "member@ensoleil.com",
];

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

export function findExistingAccount(email: string): boolean {
  return REGISTERED_EMAILS.includes(email.trim().toLowerCase());
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
  } else if (findExistingAccount(values.email)) {
    errors.email =
      "An account already exists with this email. Log in instead, or reset your password.";
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
