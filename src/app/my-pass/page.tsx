"use client";

import * as React from "react";
import Link from "next/link";
import { CircleAlert, Compass, Plus } from "lucide-react";

import { toneOf } from "@/components/lounges/lounge-thumb";
import { QrCode } from "@/components/ui/qr-code";
import { StatusChip } from "@/components/ui/status-chip";
import { Notice } from "@/components/ui/notice";
import { AppShell } from "@/components/patterns/app-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  LAST_90_DAYS_SUMMARY,
  PAST_BOOKINGS,
  UPCOMING_BOOKINGS,
  VISITS_THIS_MONTH,
  AINSWORTH_PASS,
} from "@/lib/passes";
import { cn } from "@/lib/utils";

/**
 * Story 5.1 — "Information available from My Bookings section" y Story 5.2 —
 * "No-show tracking for booking history". `MyBookings.dc.html` (Upcoming) y
 * `NoShow.dc.html` (Past), estados de la misma pantalla con pestañas.
 */
type Tab = "upcoming" | "past";

export default function MyPassPage() {
  const [tab, setTab] = React.useState<Tab>("upcoming");

  return (
    <AppShell padded={false}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-8">
          <span className="text-[13.5px] font-bold text-fg">My Pass</span>
          <div className="flex-1" />
          <Link href="/explore" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
            <Plus size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
            Book a visit
          </Link>
        </div>

        <div className="flex flex-1 gap-7 overflow-y-auto px-10 pb-7.5 pt-8">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-[34px] text-fg">My Pass</h1>
            <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
              Every booking you make lives here, with the confirmation number reception asks for.
            </p>

            <div role="tablist" aria-label="My Pass" className="mt-5.5 flex gap-6.5 border-b border-line">
              <TabButton label="Upcoming" count={UPCOMING_BOOKINGS.length} active={tab === "upcoming"} onClick={() => setTab("upcoming")} />
              <TabButton label="Past" count={14} active={tab === "past"} onClick={() => setTab("past")} />
            </div>

            {tab === "upcoming" ? <UpcomingList /> : <PastList />}
          </div>

          <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
            {tab === "upcoming" ? <UpcomingRail /> : <PastRail />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "border-b-2 pb-3 text-[13.5px] transition-colors duration-150",
        active ? "border-accent font-bold text-fg" : "border-transparent font-semibold text-fg-subtle",
      )}
    >
      {label} <span className={active ? "text-gold-600" : undefined}>{count}</span>
    </button>
  );
}

function UpcomingList() {
  const [next, ...rest] = UPCOMING_BOOKINGS;

  return (
    <>
      <div className="mt-5 flex gap-4.5 rounded-content border-[1.5px] border-accent bg-surface p-5 shadow-content">
        <span aria-hidden data-tone={toneOf(next.loungeName)} className="lounge-hero size-22 shrink-0 rounded-[14px]" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-gold-600">
              Next visit · in 2 days
            </span>
            <StatusChip available>{next.statusLabel}</StatusChip>
          </div>
          <h2 className="mt-2 text-[22px] text-fg">{next.loungeName}</h2>
          <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">{next.dateTimeLabel}</p>
          {next.addressLine && <p className="m-0 mt-0.5 text-[12.5px] text-fg-subtle">{next.addressLine}</p>}

          <div className="mt-4 flex gap-2.5">
            {next.passHref && (
              <Link href={next.passHref} className={cn(buttonVariants({ size: "md" }))}>
                View pass
              </Link>
            )}
            <button type="button" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
              Directions
            </button>
          </div>
        </div>

        <div className="relative w-[158px] shrink-0 rounded-[14px] px-3.5 pb-3 pt-3.5 text-center surface-night dot-pattern" data-theme="dark">
          <p className="relative m-0 text-[9.5px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
            Confirmation
          </p>
          <h3 className="relative mt-1 font-display text-[19px] text-fg">{AINSWORTH_PASS.reference}</h3>
          <div className="relative mt-2.5 rounded-[9px] bg-white p-1.5">
            <QrCode size={102} className="mx-auto" />
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-3">
        {rest.map((booking) => (
          <div
            key={booking.dateTimeLabel}
            className="flex items-center gap-4.5 rounded-content border border-line bg-surface p-4.5 shadow-content"
          >
            <span aria-hidden data-tone={toneOf(booking.loungeName)} className="lounge-hero size-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-lg text-fg">{booking.loungeName}</h3>
              <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">{booking.dateTimeLabel}</p>
            </div>
            {booking.status === "confirmed" ? (
              <StatusChip available>{booking.statusLabel}</StatusChip>
            ) : (
              <StatusChip available={false} dashed={false}>
                {booking.statusLabel}
              </StatusChip>
            )}
            <button type="button" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
              {booking.status === "waitlisted" ? "Manage" : "View pass"}
            </button>
          </div>
        ))}
      </div>

      <p className="m-0 mt-4.5 flex items-center gap-2 text-xs text-fg-subtle">
        A pass stays here until its booking window closes, then it moves to Past.
      </p>
    </>
  );
}

