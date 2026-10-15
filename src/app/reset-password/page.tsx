"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";

import { AuthSplit } from "@/components/patterns/auth-split";
import { RequireSession } from "@/components/onboarding/require-session";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { checkPassword } from "@/lib/registration";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 1.2 — tramo final de "Password reset via email with secure token".
 * Sin artboard propio: reutiliza el patrón split-screen (tagline de
 * `ForgotPassword.dc.html`) y los mismos campos de contraseña de
 * `/signup`, sin inventar un layout — ver COMPONENT-MAP.md para la
 * desviación anotada.
 *
 * La sesión de recuperación la deja `/auth/confirm` (type=recovery); sin
 * ella no hay nada que actualizar, de ahí `RequireSession`. Al terminar va a
 * Home, no a login: así lo fija el nodo `PwdReset --> HomeScreen` de
 * flow-onboarding.md.
 */
function ResetPasswordForm() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!checkPassword(password).isValid) {
      setError(
        !password
          ? "Choose a password."
          : !checkPassword(password).hasMinLength
            ? "Use at least 8 characters."
            : "Include at least one special character.",
      );
      return;
    }
    if (confirmPassword !== password) {
      setError("Both passwords must match.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.push("/");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplit tagline="Your access, always safe.">
      <h1 className="mb-2 text-[28px] text-fg">Choose a new password</h1>
      <p className="m-0 mb-8 text-sm leading-[1.55] text-fg-muted">
        Your new password must be at least 8 characters, including one
        special character.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <Field label="New password" htmlFor="new-password">
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters, 1 special"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={18} strokeWidth={1.6} />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="cursor-pointer transition-colors duration-150 hover:text-fg-muted"
              >
                {showPassword ? (
                  <EyeOff size={18} strokeWidth={1.6} />
                ) : (
                  <Eye size={18} strokeWidth={1.6} />
                )}
              </button>
            }
          />
        </Field>

        <Field
          label="Confirm new password"
          htmlFor="confirm-new-password"
          className="mb-7"
          error={error}
        >
          <Input
            id="confirm-new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            icon={<Lock size={18} strokeWidth={1.6} />}
          />
        </Field>

        <Button type="submit" block disabled={submitting}>
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthSplit>
  );
}

export default function ResetPasswordPage() {
  return (
    <RequireSession>
      <ResetPasswordForm />
    </RequireSession>
  );
}
