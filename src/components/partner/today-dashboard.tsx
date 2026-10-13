"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Printer, Search, Sparkles } from "lucide-react";

import { DayStepper } from "@/components/patterns/day-stepper";
import { PartnerShell, LiveStatusChip, PartnerRefreshButton } from "@/components/patterns/partner-shell";
import { ActivityPanel } from "@/components/partner/activity-panel";
import { GuestDetailDrawer } from "@/components/partner/guest-detail-drawer";
import { GuestListTable } from "@/components/partner/guest-list-table";
import { ExportGuestListPopover } from "@/components/partner/export-guest-list-popover";
import { NoShowModal } from "@/components/partner/no-show-modal";
import { usePartnerContext } from "@/components/partner/partner-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { today } from "@/lib/availability";
import {
  findPartnerGuest,
  formatLongWeekdayDate,
  guestCounts,
  mapGuestRow,
  matchesGuestQuery,
  type NoShowReason,
  type PartnerActivityItem,
  type PartnerGuestRow,
} from "@/lib/partner";

/**
 * Story 7.1 — Daily Guest Management (`Main.dc.html`). Story 7.2 —
 * "real-time updates" (`LiveUpdate.dc.html`) y "cancellation notifications"
 * (`EmailCancellation.dc.html`). Backend real (22 sept 2026, ver CLAUDE.md
 * §Alcance): `partner_guest_list`/`partner_checkin_booking`/
 * `partner_report_no_show` (`supabase/schemas/bookings.sql`) + una
 * suscripción de Supabase Realtime sobre `bookings` reemplazan los
 * temporizadores deterministas que simulaban la reserva/cancelación en vivo.
 *
 * El panel de actividad (`ActivityPanel`) es puramente de sesión — no hay
 * tabla `partner_activity` persistida — arranca vacío y se llena con lo que
 * ocurre real de verdad mientras esta pantalla está abierta (nueva reserva
 * por Realtime, cancelación por Realtime, check-in/no-show hechos desde
 * aquí). Documentado como decisión consciente en
 * docs/design/COMPONENT-MAP.md "Backend real — Epic 7".
 *
 * Vive fuera de `app/partner/page.tsx` porque un archivo de ruta del App
 * Router solo puede exportar `default`.
 */
const REFRESH_INTERVAL_MS = 30000;
/** Cuánto dura resaltada + con el chip "New booking" una fila recién llegada por Realtime. */
const NEW_BOOKING_HIGHLIGHT_MS = 15000;

type ToastState = { title: string; body: string } | null;

