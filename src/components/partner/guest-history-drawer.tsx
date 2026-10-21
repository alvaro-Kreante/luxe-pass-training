"use client";

import * as React from "react";
import { Mail } from "lucide-react";

import { Drawer } from "@/components/patterns/drawer";
import { StatusChip } from "@/components/ui/status-chip";
import { today } from "@/lib/availability";
import {
  type GuestVisit,
  type PartnerGuestHistoryRow,
  type RepeatGuestRow,
  formatCurrency,
  loyaltyTier,
  mapGuestHistoryRow,
} from "@/lib/partner";
import { createClient } from "@/lib/supabase/client";

/**
 * "Guests" — ficha del invitado con su historial en los lounges del partner.
 * Reutiliza el drawer oscuro de GuestDetail.dc.html (§5 patrón 18, 472px):
 * la cabecera de datos es la misma; la lista "Visit history" no está en el
 * artboard (desviación anotada en COMPONENT-MAP.md). `loungeId` null = "All
 * lounges": el historial de todos los lounges del partner.
 */
export function GuestHistoryDrawer({
  guest,
  loungeId,
  onOpenChange,
}: {
  guest: RepeatGuestRow | null;
  loungeId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [loaded, setLoaded] = React.useState<{ key: string; visits: GuestVisit[] } | null>(null);
  const memberId = guest?.memberId;
  const key = `${memberId}:${loungeId}`;
  const visits = loaded?.key === key ? loaded.visits : null;

  React.useEffect(() => {
    if (!memberId) return;
    let active = true;
    supabase
      .rpc("partner_guest_history", { p_member_id: memberId, p_lounge_id: loungeId })
      .then(({ data }) => {
        if (!active) return;
        const todayIso = today();
        setLoaded({
          key: `${memberId}:${loungeId}`,
          visits: ((data ?? []) as PartnerGuestHistoryRow[]).map((row) => mapGuestHistoryRow(row, todayIso)),
        });
      });
    return () => {
      active = false;
    };
  }, [supabase, memberId, loungeId]);

  if (!guest) return null;
  const tier = loyaltyTier(guest.visits);

  return (
    <Drawer open onOpenChange={onOpenChange} width={472} dark title={guest.name}>
      <div className="grid grid-cols-2 gap-x-5 gap-y-4.5">
        <DetailField label="Visits" value={String(guest.visits)} />
        <DetailField label="Loyalty" value={tier === "regular" ? "Regular" : tier === "returning" ? "Returning" : "First visit"} />
        <DetailField label="First visit" value={guest.firstVisitLabel} />
        <DetailField label="Last visit" value={guest.lastVisitLabel} />
        <DetailField label="Attributed" value={formatCurrency(guest.attributed)} />
      </div>

      {guest.email ? (
        <>
          <div className="my-5.5 h-px bg-line" />
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Contact</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-panel-black px-4 py-3.5">
            <Mail size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
            <span className="flex-1 text-[13px] text-fg">{guest.email}</span>
          </div>
        </>
      ) : null}

      <div className="my-5.5 h-px bg-line" />

      <p id="guest-visit-history" className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
        Visit history
      </p>
      {visits === null ? (
        <p className="m-0 mt-3 text-[13px] text-fg-subtle">Loading…</p>
      ) : (
        <ul aria-labelledby="guest-visit-history" className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
          {visits.map((visit) => (
            <li key={visit.id} className="rounded-xl border border-line bg-panel-black px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-[13px] font-bold text-fg">{visit.loungeName}</span>
                <span className="text-[13px] font-bold text-fg">{formatCurrency(visit.paid)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="text-xs text-fg-subtle">
                  {visit.dateLabel} · {visit.slotTime}
                </span>
                <VisitStatusChip status={visit.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

function VisitStatusChip({ status }: { status: GuestVisit["status"] }) {
  if (status === "arrived") return <StatusChip outlined size="sm">Arrived</StatusChip>;
  if (status === "no-show") return <StatusChip dashed size="sm">No-show</StatusChip>;
  if (status === "cancelled")
    return (
      <StatusChip dashed dot={false} size="sm">
        Cancelled
      </StatusChip>
    );
  if (status === "upcoming") return <StatusChip emphasis size="sm">Upcoming</StatusChip>;
  if (status === "waitlisted")
    return (
      <StatusChip available={false} size="sm" className="text-fg-muted">
        Waitlisted
      </StatusChip>
    );
  return (
    <StatusChip available={false} size="sm" className="text-fg-muted">
      Not checked in
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
