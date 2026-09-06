/**
 * DESIGN-SYSTEM.md §4 "Barra de consumo" — fijada en la Fase 9, gemela clara
 * de la barra horizontal de volumen de la Fase 2. Carril de 9px, relleno en
 * `--gold-500`, con la cifra en Bodoni 30px y la unidad en 14px. Solo dibuja
 * la barra + la cifra: cada pantalla la envuelve en su propio card o fila
 * (`Main.dc.html` la pone en una card completa; `MonthlyPlan.dc.html` en una
 * fila más compacta junto a la oferta de subida).
 */
export function ConsumptionBar({
  used,
  included,
  unitLabel,
  className,
}: {
  used: number;
  included: number;
  /** "of 8 included visits used" / "of 8 used". */
  unitLabel: string;
  className?: string;
}) {
  const percent = included > 0 ? Math.min(100, (used / included) * 100) : 0;

  return (
    <div className={className}>
      <div className="flex items-end gap-2">
        <span className="font-display text-2xl text-fg sm:text-[30px]">{used}</span>
        <span className="pb-1 text-sm text-fg-muted">{unitLabel}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={included}
        className="mt-3 h-[9px] overflow-hidden rounded-pill bg-blush-1"
      >
        <div className="h-full rounded-pill bg-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
