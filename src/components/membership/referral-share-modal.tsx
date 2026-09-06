"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, Link2, Mail, MessageCircle, MoreHorizontal, Navigation, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { referralInviteMessage } from "@/lib/referrals";

/**
 * "Share your invitation" — `Share.dc.html`. Story 9.2 — "Easy sharing via
 * social media, email, SMS". Calca la anatomía de `ShareDialog` (Story 3.1,
 * `share-dialog.tsx`): grid de 6 destinos visuales + fila de copiar enlace,
 * esta vez con `navigator.clipboard` real como allí.
 */
const SHARE_TARGETS = [
  { label: "Messages", icon: MessageCircle },
  { label: "WhatsApp", icon: MessageCircle },
  { label: "Email", icon: Mail },
  { label: "Instagram", icon: Camera },
  { label: "Nearby", icon: Navigation },
  { label: "More apps", icon: MoreHorizontal },
] as const;

export function ReferralShareModal({
  open,
  onOpenChange,
  memberFirstName,
  code,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberFirstName: string;
  code: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const shareUrl = `luxepass.co/join/${code}`;

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
          aria-label="Share your invitation"
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-panel bg-surface shadow-panel focus:outline-none"
        >
          <div className="flex items-start justify-between px-7 pt-6.5">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Refer a friend</p>
              <Dialog.Title className="mt-2 text-[22px] text-fg">Share your invitation</Dialog.Title>
            </div>
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

          <div className="mx-7 mt-4 rounded-content border border-line bg-blush-2 p-4.5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">What they receive</p>
            <p className="m-0 mt-2 text-[13px] leading-[1.6] text-fg">
              {referralInviteMessage(memberFirstName, code)}
            </p>
            <p className="m-0 mt-2 text-xs text-accent-strong">{shareUrl}</p>
          </div>

          <div className="mx-7 my-5 h-px bg-line" />

          <div className="grid grid-cols-3 gap-2 px-6">
            {SHARE_TARGETS.map(({ label, icon: Icon }) => (
              <button key={label} type="button" className="flex flex-col items-center gap-2.5 rounded-2xl py-3.5">
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
            Your friend sees your first name and the code — nothing else from your account. You are told when they
            sign up, and the day pass follows once their first payment settles.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
