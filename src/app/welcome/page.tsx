import Link from "next/link";

import { FullBleedSuccess } from "@/components/patterns/full-bleed-success";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

/**
 * Story 1.1 — "User receives welcome email with app download links".
 * Artboard: docs/design/epic-1-onboarding/Welcome.dc.html
 * Patrón 2 del DESIGN-SYSTEM (full-bleed de confirmación).
 */

function AppStoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.7 12.4c0-2.7 2.2-4 2.3-4.1-1.3-1.9-3.2-2.1-3.9-2.2-1.7-.2-3.2 1-4.1 1-.9 0-2.2-1-3.6-1-1.8 0-3.5 1.1-4.5 2.7-1.9 3.3-.5 8.2 1.4 10.9.9 1.3 2 2.8 3.5 2.7 1.4-.1 1.9-.9 3.6-.9s2.1.9 3.6.9c1.5 0 2.4-1.3 3.3-2.7.7-1 1.2-2 1.5-3.1-3.6-.1-4.1-2.9-4.1-3.2Z" />
      <path d="M13.9 4.4c.7-.9 1.2-2.1 1.1-3.4-1.1.1-2.4.7-3.2 1.6-.7.8-1.3 2-1.1 3.2 1.3.1 2.5-.6 3.2-1.4Z" />
    </svg>
  );
}

function GooglePlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 3.5v17l9-8.5-9-8.5Z" />
      <path d="m14 12 3.2-2.2 3.3 1.9c.7.4.7 1.4 0 1.8l-3.3 1.9L14 12Z" />
      <path d="M13.2 11.2 4.6 3.1c.2-.1.5-.1.7 0l10 5.7-2.1 2.4Z" />
      <path d="M13.2 12.8 4.6 20.9c.2.1.5.1.7 0l10-5.7-2.1-2.4Z" />
    </svg>
  );
}

const STORES = [
  { name: "App Store", href: "#", Icon: AppStoreIcon },
  { name: "Google Play", href: "#", Icon: GooglePlayIcon },
];

export default function WelcomePage() {
  return (
    <FullBleedSuccess
      title="Welcome to En Soleil"
      description="Your account is ready. We've sent you a welcome email with the app download links."
    >
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "primary", size: "lg" }),
          "mt-9 h-[54px] w-[280px] hover:text-on-accent",
        )}
      >
        Go to my account
      </Link>

      <Eyebrow muted className="mb-3.5 mt-10">
        Download the app
      </Eyebrow>

      <div className="flex gap-3">
        {STORES.map(({ name, href, Icon }) => (
          <a
            key={name}
            href={href}
            className="inline-flex items-center gap-2.5 rounded-nav border border-line px-[18px] py-2.5 text-[13px] font-semibold text-fg hover:text-accent-strong"
          >
            <Icon />
            {name}
          </a>
        ))}
      </div>
    </FullBleedSuccess>
  );
}
