"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, CircleCheck, Clock, Mail, Navigation2, Share2, Ticket } from "lucide-react";

import { useBooking } from "@/components/booking/booking-context";
import { AddToCalendarModal } from "@/components/booking/add-to-calendar-modal";
import { ConfirmedVisitCard } from "@/components/booking/confirmed-visit-card";
import { ShareDialog } from "@/components/lounges/share-dialog";
import { AppShell } from "@/components/patterns/app-shell";
import { ConfirmationCard } from "@/components/patterns/confirmation-card";
import { buttonVariants } from "@/components/ui/button";
import { addDays } from "@/lib/availability";
import { bookingReference as computeBookingReference } from "@/lib/booking";
import { contactFor, formatWeekdayDate } from "@/lib/lounge-profile";
import { SAMPLE_MEMBER } from "@/lib/member";
import { cn } from "@/lib/utils";

/**
 * Story 4.1 — "Immediate booking confirmation screen" (`Confirmed.dc.html`).
 * DESIGN-SYSTEM.md §5 patrón 10 para el rail oscuro; el resto es App shell
 * con miga "My Pass › Upcoming visit".
 */
export default function ConfirmedPage() {
  const router = useRouter();
  const { lounge, draft } = useBooking();
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  React.useEffect(() => {
    if (!draft.dateIso || !draft.time) {
      router.replace(`/lounges/${lounge.id}/book`);
    }
  }, [draft.dateIso, draft.time, lounge.id, router]);

  if (!draft.dateIso || !draft.time) return null;

  const contact = contactFor(lounge);
  const reference = computeBookingReference(lounge.id, draft.dateIso, draft.time);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`;
  const cancelDeadline = `${draft.time} on ${formatWeekdayDate(addDays(draft.dateIso, -1))}`;

  return (
    <AppShell padded={false} blurred={calendarOpen || shareOpen}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-8">
          <span className="text-[13.5px] text-fg-subtle">My Pass</span>
          <ChevronRight size={15} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
          <span className="text-[13.5px] font-bold text-fg">Upcoming visit</span>
          <div className="flex-1" />
          <div className="flex items-center gap-2.5">
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center gap-2 rounded-[11px] border-[1.5px] border-line px-4 text-[12.5px] font-bold tracking-[0.06em] text-fg-muted"
            >
              <Navigation2 size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
              Directions
            </a>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex h-10 items-center gap-2 rounded-[11px] border-[1.5px] border-line px-4 text-[12.5px] font-bold tracking-[0.06em] text-fg-muted"
            >
              <Share2 size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
              Share
            </button>
          </div>
        </div>

        <div className="flex flex-1 gap-8 overflow-y-auto px-10 pb-8 pt-8.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-4.5">
              <span className="flex size-18 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                <CircleCheck size={34} strokeWidth={1.7} className="text-accent-strong" aria-hidden />
              </span>
              <div>
                <h1 className="m-0 text-[34px] text-fg">Your visit is confirmed</h1>
                <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
                  A confirmation with your reference number is on its way to{" "}
                  {SAMPLE_MEMBER.email}. You can{" "}
                  <Link
                    href={`/lounges/${lounge.id}/book/receipt`}
                    className="font-semibold text-accent-strong"
                  >
                    view the email receipt
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="mt-6.5">
              <ConfirmedVisitCard />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className={cn(buttonVariants({ size: "lg" }), "flex-1")}
              >
                Add to calendar
              </button>
              <Link
                href="/my-pass"
                className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "flex-1")}
              >
                View in My Pass
              </Link>
            </div>

            <p className="m-0 mb-3 mt-6.5 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">
              What happens next
            </p>
            <div className="flex flex-col gap-3">
              <NextStep icon={Mail} text="A reminder email arrives 24 hours before your visit." />
              <NextStep
                icon={Ticket}
                text="Show your confirmation number at reception when you arrive."
              />
              <NextStep icon={Clock} text={`Cancel free of charge until ${cancelDeadline}.`} />
            </div>
          </div>

          <ConfirmationCard
            eyebrow="Confirmation"
            reference={reference}
            footnote="Screenshot-friendly. Your digital pass also lives in My Pass."
            rows={[
              { label: "Member", value: SAMPLE_MEMBER.name },
              { label: "Lounge", value: lounge.name },
              { label: "Date", value: formatWeekdayDate(draft.dateIso) },
              { label: "Arrival", value: draft.time },
              { label: "Admits", value: "1 member" },
            ]}
          />
        </div>
      </div>

      <AddToCalendarModal
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        lounge={lounge}
        address={contact.address}
        dateIso={draft.dateIso}
        time={draft.time}
        bookingReference={reference}
      />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} lounge={lounge} />
    </AppShell>
  );
}

function NextStep({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
        <Icon size={16} strokeWidth={1.7} className="text-accent-strong" />
      </span>
      <p className="m-0 flex-1 text-[13px] text-fg-muted">{text}</p>
    </div>
  );
}
