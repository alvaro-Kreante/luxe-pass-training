import type { ReactNode } from "react";
import { ChevronsUp } from "lucide-react";

import { StatusChip } from "@/components/ui/status-chip";
import type { CaseStatus } from "@/lib/admin";

const DEFAULT_LABEL: Record<CaseStatus, string> = {
  new: "New",
  open: "Open",
  waiting: "Waiting",
  escalated: "Escalated",
  resolved: "Resolved",
};

/**
 * DESIGN-SYSTEM.md §4 "Chip de estado de caso (oscuro)" — fijado en la Fase
 * 8. Un `StatusChip` con mapa de estados por dominio, como ya declara
 * COMPONENT-MAP.md para reserva/asistencia/referido: New reutiliza
 * `emphasis`, Open reutiliza `available` + `outlined`, Waiting reutiliza
 * `dashed`, Resolved el estado por defecto, y solo Escalated pide un icono
 * (doble chevron) en vez del punto.
 */
export function CaseStatusChip({ status, children }: { status: CaseStatus; children?: ReactNode }) {
  const label = children ?? DEFAULT_LABEL[status];

  if (status === "new") return <StatusChip emphasis>{label}</StatusChip>;
  if (status === "open")
    return (
      <StatusChip available outlined>
        {label}
      </StatusChip>
    );
  if (status === "waiting") return <StatusChip dashed>{label}</StatusChip>;
  if (status === "escalated")
    return (
      <StatusChip outlined dot={false}>
        <ChevronsUp size={11} strokeWidth={2.6} aria-hidden />
        {label}
      </StatusChip>
    );
  return (
    <StatusChip available={false} className="text-fg-subtle">
      {label}
    </StatusChip>
  );
}
