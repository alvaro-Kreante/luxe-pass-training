import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { insertSucceededTestPayment } from "@/lib/testing/membership-fixture";

import ReceiptsPage from "./page";

/** La pantalla llama a Supabase y a Stripe (`stripe-billing`); bajo la suite completa 1 s no alcanza. */
const LOAD = { timeout: 10000 };

/**
 * "Invoices and receipts" — `Receipts.dc.html`. Backend real: `payments`
 * del miembro y el recibo de cada cargo en Stripe. El detalle (recibos de
 * cargos reales, portal) lo cubre `src/lib/billing.test.ts`.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/membership/receipts",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

async function freshMember(label: string) {
  const supabase = createClient();
  return signUpConfirmedMemberAndSignIn(
    supabase,
    `receipts-page-${Date.now()}-${label}@ensoleil-test.example`,
    "EnSoleil!2026",
    { fullName: "Alexandra Rivas" },
  );
}

describe("Invoices and receipts", () => {
  it("sin cobros, lo dice", async () => {
    await freshMember("empty");
    render(<ReceiptsPage />);

    expect(await screen.findByText("No charges yet.", {}, LOAD)).toBeInTheDocument();
  });

  it("lista cada cobro con su importe y estado", async () => {
    const user = await freshMember("list");
    await insertSucceededTestPayment(user.id, 8166);
    render(<ReceiptsPage />);

    const row = await screen.findByRole("row", { name: /Day pass/ }, LOAD);
    expect(within(row).getByText("$81.66")).toBeInTheDocument();
    expect(within(row).getByText("Paid")).toBeInTheDocument();
  });

  it("ofrece cambiar la tarjeta en Stripe", async () => {
    await freshMember("card");
    render(<ReceiptsPage />);

    expect(await screen.findByRole("button", { name: "Update card" }, LOAD)).toBeInTheDocument();
  });
});
