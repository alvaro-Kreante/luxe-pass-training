import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient as createAdminClient } from "@supabase/supabase-js";

import { fetchMembership } from "@/lib/membership";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { giveTestMemberSavedCard, grantTestMembership } from "@/lib/testing/membership-fixture";

import PlansPage from "./page";
import { findDialog } from "@/lib/testing/find-dialog";

/** La pantalla hace varias llamadas reales (Supabase + Stripe); bajo la suite completa en paralelo 1 s no alcanza. */
const LOAD = { timeout: 10000 };

/**
 * Story 9.1 — "Upgrade options to monthly subscribers and pricing (monthly →
 * yearly price)". `Plans.dc.html`, backend real. Sin membresía, la misma
 * pantalla sirve para elegir plan (decisión de producto, 23 sept 2026 — sin
 * artboard propio): ninguna card lleva "Your plan" y las dos ofrecen
 * "Choose …", que abre el modal de `Upgrade.dc.html` sin prorrateo.
 */
const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/membership/plans",
  useRouter: () => ({ push }),
}));

beforeEach(() => push.mockReset());

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function freshMember(label: string) {
  const supabase = createClient();
  const email = `plans-page-${Date.now()}-${label}@ensoleil-test.example`;
  const user = await signUpConfirmedMemberAndSignIn(supabase, email, "EnSoleil!2026");
  return { supabase, user, email };
}

describe("comparación de planes", () => {
  it("muestra el precio mensual, el anual y la tabla comparativa", async () => {
    await freshMember("compare");
    render(<PlansPage />);

    expect(await screen.findByText("$249.00", {}, LOAD)).toBeInTheDocument();
    expect(screen.getAllByText("$2,400.00").length).toBeGreaterThan(0);
    expect(screen.getByText("What twelve months costs")).toBeInTheDocument();
  });
});

describe("sin membresía — elegir plan", () => {
  it("ninguna card es la actual y las dos se pueden elegir", async () => {
    await freshMember("choose");
    render(<PlansPage />);

    expect(await screen.findByRole("button", { name: "Choose monthly" }, LOAD)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose annual" })).toBeInTheDocument();
    expect(screen.queryByText("Your plan")).not.toBeInTheDocument();
  });

  it("elegir el anual abre la confirmación por el precio completo", async () => {
    await freshMember("choose-modal");
    const user = userEvent.setup({ delay: null });
    render(<PlansPage />);

    await user.click(await screen.findByRole("button", { name: "Choose annual" }, LOAD));

    const dialog = await findDialog({}, LOAD);
    expect(within(dialog).getByText("Confirm your new plan")).toBeInTheDocument();
    expect(await within(dialog).findByRole("button", { name: "Pay $2,400.00 and join" }, LOAD)).toBeInTheDocument();
    expect(within(dialog).queryByText(/unused days/)).not.toBeInTheDocument();
  });

  it("pagar con la tarjeta guardada activa el plan y vuelve a Membership", async () => {
    const { supabase, user, email } = await freshMember("choose-pay");
    await giveTestMemberSavedCard(user.id, email);
    const userEvents = userEvent.setup({ delay: null });
    render(<PlansPage />);

    await userEvents.click(await screen.findByRole("button", { name: "Choose monthly" }, LOAD));
    const pay = await screen.findByRole("button", { name: "Pay $249.00 and join" }, LOAD);
    await waitFor(() => expect(pay).toBeEnabled());
    await userEvents.click(pay);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/profile/membership"), { timeout: 15000 });
    const membership = await fetchMembership(supabase);
    expect(membership.status).toBe("active");
    expect(membership.plan).toBe("monthly");
  }, 30000);
});

describe("con membresía", () => {
  it("el plan anual contratado lleva 'Your plan' y ofrece pasar a mensual", async () => {
    const { user } = await freshMember("annual");
    await grantTestMembership(user.id, "annual");
    render(<PlansPage />);

    expect(await screen.findByText("Your plan", {}, LOAD)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Current plan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Switch to monthly" })).toBeEnabled();
  });

  it("pasar de anual a mensual no cobra hoy y queda programado para el final del término", async () => {
    const { supabase, user } = await freshMember("downgrade");
    await grantTestMembership(user.id, "annual");
    const userEvents = userEvent.setup({ delay: null });
    render(<PlansPage />);

    await userEvents.click(await screen.findByRole("button", { name: "Switch to monthly" }, LOAD));

    const dialog = await findDialog({}, LOAD);
    expect(within(dialog).getByText("Confirm your new plan")).toBeInTheDocument();
    expect(within(dialog).getByText("$0.00")).toBeInTheDocument();
    await userEvents.click(within(dialog).getByRole("button", { name: /^Switch to monthly on / }));

    await waitFor(async () => expect((await fetchMembership(supabase)).pendingPlan).toBe("monthly"));
    expect(await screen.findByRole("button", { name: "Switch scheduled" }, LOAD)).toBeDisabled();
    const { data: payments } = await admin().from("payments").select("id").eq("member_id", user.id);
    expect(payments).toEqual([]);
  });

  it("con el paso a mensual programado, 'Keep annual' lo deshace", async () => {
    const { supabase, user } = await freshMember("keep-annual");
    await grantTestMembership(user.id, "annual", { pendingPlan: "monthly" });
    const userEvents = userEvent.setup({ delay: null });
    render(<PlansPage />);

    await userEvents.click(await screen.findByRole("button", { name: "Keep annual" }, LOAD));

    await waitFor(async () => expect((await fetchMembership(supabase)).pendingPlan).toBeNull());
    expect(await screen.findByRole("button", { name: "Switch to monthly" }, LOAD)).toBeEnabled();
  });

  it("desde el mensual, 'Switch to annual' abre la subida con prorrateo", async () => {
    const { user } = await freshMember("monthly");
    await grantTestMembership(user.id, "monthly");
    const userEvents = userEvent.setup({ delay: null });
    render(<PlansPage />);

    await userEvents.click(await screen.findByRole("button", { name: "Switch to annual" }, LOAD));

    const dialog = await findDialog({}, LOAD);
    expect(await within(dialog).findByRole("button", { name: /^Pay \$[\d,.]+ and switch$/ }, LOAD)).toBeInTheDocument();
  });
});
