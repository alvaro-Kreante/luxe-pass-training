"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CircleAlert, Clock, Download, Mail, PhoneCall, Plus, X } from "lucide-react";

import { NotificationBellMenu } from "@/components/account/notification-bell-menu";
import { RequireSession } from "@/components/onboarding/require-session";
import { toneOf } from "@/components/lounges/lounge-thumb";
import { CancelBookingModal } from "@/components/passes/cancel-booking-modal";
import { StatusChip } from "@/components/ui/status-chip";
import { Notice } from "@/components/ui/notice";
import { AppShell } from "@/components/patterns/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { TODAY } from "@/lib/availability";
import {
  BOOKING_RECORD_SUMMARY,
  VISITS_THIS_MONTH,
  cancelBooking,
  fetchPastBookings,
  fetchUpcomingBookings,
  type PastBooking,
  type PastBookingOutcome,
  type UpcomingBooking,
} from "@/lib/passes";
import { MEMBERSHIP_SUMMARY } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * `View pass`/`Cancel`/`Directions`/`Leave`/`Email receipt`/`Dispute`/`Book
 * again`/`Book a visit` son botones de 38–40px en los artboards de la Fase 7,
 * sin `text-transform: uppercase` — a diferencia de los botones grandes de
 * los modales (52px), que sí lo llevan. `buttonVariants` aplica mayúsculas a
 * todos sus tamaños por defecto, así que estos anulan esa base.
 */
const ROW_BUTTON = cn(buttonVariants({ variant: "secondary", size: "md" }), "normal-case");

/**
 * Story 5.1 (Digital Pass Generation) — "Information available from My
 * Bookings section", extendida por la Story 6.1 (Booking Management).
 * `Main.dc.html` (Upcoming) y `History.dc.html` (Past) de la Fase 7
 * reemplazan a `MyBookings.dc.html` / `NoShow.dc.html` de la Fase 6 en esta
 * misma pantalla — ver la desviación anotada en COMPONENT-MAP.md.
 */
type Tab = "upcoming" | "past";

export default function MyPassPage() {
  return (
    <RequireSession>
      <MyPassScreen />
    </RequireSession>
  );
}

function MyPassScreen() {
  const supabase = React.useMemo(() => createClient(), []);
  const [tab, setTab] = React.useState<Tab>("upcoming");
  const [upcoming, setUpcoming] = React.useState<UpcomingBooking[]>([]);
  const [past, setPast] = React.useState<PastBooking[]>([]);
  const [cancelTarget, setCancelTarget] = React.useState<UpcomingBooking | null>(null);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    Promise.all([fetchUpcomingBookings(supabase), fetchPastBookings(supabase)]).then(
      ([upcomingBookings, pastBookings]) => {
        if (!active) return;
        setUpcoming(upcomingBookings);
        setPast(pastBookings);
      },
    );

    return () => {
      active = false;
    };
  }, [supabase]);

  function removeUpcoming(id: string) {
    setUpcoming((current) => current.filter((booking) => booking.id !== id));
  }

  /** AC "Modification options: Cancel" — también cierra una reserva en waitlist ("Leave"). */
  async function cancelAndRefresh(booking: UpcomingBooking) {
    setCancelError(null);
    try {
      await cancelBooking(supabase, booking.id, TODAY);
      removeUpcoming(booking.id);
      setPast(await fetchPastBookings(supabase));
    } catch {
      setCancelError("Something went wrong cancelling this booking. Try again in a moment.");
    }
  }

  return (
    <AppShell padded={false}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-8">
          <span className="text-[13.5px] font-bold text-fg">My Pass</span>
          <div className="flex-1" />
          <NotificationBellMenu />
          <Link href="/explore" className={ROW_BUTTON}>
            <Plus size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
            Book a visit
          </Link>
        </div>

        <div className="flex flex-1 gap-7 overflow-y-auto px-10 pb-7.5 pt-8">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-[34px] text-fg">My bookings</h1>
            <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
              Every visit you have booked, what it is doing right now, and how to change it.
            </p>

            <div role="tablist" aria-label="My Pass" className="mt-5.5 flex gap-6.5 border-b border-line">
              <TabButton
                label="Upcoming"
                count={upcoming.length}
                active={tab === "upcoming"}
                onClick={() => setTab("upcoming")}
              />
              <TabButton
                label="Past"
                count={past.length}
                active={tab === "past"}
                onClick={() => setTab("past")}
              />
            </div>

            {cancelError && (
              <Notice tone="attention" icon={<CircleAlert size={18} strokeWidth={1.8} />} className="mt-4">
                <p className="m-0">{cancelError}</p>
              </Notice>
            )}

            {tab === "upcoming" ? (
              <UpcomingList
                bookings={upcoming}
                onRequestCancel={setCancelTarget}
                onLeaveWaitlist={cancelAndRefresh}
              />
            ) : (
              <PastList bookings={past} />
            )}
          </div>

          <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
            {tab === "upcoming" ? <UpcomingRail /> : <PastRail />}
          </div>
        </div>
      </div>

      {cancelTarget && (
        <CancelBookingModal
          open
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null);
          }}
          booking={cancelTarget}
          onConfirmCancel={async () => {
            await cancelAndRefresh(cancelTarget);
            setCancelTarget(null);
          }}
        />
      )}
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

