import * as React from "react";

/**
 * DESIGN-SYSTEM.md §4 "Toast (oscuro)" — fijado en la Fase 2. Card de 396px
 * anclada a `bottom:26px; right:32px`, icono en cuadro de 38px, dos acciones
 * (la principal `--gold-600`, la de descartar `--dark-ink-500`).
 */
export function Toast({
  icon,
  title,
  body,
  primaryLabel,
  onPrimary,
  onDismiss,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="fixed bottom-6.5 right-8 z-50 flex w-[396px] gap-3.5 rounded-2xl border border-accent border-l-4 bg-dark-card p-4.5 shadow-[0_24px_50px_-18px_rgba(0,0,0,0.7)]"
    >
      <span className="flex size-9.5 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(201,168,118,0.16)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[13px] font-bold text-fg">{title}</p>
        <p className="m-0 mt-1.5 text-[12.5px] leading-[1.5] text-fg-muted">{body}</p>
        <div className="mt-2.5 flex gap-4">
          <button
            type="button"
            onClick={onPrimary}
            className="cursor-pointer text-xs font-bold text-accent-strong"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="cursor-pointer text-xs font-bold text-fg-subtle"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
