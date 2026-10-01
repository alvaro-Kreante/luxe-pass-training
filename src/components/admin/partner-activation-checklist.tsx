import { Check } from "lucide-react";

import { ADMIN_EYEBROW } from "@/components/admin/partner-details-card";
import { cn } from "@/lib/utils";

export interface ActivationItem {
  label: string;
  detail: string;
  done: boolean;
}

/**
 * Story 10.3 — "Ready to activate" del rail de PartnerNew.dc.html (2) y
 * PartnerDetail.dc.html (3), con el botón de activar debajo (`children`).
 * Story 10.4: la misma lista sirve a "When you reactivate" (PartnerSuspended 8).
 */
export function PartnerActivationChecklist({
  items,
  title = "Ready to activate",
  children,
}: {
  items: ActivationItem[];
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-content border border-line bg-dark-card px-5.5 pb-2 pt-5">
      <p id="activation-title" className={ADMIN_EYEBROW}>
        {title}
      </p>
      <ul aria-labelledby="activation-title" className="m-0 mt-2.5 list-none p-0">
        {items.map((item) => (
          <li
            key={item.label}
            aria-label={`${item.label} · ${item.done ? "done" : "pending"}`}
            className="flex gap-2.5 border-t border-line/60 py-2.5"
          >
            {item.done ? (
              <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
                <Check size={12} strokeWidth={3} aria-hidden />
              </span>
            ) : (
              <span className="mt-px size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-fg-subtle" />
            )}
            <div>
              <p className={cn("m-0 text-[12.5px] font-bold", item.done ? "text-fg" : "text-fg-muted")}>{item.label}</p>
              <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

/** La nota del rail: activar es lo que invita, no publicar un lounge. */
export function ActivationNote() {
  return (
    <div className="rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4 py-3.5">
      <p className="m-0 text-[11.5px] leading-[1.55] text-fg-muted">
        Activating sends every user an email to <strong className="text-fg">set their password</strong>. Lounges can be linked to
        a draft partner, but they publish only once it is active.
      </p>
    </div>
  );
}
