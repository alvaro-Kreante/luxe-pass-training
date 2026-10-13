"use client";

import * as React from "react";
import { BriefcaseBusiness, ChevronRight, Info, Search } from "lucide-react";

import { AdminShell } from "@/components/patterns/admin-shell";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { BookingOverrideDrawer } from "@/components/admin/booking-override-drawer";
import { DayStepper } from "@/components/patterns/day-stepper";
import { LoungeCombobox } from "@/components/admin/lounge-combobox";
import { StatusFilter } from "@/components/admin/status-filter";
import { Select } from "@/components/ui/select";
import { StatusChip } from "@/components/ui/status-chip";
import { getTicketCounts, type TicketCounts } from "@/lib/admin";
import {
  BOOKING_STATES,
  bandOccupancy,
  countByState,
  fetchBookingsLounges,
  fetchBookingsOn,
  filterBookings,
  groupByArrival,
  type BookingState,
  type BookingsLounge,
  type NetworkBooking,
} from "@/lib/admin-bookings";
import { parseDate, today } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 8.4 — Bookings Overview. Artboard:
 * docs/design/epic-8-admin-support/Bookings.dc.html.
 *
 * Backend real: `admin_bookings_on` (`supabase/schemas/support_tickets.sql`)
 * trae el día entero de la red; lounge, estado y búsqueda filtran en cliente.
 * Abrir una reserva reutiliza el drawer de la Story 8.1
 * (`BookingOverrideDrawer`), que también corrige el status (Story 8.4).
 */
export default function AdminBookingsPage() {
  return (
    <RequireAdminSession>
      <BookingsScreen />
    </RequireAdminSession>
  );
}

const GRID = "grid-cols-[1fr_112px_170px_128px_24px]";

function dayLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
    parseDate(iso),
  );
}

