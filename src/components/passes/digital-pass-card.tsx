import Image from "next/image";
import { CircleCheck } from "lucide-react";

import { QrCode } from "@/components/ui/qr-code";
import type { DigitalPass, PassLifecycleState } from "@/lib/passes";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 patrón 11 — Pase digital (rail de 380px). Extiende el
 * patrón 10 (`ConfirmationCard`) con cuatro estados de la misma tarjeta:
 * próxima (neutra), del día (borde dorado + halo, QR primero), con check-in
 * hecho (el QR se sustituye por el medallón) y expirada (grises + sello).
 *
 * Artboards: `Main` (upcoming) · `ArrivalDay` (today) · `CheckedIn` ·
 * `Expired.dc.html`.
 */
export function DigitalPassCard({
  pass,
  state,
  className,
}: {
  pass: DigitalPass;
  state: PassLifecycleState;
  className?: string;
}) {
  const expired = state === "expired";
  const today = state === "today";
  const checkedIn = state === "checked-in";

  return (
    <div
      data-theme="dark"
      className={cn(
        "h-fit w-[380px] shrink-0 overflow-hidden rounded-[24px]",
        expired
          ? "shadow-[0_20px_44px_-22px_rgba(34,26,20,0.22)]"
          : today
            ? "border-2 border-accent shadow-[0_30px_60px_-20px_rgba(34,26,20,0.35),0_0_0_6px_rgba(201,168,118,0.18)]"
            : "shadow-[0_30px_60px_-20px_rgba(34,26,20,0.35)]",
        className,
      )}
    >
      <div
        className={cn(
          "dot-pattern relative px-6.5 pb-6 pt-6.5",
          expired ? "bg-[radial-gradient(circle_at_30%_12%,#2a251f,#191510_68%)]" : "surface-night",
        )}
      >
        {expired && (
          <span
            aria-hidden
            className="absolute left-[-14px] right-[-14px] top-[196px] z-10 flex -rotate-[8deg] justify-center"
          >
            <span className="rounded-lg border-2 border-fg-subtle bg-[rgba(21,17,13,0.72)] px-6.5 py-2.5 text-base font-extrabold uppercase tracking-[0.22em] text-fg-muted">
              Expired
            </span>
          </span>
        )}

        <div className="relative flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="En Soleil"
            width={40}
            height={42}
            className={cn("h-auto w-10", expired && "opacity-[0.55]")}
          />
          {today ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-[rgba(201,168,118,0.18)] px-3 py-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-fg">
                Live today
              </span>
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              {checkedIn ? "In the lounge" : expired ? "Past visit" : "Digital pass"}
            </span>
          )}
        </div>

        {checkedIn ? (
          <div className="relative mt-5.5 text-center">
            <span className="mx-auto flex size-24 items-center justify-center rounded-full border-[1.5px] border-accent bg-[rgba(201,168,118,0.16)]">
              <CircleCheck size={44} strokeWidth={1.7} className="text-accent" aria-hidden />
            </span>
            <h2 className="mt-4.5 font-display text-[30px] text-fg">Checked in</h2>
            <p className="mt-2 text-[12.5px] text-fg-subtle">{pass.checkedInAt}</p>
          </div>
        ) : today ? (
          <div className="relative mt-4.5">
            <div className="rounded-2xl bg-white px-4.5 pb-3 pt-4.5 text-center">
              <QrCode size={212} className="mx-auto" />
              <p className="mt-2.5 text-[11px] text-ink-400">Hold the screen up at the desk</p>
            </div>
            <h2 className="mt-4.5 text-center font-display text-[34px] text-fg">
              {pass.reference}
            </h2>
            <p className="mt-1.5 text-center text-xs text-fg-subtle">Or simply give this number</p>
          </div>
        ) : (
          <div className="relative">
            <h2 className={cn("mt-4.5 font-display text-[40px]", expired ? "text-fg-subtle" : "text-fg")}>
              {pass.reference}
            </h2>
            <p className="mt-2 text-xs text-fg-subtle">
              {expired ? "No longer valid for entry" : "Present this number at reception"}
            </p>
            <div
              className={cn(
                "mt-4.5 rounded-2xl px-4 pb-3 pt-4 text-center",
                expired ? "bg-[#E6DED4]" : "bg-white",
              )}
            >
              <QrCode size={190} className={cn("mx-auto", expired && "opacity-[0.22]")} />
              <p className="mt-2.5 text-[11px] text-ink-400">
                {expired
                  ? `Code deactivated on ${pass.monthDayLabel}`
                  : `Encodes ${pass.reference} · scanning is optional`}
              </p>
            </div>
          </div>
        )}

        <div className="relative my-5 h-px bg-line" />

        <div className="relative flex flex-col gap-3">
          {checkedIn ? (
            <>
              <Row label="Reference" value={pass.reference} muted={expired} />
              <Row label="Member" value={pass.memberName} muted={expired} />
              <Row label="Lounge" value={pass.loungeName} muted={expired} />
              <Row label="Stay until" value={pass.windowCloseTime} muted={expired} />
            </>
          ) : expired ? (
            <>
              <Row label="Member" value={pass.memberName} muted />
              <Row label="Lounge" value={pass.loungeName} muted />
              <Row
                label="Visited"
                value={pass.checkedInAt ? `${pass.shortDateLabel} · ${pass.checkedInAt}` : pass.shortDateLabel}
                muted
              />
              <Row label="Outcome" value={pass.noShow ? "No-show" : "Attended"} muted />
            </>
          ) : today ? (
            <>
              <Row label="Member" value={pass.memberName} />
              <Row label="Today" value={`${pass.arrivalTime} · up to ${pass.stayHours} hours`} />
              <Row label="Admits" value={pass.admission} />
            </>
          ) : (
            <>
              <Row label="Member" value={pass.memberName} />
              <Row label="Lounge" value={pass.loungeName} />
              <Row label="Date" value={pass.shortDateLabel} />
              <Row
                label="Arrival"
                value={`${pass.arrivalTime} · up to ${pass.stayHours} hours`}
              />
              <Row label="Admits" value={pass.admission} />
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white px-5 py-3.5 text-[11.5px] leading-normal text-ink-400">
        <p className="m-0 flex-1">
          {expired
            ? "Passes expire on their own when the booking window closes — nothing to cancel or delete."
            : checkedIn
              ? "The code is now spent — it cannot be used for a second entry."
              : today
                ? "Screen brightness raised automatically so the code scans first time."
                : "Screenshot-friendly. Nothing on this card needs a connection."}
        </p>
        {!expired && !checkedIn && !today && (
          <button
            type="button"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-[var(--border)] px-3.5 text-[11.5px] font-bold tracking-[0.06em] text-ink-700"
          >
            Save image
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-[12.5px]", muted ? "text-fg-subtle" : "text-fg-subtle")}>{label}</span>
      <span className={cn("text-right text-[12.5px] font-bold", muted ? "text-fg-muted" : "text-fg")}>
        {value}
      </span>
    </div>
  );
}
