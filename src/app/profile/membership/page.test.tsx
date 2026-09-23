import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MEMBERSHIP_BENEFITS, fetchMembership } from "@/lib/membership";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { giveTestMemberSavedCard, grantTestMembership } from "@/lib/testing/membership-fixture";

import MembershipPage from "./page";

/**
 * Story 9.1 — "Clear membership display in profile (active/inactive)",
 * "Benefits explanation", "Upgrade options to monthly subscribers and
 * pricing (monthly → yearly price)" y "Renewal date and auto-renewal
 * settings". Backend real (`memberships` + Stripe en modo test): cada test
 * parte de un miembro recién creado, sin membresía hasta que el test se la
 * da. `Main.dc.html` (anual) / `MonthlyPlan.dc.html` (mensual).
 */
const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/membership",
  useRouter: () => ({ push }),
}));

async function freshMember(label: string) {
  const supabase = createClient();
  const email = `membership-page-${Date.now()}-${label}@ensoleil-test.com`;
  const user = await signUpConfirmedMemberAndSignIn(supabase, email, "EnSoleil!2026", { fullName: "Naomi Feldstein" });
  return { supabase, user, email };
}

describe("AC 'Clear membership display in profile (active/inactive)'", () => {
  it("sin plan, muestra la membresía inactiva y lleva a comparar planes", async () => {
    await freshMember("inactive");
    render(<MembershipPage />);

    expect(await screen.findByText("Inactive", {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compare plans" })).toHaveAttribute("href", "/profile/membership/plans");
  });

  it("con un plan anual activo, muestra plan, alta y fecha de renovación reales", async () => {
    const { user } = await freshMember("annual");
    await grantTestMembership(user.id, "annual", {
      startedAt: new Date("2025-11-03T00:00:00Z"),
      periodStart: new Date("2025-11-03T00:00:00Z"),
      periodEnd: new Date("2099-11-03T00:00:00Z"),
    });
    render(<MembershipPage />);

    expect(await screen.findByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Annual")).toBeInTheDocument();
    expect(screen.getByText("Member since November 2025")).toBeInTheDocument();
    expect(screen.getByText("November 3, 2099")).toBeInTheDocument();
  });

  it("enseña el código de referido real del miembro", async () => {
    await freshMember("code");
    render(<MembershipPage />);

    expect(await screen.findByText(/^NF-SOLEIL-\d{2,4}$/)).toBeInTheDocument();
  });
});

describe("AC 'Benefits explanation'", () => {
  it("explica los seis beneficios de la membresía, también sin plan activo", async () => {
    await freshMember("benefits");
    render(<MembershipPage />);

    await screen.findByText("Inactive");
    for (const benefit of MEMBERSHIP_BENEFITS) {
      expect(screen.getByText(benefit.title)).toBeInTheDocument();
    }
  });
});

describe("AC 'Upgrade options to monthly subscribers and pricing (monthly → yearly price)'", () => {
  it("un mensual ve la oferta de subir a anual y el modal enseña el prorrateo real", async () => {
    const { user } = await freshMember("offer");
    await grantTestMembership(user.id, "monthly", {
      periodStart: new Date(Date.now() - 8 * 86400000),
      periodEnd: new Date(Date.now() - 8 * 86400000 + 30 * 86400000),
    });
    const userEvents = userEvent.setup({ delay: null });
    render(<MembershipPage />);

    expect(await screen.findByText(/Save \$588\.00 a year/)).toBeInTheDocument();
    expect(screen.getByText(/credits the 22 days you have not used/)).toBeInTheDocument();
    expect(screen.queryByText("October 3")).not.toBeInTheDocument();
    await userEvents.click(screen.getByRole("button", { name: "Switch to annual" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Confirm your new plan")).toBeInTheDocument();
    expect(await within(dialog).findByText("Credit for 22 unused days on monthly")).toBeInTheDocument();
    expect(within(dialog).getAllByText("$2,217.40").length).toBeGreaterThan(0);
  });

  it("pagar con la tarjeta guardada sube de verdad al plan anual", async () => {
    const { supabase, user, email } = await freshMember("upgrade");
    await grantTestMembership(user.id, "monthly");
    await giveTestMemberSavedCard(user.id, email);
    const userEvents = userEvent.setup({ delay: null });
    render(<MembershipPage />);

    await userEvents.click(await screen.findByRole("button", { name: "Switch to annual" }));
    const pay = await screen.findByRole("button", { name: /^Pay \$[\d,.]+ and switch$/ });
    await waitFor(() => expect(pay).toBeEnabled());
    await userEvents.click(pay);

    await waitFor(async () => expect((await fetchMembership(supabase)).plan).toBe("annual"), { timeout: 15000 });
    expect(await screen.findByText("Annual")).toBeInTheDocument();
  }, 30000);
});

describe("AC 'Renewal date and auto-renewal settings'", () => {
  it('"Turn it off" apaga de verdad la auto-renovación', async () => {
    const { supabase, user } = await freshMember("auto-renew");
    await grantTestMembership(user.id, "annual");
    const userEvents = userEvent.setup({ delay: null });
    render(<MembershipPage />);

    await userEvents.click(await screen.findByRole("button", { name: "Manage renewal" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Turn off auto-renewal?")).toBeInTheDocument();
    await userEvents.click(within(dialog).getByRole("button", { name: "Turn it off" }));

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Auto-renewal" })).toHaveAttribute("aria-checked", "false"),
    );
    await waitFor(async () => expect((await fetchMembership(supabase)).autoRenew).toBe(false));
  });

  it("encender el switch de nuevo la reactiva", async () => {
    const { supabase, user } = await freshMember("auto-renew-on");
    await grantTestMembership(user.id, "annual", { autoRenew: false });
    const userEvents = userEvent.setup({ delay: null });
    render(<MembershipPage />);

    const toggle = await screen.findByRole("switch", { name: "Auto-renewal" });
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
    await userEvents.click(toggle);

    await waitFor(async () => expect((await fetchMembership(supabase)).autoRenew).toBe(true));
  });
});
