"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, CircleCheck, Clock, FileText, MapPin, Navigation2, PhoneCall, Share2, Star } from "lucide-react";

import { RequireSession } from "@/components/onboarding/require-session";
import { DigitalPassCard } from "@/components/passes/digital-pass-card";
import { AppShell } from "@/components/patterns/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { toneOf } from "@/components/lounges/lounge-thumb";
import { WriteReviewDialog } from "@/components/lounges/write-review-dialog";
import {
  fetchDigitalPass,
  isPassLifecycleState,
  type DigitalPass,
  type PassLifecycleState,
} from "@/lib/passes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 5.1 — el pase digital (`Main.dc.html`) y su expiración automática
 * (`Expired.dc.html`). Story 5.3 enlaza aquí el email de recordatorio.
 * DESIGN-SYSTEM.md §5 patrón 11: cuatro estados de la misma tarjeta.
 *
 * Backend real (Supabase local): `fetchDigitalPass` trae la reserva propia
 * por LP# (RLS ya la limita al miembro con sesión) — ver
 * `docs/design/COMPONENT-MAP.md` "Backend real — Epic 5". Los cuatro
 * estados se siguen alcanzando por `?state=`: no hay cron que mueva una
 * reserva vencida a completed/no-show (esa automatización es Epic 6,
 * desviación ya documentada antes de conectar este módulo), así que el
 * paso del tiempo no los dispara solo — ver cabecera de `src/lib/passes.ts`.
 */
export default function PassDetailPage() {
  return (
    <RequireSession>
      <React.Suspense>
        <PassDetailScreen />
      </React.Suspense>
    </RequireSession>
  );
}

function PassDetailScreen() {
  const router = useRouter();
  const { reference } = useParams<{ reference: string }>();
  const searchParams = useSearchParams();
  const requestedState = searchParams.get("state");
  const state: PassLifecycleState = isPassLifecycleState(requestedState)
    ? requestedState
    : "upcoming";

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
    <AppShell padded={false}>
      <div className="flex h-full flex-col overflow-hidden">
        <Topbar pass={pass} state={state} />

        <div className="flex flex-1 gap-8 overflow-y-auto px-10 pb-7.5 pt-8">
          <div className="min-w-0 flex-1">
            {state === "upcoming" && <UpcomingBody pass={pass} />}
            {state === "today" && <TodayBody pass={pass} />}
            {state === "checked-in" && <CheckedInBody pass={pass} />}
            {state === "expired" && <ExpiredBody pass={pass} />}
          </div>

          <DigitalPassCard pass={pass} state={state} />
        </div>
      </div>
    </AppShell>
  );
}

function Topbar({ pass, state }: { pass: DigitalPass; state: PassLifecycleState }) {
  const crumb =
    state === "today"
      ? `Today · ${pass.reference}`
      : state === "checked-in"
        ? `In the lounge · ${pass.reference}`
        : state === "expired"
          ? "Past visits"
          : pass.reference;

  return (
    <div className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-8">
      <Link href="/my-pass" className="text-[13.5px] text-fg-subtle">
        My Pass
      </Link>
      <ChevronRight size={15} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
      <span className="text-[13.5px] font-bold text-fg">{crumb}</span>
      {state === "expired" && (
        <>
          <ChevronRight size={15} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
          <span className="text-[13.5px] font-bold text-fg">{pass.reference}</span>
        </>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-2.5">
        {state === "upcoming" && (
          <>
            <TopbarAction icon={Navigation2}>Directions</TopbarAction>
            <TopbarAction icon={Share2}>Share</TopbarAction>
          </>
        )}
        {state === "today" && (
          <>
            <TopbarAction icon={PhoneCall}>Call the lounge</TopbarAction>
            <TopbarAction>Manage</TopbarAction>
          </>
        )}
        {state === "checked-in" && <TopbarAction icon={PhoneCall}>Call reception</TopbarAction>}
        {state === "expired" && <TopbarAction icon={FileText}>View receipt</TopbarAction>}
      </div>
    </div>
  );
}

function TopbarAction({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
      {Icon && <Icon size={16} strokeWidth={1.8} className="text-gold-600" />}
      {children}
    </button>
  );
}

function VisitDetailsCard({
  pass,
  statusLabel,
  children,
}: {
  pass: DigitalPass;
  statusLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-content border border-line bg-surface p-5.5 shadow-content">
      <div className="flex items-center gap-3.5 border-b border-line pb-4">
        <span aria-hidden data-tone={toneOf(pass.loungeName)} className="lounge-hero size-13 shrink-0 rounded-[14px]" />
        <div className="flex-1">
          <h2 className="m-0 text-[22px] text-fg">{pass.loungeName}</h2>
          <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">
            {pass.address} · {pass.receptionNote}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-3.5 py-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-white" />
          <span className="text-[12.5px] font-bold text-on-accent">{statusLabel}</span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4.5 pt-4">{children}</div>
    </div>
  );
}

function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-3" : undefined}>
      <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </p>
      <p className="m-0 mt-1.5 text-sm font-bold leading-normal text-fg">{value}</p>
    </div>
  );
}

