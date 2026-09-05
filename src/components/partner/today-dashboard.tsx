"use client";

import * as React from "react";
import Link from "next/link";
import { Printer, Search, Sparkles } from "lucide-react";

import { PartnerShell, LiveStatusChip, PartnerRefreshButton } from "@/components/patterns/partner-shell";
import { ActivityPanel } from "@/components/partner/activity-panel";
import { GuestDetailDrawer } from "@/components/partner/guest-detail-drawer";
import { GuestListTable } from "@/components/partner/guest-list-table";
import { ExportGuestListPopover } from "@/components/partner/export-guest-list-popover";
import { NoShowModal } from "@/components/partner/no-show-modal";
import { Toast } from "@/components/ui/toast";
import {
  CANCELLATION_ACTIVITY,
  PARTNER_ACTIVITY,
  PARTNER_GUESTS,
  PARTNER_VENUE,
  WAITLIST_PROMOTION_ACTIVITY,
  LIVE_BOOKING,
  LIVE_BOOKING_ACTIVITY,
  applyCancellationAndPromotion,
  applyLiveBooking,
  findPartnerGuest,
  guestCounts,
  markArrived,
  matchesGuestQuery,
  reportNoShow,
  type NoShowReason,
  type PartnerActivityItem,
  type PartnerGuest,
} from "@/lib/partner";

/**
 * Story 7.1 — Daily Guest Management (`Main.dc.html`). Story 7.2 —
 * "real-time updates" y sus alertas (`LiveUpdate.dc.html`,
 * `EmailNewBooking.dc.html`, `EmailCancellation.dc.html`). Sin backend, la
 * llegada de una reserva nueva y la cancelación+promoción de la waitlist son
 * temporizadores deterministas, no eventos aleatorios — mismo criterio que
 * el chequeo de disponibilidad del Epic 4.
 *
 * Vive fuera de `app/partner/page.tsx` porque un archivo de ruta del App
 * Router solo puede exportar `default` (y unos pocos nombres reservados como
 * `metadata`) — cualquier otro named export, como `TodayDashboard` para los
 * tests, rompe el chequeo de tipos de rutas de `next build`.
 */
export const DEFAULT_LIVE_BOOKING_DELAY_MS = 6000;
export const DEFAULT_CANCELLATION_DELAY_MS = 8000;

type ToastState = { title: string; body: string } | null;

/**
 * Los tiempos de espera son props (con los valores por defecto de arriba)
 * para que la suite de tests pueda acortarlos y esperar con temporizadores
 * reales — mezclar fake timers con el scheduler de React bajo jsdom se
 * cuelga, porque jsdom implementa `requestAnimationFrame` sobre `setTimeout`.
 */
