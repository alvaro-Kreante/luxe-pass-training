"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { AttendanceCheckbox } from "@/components/ui/attendance-checkbox";
import { StatusChip } from "@/components/ui/status-chip";
import type { PartnerGuest } from "@/lib/partner";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 "Fila de datos (oscura)" + §5 patrón 16 (lista de
 * datos oscura). Artboard: Main.dc.html. Grid `40px 268px 116px 118px 130px
 * 1fr 34px`: casilla, invitado, llegada, referencia, estado, contacto, chevron.
 *
 * A diferencia del artboard, aquí no se pliegan filas por antigüedad — se
 * listan todos los invitados con nombre en todo momento (ver la nota en
 * `PARTNER_GUESTS`, `lib/partner.ts`), para que "guest list display: name,
 * contact, email" (Story 7.1) se pueda comprobar sobre cualquier fila.
 */
const GRID = "grid-cols-[40px_268px_116px_118px_130px_1fr_34px]";

export function GuestListTable({
  guests,
  highlightedId,
  onMarkArrived,
  onOpenDetail,
}: {
  guests: PartnerGuest[];
  highlightedId?: string | null;
  onMarkArrived: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-content border border-line bg-dark-card">
      <div className={cn("grid items-center gap-3.5 border-b border-line px-5.5", GRID)} style={{ height: 42 }}>
        <span />
        <Th>Guest</Th>
        <Th>Arrival</Th>
        <Th>Reference</Th>
        <Th>Status</Th>
        <Th>Contact</Th>
        <span />
      </div>

      {guests.map((guest) => (
        <div
          key={guest.id}
          className={cn(
            "grid items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 transition-colors duration-150 last:border-b-0",
            GRID,
            highlightedId === guest.id && "bg-[rgba(201,168,118,0.09)] shadow-[inset_3px_0_0_var(--gold-500)]",
          )}
          style={{ height: 54 }}
        >
          <AttendanceCheckbox
            status={guest.status === "new-booking" ? "pending" : guest.status}
            label={guest.name}
            onMarkArrived={() => onMarkArrived(guest.id)}
          />

          <button
            type="button"
            onClick={() => onOpenDetail(guest.id)}
            aria-label={`View details for ${guest.name}`}
            className="flex min-w-0 cursor-pointer items-center gap-2.5 text-left"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xs font-bold text-on-accent">
              {guest.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-bold text-fg">{guest.name}</span>
              <span className="block truncate text-[11.5px] text-fg-subtle">
                {guest.membershipLabel} · {guest.visitLabel}
              </span>
            </span>
          </button>

          <span className="text-[13.5px] font-bold text-fg">{guest.arrivalTime}</span>
          <span className="text-[13px] font-bold tracking-[0.04em] text-fg">{guest.id}</span>

          <span>
            <GuestStatusChip status={guest.status} />
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs text-fg-muted">{guest.email}</span>
            <span className="block truncate text-[11.5px] text-fg-subtle">{guest.phone}</span>
          </span>

          <button
            type="button"
            onClick={() => onOpenDetail(guest.id)}
            aria-label={`Open ${guest.name}`}
            className="flex cursor-pointer justify-end text-fg-subtle"
          >
            <ChevronRight size={17} strokeWidth={1.8} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{children}</p>
  );
}

export function GuestStatusChip({ status }: { status: PartnerGuest["status"] }) {
  if (status === "arrived") return <StatusChip outlined>Arrived</StatusChip>;
  if (status === "new-booking") return <StatusChip emphasis>New booking</StatusChip>;
  if (status === "no-show") return <StatusChip dashed>No-show</StatusChip>;
  if (status === "cancelled")
    return (
      <StatusChip dashed dot={false}>
        Cancelled
      </StatusChip>
    );
  return (
    <StatusChip available={false} className="text-fg-muted">
      Pending
    </StatusChip>
  );
}