function UpcomingBody({ pass }: { pass: DigitalPass }) {
  return (
    <>
      <h1 className="m-0 text-[34px] text-fg">Your digital pass</h1>
      <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
        Everything reception needs is on the card. Take a screenshot if you would rather not open
        the app at the door.
      </p>

      <div className="mt-5.5">
        <VisitDetailsCard pass={pass} statusLabel="Valid · in 2 days">
          <Field label="Member" value={pass.memberName} />
          <Field label="Date" value={pass.dateLabel} />
          <Field label="Arrival" value={pass.arrivalTime} />
          <Field label="Duration" value={`Up to ${pass.stayHours} hours`} />
          <Field label="Admission" value={pass.admission} />
          <Field label="Booked" value={`${pass.bookedOnLabel} · ${pass.amountPaidLabel}`} />
        </VisitDetailsCard>
      </div>

      <p className="m-0 mb-3 mt-6 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
        At reception
      </p>
      <div className="flex flex-col gap-3">
        <Step n={1} text="Give your name or show the code — either one finds the booking." />
        <Step n={2} text="Reception confirms it instantly and welcomes you in." />
        <Step n={3} text="Your pass updates to Checked in, so you can put the phone away." />
      </div>

      <Notice tone="muted" icon={<Clock size={18} strokeWidth={1.8} />} className="mt-5">
        This pass stops working at <strong className="text-fg">{pass.windowCloseTime} on {pass.dateLabel}</strong>, when
        the booking window closes. It then moves to Past visits.
      </Notice>

      <div className="mt-4.5 flex gap-3">
        <button type="button" className={cn(buttonVariants({ size: "lg" }), "flex-1")}>
          Add to calendar
        </button>
        <button type="button" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "flex-1")}>
          Cancel visit
        </button>
      </div>

      <p className="m-0 mt-4.5 text-[12.5px] text-fg-subtle">
        <Link href={`/my-pass/${pass.reference}/reminder`} className="font-semibold text-accent-strong">
          View the reminder email
        </Link>{" "}
        you will get 24 hours before arrival.
      </p>
    </>
  );
}

function TodayBody({ pass }: { pass: DigitalPass }) {
  return (
    <>
      <h1 className="m-0 text-[34px] text-fg">You are expected today</h1>
      <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
        {pass.loungeName} has your table from {pass.arrivalTime}. Keep this pass open when you
        walk in.
      </p>

      <div className="mt-5.5 flex items-center gap-3.5 rounded-2xl bg-accent-soft p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white">
          <Clock size={20} strokeWidth={1.8} className="text-gold-600" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="m-0 text-sm font-bold text-fg">Check-in opens at 3:00 PM · in 34 minutes</p>
          <p className="m-0 mt-1 text-[12.5px] text-fg-muted">
            Arrive any time until 5:30 PM. After that the pass expires and the visit counts as a
            no-show.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <VisitDetailsCard pass={pass} statusLabel="Ready for check-in">
          <Field label="Arrival" value={pass.arrivalTime} />
          <Field label="Window closes" value={pass.windowCloseTime} />
          <Field label="Admission" value={pass.admission} />
          <Field label="Special requests sent to the lounge" value={pass.specialRequests} wide />
        </VisitDetailsCard>
      </div>

      <p className="m-0 mb-3 mt-5.5 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
        Getting there
      </p>
      <div className="flex gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5">
          <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
            <MapPin size={17} strokeWidth={1.7} className="text-gold-600" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="m-0 text-[13px] font-bold text-fg">{pass.address}</p>
            <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">Open directions in Google Maps</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5">
          <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
            <Star size={17} strokeWidth={1.7} className="text-gold-600" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="m-0 text-[13px] font-bold text-fg">Level 2, LuxePass desk</p>
            <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">Lift on the right of the lobby</p>
          </div>
        </div>
      </div>
    </>
  );
}

