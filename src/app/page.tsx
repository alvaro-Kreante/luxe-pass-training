import Link from "next/link";

import { AppShell } from "@/components/patterns/app-shell";
import { FeaturedLoungeCard } from "@/components/lounges/featured-lounge-card";
import { featuredLounges } from "@/lib/lounges";
import { SAMPLE_MEMBER } from "@/lib/member";

/**
 * Home del área de miembro.
 * Artboard: docs/design/epic-1-onboarding/Home.dc.html (App shell, patrón 3).
 */
export default function HomePage() {
  const [firstName] = SAMPLE_MEMBER.name.split(" ");

  return (
    <AppShell>
      <h1 className="mb-2 text-[32px] text-fg">Hello, {firstName}</h1>
      <p className="mb-11 text-[15px] text-fg-muted">
        Discover your next exclusive escape.
      </p>

      <div className="mb-5.5 flex items-center justify-between">
        <h2 className="text-[22px] text-fg">Featured lounges</h2>
        <Link href="/explore" className="text-[13px] font-bold">
          View all →
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featuredLounges().map((lounge, index) => (
          <FeaturedLoungeCard
            key={lounge.id}
            lounge={lounge}
            tone={((index % 3) + 1) as 1 | 2 | 3}
          />
        ))}
      </div>
    </AppShell>
  );
}
