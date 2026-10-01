import { StatusChip } from "@/components/ui/status-chip";

/**
 * Filtro rápido de estado de las listas del admin (Lounges.dc.html 11,
 * Partners.dc.html Fase 10 · 1): una pulsación deja solo ese estado, otra lo
 * quita.
 */
export function StatusFilter({
  label,
  count,
  pressed,
  onToggle,
}: {
  label: string;
  count: number;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className="rounded-pill focus-visible:outline-none focus-visible:shadow-ring"
    >
      <StatusChip available={pressed} outlined={pressed} className="cursor-pointer px-3.5 py-1.5">
        <span className={pressed ? "text-fg" : "text-fg-muted"}>{label}</span>
        <span className="font-semibold text-fg-subtle">{count}</span>
      </StatusChip>
    </button>
  );
}