export function TodayDashboard({
  liveBookingDelayMs = DEFAULT_LIVE_BOOKING_DELAY_MS,
  cancellationDelayMs = DEFAULT_CANCELLATION_DELAY_MS,
}: {
  liveBookingDelayMs?: number;
  cancellationDelayMs?: number;
}) {
  const [guests, setGuests] = React.useState<PartnerGuest[]>(PARTNER_GUESTS);
  const [activity, setActivity] = React.useState<PartnerActivityItem[]>(PARTNER_ACTIVITY);
  const [query, setQuery] = React.useState("");
  const [clockLabel, setClockLabel] = React.useState("3:38 PM");
  const [detailGuestId, setDetailGuestId] = React.useState<string | null>(null);
  const [noShowGuestId, setNoShowGuestId] = React.useState<string | null>(null);
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<ToastState>(null);

  React.useEffect(() => {
    const liveBookingTimer = setTimeout(() => {
      setGuests((current) => applyLiveBooking(current));
      setActivity((current) => [LIVE_BOOKING_ACTIVITY, ...current]);
      setHighlightedId(LIVE_BOOKING.id);
      setClockLabel("3:41 PM");
      setToast({
        title: "New booking just came in",
        body: `${LIVE_BOOKING.name} · ${LIVE_BOOKING.arrivalTime} tonight · ${LIVE_BOOKING.id}`,
      });
    }, liveBookingDelayMs);

    const cancellationTimer = setTimeout(() => {
      setGuests((current) => applyCancellationAndPromotion(current));
      setActivity((current) => [WAITLIST_PROMOTION_ACTIVITY, CANCELLATION_ACTIVITY, ...current]);
      setClockLabel("3:54 PM");
    }, liveBookingDelayMs + cancellationDelayMs);

    return () => {
      clearTimeout(liveBookingTimer);
      clearTimeout(cancellationTimer);
    };
  }, [liveBookingDelayMs, cancellationDelayMs]);

  const filtered = guests.filter((guest) => matchesGuestQuery(guest, query));
  const counts = guestCounts(guests);
  const detailGuest = detailGuestId ? findPartnerGuest(guests, detailGuestId) : undefined;
  const noShowGuest = noShowGuestId ? findPartnerGuest(guests, noShowGuestId) : undefined;
  const blurred = Boolean(detailGuest) || Boolean(noShowGuest);

  function handleMarkArrived(id: string) {
    setGuests((current) => markArrived(current, id));
    setDetailGuestId(null);
  }

  function handleReportNoShow(id: string, reason: NoShowReason) {
    setGuests((current) => reportNoShow(current, id, reason));
    setNoShowGuestId(null);
    setDetailGuestId(null);
  }

  return (
    <>
      <PartnerShell
        blurred={blurred}
        topbarLabel="Today"
        topbarMeta={`· ${PARTNER_VENUE.dateLabel} · ${clockLabel}`}
        topbarRight={
          <div className="flex items-center gap-2.5">
            <LiveStatusChip label="Live · updated just now" />
            <ActivityPanel
              items={activity}
              onMarkAllRead={() => setActivity((current) => current.map((item) => ({ ...item, read: true })))}
              onMarkRead={(id) =>
                setActivity((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
              }
            />
            <PartnerRefreshButton />
          </div>
        }
      >
        <div className="flex items-center gap-6">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              {PARTNER_VENUE.name} · {PARTNER_VENUE.dateLabel} ·{" "}
              <Link href="/partner/emails/digest" className="normal-case text-accent-strong">
                view this morning&apos;s digest
              </Link>
            </p>
            <h1 className="mt-2 text-[34px] text-fg">Today&apos;s guests</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-[250px] items-center gap-2.5 rounded-[11px] border border-line bg-panel-black px-4">
              <Search size={17} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
              <label htmlFor="guest-search" className="sr-only">
                Search by name or LP number
              </label>
              <input
                id="guest-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or LP number"
                className="flex-1 bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-subtle"
              />
            </div>

            <span className="flex h-11 shrink-0 items-center gap-2 rounded-[11px] border-[1.5px] border-line px-4.5 text-[13.5px] font-semibold text-fg">
              Sep 14
            </span>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-11 shrink-0 items-center gap-2.5 rounded-[11px] border-[1.5px] border-line px-4.5 text-[12.5px] font-bold tracking-[0.06em] text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
            >
              <Printer size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
              Print list
            </button>

            <ExportGuestListPopover guests={filtered} />
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <SummaryChip label={`${counts.expected} expected today`} tone="active" />
          <SummaryChip label={`${counts.arrived} checked in`} />
          <SummaryChip label={`${counts.pending} still to arrive`} />
          <SummaryChip label={`${counts.noShow} no-show`} tone="dashed" />
        </div>

        <div className="mt-5">
          <GuestListTable
            guests={filtered}
            highlightedId={highlightedId}
            onMarkArrived={handleMarkArrived}
            onOpenDetail={setDetailGuestId}
          />
        </div>

        <p className="m-0 mt-3.5 text-xs leading-[1.5] text-fg-subtle">
          Tick the box the moment a guest walks in — the member sees the check-in in their app
          straight away. A cross marks a reported no-show. The list refreshes on its own every 30
          seconds.
        </p>
      </PartnerShell>

      {detailGuest ? (
        <GuestDetailDrawer
          open
          onOpenChange={(open) => !open && setDetailGuestId(null)}
          guest={detailGuest}
          onMarkArrived={handleMarkArrived}
          onReportNoShow={(id) => {
            setNoShowGuestId(id);
          }}
        />
      ) : null}

      {noShowGuest ? (
        <NoShowModal
          open
          onOpenChange={(open) => !open && setNoShowGuestId(null)}
          guest={noShowGuest}
          onConfirm={handleReportNoShow}
        />
      ) : null}

      {toast ? (
        <Toast
          icon={<Sparkles size={18} strokeWidth={1.8} className="text-accent" aria-hidden />}
          title={toast.title}
          body={toast.body}
          primaryLabel="Open guest"
          onPrimary={() => {
            setDetailGuestId(LIVE_BOOKING.id);
            setToast(null);
          }}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </>
  );
}

function SummaryChip({ label, tone }: { label: string; tone?: "active" | "dashed" }) {
  return (
    <span
      className={
        tone === "active"
          ? "inline-flex items-center gap-1.5 rounded-pill border border-accent bg-[rgba(201,168,118,0.18)] px-3 py-1.5 text-[11.5px] font-bold text-fg"
          : tone === "dashed"
            ? "inline-flex items-center gap-1.5 rounded-pill border border-dashed border-fg-subtle px-3 py-1.5 text-[11.5px] font-bold text-fg-subtle"
            : "inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-[11.5px] font-bold text-fg-muted"
      }
    >
      <span
        aria-hidden
        className={
          tone === "active" ? "size-1.5 rounded-full bg-accent" : "size-1.5 rounded-full bg-fg-subtle"
        }
      />
      {label}
    </span>
  );
}
