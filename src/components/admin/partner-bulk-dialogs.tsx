"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DateField, overlaps, shortDay } from "@/components/admin/lounge-schedule";
import { WeeklyHoursEditor } from "@/components/admin/weekly-hours-editor";
import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { addDays } from "@/lib/availability";
import type { AdminPartnerLounge, PartnerStatus } from "@/lib/admin-partners";
import { TIME_OPTIONS } from "@/lib/lounge-draft";
import { closureBookings, listLoungeSchedule, saveLoungeClosure, saveLoungeSeason, type ClosureBooking, type LoungeSeason } from "@/lib/lounge-schedule";
import {
  planStatusChange,
  runBulk,
  setLoungeHours,
  statusAction,
  type BulkLounge,
  type BulkOutcome,
  type BulkPlan,
  type BulkStatus,
} from "@/lib/partner-bulk";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 10.11 — los modales de las acciones masivas del detalle del partner:
 * PartnerBulkStatus (29), PartnerBulkHours (30), PartnerBulkSeason (31),
 * PartnerBulkClosure (32), la confirmación (33) y el resultado (34).
 */

export type BulkAction = "status" | "hours" | "season" | "closure";

const EYEBROW = "m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle";
const DEFAULT_WEEK = Array(7).fill("8:00 AM – 9:00 PM");

const STATUS_OPTIONS: { value: BulkStatus; label: string; detail: string }[] = [
  { value: "live", label: "Live", detail: "Members see them in Explore and can book. Needs an active partner and a complete checklist." },
  { value: "draft", label: "Draft", detail: "Hidden from members while you keep editing. Bookings already made are kept." },
  { value: "suspended", label: "Suspended", detail: "Hidden from members and closed to new bookings. Reactivating brings a lounge back as a draft." },
];

const STATUS_COPY: Record<BulkStatus, { verb: string; button: (n: number) => string; done: string }> = {
  live: { verb: "Publish", button: (n) => `Publish ${lounges(n)}`, done: "Published" },
  draft: { verb: "Move to draft", button: (n) => `Move ${lounges(n)} to draft`, done: "Moved to draft" },
  suspended: { verb: "Suspend", button: (n) => `Suspend ${lounges(n)}`, done: "Suspended" },
};

function lounges(n: number) {
  return `${n} ${n === 1 ? "lounge" : "lounges"}`;
}

function ofTotal(n: number, total: number) {
  return n === total ? lounges(n) : `${n} of ${lounges(total)}`;
}

/** Lo que cada acción prepara para la confirmación. */
interface Pending {
  plan: BulkPlan;
  title: string;
  intro: string;
  confirmLabel: string;
  doneLabel: string;
  action: (lounge: BulkLounge) => () => Promise<void>;
}

