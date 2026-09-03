"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Camera,
  Link2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Navigation,
  X,
} from "lucide-react";

import { toneOf } from "@/components/lounges/lounge-thumb";
import { Button } from "@/components/ui/button";
import type { Lounge } from "@/lib/lounges";

/**
 * Story 3.1 — "Share lounge option via social/messaging apps" (Share.dc.html).
 * No hay integración real con Mensajes/WhatsApp/Instagram — son destinos
 * visuales del mockup — pero copiar el enlace sí usa el portapapeles del
 * navegador, que es una API del cliente, no un servicio externo.
 */
const SHARE_TARGETS = [
  { label: "Messages", icon: MessageCircle },
  { label: "WhatsApp", icon: MessageCircle },
  { label: "Email", icon: Mail },
  { label: "Instagram", icon: Camera },
  { label: "Nearby", icon: Navigation },
  { label: "More apps", icon: MoreHorizontal },
] as const;

export function ShareDialog({
  open,
  onOpenChange,
  lounge,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lounge: Lounge;
}) {
  const [copied, setCopied] = React.useState(false);
  const shareUrl = `luxepass.co/l/${lounge.id}`;

  async function copyLink() {
    await navigator.clipboard.writeText(`https://${shareUrl}`);
    setCopied(true);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setCopied(false);
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50" style={{ background: "var(--scrim)" }} />
        <Dialog.Content
          aria-label="Share this lounge"
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-panel bg-surface shadow-panel focus:outline-none"
        >
          <div className="flex items-start justify-between px-7 pt-6.5">
            <Dialog.Title className="text-[22px] text-fg">
              Share this lounge
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-8.5 items-center justify-center rounded-[10px] bg-blush-1 text-fg-muted"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex items-center gap-3.5 px-7 pt-4.5">
            <span
              aria-hidden
              data-tone={toneOf(lounge.id)}
              className="lounge-hero size-14 shrink-0 rounded-xl"
            />
            <div>
              <p className="m-0 text-[15px] font-bold text-fg">{lounge.name}</p>
              <p className="m-0 mt-0.5 text-[12.5px] text-fg-subtle">
                {lounge.neighborhood} · {lounge.city} · Member lounge
              </p>
            </div>
          </div>

          <div className="mx-7 my-5 h-px bg-line" />

          <div className="grid grid-cols-3 gap-3.5 px-7">
            {SHARE_TARGETS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="flex flex-col items-center gap-2.5 rounded-2xl py-3.5"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
                  <Icon size={21} strokeWidth={1.7} aria-hidden />
                </span>
                <span className="text-xs font-semibold text-fg-muted">{label}</span>
              </button>
            ))}
          </div>

          <div className="mx-7 my-4.5 h-px bg-line" />

          <div className="flex gap-2.5 px-7">
            <div className="flex h-[50px] flex-1 items-center gap-2.5 rounded-control border border-line bg-blush-2 px-4">
              <Link2 size={16} strokeWidth={1.7} className="text-fg-subtle" aria-hidden />
              <span className="truncate text-[13px] text-fg-muted">{shareUrl}</span>
            </div>
            <Button type="button" size="md" onClick={copyLink}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <p className="m-0 px-7 pb-6.5 pt-4 text-xs leading-[1.5] text-fg-subtle">
            Anyone with the link can see this lounge profile. Booking still requires an
            active LuxePass membership.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
