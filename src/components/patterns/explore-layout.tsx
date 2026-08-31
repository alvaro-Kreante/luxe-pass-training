"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 patrón 5 — Explore (mapa + resultados).
 *
 * Dentro del App shell y sin su padding: topbar de 88px, fila de 52px con los
 * filtros activos, y un cuerpo con el panel de resultados de 372px a la
 * izquierda y el mapa a la derecha. El panel y el mapa comparten la misma
 * lista, y la selección se marca en los dos.
 *
 * Artboard: Main.dc.html
 */
export function ExploreLayout({
  topbar,
  filters,
  banner,
  panel,
  children,
}: {
  topbar: React.ReactNode;
  /** Fila de chips activos y "Clear all". Se omite cuando no hay filtros. */
  filters?: React.ReactNode;
  /** Aviso a ancho completo sobre la topbar — el de offline. */
  banner?: React.ReactNode;
  panel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {banner}

      <div className="flex min-h-[88px] flex-wrap items-center gap-3.5 border-b border-line bg-surface px-5 py-4 lg:h-22 lg:flex-nowrap lg:px-8 lg:py-0">
        {topbar}
      </div>

      {filters ? (
        <div className="flex min-h-[52px] flex-wrap items-center gap-2 border-b border-line bg-surface-subtle px-5 py-2 lg:h-13 lg:flex-nowrap lg:px-8 lg:py-0">
          {filters}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          aria-label="Results"
          className={cn(
            "flex shrink-0 flex-col border-line bg-surface",
            "lg:w-[372px] lg:border-r",
          )}
        >
          {panel}
        </section>

        {children}
      </div>
    </div>
  );
}
