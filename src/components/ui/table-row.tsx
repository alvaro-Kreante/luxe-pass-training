"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Fila de las tablas oscuras de Partner y Admin (patrones 16 y 22): grids de
 * `div`, no `<table>`. Con `onOpen`, toda la fila abre el detalle salvo los
 * controles que lleva dentro (checkbox, enlaces, botones), que conservan su
 * propia acción. La flecha (`TableRowChevron`) es el acceso por teclado.
 * Ticket 002.
 */
const tableRowVariants = cva(
  "border-b border-[rgba(58,50,42,0.6)] transition-colors duration-150 ease-in-out last:border-b-0",
  {
    variants: {
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
      selected: {
        true: "bg-[rgba(201,168,118,0.09)] shadow-[inset_3px_0_0_var(--gold-500)]",
        false: "",
      },
    },
    compoundVariants: [
      { interactive: true, selected: false, className: "hover:bg-surface-hover" },
      { interactive: true, selected: true, className: "hover:bg-[rgba(201,168,118,0.14)]" },
    ],
    defaultVariants: { interactive: false, selected: false },
  },
);

const INNER_CONTROL = "a, button, input, label, [role='checkbox']";

export interface TableRowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof tableRowVariants>, "interactive"> {
  onOpen?: () => void;
}

export function TableRow({ onOpen, selected, className, onClick, ...props }: TableRowProps) {
  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    onClick?.(event);
    if (!onOpen || event.defaultPrevented) return;
    const control = (event.target as HTMLElement).closest(INNER_CONTROL);
    if (control && event.currentTarget.contains(control)) return;
    onOpen();
  }

  return (
    <div
      onClick={handleClick}
      className={cn(tableRowVariants({ interactive: Boolean(onOpen), selected }), className)}
      {...props}
    />
  );
}

/** Flecha de la derecha de la fila: botón con nombre "View <nombre>". */
export function TableRowChevron({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${label}`}
      className="flex cursor-pointer justify-end text-fg-subtle transition-colors duration-150 hover:text-accent"
    >
      <ChevronRight size={17} strokeWidth={1.8} aria-hidden />
    </button>
  );
}
