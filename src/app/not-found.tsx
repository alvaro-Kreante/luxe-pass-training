import type { Metadata } from "next";
import Link from "next/link";

import { AuthSplit } from "@/components/patterns/auth-split";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * 404 global — rutas desconocidas y llamadas a notFound().
 * Artboard: docs/design/epic-1-onboarding/NotFound.dc.html (patrón 1).
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <AuthSplit tagline="Every journey has a detour worth taking." centered>
      <Eyebrow className="mb-3.5 tracking-[0.16em]">Error 404</Eyebrow>

      <h1 className="mb-2 text-[28px] text-fg">This page has moved on</h1>
      <p className="m-0 mb-8 text-sm leading-[1.55] text-fg-muted">
        The link may be outdated or the address mistyped. Let us take you
        somewhere more comfortable.
      </p>

      <Link href="/" className={buttonVariants({ block: true })}>
        Back to home
      </Link>

      <p className="m-0 mt-[22px] text-[13px] text-fg-muted">
        Not a member yet?{" "}
        <Link href="/signup" className="font-bold text-accent-strong hover:text-fg">
          Join LuxePass
        </Link>
      </p>
    </AuthSplit>
  );
}
