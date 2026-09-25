"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";

import { AuthSplit } from "@/components/patterns/auth-split";
import {
  TermsModal,
  type TermsAcceptance,
} from "@/components/onboarding/terms-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DUPLICATE_EMAIL_MESSAGE,
  emailExists,
  validateSignUp,
  type SignUpErrors,
} from "@/lib/registration";
import { normalizeReferralCode } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 1.1 — User Registration.
 * Artboard: docs/design/epic-1-onboarding/Main.dc.html
 * Patrón 1 del DESIGN-SYSTEM (split-screen de autenticación).
 *
 * Story 9.2 — quien llega desde `/join/[code]` trae `?ref=CODE`; sin campo
 * visible (el artboard no lo tiene), el código viaja en los metadatos de
 * Auth y `create_referral_from_signup` (supabase/schemas/referrals.sql) lo
 * convierte en un referido al crear el perfil.
 */
export default function SignUpPage() {
  return (
    <React.Suspense>
      <SignUpScreen />
    </React.Suspense>
  );
}

function SignUpScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = normalizeReferralCode(searchParams.get("ref"));
  const supabase = React.useMemo(() => createClient(), []);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [acceptance, setAcceptance] = React.useState<TermsAcceptance | null>(
    null,
  );
  const [termsOpen, setTermsOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<SignUpErrors>({});
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateSignUp({
      email,
      password,
      confirmPassword,
      termsAcceptedAt: acceptance?.acceptedAt ?? null,
    });
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const trimmedEmail = email.trim();
      if (await emailExists(supabase, trimmedEmail)) {
        setErrors({ email: DUPLICATE_EMAIL_MESSAGE });
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          // El perfil se crea varios pasos y una redirección de email
          // después; sin persistencia local, el momento de aceptación viaja
          // aquí para que /onboarding/professional lo lea de vuelta.
          data: {
            terms_accepted_at: acceptance?.acceptedAt,
            ...(referralCode ? { referral_code: referralCode } : {}),
          },
        },
      });
      if (error) {
        setErrors({ email: error.message });
        return;
      }

      router.push(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AuthSplit
        tagline="Join a community of discerning travelers."
        className={termsOpen ? "blur-[3px]" : undefined}
      >
        <Link
          href="/login"
          className="mb-[22px] inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-subtle hover:text-accent-strong"
        >
          <ChevronLeft size={16} strokeWidth={1.8} />
          Back to log in
        </Link>

        <h1 className="mb-2 text-[30px] text-fg">Create account</h1>
        <p className="m-0 mb-7 text-sm leading-normal text-fg-muted">
          Join our exclusive community of members.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="Email address"
            htmlFor="email"
            hint={
              errors.email ? (
                <span className="text-accent-strong">{errors.email}</span>
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
              aria-invalid={Boolean(errors.email)}
              icon={<Mail size={18} strokeWidth={1.6} />}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            hint={
              errors.password ? (
                <span className="text-accent-strong">{errors.password}</span>
              ) : (
                "8+ characters, including one special character."
              )
            }
          >
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters, 1 special"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
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
            label="Confirm password"
            htmlFor="confirm-password"
            className="mb-[22px]"
            hint={
              errors.confirmPassword ? (
                <span className="text-accent-strong">
                  {errors.confirmPassword}
                </span>
              ) : null
            }
          >
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={Boolean(errors.confirmPassword)}
              icon={<Lock size={18} strokeWidth={1.6} />}
            />
          </Field>

          {/* La casilla no se marca a mano: abre los documentos, y la
              aceptación se registra con fecha y versión desde el modal. */}
          <Checkbox
            checked={Boolean(acceptance)}
            onCheckedChange={() => {
              if (acceptance) {
                setAcceptance(null);
              } else {
                setTermsOpen(true);
              }
            }}
            className="mb-[26px]"
          >
            I have read and agree to the{" "}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setTermsOpen(true);
              }}
              className="cursor-pointer font-bold text-accent-strong hover:text-fg"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setTermsOpen(true);
              }}
              className="cursor-pointer font-bold text-accent-strong hover:text-fg"
            >
              Privacy Policy
            </button>
          </Checkbox>

          <Button type="submit" block disabled={!acceptance || submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>

          <p className="m-0 mt-2.5 text-center text-xs text-fg-subtle">
            {errors.terms ?? "Disabled until the terms are accepted."}
          </p>
        </form>

        <p className="m-0 mt-[18px] text-center text-[13px] text-fg-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-bold">
            Log in
          </Link>
        </p>
      </AuthSplit>

      <TermsModal
        open={termsOpen}
        onOpenChange={setTermsOpen}
        onAccept={(next) => {
          setAcceptance(next);
          setErrors((prev) => ({ ...prev, terms: undefined }));
        }}
      />
    </>
  );
}
