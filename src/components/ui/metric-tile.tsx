import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 "Tile de métrica (oscuro)" — fijado en la Fase 2. Card
 * de `--dark-card`, radio 16px: eyebrow de 11px, la cifra en Bodoni 30px y
 * una nota de 11.5px debajo. Se usan en fila con `gap:14px`.
 *
 * "Tile de métrica (claro)" — fijado en la Fase 9, gemelo de este mismo
 * componente: cambia el fondo a la card de contenido (`bg-surface` con
 * borde y sombra) en vez de `--dark-card`, mismo resto de anatomía. `tone`
 * por defecto es `"dark"` para no tocar los usos ya existentes del Epic 7/8.
 *
 * `loading` (PERF-10): la etiqueta es la real y la cifra y la nota son barras
 * skeleton dentro de sus mismos párrafos, así que el tile mide lo mismo
 * antes y después de llegar los datos (DESIGN-SYSTEM.md §5 "Estados").
 */
export function MetricTile({
  label,
  value,
  note,
  loading = false,
  highlighted = false,
  tone = "dark",
  className,
}: {
  label: string;
  value?: string;
  note?: string;
  loading?: boolean;
  highlighted?: boolean;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4.5",
        tone === "light" ? "border border-line bg-surface shadow-content" : "bg-dark-card",
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
      <p className="m-0 mt-1.5 font-display text-[30px] text-fg">
        {loading ? <Skeleton className="inline-block h-[0.8em] w-24 align-middle" /> : value}
      </p>
      {loading ? (
        <p className="m-0 mt-1 text-[11.5px] text-fg-subtle">
          <Skeleton className="inline-block h-[0.9em] w-40 max-w-full align-middle" />
        </p>
      ) : note ? (
        <p className="m-0 mt-1 text-[11.5px] text-fg-subtle">{note}</p>
      ) : null}
    </div>
  );
}
