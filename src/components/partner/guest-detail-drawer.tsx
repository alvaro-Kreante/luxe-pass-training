"use client";

import { Mail, Phone, ShieldAlert } from "lucide-react";

import { Drawer } from "@/components/patterns/drawer";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import type { PartnerGuest } from "@/lib/partner";
import { cn } from "@/lib/utils";

/**
 * Story 7.1 — "guest details: name, contact, email", "guest contact
 * information for communication". DESIGN-SYSTEM.md §5 patrón 18 (drawer
 * oscuro, 472px). Artboard: GuestDetail.dc.html.
 */
export function GuestDetailDrawer({
  open,
  onOpenChange,
  guest,
  onMarkArrived,
  onReportNoShow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: PartnerGuest;
  onMarkArrived: (id: string) => void;
  onReportNoShow: (id: string) => void;
}) {
  const actionable = guest.status === "pending" || guest.status === "new-booking";

  return (
    <Drawer open={open} onOpenChange={onOpenChange} width={472} dark title={guest.name}>
      <DrawerBody guest={guest} />

      {actionable ? (
        <div className="mt-6 flex gap-3">
          <Button block onClick={() => onMarkArrived(guest.id)}>
            Mark as arrived
          </Button>
          <Button variant="ghost" className="w-[145px] shrink-0" onClick={() => onReportNoShow(guest.id)}>
            No-show
          </Button>
        </div>
      ) : null}
    </Drawer>
  );
}

function DrawerBody({ guest }: { guest: PartnerGuest }) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2.5">
        <StatusChipForStatus status={guest.status} />
        <span className="text-xs text-fg-subtle">{guest.bookedAgoLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-4.5">
        <DetailField label="Reference" value={guest.id} />
        <DetailField label="Booked arrival" value={guest.arrivalTime} />
        <DetailField label="Admission window" value={guest.admissionWindowLabel} />
        <DetailField label="Admits" value={guest.admissionLabel} />
      </div>

      <div className="my-5.5 h-px bg-line" />

      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Contact</p>
      <ContactRow icon={Mail} value={guest.email} action="Copy" />
      <ContactRow icon={Phone} value={guest.phone} action="Call" className="mt-2.5" />
      <p className="m-0 mt-2.5 text-[11.5px] leading-[1.55] text-fg-subtle">
        Contact details are shown while the booking is open, for reaching this guest about
        today&apos;s visit only.
      </p>

      <div className="mt-5 rounded-xl border border-line bg-panel-black p-4">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
          Special requests
        </p>
        <p className="m-0 mt-2 text-[13px] leading-[1.55] text-fg-muted">{guest.specialRequests}</p>
      </div>

      {guest.emergencyContact ? (
        <div className="mt-3 rounded-xl border border-dashed border-gold-600 bg-panel-black p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
              Emergency contact
            </p>
          </div>
          <p className="m-0 mt-2 text-[13px] font-bold text-fg">{guest.emergencyContact}</p>
          <p className="m-0 mt-1.5 text-[11.5px] leading-[1.5] text-fg-subtle">
            Visible during the visit only. Every access is logged.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StatusChipForStatus({ status }: { status: PartnerGuest["status"] }) {
  if (status === "arrived") return <StatusChip outlined>Arrived</StatusChip>;
  if (status === "new-booking") return <StatusChip emphasis>New booking</StatusChip>;
  if (status === "no-show") return <StatusChip dashed>No-show</StatusChip>;
  if (status === "cancelled") return (
    <StatusChip dashed dot={false}>
      Cancelled
    </StatusChip>
  );
  return (
    <StatusChip available={false} className="text-fg-muted">
      Still to arrive
    </StatusChip>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{label}</p>
      <p className="m-0 mt-1.5 text-sm font-bold text-fg">{value}</p>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  value,
  action,
  className,
}: {
  icon: typeof Mail;
  value: string;
  action: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-3 flex items-center gap-3 rounded-xl border border-line bg-panel-black px-4 py-3.5",
        className,
      )}
    >
      <Icon size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
      <span className="flex-1 text-[13px] text-fg">{value}</span>
      <span className="cursor-pointer text-xs font-bold text-accent-strong">{action}</span>
    </div>
  );
}
