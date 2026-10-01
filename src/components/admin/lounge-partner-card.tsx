import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";

import { PartnerStatusChip } from "@/components/admin/partner-status-chip";
import type { LoungePartnerSummary } from "@/lib/admin-content";

/**
 * Story 10.5 — LoungePartner.dc.html (Fase 10 · 10): el partner de un lounge
 * en solo lectura, con su representante y "Open partner". El partner y sus
 * usuarios se gestionan en /admin/partners, nunca desde el lounge.
 */
export function LoungePartnerCard({ partner }: { partner: LoungePartnerSummary | null }) {
  const initials = (partner?.name ?? "")
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

  return (
    <section aria-label="Partner" className="rounded-content border border-line bg-dark-card px-5 py-4.5">
      <div className="flex items-center gap-3">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Partner</p>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-fg-subtle">
          <Lock size={13} strokeWidth={1.8} aria-hidden />
          Managed in Partners
        </span>
      </div>
      {partner ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gold-600 bg-accent/14 font-display text-[17px] text-accent">
              {initials || "—"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="m-0 truncate text-sm font-bold text-fg">{partner.name}</p>
                <PartnerStatusChip status={partner.status} />
              </div>
              <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">
                {[`${partner.loungeCount} ${partner.loungeCount === 1 ? "lounge" : "lounges"}`, `${partner.userCount} ${partner.userCount === 1 ? "user" : "users"}`, partner.city]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="mt-3 border-t border-line/60 pt-3">
            <p className="m-0 text-[11px] font-bold text-fg-subtle">Representative</p>
            {partner.representative ? (
              <>
                <p className="m-0 mt-1.5 text-[13px] font-bold text-fg">{partner.representative.name}</p>
                <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{partner.representative.email}</p>
              </>
            ) : (
              <p className="m-0 mt-1.5 text-[12.5px] italic text-fg-subtle">No users yet</p>
            )}
          </div>
          <Link
            href={`/admin/partners/${partner.id}`}
            className="mt-3.5 flex h-10 items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-line text-xs font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
          >
            Open partner
            <ChevronRight size={14} strokeWidth={1.8} className="text-accent" aria-hidden />
          </Link>
        </>
      ) : (
        <p className="mb-0 mt-3 text-[12.5px] text-fg-subtle">No partner yet. Pick one when the lounge is a draft.</p>
      )}
    </section>
  );
}
