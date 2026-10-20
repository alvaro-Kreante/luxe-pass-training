import Link from "next/link";
import { Plus } from "lucide-react";

import { NotificationBellMenu } from "@/components/account/notification-bell-menu";
import { MyPassBookings } from "@/components/passes/my-pass-bookings";
import { PastRail, UpcomingRail } from "@/components/passes/my-pass-rails";
import { AppShell } from "@/components/patterns/app-shell";
import { buttonVariants } from "@/components/ui/button";
import type { MyPassData } from "@/lib/passes";
import { cn } from "@/lib/utils";

/**
 * Story 5.1 (Digital Pass Generation) — "Information available from My
 * Bookings section", extendida por la Story 6.1 (Booking Management).
 * `Main.dc.html` (Upcoming) y `History.dc.html` (Past) de la Fase 7
 * reemplazan a `MyBookings.dc.html` / `NoShow.dc.html` de la Fase 6 en esta
 * misma pantalla — ver la desviación anotada en COMPONENT-MAP.md.
 *
 * PERF-02 — se renderiza en el servidor con los datos de `loadMyPass`; solo
 * `MyPassBookings` (pestañas, listas y cancelar) y la campana son cliente.
 */
export function MyPassView({ upcoming, past, visits, memberSince }: MyPassData) {
  return (
    <AppShell padded={false}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-8">
          <span className="text-[13.5px] font-bold text-fg">My Pass</span>
          <div className="flex-1" />
          <NotificationBellMenu />
          <Link href="/explore" className={cn(buttonVariants({ variant: "secondary", size: "md" }), "normal-case")}>
            <Plus size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
            Book a visit
          </Link>
        </div>

        <MyPassBookings
          upcoming={upcoming}
          past={past}
          visits={visits}
          intro={
            <>
              <h1 className="m-0 text-[34px] text-fg">My bookings</h1>
              <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
                Every visit you have booked, what it is doing right now, and how to change it.
              </p>
            </>
          }
          upcomingRail={<UpcomingRail visits={visits} />}
          pastRail={<PastRail memberSince={memberSince} />}
        />
      </div>
    </AppShell>
  );
}
