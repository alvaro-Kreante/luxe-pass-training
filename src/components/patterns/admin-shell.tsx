"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  FileBarChart,
  RefreshCw,
  Users,
} from "lucide-react";

import { LogoutButton } from "@/components/patterns/logout-button";
import { NavBadge } from "@/components/ui/nav-badge";
import { displayNameFromEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 patrón 21 — App shell del admin (oscuro), fijado en la
 * Fase 8 sobre la misma anatomía del patrón 15 (partner). Nav propia: Support
 * · Members · Bookings · Partners (Epic 10) · Lounges · Analytics · Reports, donde Support y
 * Lounges pueden llevar el badge de nav con lo pendiente. Bloque de la
 * persona (no del local) abajo, y el chip "Every action logged" en vez del
 * "Live · updated …" del partner en la topbar.
 *
 * Artboard: docs/design/epic-8-admin-support/Main.dc.html
 *
 * "Bookings" queda fuera de las tres historias del Epic 8, igual que
 * "Settings" en `PartnerShell` — declarado en la nav, sin pantalla propia.
 */
const NAV_ITEMS = [
  { href: "/admin/support", label: "Support", icon: ClipboardList, badgeKey: "support" as const },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: null, label: "Bookings", icon: ClipboardList },
  { href: "/admin/partners", label: "Partners", icon: BriefcaseBusiness },
  { href: "/admin/lounges", label: "Lounges", icon: Building2, badgeKey: "lounges" as const },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface AdminShellProps {
  /** Miga de la topbar, p. ej. "Support" o ["Support", "Camille Duforest"]. */
  topbarLabel: React.ReactNode;
  topbarMeta?: React.ReactNode;
  topbarRight?: React.ReactNode;
  /** Recuento pendiente del item "Support" de la nav. */
  supportBadge?: number;
  /** Recuento pendiente del item "Lounges" de la nav. */
  loungesBadge?: number;
  /** §5 patrón 18 — la pantalla de fondo se difumina tras un modal/drawer. */
  blurred?: boolean;
  children: React.ReactNode;
}

export function AdminShell({
  topbarLabel,
  topbarMeta,
  topbarRight,
  supportBadge,
  loungesBadge,
  blurred = false,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const supabase = React.useMemo(() => createClient(), []);
  const [adminEmail, setAdminEmail] = React.useState("");

  React.useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && data.user?.email) setAdminEmail(data.user.email);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const adminName = adminEmail ? displayNameFromEmail(adminEmail) : "Admin";
  const adminInitials = adminName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const onClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const badgeFor = (key: "support" | "lounges" | undefined) => {
    if (key === "support") return supportBadge;
    if (key === "lounges") return loungesBadge;
    return undefined;
  };

  return (
    <div
      data-theme="dark"
      className={cn(
        "flex min-h-screen w-full bg-panel-black lg:h-screen lg:overflow-hidden",
        blurred && onClient && "blur-[3px]",
      )}
    >
      <nav
        aria-label="Admin console"
        className="hidden shrink-0 flex-col border-r border-line bg-panel-black px-4.5 py-7.5 lg:flex lg:h-screen lg:w-[248px]"
      >
        <Image src="/logo.png" alt="En Soleil" width={46} height={49} priority className="mb-3.5 ml-3 h-auto w-[46px]" />
        <p className="m-0 mb-6 ml-3 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
          Admin console
        </p>

        {NAV_ITEMS.map(({ href, label, icon: Icon, badgeKey }) => {
          const current = href ? isCurrent(pathname, href) : false;
          const badgeCount = badgeFor(badgeKey);
          const content = (
            <>
              <Icon size={19} strokeWidth={1.7} className={current ? "text-accent" : "text-fg-subtle"} />
              <span className={cn("text-sm", current ? "font-bold text-fg" : "font-semibold text-fg-muted")}>
                {label}
              </span>
              <div className="flex-1" />
              {typeof badgeCount === "number" ? <NavBadge count={badgeCount} active={current} /> : null}
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

        <div className="flex items-center gap-2.5 border-t border-line pt-4.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-nav border border-gold-600 bg-[rgba(201,168,118,0.14)] font-display text-base text-accent">
            {adminInitials}
          </span>
          <span className="flex-1 overflow-hidden">
            <span className="block truncate text-[13px] font-bold text-fg">{adminName}</span>
            <span className="mt-0.5 block text-[11.5px] text-fg-subtle">Support · En Soleil</span>
          </span>
          <LogoutButton redirectTo="/admin/login" />
        </div>
      </nav>

      <div className="surface-night dot-pattern relative flex flex-1 flex-col overflow-hidden">
        <div className="relative flex h-16 shrink-0 items-center gap-3 border-b border-line bg-[rgba(21,17,13,0.72)] px-6 lg:px-10">
          {topbarLabel}
          {topbarMeta ? <span className="text-[12.5px] text-fg-subtle">{topbarMeta}</span> : null}
          <div className="flex-1" />
          {topbarRight}
          <AuditedChip />
          <AdminRefreshButton />
        </div>

        <main className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6.5 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

/** Chip "Every action logged" de la topbar (patrón 21), en vez del "Live · updated …" del partner. */
function AuditedChip() {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-line px-3.5 py-2">
      <span aria-hidden className="size-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgba(201,168,118,0.28)]" />
      <span className="text-xs font-bold text-fg-muted">Every action logged</span>
    </span>
  );
}

/** Botón fantasma 40×40 de refrescar, igual que en `PartnerShell`. */
export function AdminRefreshButton({ onClick }: { onClick?: () => void }) {
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
