import * as React from "react";

/**
 * Fila de detalle con icono — la lista "What happens next" / "What happens"
 * de los modales de confirmación (`Cancel.dc.html`, `CancelFee.dc.html`,
 * `DeleteAccount.dc.html`): icono de 32px sobre `--gold-100` + una línea de
 * texto. Sin fila propia en el design system; se deriva de la geometría del
 * icono-en-cuadro que ya usan otras piezas (§4 "Fila de opción").
 */
export function DetailRow({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">{icon}</span>
      <p className="m-0 flex-1 text-[13px] text-fg-muted">{text}</p>
    </div>
  );
}
