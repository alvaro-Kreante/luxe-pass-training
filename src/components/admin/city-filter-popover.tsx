"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, ChevronUp, Search, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Story 8.3 — filtro de ciudad de `/admin/lounges`. Artboards:
 * LoungeFilterCity.dc.html (27, abierto) y LoungeFilterApplied.dc.html (28,
 * aplicado). Busca solo entre las ciudades que ya tienen un lounge; `null`
 * es "All cities".
 */
export interface CityOption {
  city: string;
  count: number;
}

export function CityFilterPopover({
  cities,
  total,
  value,
  onChange,
}: {
  cities: CityOption[];
  total: number;
  value: string | null;
  onChange: (city: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const needle = query.trim().toLowerCase();
  const matches = needle ? cities.filter((c) => c.city.toLowerCase().includes(needle)) : cities;

  function pick(city: string | null) {
    onChange(city);
    setOpen(false);
    setQuery("");
  }

  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={value ?? "All cities"}
          className={cn(
            "flex h-11 items-center justify-center gap-2.5 rounded-[11px] border-[1.5px] px-4 transition-colors duration-150",
            open
              ? "border-accent shadow-[0_0_0_3px_rgba(201,168,118,0.28)]"
              : value
                ? "border-accent"
                : "border-line hover:bg-surface-hover",
          )}
        >
          <SlidersHorizontal size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
          <span className="text-[13.5px] font-semibold text-fg">{value ?? "All cities"}</span>
          <Chevron size={15} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          data-theme="dark"
          align="end"
          sideOffset={8}
          className="z-50 w-[290px] rounded-[14px] border border-line bg-dark-card p-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        >
          <label className="mb-1.5 flex h-10 items-center gap-2.5 rounded-[10px] border-[1.5px] border-accent bg-panel-black px-3">
            <Search size={15} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            <input
              type="search"
              aria-label="Search cities"
              placeholder="Search cities"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-[13px] text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>

          <div role="listbox" aria-label="Cities">
            {!needle ? <CityRow label="All cities" count={total} selected={value === null} onSelect={() => pick(null)} /> : null}
            {matches.map((c) => (
              <CityRow
                key={c.city}
                label={c.city}
                count={c.count}
                selected={value === c.city}
                onSelect={() => pick(c.city)}
              />
            ))}
          </div>

          <p className="mx-3 mb-1 mt-2 text-[11.5px] text-fg-subtle">
            {matches.length === 0 ? "No lounge in a city with that name." : "Only cities with a lounge are listed."}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CityRow({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className="flex h-[38px] w-full items-center gap-2.5 rounded-[9px] px-3 text-left transition-colors duration-150 hover:bg-surface-hover"
    >
      {selected ? (
        <Check size={15} strokeWidth={2.2} className="shrink-0 text-accent" aria-hidden />
      ) : (
        <span className="w-[15px] shrink-0" />
      )}
      <span className={cn("flex-1 truncate text-[13px] text-fg", selected ? "font-bold" : "font-semibold text-fg-muted")}>
        {label}
      </span>
      <span className="text-xs text-fg-subtle">{count}</span>
    </button>
  );
}
