"use client";

import * as React from "react";
import Image from "next/image";
import { CircleAlert, CircleCheck, ScanLine, Search, ShieldAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { today } from "@/lib/availability";
import {
  RECEPTION_CLOSE_MATCHES,
  checkInReceptionBooking,
  fetchReceptionTodaySummary,
  lookupReceptionBooking,
  reportReceptionNoShow,
  type ReceptionBooking,
  type ReceptionTodaySummary,
} from "@/lib/reception";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 5.2 — Lounge Check-In Process. DESIGN-SYSTEM.md §5 patrón 12,
 * consola de recepción (tema oscuro). `Reception.dc.html` (reserva válida) y
 * `CheckInError.dc.html` (número no encontrado) son la misma pantalla:
 * escanear o teclear un LP# y mirar el resultado.
 *
 * Backend real (Supabase local): RPC "de kiosco" (`src/lib/reception.ts`,
 * sin login de personal ni de miembro — ver `supabase/schemas/bookings.sql`
 * y `docs/design/COMPONENT-MAP.md` "Backend real — Epic 5"). `THE_AINSWORTH`
 * sigue fijo como el lounge de esta consola, igual que el resto del
 * proyecto fija literalmente The Ainsworth donde no hay todavía un login de
 * partner que lo resuelva (Story 7.1).
 *
 * Costura declarada en pantalla (Fase 6): la lista diaria de invitados y las
 * notificaciones en tiempo real son la Story 7.1 del Partner Dashboard.
 */
const THE_AINSWORTH = "the-ainsworth";

export default function ReceptionPage() {
  const [code, setCode] = React.useState("");
  const [booking, setBooking] = React.useState<ReceptionBooking | null>(null);
  const [lookedUpCode, setLookedUpCode] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<ReceptionTodaySummary>({ expected: 0, checkedIn: 0 });
  const supabase = React.useMemo(() => createClient(), []);

  const mounted = React.useRef(false);

  const refreshSummary = React.useCallback(() => {
    fetchReceptionTodaySummary(supabase, THE_AINSWORTH, today()).then((next) => {
      if (mounted.current) setSummary(next);
    });
  }, [supabase]);

  React.useEffect(() => {
    mounted.current = true;
    refreshSummary();
    return () => {
      mounted.current = false;
    };
  }, [refreshSummary]);

  async function lookUp() {
    const found = await lookupReceptionBooking(supabase, THE_AINSWORTH, today(), code);
    setBooking(found);
    setLookedUpCode(code);
  }

  async function handleCheckIn() {
    if (!booking) return;
    await checkInReceptionBooking(supabase, THE_AINSWORTH, today(), booking.reference);
    const refreshed = await lookupReceptionBooking(supabase, THE_AINSWORTH, today(), booking.reference);
    setBooking(refreshed);
    refreshSummary();
  }

  async function handleNoShow() {
    if (!booking) return;
    await reportReceptionNoShow(supabase, THE_AINSWORTH, today(), booking.reference);
    const refreshed = await lookupReceptionBooking(supabase, THE_AINSWORTH, today(), booking.reference);
    setBooking(refreshed);
    refreshSummary();
  }

  return (
    <div data-theme="dark" className="surface-night dot-pattern relative flex min-h-screen flex-col">
      <div className="relative flex h-18 shrink-0 items-center gap-4.5 border-b border-line bg-[rgba(21,17,13,0.72)] px-8">
        <Image src="/logo.png" alt="En Soleil" width={34} height={36} className="h-auto w-8.5" />
        <span aria-hidden className="h-6.5 w-px bg-line" />
        <div>
          <h2 className="m-0 text-lg text-fg">The Ainsworth · Reception</h2>
        </div>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-2 rounded-pill border border-line px-3.5 py-2">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          <span className="text-xs font-bold text-fg-muted">
            {summary.expected} expected today · {summary.checkedIn} checked in
          </span>
        </span>
      </div>

      <div className="relative flex flex-1 justify-center px-10 py-8">
        <div className="w-full max-w-[900px]">
          <div className="flex gap-3">
            <div
              className={cn(
                "flex h-16 flex-1 items-center gap-3.5 rounded-2xl border-[1.5px] bg-panel-black px-5",
                booking
                  ? "border-accent shadow-ring"
                  : "border-dashed border-fg-subtle",
              )}
            >
              <ScanLine size={22} strokeWidth={1.7} className={booking ? "text-accent" : "text-fg-subtle"} aria-hidden />
              <label htmlFor="reception-lookup" className="sr-only">
                Confirmation number
              </label>
              <input
                id="reception-lookup"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") lookUp();
                }}
                className="flex-1 bg-transparent text-lg font-bold tracking-[0.08em] text-fg outline-none placeholder:text-fg-subtle"
                placeholder="LP-000000"
              />
              {booking ? (
                <span className="shrink-0 text-[11.5px] text-fg-subtle">Arrival {booking.arrivalTime}</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-pill border border-fg-subtle px-3 py-1.5">
                  <span aria-hidden className="size-1.5 rounded-full bg-fg-subtle" />
                  <span className="text-[11.5px] font-bold text-fg-muted">Not recognised</span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={lookUp}
              className={cn(buttonVariants({ size: "lg", variant: booking ? "primary" : "ghost" }), "px-7")}
            >
              {booking ? "Look up" : "Try again"}
            </button>
          </div>
          <p className="m-0 mt-2.5 text-xs text-fg-subtle">
            Scan the member&apos;s pass, type the LP number, or search by name or email.
          </p>

          {booking ? (
            <ValidResult booking={booking} onCheckIn={handleCheckIn} onNoShow={handleNoShow} />
          ) : (
            lookedUpCode !== null && <ErrorResult code={lookedUpCode} />
          )}

          <p className="m-0 mt-4.5 flex items-center gap-2.5 text-xs text-fg-subtle">
            {booking
              ? "Checking in updates the member's app straight away. The full daily guest list lives in the Partner Dashboard."
              : "Nothing is changed on the member's side until a booking is opened and checked in."}
          </p>
        </div>
      </div>
    </div>
  );
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

function ValidResult({
  booking,
  onCheckIn,
  onNoShow,
}: {
  booking: ReceptionBooking;
  onCheckIn: () => void;
  onNoShow: () => void;
}) {
  const firstName = booking.memberName.split(" ")[0];
  const checkedIn = booking.status === "in_progress" || booking.status === "completed";
  const reportedNoShow = booking.noShow;

  return (
    <div className="mt-5.5 rounded-[20px] border border-line bg-dark-card p-6.5">
      <div className="flex items-center gap-4 border-b border-line pb-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xl font-bold text-on-accent">
          {initialsOf(booking.memberName)}
        </span>
        <div className="flex-1">
          <h2 className="m-0 text-2xl text-fg">{booking.memberName}</h2>
          <p className="m-0 mt-1.5 text-[12.5px] text-fg-subtle">{booking.memberEmail}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-pill border border-accent bg-[rgba(201,168,118,0.18)] px-4 py-2.5">
          <CircleCheck size={16} strokeWidth={2} className="text-accent" aria-hidden />
          <span className="text-[12.5px] font-bold text-fg">Valid booking</span>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4.5 py-5">
        <ReceptionField label="Reference" value={booking.reference} />
        <ReceptionField label="Arrival" value={booking.arrivalTime} />
        <ReceptionField label="Status" value={checkedIn ? "Checked in" : reportedNoShow ? "No-show" : "Confirmed"} />
        {booking.checkedInAt && <ReceptionField label="Checked in at" value={booking.checkedInAt} />}
      </div>

      <div className="flex gap-3.5">
        <div className="flex-1 rounded-[14px] border border-line bg-panel-black p-4">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">
            Special requests
          </p>
          <p className="m-0 mt-2 text-[13px] leading-normal text-fg-muted">
            {booking.specialRequests || "None"}
          </p>
        </div>
        <div className="flex-1 rounded-[14px] border border-dashed border-gold-600 bg-panel-black p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
              Emergency contact
            </p>
          </div>
          <p className="m-0 mt-2 text-[13px] font-bold text-fg">
            {booking.emergencyContact ?? "Not on file"}
          </p>
          <p className="m-0 mt-1 text-[11.5px] leading-normal text-fg-subtle">
            Shown to reception during the visit only. Every access is logged.
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          disabled={checkedIn || reportedNoShow}
          onClick={onCheckIn}
          className={cn(buttonVariants({ size: "lg" }), "flex-1 disabled:opacity-70")}
        >
          {checkedIn ? "Checked in ✓" : `Check in ${firstName}`}
        </button>
        <button
          type="button"
          disabled={checkedIn || reportedNoShow}
          onClick={onNoShow}
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "w-[200px]")}
        >
          {reportedNoShow ? "Marked no-show" : "Mark no-show"}
        </button>
        <button type="button" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "w-[190px]")}>
          Report issue
        </button>
      </div>
    </div>
  );
}

