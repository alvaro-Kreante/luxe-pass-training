"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from "lucide-react";

import { AuthSplit } from "@/components/patterns/auth-split";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import {
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
  REMEMBER_ME_DAYS,
} from "@/lib/authentication";
import { isEmailShapeValid } from "@/lib/registration";
import { reactivateAccountIfDeleted } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 1.2 — User Login & Authentication.
 * Artboard: docs/design/epic-1-onboarding/Login.dc.html
 * Patrón 1 del DESIGN-SYSTEM (split-screen de autenticación).
 */
export default function LoginPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<"email" | "password", string>>
  >({});
  const [credentialsError, setCredentialsError] = React.useState<
    React.ReactNode
  >("");
  const [locked, setLocked] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (locked || submitting) return;

    const errors: Partial<Record<"email" | "password", string>> = {};
    if (!email.trim()) {
      errors.email = "Enter your email address.";
    } else if (!isEmailShapeValid(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (!password) {
      errors.password = "Enter your password.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setCredentialsError("");
      return;
    }

    const trimmedEmail = email.trim();
    setSubmitting(true);
    setCredentialsError("");
    try {
      const { data: lock } = await supabase.rpc("check_login_lock", {
        p_email: trimmedEmail,
      });
      if (lock?.[0]?.locked) {
        setLocked(true);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (!error) {
        await supabase.rpc("reset_login_attempts", { p_email: trimmedEmail });
        // Story 6.3 — "sign in before then and everything comes back"
        // (`DeleteAccount.dc.html`): deshace el soft-delete si la cuenta
        // seguía en su periodo de gracia de 30 días.
        await reactivateAccountIfDeleted(supabase);
        router.push("/");
        return;
      }

      if (error.message === "Email not confirmed") {
        setCredentialsError(
          <>
            Confirm your email before logging in.{" "}
            <Link href={`/verify-email?email=${encodeURIComponent(trimmedEmail)}`} className="font-bold">
              Resend the link
            </Link>
            .
          </>,
        );
        return;
      }

      const { data: attempt } = await supabase.rpc("record_failed_login", {
        p_email: trimmedEmail,
      });
      const result = attempt?.[0];

      if (result?.locked) {
        setLocked(true);
        return;
      }

      const left = MAX_FAILED_ATTEMPTS - (result?.failed_count ?? 1);
      setCredentialsError(
        `We could not find an account with that email and password. ${left} ${
          left === 1 ? "attempt" : "attempts"
        } left before the account is locked.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplit tagline="Your next moment of calm is waiting.">
      <h1 className="mb-2 text-[30px] text-fg">Welcome back</h1>
      <p className="m-0 mb-8 text-sm leading-normal text-fg-muted">
        Log in to access exclusive lounges.
      </p>

      {locked ? (
        <Notice
          tone="attention"
          icon={<ShieldAlert size={18} strokeWidth={1.6} />}
          className="mb-6"
        >
          <strong className="font-bold text-fg">
            Account temporarily locked
          </strong>
          <br />
          {MAX_FAILED_ATTEMPTS} failed attempts in a row. Try again in{" "}
          {LOCKOUT_MINUTES} minutes, or reset your password to regain access
          now.
        </Notice>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="Email address"
          htmlFor="email"
          hint={
            fieldErrors.email ? (
              <span className="text-accent-strong">{fieldErrors.email}</span>
            ) : null
          }
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={locked || submitting}
            aria-invalid={Boolean(fieldErrors.email || credentialsError)}
            icon={<Mail size={18} strokeWidth={1.6} />}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          className="mb-5"
          hint={
            fieldErrors.password ? (
              <span className="text-accent-strong">{fieldErrors.password}</span>
            ) : credentialsError ? (
              <span className="text-accent-strong">{credentialsError}</span>
            ) : null
          }
        >
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={locked || submitting}
            aria-invalid={Boolean(fieldErrors.password || credentialsError)}
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

        <div className="mb-2 flex items-center justify-between">
          <Checkbox
            align="center"
            checked={rememberMe}
            onCheckedChange={setRememberMe}
          >
            Remember me
          </Checkbox>
          <Link href="/forgot-password" className="text-[13px] font-bold">
            Forgot password?
          </Link>
        </div>

        {/* El flujo fija el alcance de "Remember me": token de 30 días.
            Decirlo evita que el miembro tenga que adivinar qué activa. */}
        <p className="m-0 mb-7 text-[11.5px] text-fg-subtle">
          Keeps you signed in for {REMEMBER_ME_DAYS} days of inactivity on this
          device.
        </p>

        <Button type="submit" block disabled={locked || submitting}>
          {locked
            ? `Locked for ${LOCKOUT_MINUTES} minutes`
            : submitting
              ? "Logging in…"
              : "Log in"}
        </Button>
      </form>

      <p className="m-0 mt-[22px] text-center text-[13px] text-fg-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold">
          Create account
        </Link>
      </p>
    </AuthSplit>
  );
}
