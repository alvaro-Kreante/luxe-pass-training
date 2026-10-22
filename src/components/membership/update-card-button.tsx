"use client";

import * as React from "react";

import { openBillingPortal } from "@/lib/billing";
import { createClient } from "@/lib/supabase/client";

/**
 * "Update" (rail de Billing, `Main.dc.html`) y "Update card"
 * (`Receipts.dc.html`): abre el Customer Portal de Stripe, que vuelve a esta
 * misma página. Los datos de tarjeta nunca pasan por LuxePass.
 */
export function UpdateCardButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const [opening, setOpening] = React.useState(false);

  async function handleClick() {
    setOpening(true);
    try {
      window.location.assign(await openBillingPortal(createClient(), window.location.href));
    } catch {
      setOpening(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={opening} className={className}>
      {children}
    </button>
  );
}