function ErrorResult({ code }: { code: string }) {
  return (
    <div className="mt-5.5 rounded-[20px] border border-line bg-dark-card p-6.5">
      <div className="flex items-center gap-4 border-b border-line pb-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-dashed border-fg-subtle bg-panel-black">
          <CircleAlert size={26} strokeWidth={1.7} className="text-fg-muted" aria-hidden />
        </span>
        <div className="flex-1">
          <h2 className="m-0 text-2xl text-fg">No booking matches this code</h2>
          <p className="m-0 mt-1.5 text-[12.5px] text-fg-subtle">
            Nothing at The Ainsworth today carries the reference {code.trim().toUpperCase()}.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-pill border border-fg-subtle px-4 py-2.5">
          <span className="text-[12.5px] font-bold text-fg-muted">Check-in blocked</span>
        </span>
      </div>

      <p className="m-0 mb-3 mt-5 text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">
        Most likely reasons
      </p>
      <div className="grid grid-cols-3 gap-3">
        <ReasonCard title="Wrong day" text="The pass belongs to another date or another lounge." />
        <ReasonCard
          title="Already used"
          text="The booking was checked in earlier, or its window has closed."
        />
        <ReasonCard title="Cancelled" text="The member cancelled and the reference was released." />
      </div>

      <p className="m-0 mb-2.5 mt-5.5 text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">
        Close matches for today
      </p>
      <div className="flex flex-col gap-2.5">
        {RECEPTION_CLOSE_MATCHES.map((match) => (
          <div
            key={match.reference}
            className="flex items-center gap-3.5 rounded-[14px] border border-line bg-panel-black px-4 py-3.5"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[12.5px] font-bold text-on-accent">
              {match.memberInitials}
            </span>
            <div className="flex-1">
              <p className="m-0 text-[13px] font-bold text-fg">
                {match.memberName} · {match.reference}
              </p>
              <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{match.note}</p>
            </div>
            <button type="button" className={cn(buttonVariants({ variant: "ghost", size: "md" }))}>
              Open
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        <button type="button" className={cn(buttonVariants({ size: "lg" }), "flex-1")}>
          <Search size={17} strokeWidth={1.9} aria-hidden />
          Search by name or email
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "w-[340px] border-accent text-accent")}
        >
          Support · (555) 018-4420
        </button>
      </div>
    </div>
  );
}

function ReasonCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-panel-black p-3.5">
      <p className="m-0 text-[13px] font-bold text-fg">{title}</p>
      <p className="m-0 mt-1.5 text-[11.5px] leading-normal text-fg-subtle">{text}</p>
    </div>
  );
}

function ReceptionField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      <p className="m-0 mt-1.5 text-sm font-bold text-fg">{value}</p>
    </div>
  );
}
