import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 patrón 10 — Tarjeta de confirmación oscura.
 * Card de 344px, radius 24px, radial `--panel-black` + puntos dorados: logo
 * de 40px y eyebrow arriba, número de reserva en Bodoni 32px, separador y
 * filas etiqueta/valor. Cierra con una franja blanca de 16px.
 *
 * Fijada en la Fase 5 (`Confirmed.dc.html`); el patrón 11 (pase digital,
 * Fase 6) la extiende sin cambiar esta anatomía.
 */
export interface ConfirmationCardRow {
  label: string;
  value: string;
}

export interface ConfirmationCardProps {
  eyebrow: string;
  reference: string;
  rows: ConfirmationCardRow[];
  footnote: string;
  className?: string;
}

export function ConfirmationCard({
  eyebrow,
  reference,
  rows,
  footnote,
  className,
}: ConfirmationCardProps) {
  return (
    <div
      data-theme="dark"
      className={cn(
        "w-[344px] shrink-0 overflow-hidden rounded-[24px]",
        className,
      )}
    >
      <div className="surface-night dot-pattern relative px-6 pb-6 pt-7">
        <Image src="/logo.png" alt="En Soleil" width={40} height={42} className="h-auto w-10" />
        <p className="relative mb-1 mt-5 text-xs font-bold uppercase tracking-[0.1em] text-fg-subtle">
          {eyebrow}
        </p>
        <h2 className="relative font-display text-[32px] text-fg">{reference}</h2>

        <div className="relative my-5 h-px bg-line" />

        <div className="relative flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-fg-subtle">{row.label}</span>
              <span className="text-right text-[13px] font-bold text-fg">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white px-6 py-4 text-center text-[11.5px] text-ink-400">
        {footnote}
      </div>
    </div>
  );
}
