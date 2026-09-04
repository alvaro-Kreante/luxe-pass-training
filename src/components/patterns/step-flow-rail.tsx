import * as React from "react";

import { LoungeSubviewHeader } from "@/components/lounges/lounge-subview-header";
import { StepProgress } from "@/components/ui/step-progress";
import type { Lounge } from "@/lib/lounges";

/**
 * DESIGN-SYSTEM.md §5 patrón 9 — Flujo por pasos con rail de resumen.
 * Topbar de 64px + header de 84px del lounge, cuerpo `flex gap-28
 * padding 24px 32px 28px`: columna izquierda con el progress de pasos y el
 * formulario, rail fijo de 344px a la derecha. Usado en los tres pasos de la
 * reserva (Main / Payment / Summary).
 */
export interface StepFlowRailProps {
  lounge: Lounge;
  backHref: string;
  backLabel: string;
  address: string;
  headerBadge?: React.ReactNode;
  /** Chip en el extremo derecho del header, sustituyendo al sello de frescura
   * (p. ej. "Slot held for M:SS" en `Payment.dc.html`/`Summary.dc.html`). */
  trailingBadge?: React.ReactNode;
  topbarRight?: React.ReactNode;
  hideFreshness?: boolean;
  stepCurrent: number;
  stepTotal: number;
  stepLabel: string;
  rail: React.ReactNode;
  children: React.ReactNode;
}

export function StepFlowRail({
  lounge,
  backHref,
  backLabel,
  address,
  headerBadge,
  trailingBadge,
  topbarRight,
  hideFreshness,
  stepCurrent,
  stepTotal,
  stepLabel,
  rail,
  children,
}: StepFlowRailProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <LoungeSubviewHeader
        lounge={lounge}
        backHref={backHref}
        backLabel={backLabel}
        address={address}
        badge={headerBadge}
        trailingBadge={trailingBadge}
        topbarRight={topbarRight}
        hideFreshness={hideFreshness}
      />

      <div className="flex flex-1 gap-7 overflow-y-auto px-8 pb-7 pt-6">
        <div className="min-w-0 flex-1">
          <StepProgress current={stepCurrent} total={stepTotal} label={stepLabel} />
          {children}
        </div>

        <div className="h-fit w-[344px] shrink-0">{rail}</div>
      </div>
    </div>
  );
}
