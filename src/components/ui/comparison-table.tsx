import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 "Tabla comparativa" — fijada en la Fase 9. Card de
 * contenido con `overflow:hidden`: cabecera sobre `--bg-blush-1` con las
 * etiquetas en eyebrow, y filas de `minmax(0,1fr) 168px 168px` separadas por
 * `border-top`. Un valor `boolean` se dibuja como check dorado o como una
 * raya `—` ("lo que un plan no tiene"), nunca una cruz; un valor `string` se
 * dibuja tal cual. La fila de total va resaltada.
 */
export interface ComparisonTableRow {
  label: string;
  values: (string | boolean)[];
  isTotal?: boolean;
}

export function ComparisonTable({
  leadingLabel,
  columns,
  rows,
  className,
}: {
  /** Etiqueta de la primera columna, p. ej. "What you get". */
  leadingLabel: string;
  columns: { label: string; highlight?: boolean }[];
  rows: ComparisonTableRow[];
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-content border border-line bg-surface shadow-content", className)}>
      <div
        className="grid items-center gap-0 bg-blush-1 px-4.5 py-3"
        style={{ gridTemplateColumns: `minmax(0, 1fr) ${columns.map(() => "168px").join(" ")}` }}
      >
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-fg-muted">{leadingLabel}</p>
        {columns.map((column) => (
          <p
            key={column.label}
            className={cn(
              "m-0 text-center text-xs font-bold uppercase tracking-[0.1em]",
              column.highlight ? "text-accent-strong" : "text-fg-muted",
            )}
          >
            {column.label}
          </p>
        ))}
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            "grid items-center gap-0 border-t border-line px-4.5 py-2.5",
            row.isTotal && "bg-blush-2",
          )}
          style={{ gridTemplateColumns: `minmax(0, 1fr) ${columns.map(() => "168px").join(" ")}` }}
        >
          <span className={cn("text-[12.5px] text-fg-muted", row.isTotal && "font-bold text-fg")}>{row.label}</span>
          {row.values.map((value, index) => (
            <span
              key={columns[index]?.label ?? index}
              className={cn(
                "text-center text-[12.5px] font-bold",
                row.isTotal && index === row.values.length - 1 ? "text-accent-strong" : "text-fg",
              )}
            >
              {typeof value === "boolean" ? (
                value ? (
                  <Check size={16} strokeWidth={2.4} className="mx-auto text-accent-strong" aria-label="Included" />
                ) : (
                  <span className="text-fg-subtle" aria-label="Not included">
                    —
                  </span>
                )
              ) : (
                value
              )}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