function PastList() {
  return (
    <div className="mt-5 flex flex-col gap-3">
      {PAST_BOOKINGS.map((booking) =>
        booking.outcome === "no-show" ? (
          <div
            key={booking.reference}
            className="rounded-content border-[1.5px] border-fg-subtle bg-surface p-5 pb-5 shadow-content"
          >
            <div className="flex items-center gap-4.5">
              <span aria-hidden data-tone={toneOf(booking.loungeName)} className="lounge-hero size-14 shrink-0 rounded-xl opacity-55" />
              <div className="min-w-0 flex-1">
                <h3 className="m-0 text-lg text-fg">{booking.loungeName}</h3>
                <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">{booking.dateTimeLabel}</p>
              </div>
              <StatusChip available={false} dashed>
                No-show
              </StatusChip>
            </div>

            <Notice tone="muted" icon={<CircleAlert size={18} strokeWidth={1.8} />} className="mt-4">
              <p className="m-0">{booking.explanation}</p>
            </Notice>

            <div className="mt-3.5 flex gap-2.5">
              <button type="button" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
                I was there — contact support
              </button>
              <button type="button" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
                View receipt
              </button>
            </div>
          </div>
        ) : (
          <div
            key={booking.reference}
            className="flex items-center gap-4 rounded-content border border-line bg-surface p-4 shadow-content"
          >
            <span aria-hidden data-tone={toneOf(booking.loungeName)} className="lounge-hero size-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-lg text-fg">{booking.loungeName}</h3>
              <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">{booking.dateTimeLabel} · {booking.reference}</p>
            </div>
            <StatusChip available>Attended</StatusChip>
            <button type="button" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
              Receipt
            </button>
          </div>
        ),
      )}
    </div>
  );
}

function UpcomingRail() {
  const progress = Array.from({ length: VISITS_THIS_MONTH.included }, (_, index) => index < VISITS_THIS_MONTH.used);

  return (
    <>
      <div className="rounded-content border border-line bg-surface p-5 shadow-content">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Your reference</p>
        <h2 className="mt-2.5 font-display text-[27px] text-fg">{AINSWORTH_PASS.reference}</h2>
        <p className="m-0 mt-2 text-[12.5px] leading-normal text-fg-muted">
          Reception can find your booking with this number alone. Scanning the code is only a shortcut.
        </p>
        <div className="my-4 h-px bg-line" />
        <div className="flex flex-col gap-2.5">
          <RailRow label="Member" value="Alexandra Rivas" />
          <RailRow label="Duration" value={`Up to ${AINSWORTH_PASS.stayHours} hours`} />
          <RailRow label="Window closes" value={AINSWORTH_PASS.windowCloseTime} />
        </div>
      </div>

      <div className="rounded-content border border-line bg-surface p-5 shadow-content">
        <div className="flex items-baseline justify-between">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
            Visits this month
          </p>
          <span className="text-[13px] font-bold text-fg">
            {VISITS_THIS_MONTH.used} of {VISITS_THIS_MONTH.included}
          </span>
        </div>
        <div className="mt-3.5 flex gap-1.5">
          {progress.map((used, index) => (
            <span key={index} className={cn("h-1 flex-1 rounded-full", used ? "bg-accent" : "bg-line")} />
          ))}
        </div>
        <p className="m-0 mt-3 text-[11.5px] leading-normal text-fg-subtle">
          Included in your annual membership. Extra visits are billed as a day pass.
        </p>
      </div>

      <SupportRow />
    </>
  );
}

function PastRail() {
  return (
    <>
      <div className="rounded-content border border-line bg-surface p-5 shadow-content">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Last 90 days</p>
        <div className="mt-4 flex flex-col gap-3.5">
          <RailStat label="Visits attended" value={LAST_90_DAYS_SUMMARY.attended} />
          <RailStat label="No-shows" value={LAST_90_DAYS_SUMMARY.noShows} />
          <RailStat label="Cancelled in time" value={LAST_90_DAYS_SUMMARY.cancelledInTime} />
        </div>
      </div>

      <div className="rounded-content border border-line bg-surface p-5 shadow-content">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Why we track this</p>
        <p className="m-0 mt-2.5 text-[12.5px] leading-relaxed text-fg-muted">
          Lounges hold a seat for every booking. Repeated no-shows may limit same-day booking, so
          cancel as soon as your plans change — it takes one tap in My Pass.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-4">
        <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
          <Compass size={17} strokeWidth={1.7} className="text-gold-600" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="m-0 text-[13px] font-bold text-fg">Cancellation policy</p>
          <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">Free up to 24 hours before arrival</p>
        </div>
      </div>
    </>
  );
}

function SupportRow() {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-4">
      <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
        <CircleAlert size={17} strokeWidth={1.7} className="text-gold-600" aria-hidden />
      </span>
      <div className="flex-1">
        <p className="m-0 text-[13px] font-bold text-fg">Something wrong with a booking?</p>
        <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">Member support answers in under 5 minutes</p>
      </div>
    </div>
  );
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px] text-fg-muted">{label}</span>
      <span className="text-[12.5px] font-bold text-fg">{value}</span>
    </div>
  );
}

function RailStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-[13px] text-fg-muted">{label}</span>
      <span className="text-base font-extrabold text-fg">{value}</span>
    </div>
  );
}
