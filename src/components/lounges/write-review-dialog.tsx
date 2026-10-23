"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, CalendarDays, Check, ChevronLeft, Loader2, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Notice } from "@/components/ui/notice";
import {
  REVIEW_BODY_MAX,
  REVIEW_MENTIONS,
  REVIEW_MENTIONS_MAX,
  submitReview,
  type ReviewableVisit,
} from "@/lib/reviews";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 3.1 — escribir la reseña de una visita. Artboards
 * `WriteReview{Empty,Filled,Submitting,Error,Sent,PickVisit}.dc.html`
 * (desktop, modal de 560px) y sus `…Mobile` (hoja desde abajo, sin
 * "Cancel"). Una reseña por visita: con varias visitas sin reseñar se
 * elige primero cuál.
 */

const RATING_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"] as const;

type Step = "pick" | "form" | "sent";

export function WriteReviewDialog({
  open,
  onOpenChange,
  loungeName,
  visits: initialVisits,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loungeName: string;
  /**
   * Visitas con check-in sin reseñar, la más reciente primero. Se fijan al
   * abrir: `onPosted` refresca la lista de quien abre el diálogo y no debe
   * quitarle la visita al aviso de "Thank you".
   */
  visits: ReviewableVisit[];
  onPosted: () => void;
}) {
  const [visits] = React.useState(initialVisits);
  const [step, setStep] = React.useState<Step>(visits.length > 1 ? "pick" : "form");
  const [visitId, setVisitId] = React.useState(visits[0]?.bookingId ?? "");
  const [rating, setRating] = React.useState(0);
  const [body, setBody] = React.useState("");
  const [mentions, setMentions] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const visit = visits.find((candidate) => candidate.bookingId === visitId) ?? visits[0];
  const multiple = visits.length > 1;

  function toggleMention(label: string) {
    setMentions((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  }

  async function post() {
    if (!visit || rating === 0) return;
    setSubmitting(true);
    setFailed(false);
    try {
      await submitReview(createClient(), { bookingId: visit.bookingId, rating, body, mentions });
      setStep("sent");
      onPosted();
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!visit) return null;

  const title = step === "pick" ? "Which visit?" : step === "sent" ? "Thank you" : loungeName;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50" style={{ background: "var(--scrim)" }} />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex flex-col overflow-y-auto bg-surface focus:outline-none",
            "inset-x-0 bottom-0 max-h-[92dvh] gap-5 rounded-t-panel px-5 pb-7 pt-3 shadow-[0_-20px_50px_-20px_rgb(34_26_20_/_0.45)]",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[820px] sm:w-[calc(100%-32px)] sm:max-w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:gap-6 sm:rounded-panel sm:p-8 sm:shadow-[0_30px_60px_-20px_rgb(34_26_20_/_0.45)]",
          )}
        >
          <span aria-hidden className="h-1 w-10 self-center rounded-[2px] bg-line sm:hidden" />
          <Dialog.Close
            aria-label="Close"
            className="absolute right-3 top-5 flex size-11 cursor-pointer items-center justify-center rounded-control bg-blush-1 text-ink-700 sm:right-4 sm:top-4"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </Dialog.Close>

          {step === "sent" ? (
            <div className="flex flex-col items-center gap-3.5 px-2 pb-2 pt-7 text-center">
              <span className="flex size-18 items-center justify-center rounded-full bg-gold-100">
                <Check size={32} strokeWidth={1.8} className="text-gold-600" aria-hidden />
              </span>
              <Dialog.Title className="text-[32px] text-fg">{title}</Dialog.Title>
              <p className="m-0 max-w-[380px] text-[14.5px] leading-[1.6] text-fg-muted">
                Your review of {loungeName} for your visit on {visit.dateLabel} is now live on the
                lounge&apos;s profile.
              </p>
              <Stars value={rating} size={22} />
              <Dialog.Close asChild>
                <Button size="md" className="mt-2 w-full sm:w-auto">
                  Done
                </Button>
              </Dialog.Close>
            </div>
          ) : step === "pick" ? (
            <>
              <div className="flex flex-col gap-1.5 pr-13">
                <Eyebrow>Write a review</Eyebrow>
                <Dialog.Title className="text-[30px] leading-[1.15] text-fg">{title}</Dialog.Title>
                <p className="m-0 mt-1 text-sm leading-[1.55] text-fg-muted">
                  You have {visits.length} visits to {loungeName} without a review. Choose the one
                  you&apos;d like to review.
                </p>
              </div>
              <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
                <legend className="sr-only">Visit to review</legend>
                {visits.map((candidate) => {
                  const selected = candidate.bookingId === visitId;
                  return (
                    <label
                      key={candidate.bookingId}
                      className={cn(
                        "flex min-h-16 cursor-pointer items-center gap-3.5 rounded-[14px] px-4 py-3 transition-colors duration-150",
                        selected ? "border-[1.5px] border-gold-500 bg-blush-2" : "border border-line bg-surface",
                      )}
                    >
                      <input
                        type="radio"
                        name="visit"
                        checked={selected}
                        onChange={() => setVisitId(candidate.bookingId)}
                        className="m-0 size-4.5 accent-gold-600"
                      />
                      <span className="flex flex-1 flex-col gap-0.5">
                        <span className="text-[15px] font-bold text-fg">{candidate.dateLabel}</span>
                        <span className="text-[12.5px] text-fg-muted">{candidate.checkedInLabel}</span>
                      </span>
                      <span className="text-[12.5px] font-bold tracking-[0.04em] text-fg-muted">
                        {candidate.reference}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="secondary" size="md" className="hidden sm:inline-flex">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button size="md" className="w-full sm:w-auto" onClick={() => setStep("form")}>
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 pr-13">
                {multiple ? (
                  <button
                    type="button"
                    onClick={() => setStep("pick")}
                    className="flex min-h-8 cursor-pointer items-center gap-1 self-start border-0 bg-transparent p-0 text-[13px] font-semibold text-gold-600"
                  >
                    <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
                    Choose another visit
                  </button>
                ) : null}
                <Eyebrow>Write a review</Eyebrow>
                <Dialog.Title className="text-[30px] leading-[1.15] text-fg">{title}</Dialog.Title>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-fg-muted">
                  <CalendarDays size={15} strokeWidth={1.6} className="text-gold-600" aria-hidden />
                  <span>
                    Your visit on <strong className="text-fg">{visit.dateLabel}</strong>
                  </span>
                  <span aria-hidden>·</span>
                  <span className="font-bold tracking-[0.04em]">{visit.reference}</span>
                </div>
              </div>

              <div className="flex flex-col gap-5.5">
                <div className="flex flex-col gap-2">
                  <span id="rv-rating" className="text-sm font-bold text-fg">
                    Your rating <span className="text-accent-strong">*</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div role="radiogroup" aria-labelledby="rv-rating" className="flex gap-0.5">
                      {RATING_LABELS.map((_, index) => {
                        const value = index + 1;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={rating === value}
                            aria-label={value === 1 ? "1 star" : `${value} stars`}
                            onClick={() => setRating(value)}
                            className="flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
                          >
                            <Star
                              size={32}
                              strokeWidth={1.4}
                              aria-hidden
                              className={value <= rating ? "fill-gold-500 text-gold-600" : "text-fg-subtle"}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-sm font-semibold text-fg-muted">
                      {rating ? RATING_LABELS[rating - 1] : "Tap a star to rate"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="rv-text" className="text-sm font-bold text-fg">
                    Tell other members about your visit{" "}
                    <span className="font-medium text-fg-subtle">(optional)</span>
                  </label>
                  <textarea
                    id="rv-text"
                    maxLength={REVIEW_BODY_MAX}
                    rows={4}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="The atmosphere, the service, what made it worth it…"
                    className="min-h-28 w-full resize-y rounded-control border border-line bg-blush-2 px-4 py-3.5 text-[14.5px] leading-[1.55] text-fg"
                  />
                  <span className="self-end text-xs text-fg-subtle">
                    {body.length} / {REVIEW_BODY_MAX}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span id="rv-tags" className="text-sm font-bold text-fg">
                      What stood out
                    </span>
                    <span className="text-xs text-fg-subtle">
                      Up to {REVIEW_MENTIONS_MAX} · {mentions.length} selected
                    </span>
                  </div>
                  <div role="group" aria-labelledby="rv-tags" className="flex flex-wrap gap-2">
                    {REVIEW_MENTIONS.map((label) => {
                      const pressed = mentions.includes(label);
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={pressed}
                          disabled={!pressed && mentions.length >= REVIEW_MENTIONS_MAX}
                          onClick={() => toggleMention(label)}
                          className={cn(
                            "h-10 cursor-pointer rounded-full border px-4 text-[13.5px] font-semibold transition-colors duration-150",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            pressed ? "border-ink-900 bg-ink-900 text-surface" : "border-line bg-surface text-fg",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {failed ? (
                <Notice
                  role="alert"
                  tone="attention"
                  icon={<AlertCircle size={18} strokeWidth={1.6} className="shrink-0 text-accent-strong" aria-hidden />}
                >
                  We couldn&apos;t post your review. Your text is kept — please try again.
                </Notice>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-line pt-5">
                <Dialog.Close asChild>
                  <Button variant="secondary" size="md" disabled={submitting} className="hidden sm:inline-flex">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button size="md" className="w-full sm:w-auto" disabled={rating === 0 || submitting} onClick={post}>
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden />
                      Posting…
                    </>
                  ) : failed ? (
                    "Try again"
                  ) : (
                    "Post review"
                  )}
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Stars({ value, size }: { value: number; size: number }) {
  return (
    <div role="img" aria-label={`${value} out of 5 stars`} className="flex gap-0.5">
      {RATING_LABELS.map((_, index) => (
        <Star
          key={index}
          size={size}
          strokeWidth={1.4}
          aria-hidden
          className={index < value ? "fill-gold-500 text-gold-600" : "text-fg-subtle"}
        />
      ))}
    </div>
  );
}
