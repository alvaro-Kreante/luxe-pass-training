import { Check, Clock, Download, PhoneCall, X } from "lucide-react";

import { BOOKING_RECORD_SUMMARY } from "@/lib/passes";
import { cn } from "@/lib/utils";

/**
 * Story 5.1 / 6.1 — los paneles laterales de `/my-pass` (`Main.dc.html` y
 * `History.dc.html` de la Fase 7). Sin estado: se renderizan en el servidor y
 * `MyPassBookings` elige cuál mostrar según la pestaña (PERF-02).
 */
export function UpcomingRail({ visits }: { visits: { used: number; included: number } }) {
  const { used, included } = visits;
  const progress = Array.from({ length: included }, (_, index) => index < used);

  return (
    <>
      <div className="rounded-content border border-line bg-surface p-5 shadow-content">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Cancellation policy</p>
        <div className="mt-3.5 flex flex-col gap-3">
          <PolicyRow
            icon={<Check size={13} strokeWidth={2} className="text-gold-600" aria-hidden />}
            label="More than 24 hours ahead"
            detail="Free. Returns to your monthly allowance."
          />
          <PolicyRow
            icon={<Clock size={13} strokeWidth={1.8} className="text-gold-600" aria-hidden />}
            label="Within 24 hours"
            detail="Flat $35.00 late cancellation fee."
          />
          <PolicyRow
            icon={<X size={13} strokeWidth={2} className="text-gold-600" aria-hidden />}
            label="No-show"
            detail="The same $35.00 fee, recorded on your account."
          />
        </div>
      </div>

      <div className="rounded-content border border-line bg-surface p-5 shadow-content">
        <div className="flex items-baseline justify-between">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Visits this month</p>
          <span className="text-[13px] font-bold text-fg">
            {used} of {included}
          </span>
        </div>
        <div className="mt-3.5 flex gap-1.5">
          {progress.map((used, index) => (
            <span key={index} className={cn("h-1 flex-1 rounded-full", used ? "bg-accent" : "bg-line")} />
          ))}
        </div>
        <p className="m-0 mt-3 text-[11.5px] leading-normal text-fg-subtle">
          A cancelled visit comes back to this count when you cancel in time.
        </p>
      </div>

      <SupportRow label="Something wrong with a booking?" detail="Member support answers in under 5 minutes" />
    </>
  );
}

export function PastRail({ memberSince }: { memberSince: string | null }) {
  return (
    <>
      <div className="rounded-content border border-line bg-surface p-5 shadow-content">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Your record</p>
        <h2 className="mt-2.5 font-display text-[27px] text-fg">{BOOKING_RECORD_SUMMARY.totalVisits} visits</h2>
        {memberSince ? (
          <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">Since you joined in {memberSince}</p>
        ) : null}
        <div className="my-4 h-px bg-line" />
        <div className="flex flex-col gap-2.5">
          <RailStat label="Completed" value={BOOKING_RECORD_SUMMARY.completed} />
          <RailStat label="Cancelled in time" value={BOOKING_RECORD_SUMMARY.cancelledInTime} />
          <RailStat label="No-shows" value={BOOKING_RECORD_SUMMARY.noShows} />
          <RailStat label="Fees charged" value={BOOKING_RECORD_SUMMARY.feesCharged} />
        </div>
        <p className="m-0 mt-3.5 text-[11.5px] leading-normal text-fg-subtle">
          Three no-shows in twelve months pauses new bookings for 30 days. You have{" "}
          {BOOKING_RECORD_SUMMARY.noShows === 1 ? "one" : BOOKING_RECORD_SUMMARY.noShows}.
        </p>
      </div>

      <SupportRow label="Disagree with a fee or a no-show?" detail="Member support can review and refund it" />

      <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-4">
        <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
          <Download size={17} strokeWidth={1.7} className="text-gold-600" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="m-0 text-[13px] font-bold text-fg">Download your booking history</p>
          <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">CSV, all {BOOKING_RECORD_SUMMARY.totalVisits} visits</p>
        </div>
      </div>
    </>
  );
}

function SupportRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-4">
      <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
        <PhoneCall size={17} strokeWidth={1.7} className="text-gold-600" aria-hidden />
      </span>
      <div className="flex-1">
        <p className="m-0 text-[13px] font-bold text-fg">{label}</p>
        <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{detail}</p>
      </div>
    </div>
  );
}

function PolicyRow({ icon, label, detail }: { icon: React.ReactNode; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[9px] bg-accent-soft">
        {icon}
      </span>
      <p className="m-0 flex-1 text-[12.5px] leading-[1.5] text-fg-muted">
        <strong className="text-fg">{label}</strong> — {detail}
      </p>
    </div>
  );
}

function RailStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-[13px] text-fg-muted">{label}</span>
      <span className="text-base font-extrabold text-fg">{value}</span>
    </div>
  );
}
