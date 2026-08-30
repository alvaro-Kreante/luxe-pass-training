"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Clock, Mail } from "lucide-react";

import { AuthSplit } from "@/components/patterns/auth-split";
import { Button } from "@/components/ui/button";

/**
 * Story 1.1 — "Email verification required before account activation".
 * Artboard: docs/design/epic-1-onboarding/Verification.dc.html
 */

const RESEND_COOLDOWN_SECONDS = 30;

function VerifyEmailCard() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "your email address";

  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return (
    <AuthSplit tagline="Join a community of discerning travelers." centered>
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
        disabled={cooldown > 0}
        onClick={() => setCooldown(RESEND_COOLDOWN_SECONDS)}
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
      </Button>

      <p className="m-0 mb-5 text-[12.5px] leading-relaxed text-fg-subtle">
        Can&apos;t find it? Check your spam or promotions folder.
      </p>

      {/* Sin backend, el enlace del correo no puede volver a la app: este paso
          continúa el alta manualmente. Cuando exista la API de verificación,
          este botón desaparece y entra la ruta /verify-email/[token]. */}
      <Link
        href="/onboarding/basics"
        className="mb-5 inline-block text-[13px] font-bold"
      >
        I have verified my email
      </Link>

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

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={null}>
      <VerifyEmailCard />
    </React.Suspense>
  );
}