function UpcomingList({
  bookings,
  onRequestCancel,
  onLeaveWaitlist,
}: {
  bookings: UpcomingBooking[];
  onRequestCancel: (booking: UpcomingBooking) => void;
  onLeaveWaitlist: (booking: UpcomingBooking) => void;
}) {
  return (
    <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
      {bookings.map((booking) => (
        <li
          key={booking.id}
          className={cn(
            "flex items-center gap-4.5 rounded-content border bg-surface p-4.5 shadow-content",
            booking.status === "in-progress" ? "border-[1.5px] border-accent" : "border-line",
          )}
        >
          <span aria-hidden data-tone={toneOf(booking.loungeName)} className="lounge-hero size-16 shrink-0 rounded-xl" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="m-0 text-lg text-fg">{booking.loungeName}</h2>
              <StatusChip
                available={booking.status === "confirmed"}
                emphasis={booking.status === "in-progress"}
              >
                {booking.statusLabel}
              </StatusChip>
            </div>
            <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">{booking.dateTimeLabel}</p>
            {booking.addressLine && (
              <p className="m-0 mt-0.5 text-[12.5px] text-fg-subtle">{booking.addressLine}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-col justify-center gap-2">
            {booking.status === "waitlisted" ? (
              <button
                type="button"
                onClick={() => onLeaveWaitlist(booking)}
                className={ROW_BUTTON}
              >
                Leave
              </button>
            ) : (
              <>
                {booking.passHref ? (
                  <Link href={booking.passHref} className={ROW_BUTTON}>
                    View pass
                  </Link>
                ) : (
                  <button type="button" className={ROW_BUTTON}>
                    View pass
                  </button>
                )}
                {booking.status === "in-progress" ? (
                  <button type="button" className={ROW_BUTTON}>
                    Directions
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRequestCancel(booking)}
                    className={ROW_BUTTON}
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

const PAST_FILTERS: { value: PastBookingOutcome | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no-show", label: "No-show" },
];

function PastList({ bookings }: { bookings: PastBooking[] }) {
  const [filter, setFilter] = React.useState<PastBookingOutcome | "all">("all");
  const visible = bookings.filter((booking) => filter === "all" || booking.outcome === filter);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {PAST_FILTERS.map(({ value, label }) => {
          const count = value === "all" ? bookings.length : bookings.filter((b) => b.outcome === value).length;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-pill px-4 py-2 text-[12.5px] font-semibold transition-colors duration-150",
                filter === value ? "bg-accent text-on-accent" : "border border-line text-fg-muted hover:border-accent",
              )}
            >
              {label} {count}
            </button>
          );
        })}
      </div>

      <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
        {visible.map((booking) => (
          <li
            key={booking.reference}
            className={cn(
              "rounded-content border bg-surface p-4.5 shadow-content",
              booking.outcome === "cancelled" && "border-dashed bg-surface-sunken shadow-none",
              booking.outcome !== "cancelled" && "border-line",
            )}
          >
            <div className="flex items-center gap-4.5">
              <span
                aria-hidden
                data-tone={toneOf(booking.loungeName)}
                className={cn("lounge-hero size-14 shrink-0 rounded-xl", booking.outcome !== "completed" && "opacity-55")}
              />
              <div className="min-w-0 flex-1">
                <h3 className="m-0 text-lg text-fg">{booking.loungeName}</h3>
                <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">
                  {booking.dateTimeLabel} · {booking.reference}
                </p>
              </div>
              <StatusChip
                available={false}
                dashed={booking.outcome !== "completed"}
                dot={booking.outcome !== "cancelled"}
              >
                {booking.outcome === "completed" ? "Completed" : booking.outcome === "no-show" ? "No-show" : "Cancelled"}
              </StatusChip>
              <button type="button" className={ROW_BUTTON}>
                {booking.outcome === "completed" ? "Email receipt" : booking.outcome === "no-show" ? "Dispute" : "Book again"}
              </button>
            </div>

            {booking.explanation && (
              <Notice tone="muted" icon={<CircleAlert size={18} strokeWidth={1.8} />} className="mt-3.5">
                <p className="m-0">{booking.explanation}</p>
              </Notice>
            )}
          </li>
        ))}
      </ul>

      <p className="m-0 mt-3.5 flex items-center gap-2 text-xs text-fg-subtle">
        <Mail size={15} strokeWidth={1.8} aria-hidden />
        Every booking is confirmed by email with its number. Send any of them again from here.
      </p>
    </>
  );
}

function UpcomingRail() {
  const progress = Array.from({ length: VISITS_THIS_MONTH.included }, (_, index) => index < VISITS_THIS_MONTH.used);

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
            {VISITS_THIS_MONTH.used} of {VISITS_THIS_MONTH.included}
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

function PastRail() {
  return (
    <>
      <div className="rounded-content border border-line bg-surface p-5 shadow-content">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Your record</p>
        <h2 className="mt-2.5 font-display text-[27px] text-fg">{BOOKING_RECORD_SUMMARY.totalVisits} visits</h2>
        <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">
          Since you joined in {MEMBERSHIP_SUMMARY.memberSince}
        </p>
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
