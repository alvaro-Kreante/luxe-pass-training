import { Check, X } from "lucide-react";

/**
 * DESIGN-SYSTEM.md §4 "Casilla de asistencia" — fijada en la Fase 2. Caja de
 * 20px en la primera columna de la lista del día. Llegó: fondo dorado con
 * check blanco. Pendiente: borde vacío. No-show: borde discontinuo con una ×.
 * Marcarla es el gesto completo del check-in — llega a la app del miembro en
 * el momento, sin un segundo paso de confirmación.
 */
export function AttendanceCheckbox({
  status,
  onMarkArrived,
  label,
}: {
  status: "arrived" | "pending" | "no-show" | "cancelled";
  /** Ausente cuando la fila ya no acepta el gesto (no-show, cancelada). */
  onMarkArrived?: () => void;
  label: string;
}) {
  if (status === "arrived") {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-accent"
      >
        <Check size={13} strokeWidth={3} className="text-white" />
      </span>
    );
  }

  if (status === "no-show" || status === "cancelled") {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-dashed border-fg-subtle"
      >
        <X size={11} strokeWidth={3} className="text-fg-subtle" />
      </span>
    );
  }

  // Sin `onMarkArrived` (un día que no es hoy, Story 7.1) la casilla solo se ve.
  if (!onMarkArrived) {
    return <span aria-hidden className="flex size-5 shrink-0 rounded-[5px] border-[1.5px] border-line opacity-50" />;
  }

  return (
    <button
      type="button"
      onClick={onMarkArrived}
      aria-label={`Mark ${label} as arrived`}
      className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] border-line transition-colors duration-150 hover:border-accent"
    />
  );
}
