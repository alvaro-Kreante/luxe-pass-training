import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { ADMIN_CARD, ADMIN_EYEBROW } from "@/components/admin/partner-details-card";
import { StatusChip } from "@/components/ui/status-chip";
import type { AdminPartnerLounge } from "@/lib/admin-partners";

/**
 * Story 10.3 — "Lounges" de PartnerDetail.dc.html (3): los lounges del
 * partner con su status; "Open lounge" abre la vista de lounge que ya existe
 * (`/admin/lounges/[id]`). Se vinculan desde el formulario del lounge.
 */
export function PartnerLoungesCard({ lounges, hint }: { lounges: AdminPartnerLounge[]; hint: string }) {
  return (
    <div className={ADMIN_CARD}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={ADMIN_EYEBROW}>Lounges · {lounges.length}</p>
        <div className="flex-1" />
        <p className="m-0 text-[11.5px] text-fg-subtle">{hint}</p>
      </div>
      {lounges.length === 0 ? (
        <p className="mb-0 mt-3 rounded-[14px] border-[1.5px] border-dashed border-line px-4 py-4.5 text-center text-[12.5px] text-fg-subtle">
          No lounges yet. Pick this partner when you create a lounge.
        </p>
      ) : (
        <ul aria-label="Lounges" className="m-0 mt-2.5 list-none p-0">
          {lounges.map((lounge) => (
            <li
              key={lounge.id}
              aria-label={lounge.name}
              className="flex flex-wrap items-center gap-3 border-t border-line/60 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[13px] font-bold text-fg">{lounge.name}</p>
                <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">
                  {lounge.area} · capacity {lounge.capacity}
                </p>
              </div>
              {lounge.contentStatus === "suspended" ? (
                <>
                  <span className="text-[11px] text-fg-subtle">
                    {lounge.suspendedBy === "partner" ? "was live" : "suspended by admin"}
                  </span>
                  <StatusChip available={false}>Suspended</StatusChip>
                </>
              ) : lounge.contentStatus === "draft" ? (
                <StatusChip dashed>Draft</StatusChip>
              ) : (
                <StatusChip available outlined>
                  Live
                </StatusChip>
              )}
              <Link
                href={`/admin/lounges/${lounge.id}`}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border-[1.5px] border-line px-3 text-xs font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
              >
                Open lounge
                <ChevronRight size={14} strokeWidth={1.8} className="text-accent" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