function BookingsScreen() {
  const supabase = React.useMemo(() => createClient(), []);
  const [date, setDate] = React.useState(() => today());
  const [bookings, setBookings] = React.useState<NetworkBooking[]>([]);
  const [lounges, setLounges] = React.useState<BookingsLounge[]>([]);
  const [loungeId, setLoungeId] = React.useState<string | null>(null);
  const [partnerId, setPartnerId] = React.useState<string | null>(null);
  const [state, setState] = React.useState<BookingState | null>(null);
  const [query, setQuery] = React.useState("");
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);
  const [opened, setOpened] = React.useState<NetworkBooking | null>(null);
  const [notice, setNotice] = React.useState("");

  const load = React.useCallback(
    async (day: string) => {
      const rows = await fetchBookingsOn(supabase, day);
      setBookings(rows);
    },
    [supabase],
  );

  React.useEffect(() => {
    let active = true;
    fetchBookingsOn(supabase, date).then((rows) => {
      if (active) setBookings(rows);
    });
    return () => {
      active = false;
    };
  }, [supabase, date]);

  React.useEffect(() => {
    let active = true;
    fetchBookingsLounges(supabase).then((rows) => {
      if (active) setLounges(rows);
    });
    getTicketCounts(supabase).then((row) => {
      if (active) setCounts(row);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const partners = Array.from(
    new Map(lounges.filter((l) => l.partnerId).map((l) => [l.partnerId!, l.partnerName ?? ""])),
    ([id, name]) => ({ id, name }),
  ).sort((a, b) => a.name.localeCompare(b.name));
  const partnerLounges = partnerId ? lounges.filter((l) => l.partnerId === partnerId) : lounges;
  const loungeIds = loungeId
    ? new Set([loungeId])
    : partnerId
      ? new Set(partnerLounges.map((l) => l.id))
      : null;
  const inLounge = filterBookings(bookings, { loungeIds, state: null, query: "" });
  const stateCounts = countByState(inLounge);
  const visible = filterBookings(inLounge, { loungeIds: null, state, query });
  const groups = groupByArrival(visible);
  const lounge = lounges.find((l) => l.id === loungeId) ?? null;
  const occupancy = lounge ? bandOccupancy(bookings, lounge) : [];
  const byLounge = Object.values(
    inLounge.reduce<Record<string, { name: string; count: number }>>((acc, b) => {
      acc[b.loungeId] ??= { name: b.loungeName, count: 0 };
      acc[b.loungeId].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  return (
    <AdminShell
      topbarLabel={<span className="text-[13.5px] font-bold text-fg">Bookings</span>}
      topbarMeta={`· Network · ${dayLabel(date)}`}
      supportBadge={counts?.open}
    >
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {bookings.length} {bookings.length === 1 ? "booking" : "bookings"} · {byLounge.length}{" "}
            {byLounge.length === 1 ? "lounge" : "lounges"}
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Who is coming</h1>
        </div>
        <div className="flex-1" />
        <DayStepper value={date} todayIso={today()} onChange={setDate} />
      </div>

      <div className="mt-4.5 flex flex-wrap items-center gap-2.5">
        <label className="flex h-11 min-w-60 flex-1 items-center gap-2.5 rounded-xl border-[1.5px] border-line bg-panel-black px-4">
          <Search size={17} strokeWidth={1.8} className="text-accent" aria-hidden />
          <input
            type="search"
            role="searchbox"
            aria-label="Member name or LP reference"
            placeholder="Member name or LP reference"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-[13px] font-bold text-fg placeholder:font-medium placeholder:text-fg-subtle focus:outline-none"
          />
        </label>
        <div className="w-52">
          <Select
            aria-label="Partner"
            inputSize="compact"
            icon={<BriefcaseBusiness size={16} strokeWidth={1.7} className="text-accent" />}
            value={partnerId ?? ""}
            onChange={(event) => {
              const next = event.target.value || null;
              setPartnerId(next);
              if (next && loungeId && !lounges.some((l) => l.id === loungeId && l.partnerId === next)) setLoungeId(null);
            }}
          >
            <option value="">All partners</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <LoungeCombobox lounges={partnerLounges} value={loungeId} onChange={setLoungeId} />
        </div>
        <span className="mx-1 h-6.5 w-px bg-line" />
        <StatusFilter label="All" count={inLounge.length} pressed={state === null} onToggle={() => setState(null)} />
        {BOOKING_STATES.map((s) => (
          <StatusFilter
            key={s.id}
            label={s.label}
            count={stateCounts[s.id]}
            pressed={state === s.id}
            onToggle={() => setState((current) => (current === s.id ? null : s.id))}
          />
        ))}
      </div>

      {notice ? (
        <p role="status" className="m-0 mt-3.5 flex items-start gap-2.5 text-[12.5px] font-bold text-accent-strong">
          <Info size={15} strokeWidth={1.8} className="mt-px shrink-0" aria-hidden />
          {notice}
        </p>
      ) : null}

      <div className="mt-4 flex min-h-0 flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-content border border-line bg-dark-card">
          <div className="min-w-[640px]">
            <div className={cn("grid h-10 items-center gap-3.5 border-b border-line px-5.5", GRID)}>
              <Th>Member</Th>
              <Th>Reference</Th>
              <Th>Lounge</Th>
              <Th>Status</Th>
              <span />
            </div>

            {groups.length === 0 ? (
              <p className="m-0 px-5.5 py-8 text-center text-[13px] text-fg-muted">No bookings match this day and filters.</p>
            ) : (
              groups.map((group) => (
                <div key={group.time} role="group" aria-label={group.time}>
                  <div className="flex h-11.5 items-center gap-3.5 border-b border-line bg-panel-black/55 px-5.5">
                    <p className="m-0 min-w-21 font-display text-[17px] text-fg">{group.time}</p>
                    <p className="m-0 text-xs text-fg-subtle">
                      <span className="font-bold text-fg">{group.bookings.length}</span>{" "}
                      {group.bookings.length === 1 ? "booking" : "bookings"}
                    </p>
                  </div>
                  {group.bookings.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} onOpen={() => setOpened(booking)} />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3.5 lg:w-[300px]">
          {occupancy.length > 0 ? (
            <RailCard title="Seats by band">
              {occupancy.map((o) => (
                <RailStat key={o.band} label={`${o.label} · ${o.taken} of ${o.capacity}`} value={o.taken >= o.capacity ? "full" : `${o.capacity - o.taken} left`} />
              ))}
            </RailCard>
          ) : null}

          <RailCard title="This day">
            <RailStat label="Expected" value={String(inLounge.length - stateCounts.cancelled)} big />
            <RailStat label="Checked in" value={String(stateCounts["checked-in"])} big />
            <RailStat label="No-shows" value={String(stateCounts["no-show"])} big />
            <RailStat label="Cancelled" value={String(stateCounts.cancelled)} big />
          </RailCard>

          {!lounge && byLounge.length > 0 ? (
            <RailCard title="By lounge">
              {byLounge.map((l) => (
                <RailStat key={l.name} label={l.name} value={`${l.count} ${l.count === 1 ? "booking" : "bookings"}`} />
              ))}
            </RailCard>
          ) : null}

          <p className="m-0 flex items-start gap-2.5 px-1 text-xs text-fg-subtle">
            <Info size={15} strokeWidth={1.8} className="mt-px shrink-0" aria-hidden />
            Open a booking to reschedule it, cancel it or correct its status. A no-show marked here records no fee.
          </p>
        </div>
      </div>

      {opened ? (
        <BookingOverrideDrawer
          open
          onOpenChange={(open) => {
            if (!open) setOpened(null);
          }}
          memberName={opened.memberName}
          booking={{
            lounge: opened.loungeName,
            area: opened.loungeArea,
            detail: `${dayLabel(opened.date)} · arrive ${opened.slotTime}`,
            reference: opened.reference,
            bookingId: opened.id,
            loungeId: opened.loungeId,
            date: opened.date,
            band: opened.band,
            slotTime: opened.slotTime,
          }}
          status={opened.state}
          onApply={() => load(date)}
          onMissing={async () => {
            setNotice(`${opened.reference} no longer exists — the list was refreshed.`);
            await load(date);
          }}
        />
      ) : null}
    </AdminShell>
  );
}

const STATE_LABEL: Record<BookingState, string> = {
  confirmed: "Confirmed",
  "checked-in": "Checked in",
  "no-show": "No-show",
  cancelled: "Cancelled",
};

function BookingRow({ booking, onOpen }: { booking: NetworkBooking; onOpen: () => void }) {
  const cancelled = booking.state === "cancelled";
  const initials = booking.memberName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <button
      type="button"
      data-booking-row
      aria-label={`Open ${booking.reference} · ${booking.memberName}`}
      onClick={onOpen}
      className={cn(
        "grid min-h-14 w-full cursor-pointer items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-surface-hover",
        GRID,
      )}
    >
      <span className="flex min-w-0 items-center gap-2.75">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold",
            cancelled ? "bg-accent-soft text-fg-muted" : "bg-accent text-on-accent",
          )}
        >
          {initials}
        </span>
        <span className="min-w-0">
          <span className={cn("block truncate text-[13.5px] font-bold", cancelled ? "text-fg-muted" : "text-fg")}>
            {booking.memberName}
          </span>
          <span className="mt-0.5 block text-[11.5px] text-fg-subtle">{booking.isDayPass ? "Day pass" : "Membership"}</span>
        </span>
      </span>
      <span className={cn("text-[12.5px] font-bold tracking-[0.02em]", cancelled ? "text-fg-subtle" : "text-fg")}>
        {booking.reference}
      </span>
      <span className={cn("truncate text-[12.5px]", cancelled ? "text-fg-subtle" : "text-fg-muted")}>{booking.loungeName}</span>
      <span>
        <StatusChip
          available={booking.state === "checked-in"}
          outlined={booking.state === "checked-in"}
          dashed={booking.state === "no-show"}
          className={cn(cancelled && "line-through")}
        >
          {STATE_LABEL[booking.state]}
        </StatusChip>
      </span>
      <ChevronRight size={16} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{children}</p>;
}

function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-content border border-line bg-dark-card px-5.5 pb-2 pt-4.5">
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{title}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function RailStat({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[rgba(58,50,42,0.6)] py-2.75 last:border-b-0">
      <span className="text-[12.5px] text-fg-muted">{label}</span>
      <span className={big ? "font-display text-xl text-fg" : "text-xs text-fg-subtle"}>{value}</span>
    </div>
  );
}
