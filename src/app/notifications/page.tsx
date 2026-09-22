"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Cake,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  CreditCard,
  MapPin,
  Moon,
  Settings,
  Tag,
} from "lucide-react";

import { NotificationBellMenu } from "@/components/account/notification-bell-menu";
import { RequireSession } from "@/components/onboarding/require-session";
import { NotificationRow } from "@/components/ui/notification-row";
import { AlwaysOnChip } from "@/components/ui/switch";
import { AppShell } from "@/components/patterns/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  QUIET_HOURS,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationCategory,
  type NotificationIcon,
  type NotificationItem,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 6.2 — centro de notificaciones completo, backend real
 * (`Notifications.dc.html`). `RequireSession` porque RLS exige `auth.uid()`
 * para leer `notifications`, igual que el resto de pantallas de miembro ya
 * conectadas (`/my-pass`, `/explore`…).
 */
const ICONS: Record<NotificationIcon, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  morning: CalendarClock,
  birthday: Cake,
  booking: CircleCheck,
  lounge: MapPin,
  membership: CreditCard,
  offer: Tag,
};

const CATEGORY_FILTERS: { value: NotificationCategory | "all"; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "bookings", label: "Bookings" },
  { value: "lounges", label: "Lounges" },
  { value: "offers", label: "Offers" },
  { value: "membership", label: "Membership" },
];

export default function NotificationsPage() {
  return (
    <RequireSession>
      <NotificationsScreen />
    </RequireSession>
  );
}

function NotificationsScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [filter, setFilter] = React.useState<NotificationCategory | "all">("all");
  /** El fetch inicial puede resolver DESPUÉS de un "mark (all) as read" bien
   * temprano — sin esta guarda, esa resolución tardía pisaría el marcado
   * optimista con el estado sin leer que traía del servidor. Mismo patrón
   * que el toggle de favorito en `/lounges/[id]`. */
  const mutatedRef = React.useRef(false);

  React.useEffect(() => {
    let active = true;
    fetchNotifications(supabase).then((fetched) => {
      if (active && !mutatedRef.current) setItems(fetched);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const visible = items.filter((item) => filter === "all" || item.category === filter);

  function markRead(id: string) {
    mutatedRef.current = true;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    markNotificationRead(supabase, id).catch(() => {});
  }

  function markAllRead() {
    mutatedRef.current = true;
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    markAllNotificationsRead(supabase).catch(() => {});
  }

  return (
    <AppShell padded={false}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-3.5 border-b border-line bg-surface px-8">
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="-ml-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[9px] text-fg-subtle transition-colors duration-150 hover:bg-accent-soft hover:text-fg"
          >
            <ArrowLeft size={18} strokeWidth={1.9} aria-hidden />
          </button>
          <span className="text-[13.5px] font-bold text-fg">Notifications</span>
          <div className="flex-1" />
          <NotificationBellMenu />
          <button
            type="button"
            onClick={markAllRead}
            className={cn(buttonVariants({ variant: "secondary", size: "md" }), "normal-case")}
          >
            <CheckCheck size={16} strokeWidth={1.9} className="text-gold-600" aria-hidden />
            Mark all as read
          </button>
          <Link href="/profile/notifications" className={cn(buttonVariants({ variant: "secondary", size: "md" }), "normal-case")}>
            <Settings size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
            Settings
          </Link>
        </div>

        <div className="flex flex-1 gap-7 overflow-y-auto px-10 pb-7.5 pt-8">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-[34px] text-fg">Notifications</h1>
            <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
              Anything about a booking reaches you first. Everything else, at most once a day.
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              {visible.map((item) => {
                const Icon = ICONS[item.icon];
                return (
                  <NotificationRow
                    key={item.id}
                    icon={<Icon size={19} strokeWidth={1.7} className="text-gold-600" aria-hidden />}
                    title={item.title}
                    body={item.body}
                    time={item.time}
                    read={item.read}
                    onMarkRead={() => markRead(item.id)}
                    actions={
                      item.showBookingActions ? (
                        <div className="mt-3 flex gap-2.5">
                          <Button size="md" type="button" onClick={(e) => e.stopPropagation()}>
                            View pass
                          </Button>
                          <Button
                            variant="secondary"
                            size="md"
                            type="button"
                            className="normal-case"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Directions
                          </Button>
                        </div>
                      ) : item.linkLabel ? (
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2.5 block cursor-pointer text-[12.5px] font-bold text-accent-strong"
                        >
                          {item.linkLabel}
                        </button>
                      ) : undefined
                    }
                  />
                );
              })}
            </div>

            <p className="m-0 mt-3.5 text-xs text-fg-subtle">
              Notifications older than 30 days are cleared automatically.
            </p>
          </div>

          <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
            <div className="rounded-content border border-line bg-surface p-5 shadow-content">
              <p className="m-0 mb-3.5 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Show</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={cn(
                      "rounded-pill px-4 py-2 text-[12.5px] font-semibold transition-colors duration-150",
                      filter === value
                        ? "bg-accent text-on-accent"
                        : "border border-line text-fg-muted hover:border-accent",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-content border border-line bg-surface p-5 shadow-content">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">How you hear from us</p>
              <div className="mt-3.5 flex flex-col gap-3">
                <ChannelSummaryRow label="Push on this device" value="On" />
                <ChannelSummaryRow label="Email for bookings" value={<AlwaysOnChip />} />
                <ChannelSummaryRow label="SMS" value="Off" muted />
              </div>
              <div className="my-3.5 h-px bg-line" />
              <Link href="/profile/notifications" className="text-[12.5px] font-bold text-accent-strong">
                Notification settings
              </Link>
            </div>

            <div className="flex items-start gap-2.5 rounded-content border border-line bg-surface-sunken p-4">
              <Moon size={17} strokeWidth={1.7} className="mt-0.5 shrink-0 text-gold-600" aria-hidden />
              <p className="m-0 text-xs leading-[1.55] text-fg-muted">
                Quiet hours are on from {QUIET_HOURS.start} to {QUIET_HOURS.end}. Only booking alerts come through.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ChannelSummaryRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("flex-1 text-[12.5px]", muted ? "text-fg-subtle" : "text-fg-muted")}>{label}</span>
      {typeof value === "string" ? (
        <span className={cn("text-xs font-bold", muted ? "text-fg-subtle" : "text-fg")}>{value}</span>
      ) : (
        value
      )}
    </div>
  );
}