function nowLabel(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function TodayDashboard() {
  const supabase = React.useMemo(() => createClient(), []);
  // Story 10.6 — siempre un lounge concreto: el elegido en la cabecera.
  const partner = usePartnerContext();
  const loungeId = partner?.context?.selectedLoungeId ?? null;
  const [rows, setRows] = React.useState<PartnerGuestRow[]>([]);
  const [activity, setActivity] = React.useState<PartnerActivityItem[]>([]);
  const [query, setQuery] = React.useState("");
  // Story 7.1 — "Search/filter guests by date": hoy por defecto; otro día es de solo lectura.
  const [date, setDate] = React.useState(() => today());
  const isToday = date === today();
  const [detailGuestId, setDetailGuestId] = React.useState<string | null>(null);
  const [noShowGuestId, setNoShowGuestId] = React.useState<string | null>(null);
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null);
  const [newlyBookedIds, setNewlyBookedIds] = React.useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = React.useState<ToastState>(null);

  const fetchGuestList = React.useCallback(
    async (lounge: string): Promise<PartnerGuestRow[]> => {
      const { data } = await supabase.rpc("partner_guest_list", { p_lounge_id: lounge, p_date: date });
      const nextRows = (data as PartnerGuestRow[] | null) ?? [];
      setRows(nextRows);
      return nextRows;
    },
    [supabase, date],
  );

  React.useEffect(() => {
    if (!loungeId) return;
    let active = true;
    supabase.rpc("partner_guest_list", { p_lounge_id: loungeId, p_date: date }).then(({ data }) => {
      if (active) setRows((data as PartnerGuestRow[] | null) ?? []);
    });
    return () => {
      active = false;
    };
  }, [supabase, loungeId, date]);

  React.useEffect(() => {
    if (!loungeId) return;
    const interval = setInterval(() => fetchGuestList(loungeId), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loungeId, fetchGuestList]);

  React.useEffect(() => {
    if (!loungeId) return;

    const channel = supabase
      .channel(`partner-bookings-${loungeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings", filter: `lounge_id=eq.${loungeId}` },
        async (payload) => {
          const booking = payload.new as {
            id: string;
            date: string;
            status: string;
            slot_time: string;
            confirmation_code: string;
          };
          if (booking.date !== date || booking.status !== "confirmed") return;

          const nextRows = await fetchGuestList(loungeId);
          const guestRow = nextRows.find((row) => row.id === booking.id);
          const guestName = guestRow?.member_name ?? "A guest";

          setNewlyBookedIds((current) => new Set(current).add(booking.id));
          setHighlightedId(booking.confirmation_code);
          setToast({
            title: "New booking just came in",
            body: `${guestName} · ${booking.slot_time} tonight · ${booking.confirmation_code}`,
          });
          setActivity((current) => [
            {
              id: `new-booking-${booking.id}`,
              kind: "new-booking",
              title: "New booking",
              time: nowLabel(),
              body: `${guestName} booked ${booking.slot_time} today · ${booking.confirmation_code}.`,
              read: false,
              emailHref: "/partner/emails/new-booking",
            },
            ...current,
          ]);

          setTimeout(() => {
            setNewlyBookedIds((current) => {
              const next = new Set(current);
              next.delete(booking.id);
              return next;
            });
          }, NEW_BOOKING_HIGHLIGHT_MS);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `lounge_id=eq.${loungeId}` },
        async (payload) => {
          const updated = payload.new as {
            id: string;
            date: string;
            status: string;
            confirmation_code: string;
          };
          const previous = payload.old as { status?: string };
          if (updated.date !== date) return;

          const nextRows = await fetchGuestList(loungeId);

          if (updated.status === "cancelled" && previous.status !== "cancelled") {
            const guestRow = nextRows.find((row) => row.id === updated.id);
            const guestName = guestRow?.member_name ?? "A guest";
            const stillExpected = guestCounts(nextRows.map((row) => mapGuestRow(row))).expected;

            setActivity((current) => [
              {
                id: `cancellation-${updated.id}-${Date.now()}`,
                kind: "cancellation",
                title: "Cancellation",
                time: nowLabel(),
                body: `${guestName} cancelled · ${updated.confirmation_code}. Today's count is now ${stillExpected}.`,
                read: false,
                emailHref: "/partner/emails/cancellation",
              },
              ...current,
            ]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loungeId, date, fetchGuestList]);

  const guests = React.useMemo(
    () => rows.map((row) => mapGuestRow(row, { newlyBooked: newlyBookedIds.has(row.id) })),
    [rows, newlyBookedIds],
  );

  const filtered = guests.filter((guest) => matchesGuestQuery(guest, query));
  const counts = guestCounts(guests);
  const detailGuest = detailGuestId ? findPartnerGuest(guests, detailGuestId) : undefined;
  const noShowGuest = noShowGuestId ? findPartnerGuest(guests, noShowGuestId) : undefined;
  const blurred = Boolean(detailGuest) || Boolean(noShowGuest);

  async function handleMarkArrived(id: string) {
    setDetailGuestId(null);
    const guest = findPartnerGuest(guests, id);
    if (!guest?.bookingId || !loungeId) return;

    const { error } = await supabase.rpc("partner_checkin_booking", { p_booking_id: guest.bookingId });
    if (error) return;

    setActivity((current) => [
      {
        id: `checked-in-${guest.bookingId}-${Date.now()}`,
        kind: "checked-in",
        title: "Checked in",
        time: nowLabel(),
        body: `${guest.name} · ${guest.arrivalTime} arrival.`,
        read: false,
      },
      ...current,
    ]);
    fetchGuestList(loungeId);
  }

  async function handleReportNoShow(id: string, reason: NoShowReason) {
    setNoShowGuestId(null);
    setDetailGuestId(null);
    const guest = findPartnerGuest(guests, id);
    if (!guest?.bookingId || !loungeId) return;

    const { error } = await supabase.rpc("partner_report_no_show", {
      p_booking_id: guest.bookingId,
      p_reason: reason,
    });
    if (error) return;

    setActivity((current) => [
      {
        id: `no-show-${guest.bookingId}-${Date.now()}`,
        kind: "no-show",
        title: "No-show recorded",
        time: nowLabel(),
        body: `${guest.name} · ${guest.arrivalTime} arrival.`,
        read: false,
      },
      ...current,
    ]);
    fetchGuestList(loungeId);
  }

  if (partner?.context && partner.context.lounges.length === 0) {
    return (
      <PartnerShell topbarLabel="Today" topbarMeta={`· ${formatLongWeekdayDate(today())}`}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <EmptyState
            icon={Building2}
            title="No lounges yet"
            description={`En Soleil is setting up your lounges. As soon as the first one is linked to ${partner.context.partner.name}, its guests show up here.`}
            width={520}
          />
        </div>
      </PartnerShell>
    );
  }

  return (
    <>
      <PartnerShell
        blurred={blurred}
        topbarLabel="Today"
        topbarMeta={`· ${formatLongWeekdayDate(date)}`}
        topbarRight={
          <div className="flex items-center gap-2.5">
            <LiveStatusChip label="Live" />
            <ActivityPanel
              items={activity}
              onMarkAllRead={() => setActivity((current) => current.map((item) => ({ ...item, read: true })))}
              onMarkRead={(id) =>
                setActivity((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
              }
            />
            <PartnerRefreshButton onClick={() => loungeId && fetchGuestList(loungeId)} />
          </div>
        }
      >
        <div className="flex items-center gap-6">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              {formatLongWeekdayDate(date)}
              {isToday ? (
                <>
                  {" "}·{" "}
                  <Link href="/partner/emails/digest" className="normal-case text-accent-strong">
                    view this morning&apos;s digest
                  </Link>
                </>
              ) : null}
            </p>
            <h1 className="mt-2 text-[34px] text-fg">{isToday ? "Today's guests" : "Guests for this day"}</h1>
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

        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <SummaryChip label={`${counts.expected} expected${isToday ? " today" : ""}`} tone="active" />
          <SummaryChip label={`${counts.arrived} checked in`} />
          <SummaryChip label={`${counts.pending} still to arrive`} />
          <SummaryChip label={`${counts.noShow} no-show`} tone="dashed" />
          <div className="flex-1" />
          <DayStepper value={date} todayIso={today()} onChange={setDate} />
        </div>

        <div className="mt-5">
          <GuestListTable
            guests={filtered}
            highlightedId={highlightedId}
            onMarkArrived={handleMarkArrived}
            onOpenDetail={setDetailGuestId}
            readOnly={!isToday}
          />
        </div>

        <p className="m-0 mt-3.5 text-xs leading-[1.5] text-fg-subtle">
          {isToday
            ? "Tick the box the moment a guest walks in — the member sees the check-in in their app straight away. A cross marks a reported no-show. The list refreshes on its own every 30 seconds."
            : "Another day's list is for reference only — check-ins and no-shows are recorded on the day itself."}
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
          readOnly={!isToday}
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
            if (highlightedId) setDetailGuestId(highlightedId);
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
