"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Building2, Check, ChevronDown, ChevronUp, Info, LayoutGrid } from "lucide-react";

import { usePartnerContext } from "@/components/partner/partner-context";
import { cn } from "@/lib/utils";

/**
 * Story 10.6 — el selector de la cabecera (PartnerToday 13, PartnerLoungeMenu
 * 14, PartnerAnalyticsAll 15 · Fase 10): el partner es texto fijo y solo el
 * lounge es botón. "All lounges" solo en Analytics, Guests y Reports
 * (`allowAll`); Today y el check-in siempre trabajan sobre un lounge.
 */
export function LoungeSwitcher({ allowAll = false }: { allowAll?: boolean }) {
  const partner = usePartnerContext();
  const [open, setOpen] = React.useState(false);
  if (!partner?.context) return null;

  const { context, select } = partner;
  const empty = context.lounges.length === 0;
  const showingAll = allowAll && context.allLounges;
  const current = context.lounges.find((lounge) => lounge.id === context.selectedLoungeId);
  const label = empty ? "No lounges yet" : showingAll ? "All lounges" : current?.name ?? "";
  const initials = context.partner.name
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

  async function choose(loungeId: string | null) {
    setOpen(false);
    await select(loungeId);
  }

  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center rounded-xl border-[1.5px] bg-panel-black",
        open ? "border-accent shadow-ring" : "border-line",
      )}
    >
      <div className="hidden h-full items-center gap-2 border-r border-line pl-1.5 pr-3 md:flex">
        <span className="flex size-7 items-center justify-center rounded-lg border border-gold-600 bg-accent/14 font-display text-xs text-accent">
          {initials || "—"}
        </span>
        <span className="whitespace-nowrap text-[12.5px] font-bold text-fg-muted">{context.partner.name}</span>
      </div>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={empty}
            aria-label={`Lounge: ${label}`}
            className="flex h-full items-center gap-2 rounded-r-[11px] pl-3 pr-3 transition-colors duration-150 hover:bg-surface-hover disabled:cursor-not-allowed"
          >
            {showingAll ? (
              <LayoutGrid size={15} strokeWidth={1.8} className="text-accent" aria-hidden />
            ) : (
              <Building2 size={15} strokeWidth={1.8} className={empty ? "text-fg-subtle" : "text-accent"} aria-hidden />
            )}
            <span className={cn("max-w-[220px] truncate whitespace-nowrap text-[13px] font-bold", empty ? "text-fg-subtle" : "text-fg")}>
              {label}
            </span>
            {open ? (
              <ChevronUp size={15} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            ) : (
              <ChevronDown size={15} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            )}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            data-theme="dark"
            align="end"
            sideOffset={8}
            className="z-50 w-[340px] rounded-2xl border border-line bg-dark-card p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)]"
          >
            <p className="m-0 px-3 pb-2.5 pt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              {context.partner.name} · {context.lounges.length} {context.lounges.length === 1 ? "lounge" : "lounges"}
            </p>
            <div role="menu" aria-label="Lounges">
              {allowAll ? (
                <>
                  <Option label="All lounges" detail="Totals across every lounge" all checked={showingAll} onSelect={() => choose(null)} />
                  <div className="mx-3 my-1 h-px bg-line" />
                </>
              ) : null}
              {context.lounges.map((lounge) => (
                <Option
                  key={lounge.id}
                  label={lounge.name}
                  detail={[lounge.neighborhood, lounge.contentStatus === "live" ? "" : "not open to members yet"].filter(Boolean).join(" · ")}
                  checked={!showingAll && lounge.id === context.selectedLoungeId}
                  onSelect={() => choose(lounge.id)}
                />
              ))}
            </div>
            <div className="mt-1.5 flex items-center gap-2 border-t border-line px-3 pb-1.5 pt-2.5">
              <Info size={14} strokeWidth={1.8} className="shrink-0 text-fg-subtle" aria-hidden />
              <p className="m-0 text-[11.5px] text-fg-subtle">
                {allowAll ? "Today and check-in always show one lounge." : "Saved to your account — it opens here on every device."}
              </p>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function Option({
  label,
  detail,
  checked,
  all = false,
  onSelect,
}: {
  label: string;
  detail: string;
  checked: boolean;
  all?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-hover",
        checked && "bg-accent/12",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-[9px]",
          all ? "border border-dashed border-gold-600" : "border border-line bg-accent/10",
        )}
      >
        {all ? (
          <LayoutGrid size={15} strokeWidth={1.8} className="text-accent" aria-hidden />
        ) : (
          <Building2 size={15} strokeWidth={1.8} className="text-accent" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-fg">{label}</span>
        {detail ? <span className="block truncate text-[11.5px] text-fg-subtle">{detail}</span> : null}
      </span>
      {checked ? <Check size={16} strokeWidth={2.4} className="shrink-0 text-accent" aria-hidden /> : null}
    </button>
  );
}
