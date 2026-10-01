import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";

export interface ConfirmPoint {
  title: string;
  detail: React.ReactNode;
}

/**
 * Confirmación del admin con la geometría de PartnerSuspend.dc.html (Fase 8 ·
 * 21): eyebrow, título, una frase y los puntos de qué va a pasar. La usan
 * activar y suspender un partner, suspender o borrar un usuario y suspender
 * un lounge (Fase 10 · 5, 7, 11).
 */
export function ConfirmModal({
  open,
  onOpenChange,
  eyebrow,
  title,
  intro,
  points,
  confirmLabel,
  busy = false,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  intro: string;
  points: ConfirmPoint[];
  confirmLabel: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      dark
      width={540}
      eyebrow={eyebrow}
      title={title}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="normal-case" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex-1" />
          <Button disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="m-0 text-[13.5px] leading-[1.6] text-fg-muted">{intro}</p>
      {points.map((point) => (
        <div key={point.title} className="mt-3 flex gap-3 border-t border-line/60 pt-3">
          <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13px] font-bold text-fg">{point.title}</p>
            <div className="m-0 mt-0.5 text-xs leading-[1.5] text-fg-subtle">{point.detail}</div>
          </div>
        </div>
      ))}
      {error ? (
        <p role="alert" className="m-0 mt-3 text-[12.5px] font-bold text-accent-strong">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
