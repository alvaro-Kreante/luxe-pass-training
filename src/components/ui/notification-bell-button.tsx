import * as React from "react";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Campana de notificaciones. Botón de 40×40, icono de
 * 18px. Inactiva: fondo blanco + borde `--border`. Activa: fondo `--gold-100`
 * + borde `--gold-500`. El badge es una píldora de 19px en `--gold-500`.
 */
export const NotificationBellButton = React.forwardRef<
  HTMLButtonElement,
  {
    unreadCount: number;
    active?: boolean;
    className?: string;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function NotificationBellButton({ unreadCount, active = false, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-[11px] border-[1.5px] transition-colors duration-150",
        active ? "border-accent bg-accent-soft" : "border-line bg-surface",
        className,
      )}
      {...props}
    >
      <Bell size={18} strokeWidth={1.8} className="text-gold-600" aria-hidden />
      {unreadCount > 0 && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-pill border-2 border-surface bg-accent px-1 text-[10px] font-extrabold text-on-accent"
        >
          {unreadCount}
        </span>
      )}
    </button>
  );
});
