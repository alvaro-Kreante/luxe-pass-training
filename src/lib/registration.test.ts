import { describe, expect, it } from "vitest";

import {
  checkPassword,
  findExistingAccount,
  isEmailShapeValid,
  validateSignUp,
  type SignUpValues,
} from "./registration";

/**
 * Story 1.1 — criterios "8+ chars, special characters" y
 * "Duplicate email addresses prevented".
 */

function signUp(overrides: Partial<SignUpValues> = {}): SignUpValues {
  return {
    email: "nueva.socia@email.com",
    password: "EnSoleil!2026",
    confirmPassword: "EnSoleil!2026",
    termsAcceptedAt: "2026-08-31T10:00:00.000Z",
    ...overrides,
  };
}

describe("checkPassword", () => {
  it("rechaza una contraseña de menos de 8 caracteres", () => {
    expect(checkPassword("Ab!2").isValid).toBe(false);
  });

  it("rechaza una contraseña sin carácter especial", () => {
    expect(checkPassword("EnSoleil2026").isValid).toBe(false);
  });

  it("acepta una contraseña con longitud suficiente y un carácter especial", () => {
    expect(checkPassword("EnSoleil!2026").isValid).toBe(true);
  });

  it("informa de cada requisito por separado para poder señalar el que falla", () => {
    const result = checkPassword("EnSoleil2026");

    expect(result.hasMinLength).toBe(true);
    expect(result.hasSpecialCharacter).toBe(false);
  });
});

describe("isEmailShapeValid", () => {
  it("acepta una dirección con forma válida", () => {
    expect(isEmailShapeValid("nueva.socia@email.com")).toBe(true);
  });

  it("rechaza una dirección sin arroba", () => {
    expect(isEmailShapeValid("nueva.socia.email.com")).toBe(false);
  });

  it("rechaza una dirección sin dominio", () => {
    expect(isEmailShapeValid("nueva.socia@email")).toBe(false);
  });

  it("ignora los espacios alrededor", () => {
    expect(isEmailShapeValid("  nueva.socia@email.com  ")).toBe(true);
  });
});

describe("findExistingAccount", () => {
  it("encuentra una cuenta ya registrada", () => {
    expect(findExistingAccount("member@ensoleil.com")).toBe(true);
  });

  it("ignora las mayúsculas al comparar", () => {
    expect(findExistingAccount("Member@EnSoleil.com")).toBe(true);
  });

  it("ignora los espacios alrededor", () => {
    expect(findExistingAccount("  member@ensoleil.com  ")).toBe(true);
  });

  it("no encuentra una dirección desconocida", () => {
    expect(findExistingAccount("nueva.socia@email.com")).toBe(false);
  });
});

describe("validateSignUp", () => {
  it("no devuelve ningún error con un alta completa y válida", () => {
    expect(validateSignUp(signUp())).toEqual({});
  });

  it("exige el email", () => {
    const errors = validateSignUp(signUp({ email: "   " }));

    expect(errors.email).toBe("Enter your email address.");
  });

  it("exige que el email tenga forma de dirección", () => {
    const errors = validateSignUp(signUp({ email: "nueva.socia" }));

    expect(errors.email).toBe("Enter a valid email address.");
  });

  it("rechaza un email que ya tiene cuenta y ofrece la salida", () => {
    const errors = validateSignUp(signUp({ email: "member@ensoleil.com" }));

    expect(errors.email).toMatch(/An account already exists/);
    expect(errors.email).toMatch(/Log in instead/);
  });

  it("exige la contraseña", () => {
    const errors = validateSignUp(
      signUp({ password: "", confirmPassword: "" }),
    );

    expect(errors.password).toBe("Choose a password.");
  });

  it("exige la longitud mínima de la contraseña", () => {
    const errors = validateSignUp(
      signUp({ password: "Ab!2", confirmPassword: "Ab!2" }),
    );

    expect(errors.password).toBe("Use at least 8 characters.");
  });

  it("exige un carácter especial en la contraseña", () => {
    const errors = validateSignUp(
      signUp({ password: "EnSoleil2026", confirmPassword: "EnSoleil2026" }),
    );

    expect(errors.password).toBe("Include at least one special character.");
  });

  it("exige repetir la contraseña", () => {
    const errors = validateSignUp(signUp({ confirmPassword: "" }));

    expect(errors.confirmPassword).toBe("Re-enter your password.");
  });

  it("exige que las dos contraseñas coincidan", () => {
    const errors = validateSignUp(signUp({ confirmPassword: "EnSoleil!2027" }));

    expect(errors.confirmPassword).toBe("Both passwords must match.");
  });

  it("exige la aceptación de los términos", () => {
    const errors = validateSignUp(signUp({ termsAcceptedAt: null }));

    expect(errors.terms).toMatch(/Accept the Terms of Service/);
  });

  it("señala todos los campos que fallan, no solo el primero", () => {
    const errors = validateSignUp({
      email: "",
      password: "",
      confirmPassword: "",
      termsAcceptedAt: null,
    });

    expect(Object.keys(errors).sort()).toEqual([
      "confirmPassword",
      "email",
      "password",
      "terms",
    ]);
  });
});
