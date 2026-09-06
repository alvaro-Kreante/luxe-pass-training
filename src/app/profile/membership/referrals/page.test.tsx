import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { REFERRAL_CODE } from "@/lib/profile";
import { REFERRAL_INVITATIONS } from "@/lib/referrals";

import ReferralsPage from "./page";

/**
 * Story 9.2 — "Referral Program". `Referrals.dc.html` por defecto;
 * `RewardCredited.dc.html` con `?state=credited`.
 */
let query = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => query,
  usePathname: () => "/profile/membership/referrals",
}));

beforeEach(() => {
  query = new URLSearchParams();
});

describe("código de referido", () => {
  it("muestra el código único", () => {
    render(<ReferralsPage />);

    expect(screen.getByText(REFERRAL_CODE)).toBeInTheDocument();
  });
});

describe("seguimiento de invitaciones", () => {
  it("lista las cinco invitaciones con sus cuatro estados", () => {
    render(<ReferralsPage />);

    for (const invitation of REFERRAL_INVITATIONS) {
      expect(screen.getByText(invitation.name)).toBeInTheDocument();
    }
    expect(screen.getByText("Day pass credited")).toBeInTheDocument();
    expect(screen.getByText("Reward pending")).toBeInTheDocument();
    expect(screen.getAllByText("Invited").length).toBe(2);
    expect(screen.getByText("Invite expired")).toBeInTheDocument();
  });
});

describe("compartir el código", () => {
  it('"Share your code" abre el modal con los destinos y el enlace para copiar', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReferralsPage />);

    await user.click(screen.getByRole("button", { name: "Share your code" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("WhatsApp")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });
});

describe("términos del programa", () => {
  it('"Referral terms" abre el modal con los tres números y al menos una cláusula', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReferralsPage />);

    await user.click(screen.getByRole("button", { name: "Referral terms" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("48 hours")).toBeInTheDocument();
    expect(within(dialog).getByText("1. What you both get")).toBeInTheDocument();
  });
});

describe("acreditación del premio (?state=credited)", () => {
  beforeEach(() => {
    query = new URLSearchParams({ state: "credited" });
  });

  it("Daniel Okonjo pasa a Day pass credited", () => {
    render(<ReferralsPage />);

    expect(screen.getAllByText("Day pass credited").length).toBe(2);
  });

  it("el stat de day passes earned pasa a 2", () => {
    render(<ReferralsPage />);

    expect(screen.getByText("$150.00 · nothing pending")).toBeInTheDocument();
  });

  it("las dos notificaciones nuevas aparecen al abrir la campana", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReferralsPage />);

    await user.click(screen.getByRole("button", { name: /notifications/i }));

    expect(screen.getByText("Your referral day pass is ready")).toBeInTheDocument();
    expect(screen.getByText("Daniel Okonjo joined")).toBeInTheDocument();
  });
});
