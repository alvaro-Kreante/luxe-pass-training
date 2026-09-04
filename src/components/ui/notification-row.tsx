import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Fila de notificación. Sin leer: fondo blanco, sombra
 * de card, icono sobre `--gold-100` y un punto de 8px delante del título.
 * Leída: fondo `--bg-blush-2`, sin sombra, icono sobre blanco.
 */
export function NotificationRow({
  icon,
  title,
  body,
  time,
  read,
  actions,
  /** Marca esta notificación como leída — no hace nada si ya lo estaba. */
  onMarkRead,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  time?: string;
  read: boolean;
  actions?: React.ReactNode;
  onMarkRead?: () => void;
  className?: string;
}) {
  const clickable = Boolean(onMarkRead) && !read;

  return (
    <div
      role="group"
      aria-label={`${title}, ${read ? "read" : "unread"}`}
      onClick={clickable ? onMarkRead : undefined}
      className={cn(
        "flex gap-3.5 rounded-content border border-line p-4 transition-colors duration-150",
        read ? "bg-surface-subtle" : "bg-surface shadow-content",
        clickable && "cursor-pointer hover:bg-surface-subtle",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-9.5 shrink-0 items-center justify-center rounded-[11px]",
          read ? "border border-line bg-surface" : "bg-accent-soft",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!read && <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />}
          <p className={cn("m-0 flex-1 text-sm font-bold", read ? "text-fg-muted" : "text-fg")}>{title}</p>
          {time && <span className="shrink-0 text-xs text-fg-subtle">{time}</span>}
        </div>
        <p className={cn("m-0 mt-1.5 text-[13px] leading-[1.5]", read ? "text-fg-subtle" : "ml-[17px] text-fg-muted")}>
          {body}
        </p>
        {actions}
      </div>
    </div>
  );
}
