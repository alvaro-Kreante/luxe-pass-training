"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, Clock, Mail } from "lucide-react";

import { AuthSplit } from "@/components/patterns/auth-split";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 1.1 — "Email verification required before account activation".
 * Artboard: docs/design/epic-1-onboarding/Verification.dc.html
 */

const RESEND_COOLDOWN_SECONDS = 30;
const CONFIRMED_REDIRECT_DELAY_MS = 2500;

/**
 * Segundo estado de esta misma pantalla, sin artboard propio: reutiliza la
 * anatomía de `Verification.dc.html` (medallón + destinatario), igual que
 * `/forgot-password` con su acuse de envío. La sesión ya la dejó activa
 * `/auth/confirm`, así que solo confirma y continúa — no hay login de por
 * medio (ver flow-onboarding.md: EmailVerified → ProfileCreation).
 */
function EmailConfirmedCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/onboarding/basics";

  React.useEffect(() => {
    const timer = setTimeout(() => router.push(next), CONFIRMED_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [router, next]);

  return (
    <AuthSplit tagline="Almost there. Confirm your email to begin." centered>
      <div className="relative mx-auto mb-7 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-accent-soft">
        <Mail size={34} strokeWidth={1.6} className="text-accent-strong" />
        <span className="absolute -bottom-1 -right-1 flex h-[26px] w-[26px] items-center justify-center rounded-full border-[3px] border-surface bg-accent text-on-accent">
          <Check size={12} strokeWidth={2.4} />
        </span>
      </div>

      <h1 className="mb-3 text-[26px] text-fg">Email confirmed</h1>
      <p className="m-0 mb-7 text-sm leading-relaxed text-fg-muted">
        Your account is ready. Let&apos;s set up your profile.
      </p>

      <Button block onClick={() => router.push(next)}>
        Continue
      </Button>
    </AuthSplit>
  );
}

function VerifyEmailCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resendOnArrival = searchParams.get("resend") === "1";
  const emailParam = searchParams.get("email");
  const email = emailParam ?? "your email address";
  const supabase = React.useMemo(() => createClient(), []);

  const [cooldown, setCooldown] = React.useState(0);
  const [resending, setResending] = React.useState(false);
  const [resendError, setResendError] = React.useState("");

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = React.useCallback(async () => {
    if (!emailParam) return;
    setResending(true);
    setResendError("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailParam,
      });
      if (error) {
        setResendError("We could not resend the email. Try again in a moment.");
        return;
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setResending(false);
    }
  }, [supabase, emailParam]);

  // "Resend the link" del login llega con resend=1: reenvía al aterrizar y
  // limpia el param para que recargar la página no vuelva a enviar.
  const resentOnArrival = React.useRef(false);
  React.useEffect(() => {
    if (!resendOnArrival || resentOnArrival.current) return;
    resentOnArrival.current = true;
    void handleResend();
    if (emailParam) {
      router.replace(`/verify-email?email=${encodeURIComponent(emailParam)}`);
    }
  }, [resendOnArrival, handleResend, router, emailParam]);

  return (
    <AuthSplit tagline="Almost there. Confirm your email to begin." centered>
      <div className="relative mx-auto mb-7 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-accent-soft">
        <Mail size={34} strokeWidth={1.6} className="text-accent-strong" />
        <span className="absolute -bottom-1 -right-1 flex h-[26px] w-[26px] items-center justify-center rounded-full border-[3px] border-surface bg-accent text-on-accent">
          <Clock size={12} strokeWidth={2.4} />
        </span>
      </div>

      <h1 className="mb-3 text-[26px] text-fg">Check your inbox</h1>
      <p className="m-0 mb-2 text-sm leading-relaxed text-fg-muted">
        We sent a verification link to
      </p>
      <p className="m-0 mb-7 text-sm font-bold text-fg">{email}</p>

      <Button
        variant="outline"
        block
        className="mb-6 tracking-[0.1em]"
        disabled={cooldown > 0 || resending || !emailParam}
        onClick={handleResend}
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
      </Button>

      {resendError && (
        <p role="alert" className="m-0 mb-4 text-[12.5px] leading-relaxed text-fg-muted">
          {resendError}
        </p>
      )}

      <p className="m-0 mb-5 text-[12.5px] leading-relaxed text-fg-subtle">
        Can&apos;t find it? Check your spam or promotions folder.
      </p>

      <div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-subtle hover:text-accent-strong"
        >
          <ChevronLeft size={16} strokeWidth={1.8} />
          Back to log in
        </Link>
      </div>
    </AuthSplit>
  );
}

function VerifyEmailRouter() {
  const searchParams = useSearchParams();
  return searchParams.get("verified") === "1" ? (
    <EmailConfirmedCard />
  ) : (
    <VerifyEmailCard />
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={null}>
      <VerifyEmailRouter />
    </React.Suspense>
  );
}
