"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Mail, ShieldCheck } from "lucide-react";

import { AuthSplit } from "@/components/patterns/auth-split";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { isEmailShapeValid } from "@/lib/registration";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 1.2 — "Password reset via email with secure token".
 * Artboard: docs/design/epic-1-onboarding/ForgotPassword.dc.html
 *
 * El artboard cubre el formulario. El acuse de envío no tiene artboard propio,
 * así que se resuelve como un segundo estado de esta misma card reutilizando la
 * anatomía de Verification.dc.html (medallón de 76px + destinatario + reenvío),
 * en lugar de inventar una pantalla nueva.
 */

const RESEND_COOLDOWN_SECONDS = 30;

export default function ForgotPasswordPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestReset(value: string) {
    setSending(true);
    try {
      await supabase.auth.resetPasswordForEmail(value);
      setSentTo(value);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();

    if (!value) {
      setError("Enter your email address.");
      return;
    }
    if (!isEmailShapeValid(value)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    await requestReset(value);
  }

  if (sentTo) {
    return (
      <AuthSplit tagline="Your access, always safe." centered>
        <div className="relative mx-auto mb-7 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-accent-soft">
          <Mail size={34} strokeWidth={1.6} className="text-accent-strong" />
          <span className="absolute -bottom-1 -right-1 flex h-[26px] w-[26px] items-center justify-center rounded-full border-[3px] border-surface bg-accent text-on-accent">
            <ShieldCheck size={12} strokeWidth={2.4} />
          </span>
        </div>

        <h1 className="mb-3 text-[26px] text-fg">Check your inbox</h1>
        <p className="m-0 mb-2 text-sm leading-relaxed text-fg-muted">
          If an account exists for
        </p>
        <p className="m-0 mb-7 text-sm font-bold text-fg">{sentTo}</p>

        <Notice className="mb-6 text-left">
          The reset link is single-use and expires in 60 minutes. Opening it
          signs you out of any other device.
        </Notice>

        <Button
          variant="outline"
          block
          className="mb-6 tracking-[0.1em]"
          disabled={cooldown > 0 || sending}
          onClick={() => requestReset(sentTo)}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
        </Button>

        <p className="m-0 mb-5 text-[12.5px] leading-relaxed text-fg-subtle">
          Can&apos;t find it? Check your spam or promotions folder.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-subtle hover:text-accent-strong"
        >
          <ChevronLeft size={16} strokeWidth={1.8} />
          Back to log in
        </Link>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit tagline="Your access, always safe.">
      <Link
        href="/login"
        className="mb-[22px] inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-subtle hover:text-accent-strong"
      >
        <ChevronLeft size={16} strokeWidth={1.8} />
        Back to log in
      </Link>

      <h1 className="mb-2 text-[28px] text-fg">Reset your password</h1>
      <p className="m-0 mb-8 text-sm leading-[1.55] text-fg-muted">
        Enter your email and we&apos;ll send you a secure link to reset your
        password.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="Email address"
          htmlFor="email"
          className="mb-7"
          error={error}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            icon={<Mail size={18} strokeWidth={1.6} />}
          />
        </Field>

        <Button type="submit" block>
          Send reset link
        </Button>
      </form>

      <p className="m-0 mt-[22px] text-center text-[13px] text-fg-muted">
        Remembered your password?{" "}
        <Link href="/login" className="font-bold">
          Log in
        </Link>
      </p>
    </AuthSplit>
  );
}
