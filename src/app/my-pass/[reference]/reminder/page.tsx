"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { QrCode } from "@/components/ui/qr-code";
import { buttonVariants } from "@/components/ui/button";
import { RequireSession } from "@/components/onboarding/require-session";
import { fetchDigitalPass, type DigitalPass } from "@/lib/passes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 5.3 — Booking Reminder Notification, "24 hrs before the booking
 * time" (`Reminder.dc.html`). DESIGN-SYSTEM.md §5 patrón 20 — email de
 * marca, sin App shell, igual que `Receipt.dc.html`. Esta pantalla sigue
 * siendo visual (el email real ya lo manda `send-booking-reminder` vía
 * pg_cron, ver `supabase/schemas/booking_reminders.sql`) — pinta la
 * reserva real, igual que `Receipt.dc.html` pinta el pago real de la
 * Story 4.2.
 */
export default function ReminderPage() {
  return (
    <RequireSession>
      <ReminderScreen />
    </RequireSession>
  );
}

function ReminderScreen() {
  const router = useRouter();
  const { reference } = useParams<{ reference: string }>();
  const [pass, setPass] = React.useState<DigitalPass | null | undefined>(undefined);

  React.useEffect(() => {
    let active = true;
    const supabase = createClient();

    fetchDigitalPass(supabase, reference).then((found) => {
      if (active) setPass(found);
    });

    return () => {
      active = false;
    };
  }, [reference]);

  React.useEffect(() => {
    if (pass === null) router.replace("/my-pass");
  }, [pass, router]);

  if (!pass) return null;

  return (
    <div className="surface-blush flex min-h-screen items-start justify-center px-6 py-8">
      <div className="w-full max-w-[660px] overflow-hidden rounded-[20px] border border-line bg-surface shadow-panel">
        <div className="border-b border-line px-6.5 py-4.5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[13px] font-bold text-on-accent">
              ES
            </span>
            <div className="flex-1">
              <p className="m-0 text-[13.5px] font-bold text-fg">
                En Soleil · LuxePass{" "}
                <span className="font-medium text-fg-subtle">&lt;bookings@luxepass.co&gt;</span>
              </p>
              <p className="m-0 mt-0.5 text-xs text-fg-subtle">to {pass.memberEmail}</p>
            </div>
            <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-fg">
              Reminder
            </span>
          </div>
          <p className="m-0 mt-3.5 text-[15px] font-bold text-fg">
            Tomorrow at {pass.arrivalTime} — your visit at {pass.loungeName}
          </p>
        </div>

        <div data-theme="dark" className="surface-night dot-pattern relative px-8 py-5 text-center">
          <div className="relative">
            <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.16em] text-fg-subtle">
              See you tomorrow
            </p>
            <h2 className="mt-2.5 font-display text-[30px] text-fg">{pass.shortDateLabel}, {pass.arrivalTime}</h2>
          </div>
        </div>

        <div className="px-8 py-5">
          <p className="m-0 text-sm leading-[1.6] text-fg-muted">
            {pass.memberName.split(" ")[0]}, your lounge visit is tomorrow. Nothing to print —
            give the number below at reception, or let them scan the code.
          </p>

          <div className="mt-4 flex gap-4.5 rounded-2xl border border-line bg-blush-2 p-4.5">
            <div className="flex flex-1 flex-col gap-3.5">
              <ReminderField
                label="When"
                value={pass.dateLabel}
                detail={`Arrive ${pass.arrivalTime} · stay up to ${pass.stayHours} hours · doors close for you at ${pass.windowCloseTime}`}
              />
              <ReminderField
                label="Where"
                value={pass.loungeName}
                detail={`${pass.address} · ${pass.receptionNote}`}
              />
              <ReminderField label="Admission" value={`${pass.admission} · ${pass.memberName}`} />
            </div>

            <div className="w-[158px] shrink-0 rounded-2xl border border-line bg-surface p-3.5 text-center">
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                Confirmation
              </p>
              <h3 className="mt-1 font-display text-lg text-fg">{pass.reference}</h3>
              <QrCode size={118} className="mx-auto mt-2.5" />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button type="button" className={cn(buttonVariants({ size: "md" }), "flex-1 cursor-default")}>
              Open my pass
            </button>
            <button type="button" className={cn(buttonVariants({ variant: "secondary", size: "md" }), "flex-1 cursor-default")}>
              Get directions
            </button>
          </div>

          <p className="m-0 mt-4 text-xs leading-[1.55] text-fg-muted">
            Plans changed? Cancel free of charge until{" "}
            <strong className="text-fg">today at {pass.arrivalTime}</strong>. A visit you do not
            attend is recorded as a no-show.
          </p>
        </div>

        <div className="border-t border-line bg-blush-2 px-8 py-3.5 text-center">
          <p className="m-0 text-[11.5px] leading-[1.6] text-fg-subtle">
            En Soleil LuxePass · 445 Park Avenue, New York, NY 10022
            <br />
            <a href="#" className="font-semibold">
              Manage booking
            </a>{" "}
            ·{" "}
            <a href="#" className="font-semibold">
              Contact support
            </a>{" "}
            ·{" "}
            <a href="#" className="font-semibold">
              Email preferences
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function ReminderField({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-subtle">{label}</p>
      <p className="m-0 mt-1 text-[13.5px] font-bold text-fg">{value}</p>
      {detail ? <p className="m-0 mt-0.5 text-xs leading-[1.5] text-fg-muted">{detail}</p> : null}
    </div>
  );
}