function Chosen({ lounges: selected }: { lounges: BulkLounge[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {selected.map((lounge) => (
        <span key={lounge.id} className="rounded-pill border border-line px-3 py-1 text-[11.5px] font-bold text-fg-muted">
          {lounge.name}
        </span>
      ))}
    </div>
  );
}

function Footer({ onCancel, note, disabled, onReview }: { onCancel: () => void; note?: React.ReactNode; disabled?: boolean; onReview: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" className="normal-case" onClick={onCancel}>
        Cancel
      </Button>
      <p className="m-0 flex-1 text-right text-[12px] font-bold text-fg-muted">{note}</p>
      <Button disabled={disabled} onClick={onReview}>
        Review change
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------- */

function StatusStep({
  selected,
  partnerStatus,
  onCancel,
  onReview,
}: {
  selected: BulkLounge[];
  partnerStatus: PartnerStatus;
  onCancel: () => void;
  onReview: (pending: Pending) => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [target, setTarget] = React.useState<BulkStatus | null>(null);
  const plan = target ? planStatusChange(selected, target, partnerStatus) : null;

  return (
    <Modal
      open
      onOpenChange={(open) => (open ? null : onCancel())}
      dark
      width={600}
      eyebrow={`Change status · ${lounges(selected.length)}`}
      title="Set a new status"
      footer={
        <Footer
          onCancel={onCancel}
          disabled={!plan || plan.apply.length === 0}
          onReview={() => {
            if (!plan || !target) return;
            const copy = STATUS_COPY[target];
            onReview({
              plan,
              title: `${copy.verb} ${ofTotal(plan.apply.length, selected.length)}?`,
              intro:
                target === "live"
                  ? "Status Draft → Live for the lounges below. Members see them in Explore from the moment you confirm."
                  : `Status → ${STATUS_OPTIONS.find((option) => option.value === target)!.label} for the lounges below.`,
              confirmLabel: copy.button(plan.apply.length),
              doneLabel: copy.done,
              action: (lounge) => statusAction(supabase, lounge, target),
            });
          }}
        />
      }
    >
      <Chosen lounges={selected} />
      <p className={cn(EYEBROW, "mt-4")}>New status</p>
      <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="New status">
        {STATUS_OPTIONS.map((option) => {
          const checked = target === option.value;
          const optionPlan = checked ? plan : null;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-150",
                checked ? "border-accent bg-accent/12" : "border-line hover:border-gold-600",
              )}
            >
              <input
                type="radio"
                name="bulk-status"
                aria-label={`${option.label} — ${option.detail}`}
                checked={checked}
                onChange={() => setTarget(option.value)}
                className="mt-1 accent-[var(--color-accent)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-fg">{option.label}</span>
                <span className="mt-0.5 block text-[11.5px] leading-[1.5] text-fg-subtle">{option.detail}</span>
                {optionPlan ? (
                  <span className="mt-2 block text-[12px] text-fg-muted">
                    <strong className="text-fg">
                      {optionPlan.apply.length} {option.value === "live" ? "ready to publish" : "will change"}
                    </strong>
                    {optionPlan.apply.length ? ` · ${optionPlan.apply.map((lounge) => lounge.name).join(", ")}` : ""}
                    {optionPlan.skip.length ? (
                      <span className="mt-1 block">
                        <strong className="text-accent-strong">
                          {optionPlan.skip.length} {option.value === "live" ? "can't publish" : "won't change"}
                        </strong>
                        {` · ${optionPlan.skip.map((skip) => `${skip.lounge.name} — ${skip.reason}`).join(" · ")}`}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------- */

function HoursStep({
  selected,
  all,
  onCancel,
  onReview,
}: {
  selected: BulkLounge[];
  all: AdminPartnerLounge[];
  onCancel: () => void;
  onReview: (pending: Pending) => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const first = all.find((lounge) => lounge.id === selected[0]?.id);
  const [week, setWeek] = React.useState<string[]>(first?.weeklyHours.length === 7 ? first.weeklyHours : DEFAULT_WEEK);
  const startId = React.useId();

  return (
    <Modal
      open
      onOpenChange={(open) => (open ? null : onCancel())}
      dark
      width={680}
      eyebrow={`Set hours · ${lounges(selected.length)}`}
      title="Same weekly hours"
      footer={
        <Footer
          onCancel={onCancel}
          onReview={() =>
            onReview({
              plan: { apply: selected, skip: [] },
              title: `Set hours in ${lounges(selected.length)}?`,
              intro: "Replaces each lounge's usual week. Their seasons and closures stay as they are.",
              confirmLabel: `Set hours in ${lounges(selected.length)}`,
              doneLabel: "Hours set",
              action: (lounge) => () => setLoungeHours(supabase, lounge.id, week),
            })
          }
        />
      }
    >
      <Chosen lounges={selected} />
      <div className="mt-4 flex items-center gap-3">
        <p className={cn(EYEBROW, "flex-1")}>Operating hours for all {selected.length === 3 ? "three" : selected.length}</p>
        <label htmlFor={startId} className="text-[11.5px] font-bold text-fg-subtle">
          Start from a lounge
        </label>
        <Select
          id={startId}
          inputSize="compact"
          className="w-[200px]"
          value=""
          onChange={(event) => {
            const source = all.find((lounge) => lounge.id === event.target.value);
            if (source?.weeklyHours.length === 7) setWeek(source.weeklyHours);
          }}
        >
          <option value="">Choose…</option>
          {all.map((lounge) => (
            <option key={lounge.id} value={lounge.id}>
              {lounge.name}
            </option>
          ))}
        </Select>
      </div>
      <WeeklyHoursEditor value={week} onChange={setWeek} className="mt-2.5" />
      <p className="m-0 mt-3 text-[11.5px] text-fg-subtle">
        Replaces each lounge&apos;s usual week. Their seasons and closures stay as they are — a day still uses its closure first, then its season.
      </p>
    </Modal>
  );
}

/* -------------------------------------------------------------------- */

function SeasonStep({
  selected,
  onCancel,
  onReview,
}: {
  selected: BulkLounge[];
  onCancel: () => void;
  onReview: (pending: Pending) => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const nameId = React.useId();
  const [name, setName] = React.useState("");
  const [startsOn, setStartsOn] = React.useState("");
  const [endsOn, setEndsOn] = React.useState("");
  const [week, setWeek] = React.useState<string[]>(DEFAULT_WEEK);
  const [seasons, setSeasons] = React.useState<Record<string, LoungeSeason[]>>({});

  React.useEffect(() => {
    let active = true;
    Promise.all(selected.map(async (lounge) => [lounge.id, (await listLoungeSchedule(supabase, lounge.id)).seasons] as const)).then((entries) => {
      if (active) setSeasons(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [selected, supabase]);

  const backwards = Boolean(startsOn && endsOn && endsOn < startsOn);
  const ready = Boolean(startsOn && endsOn) && !backwards;
  const clashes = ready
    ? selected.flatMap((lounge) => {
        const clash = (seasons[lounge.id] ?? []).find((season) => overlaps({ startsOn, endsOn }, season));
        return clash ? [{ lounge, clash }] : [];
      })
    : [];
  const plan: BulkPlan = {
    apply: selected.filter((lounge) => !clashes.some((item) => item.lounge.id === lounge.id)),
    skip: clashes.map(({ lounge, clash }) => ({ lounge, reason: `Already has ${clash.name || "a season"} on those days` })),
  };

  return (
    <Modal
      open
      onOpenChange={(open) => (open ? null : onCancel())}
      dark
      width={680}
      eyebrow={`Add season · ${lounges(selected.length)}`}
      title="Same season everywhere"
      footer={
        <Footer
          onCancel={onCancel}
          note={ready && clashes.length ? `Adds to ${plan.apply.length} · skips ${clashes.length}` : null}
          disabled={!ready || plan.apply.length === 0}
          onReview={() =>
            onReview({
              plan,
              title: `Add the season to ${ofTotal(plan.apply.length, selected.length)}?`,
              intro: `${name.trim() || "The season"} · ${shortDay(startsOn)} – ${shortDay(endsOn)}. Its week replaces the usual one on those days.`,
              confirmLabel: `Add to ${lounges(plan.apply.length)}`,
              doneLabel: "Season added",
              action: (lounge) => () => saveLoungeSeason(supabase, lounge.id, { name, startsOn, endsOn, weeklyHours: week }).then(() => undefined),
            })
          }
        />
      }
    >
      <Chosen lounges={selected} />
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="min-w-[180px] flex-[1.4]">
          <label htmlFor={nameId} className="mb-1.5 block text-[12px] font-semibold text-fg-muted">
            Name · optional
          </label>
          <Input id={nameId} inputSize="compact" value={name} placeholder="Holiday hours" onChange={(event) => setName(event.target.value)} />
        </div>
        <DateField label="From" value={startsOn} onChange={setStartsOn} />
        <DateField label="To" value={endsOn} onChange={setEndsOn} error={backwards ? "Ends before it starts" : undefined} />
      </div>
      <p className={cn(EYEBROW, "mt-4")}>Weekly hours in this season</p>
      <WeeklyHoursEditor value={week} onChange={setWeek} className="mt-2.5" />
      {clashes.length ? (
        <div className="mt-3 rounded-xl border border-accent-strong px-3.5 py-3">
          <p className="m-0 text-[12.5px] font-bold text-fg">
            Clashes with a season in {lounges(clashes.length)}
          </p>
          {clashes.map(({ lounge, clash }) => (
            <p key={lounge.id} className="m-0 mt-1 text-[11.5px] leading-[1.5] text-fg-subtle">
              <strong className="text-fg-muted">{lounge.name}</strong> already has <strong className="text-fg-muted">{clash.name || "a season"}</strong> ·{" "}
              {shortDay(clash.startsOn)} – {shortDay(clash.endsOn)}. Two seasons can&apos;t share a day, so it will be skipped there.
            </p>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}

/* -------------------------------------------------------------------- */

function ClosureStep({
  selected,
  onCancel,
  onReview,
}: {
  selected: BulkLounge[];
  onCancel: () => void;
  onReview: (pending: Pending) => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const reasonId = React.useId();
  const reopensOnId = React.useId();
  const reopensAtId = React.useId();
  const [startsOn, setStartsOn] = React.useState("");
  const [endsOn, setEndsOn] = React.useState("");
  const [reopensOn, setReopensOn] = React.useState("");
  const [reopensAt, setReopensAt] = React.useState(TIME_OPTIONS[20]);
  const [reason, setReason] = React.useState("");
  const [bookings, setBookings] = React.useState<Record<string, ClosureBooking[]> | null>(null);

  const backwards = Boolean(startsOn && endsOn && endsOn < startsOn);
  const datesReady = Boolean(startsOn && endsOn) && !backwards;

  React.useEffect(() => {
    if (!datesReady) return;
    let active = true;
    Promise.all(selected.map(async (lounge) => [lounge.id, await closureBookings(supabase, lounge.id, startsOn, endsOn)] as const))
      .then((entries) => {
        if (active) setBookings(Object.fromEntries(entries));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [datesReady, selected, startsOn, endsOn, supabase]);

  const total = datesReady && bookings ? Object.values(bookings).reduce((sum, list) => sum + list.length, 0) : 0;
  const label = reopensOn ? `Reopens ${shortDay(reopensOn)}${reopensAt ? ` at ${reopensAt}` : ""}` : "";

  return (
    <Modal
      open
      onOpenChange={(open) => (open ? null : onCancel())}
      dark
      width={680}
      eyebrow={`Add closure · ${lounges(selected.length)}`}
      title="Same closure everywhere"
      footer={
        <Footer
          onCancel={onCancel}
          disabled={!datesReady || !reason.trim()}
          onReview={() =>
            onReview({
              plan: { apply: selected, skip: [] },
              title: `Add the closure to ${lounges(selected.length)}?`,
              intro: `Closed ${shortDay(startsOn)} – ${shortDay(endsOn)} for ${reason.trim()}. These days take no new bookings.${total ? ` ${total} confirmed ${total === 1 ? "booking stays" : "bookings stay"} as they are.` : ""}`,
              confirmLabel: `Add to ${lounges(selected.length)}`,
              doneLabel: "Closure added",
              action: (lounge) => () => saveLoungeClosure(supabase, lounge.id, { startsOn, endsOn, reason, reopensLabel: label }).then(() => undefined),
            })
          }
        />
      }
    >
      <Chosen lounges={selected} />
      <div className="mt-4 flex flex-wrap gap-3">
        <DateField
          label="From"
          value={startsOn}
          onChange={setStartsOn}
        />
        <DateField
          label="To"
          value={endsOn}
          onChange={(value) => {
            setEndsOn(value);
            if (value) setReopensOn(addDays(value, 1));
          }}
          error={backwards ? "Ends before it starts" : undefined}
        />
        <div className="basis-full">
          <p className="m-0 mb-1.5 text-[12px] font-semibold text-fg-muted">Reopens</p>
          <div className="flex gap-2">
            <label htmlFor={reopensOnId} className="sr-only">
              Reopens on
            </label>
            <div className="w-[200px]">
              <Input id={reopensOnId} type="date" inputSize="compact" value={reopensOn} onChange={(event) => setReopensOn(event.target.value)} />
            </div>
            <label htmlFor={reopensAtId} className="sr-only">
              Reopens at
            </label>
            <Select id={reopensAtId} inputSize="compact" className="w-[134px] shrink-0" value={reopensAt} onChange={(event) => setReopensAt(event.target.value)}>
              {TIME_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor={reasonId} className="mb-1.5 block text-[12px] font-semibold text-fg-muted">
          Reason · members see it
        </label>
        <Input id={reasonId} inputSize="compact" maxLength={80} value={reason} placeholder="Private event" onChange={(event) => setReason(event.target.value)} />
      </div>
      {datesReady && reason.trim() ? (
        <p className="m-0 mt-3 text-[12px] text-fg-subtle">
          Members read · <span className="text-fg-muted">Closed {shortDay(startsOn)} – {shortDay(endsOn)} for {reason.trim()}.{label ? ` ${label}.` : ""}</span>
        </p>
      ) : null}
      {datesReady && bookings ? (
        <div className="mt-3 rounded-xl border border-line px-3.5 py-3">
          <p className="m-0 text-[12.5px] font-bold text-fg">
            {total} confirmed {total === 1 ? "booking falls" : "bookings fall"} in this closure
          </p>
          {selected.map((lounge) => {
            const list = bookings[lounge.id] ?? [];
            return (
              <div key={lounge.id} className="mt-2 flex items-start gap-3 border-t border-line/60 pt-2">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[12px] font-bold text-fg-muted">{lounge.name}</p>
                  {list.length ? (
                    <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{[...new Set(list.map((booking) => booking.memberName))].join(", ")}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11.5px] font-bold text-fg-subtle">{list.length ? `${list.length} confirmed` : "No bookings"}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </Modal>
  );
}

/* -------------------------------------------------------------------- */

function ConfirmStep({ pending, total, busy, onBack, onConfirm }: { pending: Pending; total: number; busy: boolean; onBack: () => void; onConfirm: () => void }) {
  return (
    <Modal
      open
      onOpenChange={(open) => (open ? null : onBack())}
      dark
      width={600}
      eyebrow="Bulk change · confirm"
      title={pending.title}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="normal-case" onClick={onBack}>
            Back
          </Button>
          <p className="m-0 flex-1 text-right text-[12px] font-bold text-fg-muted">
            {pending.plan.apply.length} of {total} change
          </p>
          <Button disabled={busy} onClick={onConfirm}>
            {pending.confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="m-0 text-[13px] leading-[1.6] text-fg-muted">{pending.intro}</p>
      <ul className="m-0 mt-3 list-none p-0">
        {pending.plan.apply.map((lounge) => (
          <li key={lounge.id} className="flex items-center gap-3 border-t border-line/60 py-2.5">
            <span className="size-1.5 shrink-0 rounded-full bg-accent" />
            <span className="flex-1 text-[13px] font-bold text-fg">{lounge.name}</span>
            <span className="text-[11.5px] font-bold text-fg-muted">Changes</span>
          </li>
        ))}
        {pending.plan.skip.map(({ lounge, reason }) => (
          <li key={lounge.id} className="flex items-center gap-3 border-t border-line/60 py-2.5">
            <span className="size-1.5 shrink-0 rounded-full border border-fg-subtle" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-fg">{lounge.name}</span>
              <span className="block text-[11.5px] text-accent-strong">{reason}</span>
            </span>
            <span className="text-[11.5px] font-bold text-fg-subtle">Skipped</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function ResultStep({ pending, outcomes, onDone }: { pending: Pending; outcomes: BulkOutcome[]; onDone: () => void }) {
  const applied = outcomes.filter((outcome) => outcome.ok).length;
  const failed = outcomes.length - applied;
  return (
    <Modal
      open
      onOpenChange={(open) => (open ? null : onDone())}
      dark
      width={600}
      eyebrow="Bulk change · done"
      title={`${pending.doneLabel} in ${applied} of ${outcomes.length}`}
      footer={
        <div className="flex justify-end">
          <Button onClick={onDone}>Done</Button>
        </div>
      }
    >
      <p className="m-0 text-[13px] leading-[1.6] text-fg-muted">
        Applied in <strong className="text-fg">{lounges(applied)}</strong>.
        {failed ? ` Not applied in ${failed} — ${failed === 1 ? "it's" : "they're"} still selected so you can fix it and try again.` : ""}
      </p>
      <ul className="m-0 mt-3 list-none p-0">
        {outcomes.map(({ lounge, ok, reason }) => (
          <li key={lounge.id} className="flex items-center gap-3 border-t border-line/60 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-fg">{lounge.name}</span>
              <span className={cn("block text-[11.5px]", ok ? "text-fg-subtle" : "text-accent-strong")}>{ok ? "Done" : `Not applied: ${reason}`}</span>
            </span>
            {ok ? null : (
              <Link
                href={`/admin/lounges/${lounge.id}`}
                className="inline-flex h-[30px] items-center gap-1 rounded-[9px] border-[1.5px] border-line px-2.5 text-[11.5px] font-bold text-fg-muted transition-colors duration-150 hover:border-accent"
              >
                Open lounge
                <ChevronRight size={13} strokeWidth={1.8} className="text-accent" aria-hidden />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/* -------------------------------------------------------------------- */

/** Un flujo: el modal de la acción → confirmación → resultado. */
export function PartnerBulkFlow({
  action,
  selected,
  all,
  partnerStatus,
  onClose,
  onApplied,
}: {
  action: BulkAction;
  selected: BulkLounge[];
  all: AdminPartnerLounge[];
  partnerStatus: PartnerStatus;
  onClose: () => void;
  /** Recarga el partner y deja seleccionados los que no se aplicaron. */
  onApplied: (failedIds: string[]) => void;
}) {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [outcomes, setOutcomes] = React.useState<BulkOutcome[] | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (pending && outcomes) {
    return (
      <ResultStep
        pending={pending}
        outcomes={outcomes}
        onDone={() => {
          onApplied(outcomes.filter((outcome) => !outcome.ok).map((outcome) => outcome.lounge.id));
          onClose();
        }}
      />
    );
  }
  if (pending) {
    return (
      <ConfirmStep
        pending={pending}
        total={selected.length}
        busy={busy}
        onBack={() => setPending(null)}
        onConfirm={async () => {
          setBusy(true);
          setOutcomes(await runBulk(pending.plan, pending.action));
          setBusy(false);
        }}
      />
    );
  }
  if (action === "status") return <StatusStep selected={selected} partnerStatus={partnerStatus} onCancel={onClose} onReview={setPending} />;
  if (action === "hours") return <HoursStep selected={selected} all={all} onCancel={onClose} onReview={setPending} />;
  if (action === "season") return <SeasonStep selected={selected} onCancel={onClose} onReview={setPending} />;
  return <ClosureStep selected={selected} onCancel={onClose} onReview={setPending} />;
}
