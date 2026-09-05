"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 patrón 6 — Drawer lateral.
 *
 * Variante del modal para formularios largos: scrim `--scrim-drawer` y panel de
 * 436px pegado a la derecha, con la misma anatomía header / cuerpo scrolleable
 * / footer. El patrón **18** lo reutiliza en oscuro (472px) sin cambiar nada
 * más que el `data-theme` y el ancho.
 *
 * Artboard: Filters.dc.html
 *
 * No es modal a propósito: el drawer promete que "los resultados se actualizan
 * mientras cambias los filtros", y un diálogo modal deja el fondo en
 * `aria-hidden`, invisible para quien navega con lector de pantalla. El scrim
 * sigue estando, y pulsar sobre él cierra.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  eyebrow,
  footer,
  width = 436,
  dark = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eyebrow?: React.ReactNode;
  footer?: React.ReactNode;
  /** 436px en el tema claro; 472px en el drawer oscuro del patrón 18. */
  width?: number;
  /** §5 patrón 18 — drawer oscuro. Ver la nota de `dark` en `Modal`. */
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-theme={dark ? "dark" : undefined}
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-50"
          style={{ background: "var(--scrim-drawer)" }}
        />
        <Dialog.Content
          data-theme={dark ? "dark" : undefined}
          style={{ maxWidth: width }}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface",
            "border-l border-line",
            dark
              ? "shadow-[-40px_0_80px_-30px_rgba(0,0,0,0.7)]"
              : "shadow-[-40px_0_80px_-30px_rgb(34_26_20_/_0.35)]",
            "focus:outline-none",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-8 py-6">
            <div>
              {eyebrow ? <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow> : null}
              <Dialog.Title className="text-[22px] text-fg">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label={`Close ${title}`}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-nav border border-line text-fg-muted transition-colors duration-150 hover:bg-accent-soft focus-visible:outline-none focus-visible:shadow-ring"
            >
              <X size={16} strokeWidth={1.9} />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-2 pt-6">
            {children}
          </div>

          {footer ? (
            <div className="border-t border-line px-8 pb-7 pt-[22px]">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
