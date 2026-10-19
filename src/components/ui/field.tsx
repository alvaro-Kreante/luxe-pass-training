import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §3 — label 13px/600, hint 12px `--ink-400`.
 * Envuelve cualquier control: es el bloque label + control + hint que se
 * repite en todos los formularios del sistema.
 */
export interface FieldProps {
  label: string;
  /** Marca el asterisco del design system sin repetirlo en cada llamada. */
  required?: boolean;
  /** Sufijo "(optional)" en peso normal — ver ProfileProfessional.dc.html. */
  optional?: boolean;
  /** Junto a la etiqueta, no debajo del control — p. ej. el badge "Verified" de `Profile.dc.html`. */
  labelExtra?: React.ReactNode;
  hint?: React.ReactNode;
  /** Sustituye al hint, en el color de acento, y se anuncia con `role="alert"`. */
  error?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  required,
  optional,
  labelExtra,
  hint,
  error,
  htmlFor,
  className,
  children,
}: FieldProps) {
  const description = error || hint;
  const descriptionId = description && htmlFor ? `${htmlFor}-description` : undefined;
  const control =
    descriptionId && React.isValidElement<{ "aria-describedby"?: string }>(children)
      ? React.cloneElement(children, { "aria-describedby": descriptionId })
      : children;

  return (
    <div className={cn("mb-[18px]", className)}>
      <div className="mb-2 flex items-center gap-2">
        <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-fg-muted">
          {label}
          {required ? " *" : null}
          {optional ? (
            <span className="font-normal text-fg-subtle"> (optional)</span>
          ) : null}
        </label>
        {labelExtra}
      </div>
      {control}
      {error ? (
        <p id={descriptionId} role="alert" className="mt-1.5 text-xs text-accent-strong">
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="mt-1.5 text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
