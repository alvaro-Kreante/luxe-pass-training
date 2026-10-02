"use client";

import * as React from "react";
import { Ban, Pencil, Plus, Sun, Trash2 } from "lucide-react";

import { ConfirmModal } from "@/components/admin/confirm-modal";
import { WeeklyHoursEditor } from "@/components/admin/weekly-hours-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TODAY, addDays } from "@/lib/availability";
import { TIME_OPTIONS, parseDayHours } from "@/lib/lounge-draft";
import {
  closureBookings,
  dayHours,
  defaultReopening,
  deleteLoungeClosure,
  deleteLoungeSeason,
  listLoungeSchedule,
  saveLoungeClosure,
  saveLoungeSeason,
  weekSummary,
  type ClosureBooking,
  type LoungeClosure,
  type LoungeClosureInput,
  type LoungeSchedule,
  type LoungeSeasonInput,
  type LoungeSeason,
} from "@/lib/lounge-schedule";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 10.9 — "Seasonal hours" y "Special closures" del lounge
 * (SeasonalEmpty 17, SeasonalEdit 18, SeasonalOverlap 19, ClosureEdit 20,
 * ClosureBookingsWarning 21, SeasonalFilled 22). Cada alta, edición o
 * borrado se guarda al momento: el lounge sigue live.
 */

const CARD = "rounded-content border border-line bg-dark-card px-5 py-4";
const EYEBROW = "m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle";
const ROW = "flex items-center gap-3.5 rounded-[14px] border border-line bg-panel-black px-3.5 py-3";
const ICON_BUTTON =
  "flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-line transition-colors duration-150 hover:border-accent hover:bg-surface-hover";
const ADD_BUTTON =
  "inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-fg-subtle px-3 text-xs font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover";
const REASON_MAX = 80;

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const WEEKDAY_MONTH = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const WEEKDAY_DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" });

function utc(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

function year(iso: string) {
  return iso.slice(0, 4);
}

/** "Jun 1 – Aug 31, 2026", o con año a cada lado si cambia. */
function rangeLabel(from: string, to: string, format = MONTH) {
  const clean = (iso: string) => format.format(utc(iso)).replace(",", "");
  if (year(from) === year(to)) return `${clean(from)} – ${clean(to)}, ${year(to)}`;
  return `${clean(from)}, ${year(from)} – ${clean(to)}, ${year(to)}`;
}

export function shortDay(iso: string) {
  return WEEKDAY_MONTH.format(utc(iso)).replace(",", "");
}

function daysBetween(from: string, to: string) {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / 86_400_000);
}

function timingLabel(startsOn: string, endsOn: string): { label: string; soon: boolean } {
  if (endsOn < TODAY) return { label: "Ended", soon: false };
  if (startsOn <= TODAY) return { label: "Now", soon: true };
  const days = daysBetween(TODAY, startsOn);
  if (days <= 7) return { label: days === 1 ? "Tomorrow" : `In ${days} days`, soon: true };
  return { label: "Upcoming", soon: false };
}

function TimingChip({ startsOn, endsOn }: { startsOn: string; endsOn: string }) {
  const { label, soon } = timingLabel(startsOn, endsOn);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-bold text-fg-muted",
        soon ? "border-gold-600 bg-accent/16" : "border-line",
      )}
    >
      {soon ? <span className="size-1.5 rounded-full bg-accent" /> : null}
      {label}
    </span>
  );
}

export function overlaps(a: { startsOn: string; endsOn: string }, b: { startsOn: string; endsOn: string }) {
  return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;
}

