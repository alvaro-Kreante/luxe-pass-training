"use client";

import * as React from "react";
import { Building2, Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Story 8.4 — filtro de lounge de `/admin/bookings` en el que se escribe:
 * filtra la lista mientras se teclea y se elige una sugerencia. `null` es
 * "All lounges". Mismas filas que `CityFilterPopover` (Story 8.3).
 */
export function LoungeCombobox({
  lounges,
  value,
  onChange,
}: {
  lounges: { id: string; name: string }[];
  value: string | null;
  onChange: (loungeId: string | null) => void;
}) {
  const listId = React.useId();
  const selected = lounges.find((l) => l.id === value) ?? null;
  /** `null` mientras no se escribe: el campo enseña el lounge elegido. */
  const [draft, setDraft] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const text = draft ?? selected?.name ?? "";

  const needle = text.trim().toLowerCase();
  const typing = draft !== null && needle !== (selected?.name.toLowerCase() ?? "");
  const matches = typing && needle ? lounges.filter((l) => l.name.toLowerCase().includes(needle)) : lounges;

  function pick(loungeId: string | null) {
    onChange(loungeId);
    setDraft(null);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label
        className={cn(
          "flex h-11 items-center gap-2.5 rounded-[11px] border-[1.5px] bg-panel-black px-4 transition-colors duration-150",
          open ? "border-accent shadow-[0_0_0_3px_rgba(201,168,118,0.28)]" : value ? "border-accent" : "border-line",
        )}
      >
        <Building2 size={16} strokeWidth={1.7} className="shrink-0 text-accent" aria-hidden />
        <input
          role="combobox"
          aria-label="Lounge"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="All lounges"
          value={text}
          onFocus={(event) => {
            event.target.select();
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setDraft(null);
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && matches.length > 0 && typing) pick(matches[0]!.id);
          }}
          className="w-full min-w-0 bg-transparent text-[13.5px] font-semibold text-fg placeholder:text-fg placeholder:opacity-100 focus:outline-none"
        />
        <ChevronDown size={15} strokeWidth={1.8} className="shrink-0 text-fg-subtle" aria-hidden />
      </label>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Lounges"
          className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-80 w-full min-w-[260px] overflow-y-auto rounded-[14px] border border-line bg-dark-card p-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        >
          {!typing || !needle ? <Option label="All lounges" selected={value === null} onSelect={() => pick(null)} /> : null}
          {matches.map((l) => (
            <Option key={l.id} label={l.name} selected={value === l.id} onSelect={() => pick(l.id)} />
          ))}
          {matches.length === 0 ? <p className="mx-3 my-2 text-[11.5px] text-fg-subtle">No lounge with that name.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function Option({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      className="flex h-[38px] w-full items-center gap-2.5 rounded-[9px] px-3 text-left transition-colors duration-150 hover:bg-surface-hover"
    >
      {selected ? (
        <Check size={15} strokeWidth={2.2} className="shrink-0 text-accent" aria-hidden />
      ) : (
        <span className="w-[15px] shrink-0" />
      )}
      <span className={cn("flex-1 truncate text-[13px]", selected ? "font-bold text-fg" : "font-semibold text-fg-muted")}>
        {label}
      </span>
    </button>
  );
}
