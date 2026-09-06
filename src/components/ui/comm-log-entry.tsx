import type { ReactNode } from "react";
import { AlertTriangle, Mail } from "lucide-react";

import type { CommLogEntryData } from "@/lib/admin";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 "Entrada de log de comunicación" — fijada en la Fase 8.
 * Avatar de 36px (circular para una persona, cuadrado `--panel-black` con
 * borde para el sistema o un email automático) + autor/hora/cuerpo. El
 * mensaje del miembro va en una caja con borde dorado; una nota interna
 * lleva el chip discontinuo "Internal note · not sent to the member".
 */
export function CommLogEntry({ entry, className }: { entry: CommLogEntryData; className?: string }) {
  const isInternalNote = entry.kind === "internal-note";
  const isMember = entry.kind === "member";

  return (
    <div className={cn("flex gap-3.5 border-b border-[rgba(58,50,42,0.6)] py-3 last:border-b-0", className)}>
      <Avatar entry={entry} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <p className={cn("m-0 text-[13px] font-bold", isMember ? "text-fg" : "text-fg-muted")}>
            {entry.author}
          </p>
          {isInternalNote ? (
            <span className="inline-flex items-center rounded-pill border border-dashed border-fg-subtle px-2.5 py-1">
              <span className="text-[10.5px] font-bold text-fg-muted">
                Internal note · not sent to the member
              </span>
            </span>
          ) : null}
          <div className="flex-1" />
          <p className="m-0 shrink-0 text-[11.5px] text-fg-subtle">{entry.timestampLabel}</p>
        </div>

        {isMember ? (
          <div className="mt-2 rounded-2xl border border-gold-600 bg-panel-black px-4 py-3.5">
            <p className="m-0 text-[13px] leading-[1.55] text-fg">{entry.body}</p>
          </div>
        ) : (
          <p className="m-0 mt-1.5 text-[12.5px] text-fg-muted">{entry.body}</p>
        )}
      </div>
    </div>
  );
}

function Avatar({ entry }: { entry: CommLogEntryData }) {
  const base = "flex size-9 shrink-0 items-center justify-center font-display text-[13px] font-bold";

  if (entry.kind === "system") {
    return (
      <span aria-hidden className={cn(base, "rounded-[10px] border border-line bg-panel-black")}>
        <AlertTriangle size={17} strokeWidth={1.8} className="text-fg-subtle" />
      </span>
    );
  }

  if (entry.kind === "email-auto") {
    return (
      <span aria-hidden className={cn(base, "rounded-[10px] border border-line bg-panel-black")}>
        <Mail size={17} strokeWidth={1.8} className="text-fg-subtle" />
      </span>
    );
  }

  if (entry.kind === "member") {
    return (
      <span aria-hidden className={cn(base, "rounded-full bg-accent text-on-accent")}>
        {initialsFrom(entry.author)}
      </span>
    );
  }

  if (entry.kind === "internal-note" || entry.kind === "staff-reply") {
    return (
      <span
        aria-hidden
        className={cn(base, "rounded-[10px] border border-gold-600 bg-[rgba(201,168,118,0.16)] text-accent-strong")}
      >
        {initialsFrom(entry.author)}
      </span>
    );
  }

  return (
    <span aria-hidden className={cn(base, "rounded-full bg-accent text-on-accent")}>
      {initialsFrom(entry.author)}
    </span>
  );
}

function initialsFrom(author: string): ReactNode {
  const firstWord = author.split(/[\s·]/)[0] ?? "";
  return firstWord.charAt(0).toUpperCase();
}
