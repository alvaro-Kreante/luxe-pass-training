"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * DESIGN-SYSTEM.md §5 patrón 4 — Modal sobre pantalla.
 *
 * Scrim `--scrim`, card de 640px con header + cuerpo scrolleable + footer
 * separado por `border-top`. El `filter: blur(3px)` de la pantalla de fondo lo
 * aplica la pantalla que abre el modal, no el modal (no puede alcanzar a su
 * propio hermano en el árbol).
 *
 * §5 patrón 18 lo reutiliza en tema oscuro sin cambiar la anatomía: basta con
 * envolverlo en `data-theme="dark"`.
 */
export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  /** Cabecera extra bajo la descripción — p. ej. las pestañas de documento. */
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  /** 640px para el modal estándar; 520–540px en los diálogos de ubicación. */
  width?: number;
  /**
   * El diálogo de permiso de ubicación (LocationPermission.dc.html) centra su
   * cabecera bajo un medallón; el resto de modales alinean a la izquierda.
   */
  align?: "start" | "center";
  /** Medallón u otra pieza sobre el eyebrow. */
  media?: React.ReactNode;
  /**
   * §5 patrón 18 — modal oscuro. El `data-theme` va en `Dialog.Content`, no en
   * un contenedor externo: el diálogo vive en un portal (normalmente a
   * `document.body`), así que un wrapper en el árbol de React no llega a ser
   * su ancestro real en el DOM. Puesto aquí, sí lo es.
   */
  dark?: boolean;
  children: React.ReactNode;
}

export function Modal({
  open,
  onOpenChange,
  title,
  eyebrow,
  description,
  headerExtra,
  footer,
  width = 640,
  align = "start",
  media,
  dark = false,
  children,
}: ModalProps) {
  const centered = align === "center";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-theme={dark ? "dark" : undefined}
          className="fixed inset-0 z-50"
          style={{ background: "var(--scrim)" }}
        />
        <Dialog.Content
          data-theme={dark ? "dark" : undefined}
          style={{ maxWidth: width }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2",
            "max-h-[760px] flex-col overflow-hidden rounded-panel bg-surface",
            dark
              ? "border border-line shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)]"
              : "shadow-[0_40px_90px_-25px_rgb(10_8_6_/_0.55)]",
            "focus:outline-none",
          )}
        >
          <div
            className={cn(
              "px-6 pt-8 sm:px-10 sm:pt-9",
              centered && "text-center",
            )}
          >
            {media}
            {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
            <Dialog.Title className="mb-2 text-[27px] text-fg">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="m-0 mb-[22px] text-sm leading-[1.55] text-fg-muted">
                {description}
              </Dialog.Description>
            ) : null}
            {headerExtra}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 pt-6 sm:px-10">
            {children}
          </div>

          {footer ? (
            <div className="border-t border-line px-6 pb-8 pt-[22px] sm:px-10">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
