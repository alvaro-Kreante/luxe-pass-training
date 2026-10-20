"use client";

import * as React from "react";
import Link from "next/link";
import { CircleAlert, Mail } from "lucide-react";

import { toneOf } from "@/components/lounges/lounge-thumb";
import { CancelBookingModal } from "@/components/passes/cancel-booking-modal";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { StatusChip } from "@/components/ui/status-chip";
import { today } from "@/lib/availability";
import {
  cancelBooking,
  fetchPastBookings,
  type MyPassData,
  type PastBooking,
  type PastBookingOutcome,
  type UpcomingBooking,
} from "@/lib/passes";
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
 * Story 5.1 / 6.1 — la parte interactiva de `/my-pass`: pestañas Upcoming /
 * Past, cancelar (con su modal) y dejar la waitlist, y el filtro del
 * historial. Arranca con los datos del servidor (PERF-02); los paneles
 * laterales llegan ya renderizados y aquí solo se elige cuál se ve.
 */
type Tab = "upcoming" | "past";

export function MyPassBookings({
  upcoming: initialUpcoming,
  past: initialPast,
  visits,
  intro,
  upcomingRail,
  pastRail,
}: Pick<MyPassData, "upcoming" | "past" | "visits"> & {
  intro: React.ReactNode;
  upcomingRail: React.ReactNode;
  pastRail: React.ReactNode;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [tab, setTab] = React.useState<Tab>("upcoming");
  const [upcoming, setUpcoming] = React.useState(initialUpcoming);
  const [past, setPast] = React.useState(initialPast);
  const [cancelTarget, setCancelTarget] = React.useState<UpcomingBooking | null>(null);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  /** AC "Modification options: Cancel" — también cierra una reserva en waitlist ("Leave"). */
  async function cancelAndRefresh(booking: UpcomingBooking) {
    setCancelError(null);
    try {
      await cancelBooking(supabase, booking.id, today());
      setUpcoming((current) => current.filter((item) => item.id !== booking.id));
      setPast(await fetchPastBookings(supabase));
    } catch {
      setCancelError("Something went wrong cancelling this booking. Try again in a moment.");
    }
  }

  return (
    <div className="flex flex-1 gap-7 overflow-y-auto px-10 pb-7.5 pt-8">
      <div className="min-w-0 flex-1">
        {intro}

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
        {tab === "upcoming" ? upcomingRail : pastRail}
      </div>

      {cancelTarget && (
        <CancelBookingModal
          open
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null);
          }}
          booking={cancelTarget}
          visits={visits}
          onConfirmCancel={async () => {
            await cancelAndRefresh(cancelTarget);
            setCancelTarget(null);
          }}
        />
      )}
    </div>
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
              <p className="m-0 mt-0.5 text-[12.5px] text-fg-subtle">
                {[booking.partnerName, booking.addressLine].filter(Boolean).join(" · ")}
              </p>
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
