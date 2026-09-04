"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, Heart, Shield, SlidersHorizontal, UserRound } from "lucide-react";

import { NotificationBellMenu } from "@/components/account/notification-bell-menu";
import { AppShell } from "@/components/patterns/app-shell";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 patrón 13 — Sección de cuenta con sub-nav, dentro del
 * App shell. Topbar de 64px con la miga "Account › X" + campana, y sub-nav
 * de 232px (Profile details · Preferences · Notifications · Privacy and
 * data · Membership). `Profile.dc.html` / `Preferences.dc.html` /
 * `NotificationSettings.dc.html` / `Privacy.dc.html`.
 *
 * "Membership" no tiene artboard en esta fase (lo diseña el Epic 9), así
 * que queda inerte en el sub-nav — igual que "Write a review" en el Epic 3.
 */
const ACCOUNT_NAV = [
  { id: "profile", href: "/profile", label: "Profile details", icon: UserRound },
  { id: "preferences", href: "/profile/preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "notifications", href: "/profile/notifications", label: "Notifications", icon: Bell },
  { id: "privacy", href: "/profile/privacy", label: "Privacy and data", icon: Shield },
] as const;

export type AccountSection = (typeof ACCOUNT_NAV)[number]["id"];

/** Chip que reemplaza a "Save changes" en las vistas de Account que autoguardan. */
export function SavedIndicatorChip() {
  return (
    <span className="flex items-center gap-1.5 rounded-pill bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-fg">
      <Check size={13} strokeWidth={2.6} className="text-accent-strong" aria-hidden />
      Saved as you change them
    </span>
  );
}

export function AccountShell({
  active,
  breadcrumb,
  topbarRight,
  /**
   * `Profile.dc.html` pone la campana antes de "Save changes" (la acción va
   * de última); el resto de vistas de Account ponen el chip antes de la
   * campana. Mismo topbar, dos órdenes distintos.
   */
  actionAfterBell = false,
  children,
}: {
  active: AccountSection;
  breadcrumb: string;
  /** Botón "Save changes" (Profile) o el chip "Saved as you change them" (el resto). */
  topbarRight: React.ReactNode;
  actionAfterBell?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AppShell padded={false}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line bg-surface px-8">
          <span className="text-[13.5px] font-bold text-fg">Account</span>
          <span className="text-fg-subtle" aria-hidden>
            ›
          </span>
          <span className="text-[13.5px] text-fg-subtle">{breadcrumb}</span>
          <div className="flex-1" />
          {actionAfterBell ? (
            <>
              <NotificationBellMenu />
              {topbarRight}
            </>
          ) : (
            <>
              {topbarRight}
              <NotificationBellMenu />
            </>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav aria-label="Account" className="flex w-[232px] shrink-0 flex-col gap-1 border-r border-line bg-surface p-4">
            <p className="m-0 mb-3 px-3.5 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Account</p>
            {ACCOUNT_NAV.map(({ id, href, label, icon: Icon }) => (
              <Link
                key={id}
                href={href}
                aria-current={active === id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-nav px-3.5 py-3 text-[13.5px] transition-colors duration-150",
                  active === id ? "bg-accent-soft font-bold text-fg" : "font-semibold text-fg-muted hover:bg-accent-soft",
                )}
              >
                <Icon size={18} strokeWidth={1.7} className={active === id ? "text-accent-strong" : "text-fg-subtle"} aria-hidden />
                {label}
              </Link>
            ))}
            <span className="flex cursor-default items-center gap-2.5 rounded-nav px-3.5 py-3 text-[13.5px] font-semibold text-fg-subtle">
              <Heart size={18} strokeWidth={1.7} className="text-fg-subtle" aria-hidden />
              Membership
            </span>
            <div className="flex-1" />
            <p className="m-0 px-3.5 text-[11.5px] leading-[1.55] text-fg-subtle">
              Plan, invoices and referral rewards are managed in Membership.
            </p>
          </nav>

          <div className="min-w-0 flex-1 overflow-y-auto px-10 pb-7 pt-7.5">{children}</div>
        </div>
      </div>
    </AppShell>
  );
}
