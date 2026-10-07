"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, RefreshCw, Settings, Ticket, UsersRound } from "lucide-react";

import { LogoutButton } from "@/components/patterns/logout-button";
import { LoungeSwitcher } from "@/components/partner/lounge-switcher";
import { usePartnerContext } from "@/components/partner/partner-context";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 patrón 15 — App shell del partner (oscuro), gemelo del
 * patrón 3. Sidebar de 248px con la nav del Partner Dashboard (Today · Guests
 * · Analytics · Reports · Settings) y el bloque del local abajo; área de
 * contenido con el radial oscuro y una topbar de 64px.
 *
 * Artboard: docs/design/epic-7-partner-dashboard/Main.dc.html
 *
 * "Guests" y "Settings" quedan fuera de las tres historias del Epic 7 salvo
 * "Guests", que sí tiene artboard propio (`RepeatGuests.dc.html`, Story 7.3
 * "repeat guest identification") — solo "Settings → Notifications" queda
 * declarado en pantalla sin diseñar, igual que "Membership" en el sub-nav de
 * cuenta del Epic 6.
 *
 * Story 10.6 (PartnerToday.dc.html, Fase 10 · 13): el bloque de abajo es el
 * usuario real y su partner (antes `PARTNER_VENUE`, fijo), y la topbar
 * termina con el selector de lounge.
 */
const NAV_ITEMS = [
  { href: "/partner", label: "Today", icon: Ticket },
  { href: "/partner/guests", label: "Guests", icon: UsersRound },
  { href: "/partner/analytics", label: "Analytics", icon: LayoutGrid },
  { href: "/partner/reports", label: "Reports", icon: LayoutGrid },
  { href: null, label: "Settings", icon: Settings },
] as const;

function isCurrent(pathname: string, href: string) {
  if (href === "/partner") return pathname === "/partner";
  return pathname.startsWith(href);
}

export interface PartnerShellProps {
  /** Etiqueta corta de la topbar, p. ej. "Today", "Analytics". */
  topbarLabel: string;
  /** Meta junto a la etiqueta, p. ej. "· Saturday, September 14 · 3:38 PM". */
  topbarMeta?: React.ReactNode;
  /** Controles propios de cada pantalla, a la izquierda de la campana. */
  topbarRight?: React.ReactNode;
  /** §5 patrón 18 — la pantalla de fondo se difumina tras un modal/drawer oscuro. */
  blurred?: boolean;
  /** Story 10.6 — "All lounges" en el selector (Analytics, Guests, Reports; nunca Today). */
  allowAllLounges?: boolean;
  children: React.ReactNode;
}

export function PartnerShell({
  topbarLabel,
  topbarMeta,
  topbarRight,
  blurred = false,
  allowAllLounges = false,
  children,
}: PartnerShellProps) {
  const pathname = usePathname();
  const context = usePartnerContext()?.context ?? null;
  const userName = context ? `${context.user.firstName} ${context.user.lastName}`.trim() : "";
  const userInitials = context ? `${context.user.firstName[0] ?? ""}${context.user.lastName[0] ?? ""}`.toUpperCase() : "";

  const onClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div
      data-theme="dark"
      className={cn(
        "flex min-h-screen w-full bg-panel-black lg:h-screen lg:overflow-hidden",
        blurred && onClient && "blur-[3px]",
      )}
    >
      <nav
        aria-label="Partner dashboard"
        className="hidden shrink-0 flex-col border-r border-line bg-panel-black px-4.5 py-7.5 lg:flex lg:h-screen lg:w-[248px]"
      >
        <Image src="/logo.png" alt="En Soleil" width={46} height={49} priority className="mb-3.5 ml-3 h-auto w-[46px]" />
        <p className="m-0 mb-6 ml-3 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
          Partner dashboard
        </p>

        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const current = href ? isCurrent(pathname, href) : false;
          const content = (
            <>
              <Icon size={19} strokeWidth={1.7} className={current ? "text-accent" : "text-fg-subtle"} />
              <span className={cn("text-sm", current ? "font-bold text-fg" : "font-semibold text-fg-muted")}>
                {label}
              </span>
            </>
          );

          if (!href) {
            return (
              <span
                key={label}
                aria-disabled="true"
                className="mb-1 flex cursor-not-allowed items-center gap-3 rounded-nav px-3.5 py-3 opacity-60"
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "mb-1 flex items-center gap-3 rounded-nav px-3.5 py-3 transition-colors duration-150",
                current ? "bg-[rgba(201,168,118,0.16)]" : "hover:bg-surface-hover",
              )}
            >
              {content}
            </Link>
          );
        })}

        <div className="flex-1" />

        {context ? (
          <div className="flex items-center gap-2.5 border-t border-line pt-4.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-600 bg-[rgba(201,168,118,0.14)] font-display text-sm text-accent">
              {userInitials}
            </span>
            <span className="flex-1 overflow-hidden">
              <span className="block truncate text-[13px] font-bold text-fg">{userName}</span>
              <span className="mt-0.5 block truncate text-[11.5px] text-fg-subtle">{context.partner.name}</span>
            </span>
            <LogoutButton redirectTo="/partner/login" />
          </div>
        ) : null}
      </nav>

      <div className="surface-night dot-pattern relative flex flex-1 flex-col overflow-hidden">
        <div className="relative flex h-16 shrink-0 items-center gap-3 border-b border-line bg-[rgba(21,17,13,0.72)] px-6 lg:px-10">
          <span className="text-[13.5px] font-bold text-fg">{topbarLabel}</span>
          {topbarMeta ? <span className="text-[12.5px] text-fg-subtle">{topbarMeta}</span> : null}
          <div className="flex-1" />
          {topbarRight}
          <LoungeSwitcher allowAll={allowAllLounges} />
        </div>

        <main className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6.5 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

/** Botón fantasma 40×40 de refrescar, común a todas las pantallas del shell. */
export function PartnerRefreshButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Refresh"
      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[11px] border-[1.5px] border-line transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
    >
      <RefreshCw size={17} strokeWidth={1.8} className="text-accent" aria-hidden />
    </button>
  );
}

/** Chip "Live · updated Ns ago" de la topbar (patrón 15). */
export function LiveStatusChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-line px-3.5 py-2">
      <span aria-hidden className="size-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgba(201,168,118,0.28)]" />
      <span className="text-xs font-bold text-fg-muted">{label}</span>
    </span>
  );
}
