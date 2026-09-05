"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { ArrowUpRight, Clock, Sparkles, UserCheck, XCircle } from "lucide-react";

import { NotificationBellButton } from "@/components/ui/notification-bell-button";
import { NotificationRow } from "@/components/ui/notification-row";
import { type PartnerActivityItem, unreadPartnerActivityCount } from "@/lib/partner";

/**
 * DESIGN-SYSTEM.md §5 patrón 17 — Panel de actividad (oscuro), gemelo del
 * patrón 14. Reutiliza `NotificationBellButton` y `NotificationRow` — la
 * misma anatomía, resuelta en oscuro por `data-theme`. Artboard: LiveUpdate.dc.html.
 *
 * "See all activity" no enlaza a ningún sitio: ninguna de las tres historias
 * del Epic 7 diseña un centro de actividad aparte (a diferencia de
 * "Notifications", Story 6.2), así que queda como texto, no como enlace —
 * mismo criterio que "Write a review" en el Epic 3.
 */
const ICONS: Record<PartnerActivityItem["kind"], React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  "new-booking": Sparkles,
  "checked-in": UserCheck,
  "no-show": Clock,
  cancellation: XCircle,
  "waitlist-promotion": ArrowUpRight,
};

export function ActivityPanel({
  items,
  onMarkAllRead,
  onMarkRead,
}: {
  items: PartnerActivityItem[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const unread = unreadPartnerActivityCount(items);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <NotificationBellButton
          unreadCount={unread}
          active={open}
          aria-label={unread > 0 ? `Today's activity, ${unread} unread` : "Today's activity"}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          data-theme="dark"
          align="end"
          sideOffset={10}
          className="z-50 w-[400px] overflow-hidden rounded-content border border-line bg-dark-card shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-4.5 py-4">
            <p className="m-0 flex-1 text-[13.5px] font-bold text-fg">Today&apos;s activity</p>
            <button type="button" onClick={onMarkAllRead} className="cursor-pointer text-xs font-bold text-accent-strong">
              Mark all as read
            </button>
          </div>

          <div className="flex max-h-[380px] flex-col gap-2 overflow-y-auto p-3">
            {items.map((item) => {
              const Icon = ICONS[item.kind];
              return (
                <NotificationRow
                  key={item.id}
                  icon={<Icon size={16} strokeWidth={1.8} className="text-accent" aria-hidden />}
                  title={item.title}
                  body={item.body}
                  time={item.time}
                  read={item.read}
                  onMarkRead={() => onMarkRead(item.id)}
                  actions={
                    item.emailHref ? (
                      <a
                        href={item.emailHref}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-2 inline-block text-xs font-bold text-accent-strong"
                      >
                        View email
                      </a>
                    ) : null
                  }
                />
              );
            })}
          </div>

          <div className="flex items-center justify-center border-t border-line bg-panel-black p-3.5">
            <span className="text-[12.5px] font-bold text-accent-strong">See all activity</span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
