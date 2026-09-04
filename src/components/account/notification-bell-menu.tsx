"use client";

import * as React from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Cake, CalendarClock, CircleCheck, CreditCard, MapPin, Tag } from "lucide-react";

import { NotificationBellButton } from "@/components/ui/notification-bell-button";
import { NotificationRow } from "@/components/ui/notification-row";
import { NOTIFICATIONS, unreadNotificationCount, type NotificationIcon, type NotificationItem } from "@/lib/notifications";

/**
 * DESIGN-SYSTEM.md §5 patrón 14 — Panel de notificaciones. Desplegable de
 * 380px anclado a la campana, con el aviso recién llegado. `MorningAlert.dc.html`
 * dibuja este panel abierto; `Notifications.dc.html` es el centro completo
 * al que enlaza "See all notifications".
 */
const ICONS: Record<NotificationIcon, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  morning: CalendarClock,
  birthday: Cake,
  booking: CircleCheck,
  lounge: MapPin,
  membership: CreditCard,
  offer: Tag,
};

export function NotificationBellMenu() {
  const [items, setItems] = React.useState<NotificationItem[]>(NOTIFICATIONS);
  const [open, setOpen] = React.useState(false);
  const unread = unreadNotificationCount(items);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <NotificationBellButton unreadCount={unread} active={open} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-50 w-[380px] overflow-hidden rounded-content border border-line bg-surface shadow-[0_30px_60px_-20px_rgba(34,26,20,0.32)]"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-4.5 py-4">
            <p className="m-0 flex-1 text-[13.5px] font-bold text-fg">Notifications</p>
            <button
              type="button"
              onClick={() => setItems((current) => current.map((item) => ({ ...item, read: true })))}
              className="cursor-pointer text-xs font-semibold text-accent-strong"
            >
              Mark all as read
            </button>
          </div>

          <div className="flex max-h-[380px] flex-col gap-2 overflow-y-auto p-3">
            {items.slice(0, 5).map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <NotificationRow
                  key={item.id}
                  icon={<Icon size={17} strokeWidth={1.7} className="text-gold-600" aria-hidden />}
                  title={item.title}
                  body={item.body}
                  time={item.time}
                  read={item.read}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-center border-t border-line bg-surface-subtle p-3.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[12.5px] font-bold text-accent-strong"
            >
              See all notifications
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
