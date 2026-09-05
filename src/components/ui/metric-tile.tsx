import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 "Tile de métrica (oscuro)" — fijado en la Fase 2. Card
 * de `--dark-card`, radio 16px: eyebrow de 11px, la cifra en Bodoni 30px y
 * una nota de 11.5px debajo. Se usan en fila con `gap:14px`.
 *
 * Solo cubre la mitad oscura (Epic 7/8): el gemelo claro de la Fase 9 cambia
 * el fondo a la card de contenido y el eyebrow a `--ink-400` — se añade como
 * variante cuando llegue ese epic, no antes.
 */
export function MetricTile({
  label,
  value,
  note,
  highlighted = false,
  className,
}: {
  label: string;
  value: string;
  note?: string;
  highlighted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-dark-card p-4.5",
        highlighted && "border-[1.5px] border-accent shadow-ring",
        className,
      )}
    >
      <p
        className={cn(
          "m-0 text-[11px] font-bold uppercase tracking-[0.1em]",
          highlighted ? "text-accent-strong" : "text-fg-subtle",
        )}
      >
        {label}
      </p>
      <p className="m-0 mt-1.5 font-display text-[30px] text-fg">{value}</p>
      {note ? <p className="m-0 mt-1 text-[11.5px] text-fg-subtle">{note}</p> : null}
    </div>
  );
}
