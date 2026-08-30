"use client";

import * as React from "react";
import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Story 1.1 — "Terms of service and privacy policy acceptance required".
 * Artboard: docs/design/epic-1-onboarding/Terms.dc.html
 *
 * Una casilla por documento y registro de la aceptación con fecha y versión,
 * tal como fija DESIGN-SYSTEM.md §6 (Fase 1).
 *
 * PENDIENTE conocido del design system: el texto legal es de relleno
 * estructural, a reemplazar por el documento real de En Soleil.
 */

export const DOCUMENT_VERSION = "2026-01";

export interface TermsAcceptance {
  version: string;
  acceptedAt: string;
}

const DOCUMENTS = {
  terms: {
    tab: "Terms of Service",
    sections: [
      {
        heading: "1. Membership",
        body: "En Soleil grants you a personal, non-transferable right to access participating lounges through the LuxePass platform while your membership remains active. Access passes are issued to you individually and may not be shared, resold, or assigned.",
      },
      {
        heading: "2. Bookings & check-in",
        body: "Each reservation generates a single-use QR code valid only for the lounge, date, and time window shown. Partner venues may refuse entry when capacity, dress code, or house rules are not met. Cancellations made less than 24 hours before the reservation may count against your monthly allowance.",
      },
      {
        heading: "3. Conduct",
        body: "Members are expected to observe the standards of conduct of each venue. En Soleil may suspend or terminate a membership for repeated no-shows, misuse of access passes, or conduct reported by a partner venue.",
      },
      {
        heading: "4. Billing",
        body: "Membership fees are billed in advance for the selected period and renew automatically unless cancelled before the renewal date. Fees already paid are non-refundable except where required by law.",
      },
      {
        heading: "5. Changes to these terms",
        body: "We may update these terms from time to time. Material changes will be notified by email at least 30 days before they take effect, and continued use of the platform after that date constitutes acceptance.",
      },
    ],
  },
  privacy: {
    tab: "Privacy Policy",
    sections: [
      {
        heading: "1. What we collect",
        body: "We collect the details you give us when you create your profile — name, contact details, interests, the cities you travel to, and your professional details — together with your booking and check-in history.",
      },
      {
        heading: "2. How we use it",
        body: "Your profile and booking history are used to recommend lounges, hold your reservations, and issue your access passes. Partner venues receive only the data they need to admit you: your name, arrival time, and pass number.",
      },
      {
        heading: "3. Who we share it with",
        body: "We share data with partner venues for the sole purpose of check-in, and with the payment processor that handles your membership fees. Card details are held by the payment processor and never by En Soleil.",
      },
      {
        heading: "4. Your choices",
        body: "You can review, correct, or export your data from Account settings at any time, and choose which notifications reach you by push, email, or SMS. Deleting your account removes your profile and cancels any upcoming reservations.",
      },
      {
        heading: "5. Retention",
        body: "We keep your booking history for as long as your membership is active and for the period afterwards required by law, then delete or anonymise it.",
      },
    ],
  },
} as const;

type DocumentKey = keyof typeof DOCUMENTS;

export interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (acceptance: TermsAcceptance) => void;
}

export function TermsModal({ open, onOpenChange, onAccept }: TermsModalProps) {
  const [tab, setTab] = React.useState<DocumentKey>("terms");
  const [termsChecked, setTermsChecked] = React.useState(false);
  const [privacyChecked, setPrivacyChecked] = React.useState(false);

  const bothChecked = termsChecked && privacyChecked;

  /**
   * Al cerrar, el diálogo vuelve a su estado inicial: las casillas marcadas no
   * sobreviven a un cierre sin aceptar. Radix llama a onOpenChange en todos los
   * cierres (Escape, scrim y "Decline"), así que este es el único punto que hay
   * que cubrir.
   */
  function handleOpenChange(next: boolean) {
    if (!next) {
      setTab("terms");
      setTermsChecked(false);
      setPrivacyChecked(false);
    }
    onOpenChange(next);
  }

  function handleAccept() {
    if (!bothChecked) return;
    onAccept({
      version: DOCUMENT_VERSION,
      acceptedAt: new Date().toISOString(),
    });
    handleOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      eyebrow="Required before you continue"
      title="Terms & Privacy"
      description="Please review and accept both documents to activate your En Soleil membership account."
      headerExtra={
        <div
          role="tablist"
          aria-label="Legal documents"
          className="flex gap-[26px] border-b border-line"
        >
          {(Object.keys(DOCUMENTS) as DocumentKey[]).map((key) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "-mb-px cursor-pointer px-0.5 pb-3 text-[13.5px] transition-colors duration-150",
                tab === key
                  ? "border-b-2 border-accent font-bold text-fg"
                  : "font-semibold text-fg-subtle hover:text-fg-muted",
              )}
            >
              {DOCUMENTS[key].tab}
            </button>
          ))}
        </div>
      }
      footer={
        <>
          <Checkbox
            checked={termsChecked}
            onCheckedChange={setTermsChecked}
            className="mb-3"
          >
            I have read and accept the{" "}
            <strong className="font-bold text-fg">Terms of Service</strong>.
          </Checkbox>

          <Checkbox
            checked={privacyChecked}
            onCheckedChange={setPrivacyChecked}
            className="mb-5"
          >
            I have read and accept the{" "}
            <strong className="font-bold text-fg">Privacy Policy</strong>,
            including how my data is used to personalise recommendations.
          </Checkbox>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1 tracking-[0.1em]"
              onClick={() => handleOpenChange(false)}
            >
              Decline
            </Button>
            <Button
              className="flex-[1.6]"
              disabled={!bothChecked}
              onClick={handleAccept}
            >
              Accept &amp; continue
            </Button>
          </div>

          <p className="m-0 mt-3 text-center text-xs text-fg-subtle">
            Both boxes must be checked. Acceptance is recorded with date and
            document version.
          </p>
        </>
      }
    >
      <div role="tabpanel">
        {DOCUMENTS[tab].sections.map((section) => (
          <React.Fragment key={section.heading}>
            <h4 className="mb-1.5 mt-4 font-sans text-[13.5px] font-bold text-fg first:mt-0">
              {section.heading}
            </h4>
            <p className="m-0 text-[13px] leading-[1.65] text-fg-muted">
              {section.body}
            </p>
          </React.Fragment>
        ))}
      </div>
    </Modal>
  );
}