export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = React.useId();
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-semibold text-fg-muted">
        {label}
      </label>
      <Input id={id} type="date" inputSize="compact" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
      {error ? <p className="m-0 mt-1.5 text-[11.5px] font-bold text-accent-strong">{error}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Temporadas                                                            */
/* -------------------------------------------------------------------- */

interface SeasonDraft {
  id?: string;
  name: string;
  startsOn: string;
  endsOn: string;
  weeklyHours: string[];
}

function SeasonEditor({
  draft,
  others,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  draft: SeasonDraft;
  others: LoungeSeason[];
  busy: boolean;
  onChange: (draft: SeasonDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const nameId = React.useId();
  const backwards = Boolean(draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn);
  const clash =
    draft.startsOn && draft.endsOn
      ? others.find((season) => overlaps({ startsOn: draft.startsOn, endsOn: draft.endsOn < draft.startsOn ? draft.startsOn : draft.endsOn }, season))
      : undefined;
  const ready = Boolean(draft.startsOn && draft.endsOn) && !backwards && !clash;
  const title = draft.id ? "Edit season" : "New season";

  return (
    <fieldset aria-label={title} className="m-0 mt-3 rounded-[14px] border border-gold-600 bg-panel-black p-4">
      <p className="m-0 text-[13.5px] font-bold text-fg">{title}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="min-w-[180px] flex-[1.4]">
          <label htmlFor={nameId} className="mb-1.5 block text-[12px] font-semibold text-fg-muted">
            Name · optional
          </label>
          <Input
            id={nameId}
            inputSize="compact"
            value={draft.name}
            placeholder="Summer hours"
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
          />
        </div>
        <DateField
          label="From"
          value={draft.startsOn}
          onChange={(startsOn) => onChange({ ...draft, startsOn })}
          error={clash ? `Overlaps ${clash.name || "another season"}` : undefined}
        />
        <DateField
          label="To"
          value={draft.endsOn}
          onChange={(endsOn) => onChange({ ...draft, endsOn })}
          error={backwards ? "Ends before it starts" : undefined}
        />
      </div>
      <p className={cn(EYEBROW, "mt-4")}>Weekly hours in this season</p>
      <WeeklyHoursEditor value={draft.weeklyHours} onChange={(weeklyHours) => onChange({ ...draft, weeklyHours })} className="mt-2.5" />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="m-0 flex-1 text-[11.5px] text-fg-subtle">
          {ready ? "Saved straight onto the lounge — it stays live" : "Fix the dates to add this season"}
        </p>
        <Button variant="ghost" size="md" className="normal-case" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="md" disabled={!ready || busy} onClick={onSave}>
          {draft.id ? "Save season" : "Add season"}
        </Button>
      </div>
    </fieldset>
  );
}

function SeasonsCard({
  seasons,
  regularWeek,
  busy,
  run,
  api,
}: {
  seasons: LoungeSeason[];
  regularWeek: string[];
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<boolean>;
  api: ScheduleApi;
}) {
  const [draft, setDraft] = React.useState<SeasonDraft | null>(null);
  const headingId = React.useId();
  const others = seasons.filter((season) => season.id !== draft?.id);

  return (
    <section aria-labelledby={headingId} className={CARD}>
      <div className="flex items-center gap-3">
        <p id={headingId} className={EYEBROW}>
          Seasonal hours
        </p>
        <p className="m-0 text-[11.5px] text-fg-subtle">· {seasons.length === 0 ? "none yet" : seasons.length}</p>
        <div className="flex-1" />
        {draft ? null : (
          <button
            type="button"
            className={ADD_BUTTON}
            onClick={() => setDraft({ name: "", startsOn: "", endsOn: "", weeklyHours: [...regularWeek] })}
          >
            <Plus size={14} strokeWidth={2.2} className="text-accent" aria-hidden />
            Add season
          </button>
        )}
      </div>

      {seasons.length === 0 && !draft ? (
        <div className="mt-3 rounded-[14px] border-[1.5px] border-dashed border-line px-4 py-4.5 text-center">
          <p className="m-0 text-[13px] font-bold text-fg">No seasons</p>
          <p className="m-0 mt-1 text-[12px] text-fg-subtle">
            Add a period with its own week — summer, holidays. During it, members only see and book those hours.
          </p>
        </div>
      ) : null}

      {seasons.length > 0 ? (
        <ul aria-label="Seasons" className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {seasons.map((season) => {
            const name = season.name || "Season";
            const clashing = draft ? overlaps(draft, season) && season.id !== draft.id && Boolean(draft.startsOn && draft.endsOn) : false;
            return (
              <li key={season.id} aria-label={`${name} · ${rangeLabel(season.startsOn, season.endsOn)}`} className={cn(ROW, clashing && "border-accent-strong")}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line">
                  <Sun size={17} strokeWidth={1.7} className="text-accent" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2.5">
                    <p className="m-0 text-[13.5px] font-bold text-fg">{name}</p>
                    <span className="text-xs font-semibold text-fg-muted">{rangeLabel(season.startsOn, season.endsOn)}</span>
                  </div>
                  <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">{weekSummary(season.weeklyHours)}</p>
                </div>
                {clashing ? (
                  <span className="shrink-0 rounded-pill border border-accent-strong px-2.5 py-1 text-[11px] font-bold text-accent-strong">Overlaps</span>
                ) : (
                  <TimingChip startsOn={season.startsOn} endsOn={season.endsOn} />
                )}
                <button
                  type="button"
                  aria-label={`Edit ${name}`}
                  className={ICON_BUTTON}
                  onClick={() => setDraft({ ...season })}
                >
                  <Pencil size={15} strokeWidth={1.8} className="text-accent" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${name}`}
                  disabled={busy}
                  className={ICON_BUTTON}
                  onClick={() => run(() => api.deleteSeason(season.id))}
                >
                  <Trash2 size={15} strokeWidth={1.8} className="text-fg-muted" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {draft ? (
        <SeasonEditor
          draft={draft}
          others={others}
          busy={busy}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={async () => {
            if (await run(() => api.saveSeason(draft))) setDraft(null);
          }}
        />
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------- */
/* Cierres especiales                                                    */
/* -------------------------------------------------------------------- */

interface ClosureDraft {
  id?: string;
  startsOn: string;
  endsOn: string;
  reason: string;
  reopensOn: string;
  reopensAt: string;
}

/** "9 AM" → "9:00 AM", como las opciones de hora. */
function asTimeOption(time: string) {
  return parseDayHours(`${time} – ${time}`).from;
}

function reopensLabel(draft: ClosureDraft) {
  if (!draft.reopensOn) return "";
  return `Reopens ${shortDay(draft.reopensOn)}${draft.reopensAt ? ` at ${draft.reopensAt}` : ""}`;
}

function ClosureEditor({
  draft,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  draft: ClosureDraft;
  busy: boolean;
  onChange: (draft: ClosureDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const reasonId = React.useId();
  const reopensOnId = React.useId();
  const reopensAtId = React.useId();
  const backwards = Boolean(draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn);
  const ready = Boolean(draft.startsOn && draft.endsOn && draft.reason.trim()) && !backwards;
  const title = draft.id ? "Edit closure" : "New closure";
  const range = draft.startsOn && draft.endsOn && !backwards
    ? draft.startsOn === draft.endsOn
      ? shortDay(draft.startsOn)
      : `${shortDay(draft.startsOn)} – ${shortDay(draft.endsOn)}`
    : "";

  return (
    <fieldset aria-label={title} className="m-0 mt-3 rounded-[14px] border border-gold-600 bg-panel-black p-4">
      <p className="m-0 text-[13.5px] font-bold text-fg">{title}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <DateField label="From" value={draft.startsOn} onChange={(startsOn) => onChange({ ...draft, startsOn })} />
        <DateField
          label="To"
          value={draft.endsOn}
          onChange={(endsOn) => onChange({ ...draft, endsOn })}
          error={backwards ? "Ends before it starts" : undefined}
        />
        <div className="basis-full">
          <p className="m-0 mb-1.5 text-[12px] font-semibold text-fg-muted">Reopens</p>
          <div className="flex gap-2">
            <label htmlFor={reopensOnId} className="sr-only">
              Reopens on
            </label>
            <div className="w-[200px]">
              <Input
                id={reopensOnId}
                type="date"
                inputSize="compact"
                value={draft.reopensOn}
                onChange={(event) => onChange({ ...draft, reopensOn: event.target.value })}
              />
            </div>
            <label htmlFor={reopensAtId} className="sr-only">
              Reopens at
            </label>
            <Select
              id={reopensAtId}
              inputSize="compact"
              value={draft.reopensAt}
              onChange={(event) => onChange({ ...draft, reopensAt: event.target.value })}
              className="w-[134px] shrink-0"
            >
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
        <div className="mb-1.5 flex items-center">
          <label htmlFor={reasonId} className="text-[12px] font-semibold text-fg-muted">
            Reason · members see it
          </label>
          <div className="flex-1" />
          <span className="text-[11px] text-fg-subtle">
            {draft.reason.length} / {REASON_MAX}
          </span>
        </div>
        <Input
          id={reasonId}
          inputSize="compact"
          maxLength={REASON_MAX}
          value={draft.reason}
          placeholder="Private event"
          onChange={(event) => onChange({ ...draft, reason: event.target.value })}
        />
      </div>
      {range && draft.reason.trim() ? (
        <div className="mt-3 rounded-xl border border-dashed border-line px-3.5 py-3">
          <p className={EYEBROW}>On the lounge page</p>
          <p className="m-0 mt-1.5 text-[13px] font-bold text-fg">
            Closed {range} for {draft.reason.trim()}
          </p>
          <p className="m-0 mt-0.5 text-[12px] text-fg-subtle">
            Bookings are paused on these dates.
            {draft.reopensOn ? ` The lounge ${reopensLabel(draft).replace("Reopens", "reopens")}.` : ""}
          </p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="m-0 flex-1 text-[11.5px] text-fg-subtle">Reopens defaults to the next open day, at that day&apos;s opening hour</p>
        <Button variant="ghost" size="md" className="normal-case" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="md" disabled={!ready || busy} onClick={onSave}>
          {draft.id ? "Save closure" : "Add closure"}
        </Button>
      </div>
    </fieldset>
  );
}

function ClosuresCard({
  loungeName,
  closures,
  schedule,
  regularWeek,
  busy,
  run,
  api,
}: {
  loungeName: string;
  closures: LoungeClosure[];
  schedule: LoungeSchedule;
  regularWeek: string[];
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<boolean>;
  api: ScheduleApi;
}) {
  const [draft, setDraft] = React.useState<ClosureDraft | null>(null);
  const [affected, setAffected] = React.useState<ClosureBooking[] | null>(null);
  const headingId = React.useId();

  function change(next: ClosureDraft) {
    // La reapertura se propone sola mientras el admin no la toque.
    if (next.endsOn && next.endsOn !== draft?.endsOn) {
      const reopening = defaultReopening(next.endsOn, regularWeek, {
        ...schedule,
        closures: schedule.closures.filter((closure) => closure.id !== next.id),
      });
      if (reopening) {
        next = { ...next, reopensOn: reopening.date, reopensAt: asTimeOption(reopening.time) };
      }
    }
    setDraft(next);
  }

  async function save(current: ClosureDraft) {
    const ok = await run(() =>
      api.saveClosure({
        id: current.id,
        startsOn: current.startsOn,
        endsOn: current.endsOn,
        reason: current.reason,
        reopensLabel: reopensLabel(current),
      }),
    );
    if (ok) {
      setDraft(null);
      setAffected(null);
    }
  }

  async function review() {
    if (!draft) return;
    let bookings: ClosureBooking[] = [];
    const ok = await run(async () => {
      bookings = await api.bookings(draft.startsOn, draft.endsOn);
    });
    if (!ok) return;
    if (bookings.length > 0) setAffected(bookings);
    else await save(draft);
  }

  const range = draft && draft.startsOn && draft.endsOn ? `${shortDay(draft.startsOn)} – ${shortDay(draft.endsOn)}` : "";

  return (
    <section aria-labelledby={headingId} className={CARD}>
      <div className="flex items-center gap-3">
        <p id={headingId} className={EYEBROW}>
          Special closures
        </p>
        <p className="m-0 text-[11.5px] text-fg-subtle">· {closures.length === 0 ? "none yet" : closures.length}</p>
        <div className="flex-1" />
        {draft ? null : (
          <button
            type="button"
            className={ADD_BUTTON}
            onClick={() => setDraft({ startsOn: "", endsOn: "", reason: "", reopensOn: "", reopensAt: TIME_OPTIONS[16] })}
          >
            <Plus size={14} strokeWidth={2.2} className="text-accent" aria-hidden />
            Add closure
          </button>
        )}
      </div>

      {closures.length === 0 && !draft ? (
        <div className="mt-3 rounded-[14px] border-[1.5px] border-dashed border-line px-4 py-4.5 text-center">
          <p className="m-0 text-[13px] font-bold text-fg">No special closures</p>
          <p className="m-0 mt-1 text-[12px] text-fg-subtle">
            Close the lounge for a few days — a private event, works, a holiday. Those days take no bookings.
          </p>
        </div>
      ) : null}

      {closures.length > 0 ? (
        <ul aria-label="Closures" className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {closures.map((closure) => (
            <li key={closure.id} aria-label={`${closure.reason} · ${rangeLabel(closure.startsOn, closure.endsOn, WEEKDAY_MONTH)}`} className={ROW}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line">
                <Ban size={17} strokeWidth={1.7} className="text-accent" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5">
                  <p className="m-0 text-[13.5px] font-bold text-fg">{closure.reason}</p>
                  <span className="text-xs font-semibold text-fg-muted">{rangeLabel(closure.startsOn, closure.endsOn, WEEKDAY_MONTH)}</span>
                </div>
                <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">
                  {[closure.reopensLabel, "members see this reason on the lounge page"].filter(Boolean).join(" · ")}
                </p>
              </div>
              <TimingChip startsOn={closure.startsOn} endsOn={closure.endsOn} />
              <button
                type="button"
                aria-label={`Edit ${closure.reason}`}
                className={ICON_BUTTON}
                onClick={() => {
                  const reopening = defaultReopening(closure.endsOn, regularWeek, {
                    ...schedule,
                    closures: schedule.closures.filter((other) => other.id !== closure.id),
                  });
                  setDraft({
                    id: closure.id,
                    startsOn: closure.startsOn,
                    endsOn: closure.endsOn,
                    reason: closure.reason,
                    reopensOn: reopening?.date ?? "",
                    reopensAt: reopening ? asTimeOption(reopening.time) : TIME_OPTIONS[16],
                  });
                }}
              >
                <Pencil size={15} strokeWidth={1.8} className="text-accent" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Delete ${closure.reason}`}
                disabled={busy}
                className={ICON_BUTTON}
                onClick={() => run(() => api.deleteClosure(closure.id))}
              >
                <Trash2 size={15} strokeWidth={1.8} className="text-fg-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {draft ? (
        <ClosureEditor draft={draft} busy={busy} onChange={change} onCancel={() => setDraft(null)} onSave={review} />
      ) : null}

      <ConfirmModal
        open={affected !== null}
        onOpenChange={(open) => (open ? null : setAffected(null))}
        eyebrow={`${loungeName} · special closure`}
        title={`${affected?.length ?? 0} confirmed ${affected?.length === 1 ? "booking falls" : "bookings fall"} in this closure`}
        intro={`${draft?.reason.trim() ?? ""} closes ${loungeName} ${range}. These members already have a confirmed booking on those days. From the save on, these days take no new bookings.`}
        points={(affected ?? []).map((booking) => ({
          title: booking.memberName,
          detail: `${shortDay(booking.date)} · ${booking.slotTime} · Confirmed`,
        }))}
        confirmLabel="Save anyway"
        busy={busy}
        onConfirm={() => (draft ? save(draft) : undefined)}
      />
    </section>
  );
}

/* -------------------------------------------------------------------- */
/* Rail                                                                   */
/* -------------------------------------------------------------------- */

/** SeasonalFilled (22) — qué horario usa cada uno de los próximos 7 días. */
export function NextDaysCard({ schedule, regularWeek }: { schedule: LoungeSchedule; regularWeek: string[] }) {
  const headingId = React.useId();
  const days = Array.from({ length: 7 }, (_, offset) => addDays(TODAY, offset));
  return (
    <div className={cn(CARD, "pb-2.5")}>
      <div className="flex items-center">
        <p id={headingId} className={EYEBROW}>
          Next 7 days
        </p>
        <div className="flex-1" />
        <p className="m-0 text-[11.5px] text-fg-subtle">from {WEEKDAY_MONTH.format(utc(TODAY)).replace(",", "")}</p>
      </div>
      <ul aria-labelledby={headingId} className="m-0 mt-2 list-none p-0">
        {days.map((date, index) => {
          const day = dayHours(date, regularWeek, schedule);
          const previous = index > 0 ? dayHours(days[index - 1], regularWeek, schedule) : null;
          const reopens = day.source !== "closure" && previous?.source === "closure";
          const label = WEEKDAY_DAY.format(utc(date)).replace(/(\d+)\s(\w+)/, "$2 $1");
          return (
            <li
              key={date}
              aria-label={label}
              className={cn("flex items-center gap-2.5 py-1.5", index > 0 && "border-t border-line/60")}
            >
              <span className="w-[54px] text-xs font-bold text-fg-muted">{label}</span>
              <span className={cn("flex-1 text-xs font-bold", day.hours === "Closed" ? "text-fg-subtle" : "text-fg")}>{day.hours}</span>
              {day.source === "closure" ? (
                <span className="rounded-pill border border-dashed border-fg-subtle px-2.5 py-1 text-[11px] font-bold text-fg-muted">{day.reason}</span>
              ) : reopens ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill border border-gold-600 bg-accent/16 px-2.5 py-1 text-[11px] font-bold text-fg-muted">
                  <span className="size-1.5 rounded-full bg-accent" />
                  Reopens
                </span>
              ) : day.source === "season" ? (
                <span className="rounded-pill border border-line px-2.5 py-1 text-[11px] font-bold text-fg-muted">{day.season || "Season"}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** SeasonalEmpty (17) — el orden en que se decide el horario de un día. */
export function ScheduleOrderCard() {
  const steps = [
    { title: "Special closure", detail: "No bookings that day. Members see the reason and when it reopens." },
    { title: "Season", detail: "Its week replaces the usual one — lounge page, Explore and booking." },
    { title: "Operating hours", detail: "Every other day of the year." },
  ];
  return (
    <div className={CARD}>
      <p className={EYEBROW}>Which hours a day uses</p>
      <ol className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-gold-600 text-[11px] font-extrabold text-accent">
              {index + 1}
            </span>
            <div>
              <p className="m-0 text-[12.5px] font-bold text-fg">{step.title}</p>
              <p className="m-0 mt-0.5 text-[11.5px] leading-[1.5] text-fg-subtle">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="m-0 mt-3 border-t border-line/60 pt-3 text-[11.5px] leading-[1.5] text-fg-subtle">
        Only the admin edits these. The partner sees them read only in its dashboard; members see the result.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Estado compartido                                                      */
/* -------------------------------------------------------------------- */

/** Lo que las tarjetas escriben: en la base, o en el formulario de un lounge nuevo. */
export interface ScheduleApi {
  saveSeason: (input: LoungeSeasonInput) => Promise<void>;
  deleteSeason: (id: string) => Promise<void>;
  saveClosure: (input: LoungeClosureInput) => Promise<void>;
  deleteClosure: (id: string) => Promise<void>;
  bookings: (from: string, to: string) => Promise<ClosureBooking[]>;
}

/**
 * Con `loungeId` lee y escribe en la base al momento. Con `null` (un lounge
 * nuevo, sin id todavía) lo guarda en memoria; el formulario lo escribe con
 * `persistLoungeSchedule` al guardarlo por primera vez.
 */
export function useLoungeSchedule(loungeId: string | null) {
  const supabase = React.useMemo(() => createClient(), []);
  const [schedule, setSchedule] = React.useState<LoungeSchedule>({ seasons: [], closures: [] });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const reload = React.useCallback(async () => {
    if (loungeId) setSchedule(await listLoungeSchedule(supabase, loungeId));
  }, [supabase, loungeId]);

  React.useEffect(() => {
    if (!loungeId) return;
    let active = true;
    listLoungeSchedule(supabase, loungeId).then((next) => {
      if (active) setSchedule(next);
    });
    return () => {
      active = false;
    };
  }, [supabase, loungeId]);

  const api = React.useMemo<ScheduleApi>(() => {
    if (loungeId) {
      return {
        saveSeason: (input) => saveLoungeSeason(supabase, loungeId, input).then(() => undefined),
        deleteSeason: (id) => deleteLoungeSeason(supabase, id),
        saveClosure: (input) => saveLoungeClosure(supabase, loungeId, input).then(() => undefined),
        deleteClosure: (id) => deleteLoungeClosure(supabase, id),
        bookings: (from, to) => closureBookings(supabase, loungeId, from, to),
      };
    }
    const byStart = <T extends { startsOn: string }>(items: T[]) => [...items].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
    return {
      saveSeason: async (input) => {
        const season = { ...input, name: input.name.trim(), id: input.id ?? `local-${crypto.randomUUID()}` };
        setSchedule((current) => ({ ...current, seasons: byStart([...current.seasons.filter((other) => other.id !== season.id), season]) }));
      },
      deleteSeason: async (id) => setSchedule((current) => ({ ...current, seasons: current.seasons.filter((season) => season.id !== id) })),
      saveClosure: async (input) => {
        const closure = { ...input, reason: input.reason.trim(), id: input.id ?? `local-${crypto.randomUUID()}` };
        setSchedule((current) => ({ ...current, closures: byStart([...current.closures.filter((other) => other.id !== closure.id), closure]) }));
      },
      deleteClosure: async (id) => setSchedule((current) => ({ ...current, closures: current.closures.filter((closure) => closure.id !== id) })),
      // Un lounge nuevo no tiene reservas.
      bookings: async () => [],
    };
  }, [supabase, loungeId]);

  const run = React.useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      setError("");
      try {
        await action();
        await reload();
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something went wrong");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  return { schedule, busy, error, run, api };
}

/** Las dos secciones, debajo de "Operating hours". */
export function LoungeScheduleCards({
  loungeName,
  regularWeek,
  state,
}: {
  loungeName: string;
  regularWeek: string[];
  state: ReturnType<typeof useLoungeSchedule>;
}) {
  const { schedule, busy, error, run, api } = state;
  return (
    <>
      <SeasonsCard seasons={schedule.seasons} regularWeek={regularWeek} busy={busy} run={run} api={api} />
      <ClosuresCard
        loungeName={loungeName}
        closures={schedule.closures}
        schedule={schedule}
        regularWeek={regularWeek}
        busy={busy}
        run={run}
        api={api}
      />
      {error ? (
        <p role="alert" className="m-0 text-[13px] font-bold text-accent-strong">
          {error}
        </p>
      ) : null}
    </>
  );
}
