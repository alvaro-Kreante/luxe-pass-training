import * as React from "react";
import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 patrón 2 — Full-bleed de confirmación.
 *
 * Fondo negro radial a pantalla completa, medallón dorado de 96px con check y
 * h1 de 40px en blanco. Sirve para welcome y cualquier estado de éxito terminal.
 *
 * Va en tema oscuro: `data-theme="dark"` hace que los componentes anidados
 * (botones, chips) resuelvan sus tokens en la mitad oscura del sistema.
 */
export interface FullBleedSuccessProps {
  title: string;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function FullBleedSuccess({
  title,
  description,
  className,
  children,
}: FullBleedSuccessProps) {
  return (
    <div
      data-theme="dark"
      className={cn(
        "surface-night-panel relative flex min-h-screen items-center justify-center px-6 py-16",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgb(201 168 118 / 0.14) 1px, transparent 1.5px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10 flex max-w-[520px] flex-col items-center text-center">
        <div
          className="mb-9 flex h-24 w-24 items-center justify-center rounded-full text-panel-black"
          style={{
            background:
              "linear-gradient(160deg, var(--gold-500), var(--gold-600))",
            boxShadow:
              "0 0 0 1px rgb(201 168 118 / 0.4), 0 20px 50px -10px rgb(201 168 118 / 0.5)",
          }}
        >
          <CircleCheck size={42} strokeWidth={1.8} />
        </div>

        <h1 className="mb-4 text-[40px] leading-tight text-white">{title}</h1>
        {description ? (
          <p className="m-0 text-[15px] leading-[1.65] text-dark-ink-300">
            {description}
          </p>
        ) : null}

        {children}
      </div>
    </div>
  );
}