function CheckedInBody({ pass }: { pass: DigitalPass }) {
  return (
    <>
      <div className="flex items-center gap-4.5">
        <span className="flex size-18 shrink-0 items-center justify-center rounded-full bg-accent-soft">
          <CircleCheck size={34} strokeWidth={1.7} className="text-gold-600" aria-hidden />
        </span>
        <div>
          <h1 className="m-0 text-[34px] text-fg">You are checked in</h1>
          <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
            Reception welcomed you at {pass.checkedInAt}. Nothing else to show or scan today.
          </p>
        </div>
      </div>

      <div className="mt-5.5">
        <VisitDetailsCard pass={pass} statusLabel="Checked in">
          <Field label="Checked in at" value={pass.checkedInAt ?? "—"} />
          <Field label="Your stay ends" value={pass.windowCloseTime} />
          <Field label="Time remaining" value="3 h 56 min" />
          <Field label="Your requests" value={`${pass.specialRequests} — passed to the floor team.`} wide />
        </VisitDetailsCard>
      </div>

      <p className="m-0 mb-3 mt-5.5 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
        After your visit
      </p>
      <div className="flex flex-col gap-3">
        <Step icon={Clock} text="The pass closes itself at 7:30 PM — no need to check out." />
        <Step icon={FileText} text="This visit moves to Past visits and counts as your 4th of 8 this month." />
        <Step icon={Star} text="We will ask how it went — reviews help other members choose." />
      </div>
    </>
  );
}

function ExpiredBody({ pass }: { pass: DigitalPass }) {
  const [reviewed, setReviewed] = React.useState(pass.reviewed);
  const [writing, setWriting] = React.useState(false);

  return (
    <>
      <div className="flex items-center gap-4.5">
        <span className="flex size-18 shrink-0 items-center justify-center rounded-full border border-dashed border-line bg-surface-sunken">
          <Clock size={32} strokeWidth={1.7} className="text-fg-subtle" aria-hidden />
        </span>
        <div>
          <h1 className="m-0 text-[34px] text-fg">This pass has expired</h1>
          <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
            The booking window closed at {pass.windowCloseTime} on {pass.dateLabel}. The code no
            longer opens anything.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-content border border-line bg-surface p-5.5 shadow-content">
        <p className="m-0 mb-4 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
          What happened with this booking
        </p>

        <TimelineEntry title="Booked" detail={`${pass.bookedOnLabel} · ${pass.amountPaidLabel}`} />
        <TimelineEntry title="Reminder sent" detail="24 hours before arrival" />
        {pass.checkedInAt ? (
          <TimelineEntry title="Checked in at reception" detail={`${pass.dateLabel} at ${pass.checkedInAt}`} />
        ) : (
          <TimelineEntry title="Never checked in" detail={`${pass.dateLabel} · recorded as a no-show`} />
        )}
        <TimelineEntry
          title="Window closed, pass expired"
          detail={`${pass.dateLabel} at ${pass.windowCloseTime} · visit counted as ${pass.noShow ? "a no-show" : "attended"}`}
          last
        />
      </div>

      <div className="mt-5 flex gap-3">
        <Link href={`/lounges/${pass.loungeId}/book`} className={cn(buttonVariants({ size: "lg" }), "flex-1")}>
          Book {pass.loungeName} again
        </Link>
        {reviewed ? (
          <Link
            href={`/lounges/${pass.loungeId}/reviews`}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "flex-1")}
          >
            See your review
          </Link>
        ) : pass.checkedInLabel ? (
          <button
            type="button"
            onClick={() => setWriting(true)}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "flex-1")}
          >
            Leave a review
          </button>
        ) : null}
      </div>

      {writing && pass.checkedInLabel ? (
        <WriteReviewDialog
          open
          onOpenChange={setWriting}
          loungeName={pass.loungeName}
          visits={[
            {
              bookingId: pass.bookingId,
              reference: pass.reference,
              loungeId: pass.loungeId,
              loungeName: pass.loungeName,
              date: pass.dateIso,
              dateLabel: pass.dateLabel,
              checkedInLabel: pass.checkedInLabel,
            },
          ]}
          onPosted={() => setReviewed(true)}
        />
      ) : null}

      <p className="m-0 mt-4.5 text-xs text-fg-subtle">
        Expired passes stay in your history for your records, but cannot be used for entry again.
      </p>
    </>
  );
}

function TimelineEntry({ title, detail, last = false }: { title: string; detail: string; last?: boolean }) {
  return (
    <div className="flex gap-3.5">
      <div className="flex w-4 flex-col items-center">
        <span aria-hidden className="size-2.5 rounded-full bg-accent" />
        {!last && <span className="w-px flex-1 bg-line" />}
      </div>
      <div className={cn("flex-1", !last && "pb-4.5")}>
        <p className="m-0 text-[13.5px] font-bold text-fg">{title}</p>
        <p className="m-0 mt-0.5 text-xs text-fg-subtle">{detail}</p>
      </div>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  text,
}: {
  n?: number;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-[13px] font-extrabold text-gold-600">
        {Icon ? <Icon size={17} strokeWidth={1.7} className="text-gold-600" /> : n}
      </span>
      <p className="m-0 flex-1 text-[13px] text-fg-muted">{text}</p>
    </div>
  );
}
