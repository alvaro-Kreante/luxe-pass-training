"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";

export type LoungeSavedKind = "draft" | "live";

/** Un punto del cuerpo de los popups del lounge (LoungeEditConfirm.dc.html, 18). */
export function ModalPoint({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 flex gap-3 border-t border-line/60 pt-3 text-left">
      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
      <div>
        <p className="m-0 text-[13px] font-bold text-fg">{title}</p>
        <p className="m-0 mt-0.5 text-xs leading-[1.5] text-fg-subtle">{children}</p>
      </div>
    </div>
  );
}

/**
 * Epic 8 · LoungeDraftSaved.dc.html (24) y LoungePublished.dc.html (25) —
 * solo informa: el borrador se guardó o el lounge ya está live. Quien lo
 * cierra sigue en el lounge.
 */
export function LoungeSavedNotice({
  kind,
  loungeName,
  onClose,
}: {
  kind: LoungeSavedKind | null;
  loungeName: string;
  onClose: () => void;
}) {
  const live = kind === "live";
  return (
    <Modal
      open={kind !== null}
      onOpenChange={(open) => !open && onClose()}
      dark
      width={480}
      align="center"
      media={
        <span className="mx-auto mb-4.5 flex size-13 items-center justify-center rounded-full border border-gold-600 bg-accent/16 text-accent">
          <Check size={22} strokeWidth={2.2} aria-hidden />
        </span>
      }
      eyebrow={live ? loungeName : `${loungeName} · draft`}
      title={live ? "The lounge is live" : "Draft saved"}
      description={
        live
          ? "Members can find it in Explore and book it from now on."
          : "Your changes are kept. Members see nothing until you publish."
      }
      footer={
        <Button className="w-full" onClick={onClose}>
          {live ? "Done" : "Keep editing"}
        </Button>
      }
    >
      {live ? (
        <>
          <ModalPoint title="Invitations sent">
            New partners get an email to create their password. The link works for 24 hours.
          </ModalPoint>
          <ModalPoint title="You stay on the lounge">Everything is locked again; Edit lounge moves it back to draft.</ModalPoint>
        </>
      ) : (
        <ModalPoint title="Nobody is invited yet">
          Partners added to the draft get their email when the lounge is published.
        </ModalPoint>
      )}
    </Modal>
  );
}
