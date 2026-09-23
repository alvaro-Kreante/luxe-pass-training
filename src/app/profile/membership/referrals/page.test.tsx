import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ensureReferralCode, fetchReferralOverview } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { insertSucceededTestPayment } from "@/lib/testing/membership-fixture";

import ReferralsPage from "./page";

/**
 * Story 9.2 — "Referral Program", backend real (`referrals`,
 * `referral_shares`, `profiles.referral_code`). `Referrals.dc.html`;
 * `RewardCredited.dc.html` es el mismo listado cuando un premio se acaba de
 * acreditar (primer pago real del amigo), ya no un `?state=`.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/membership/referrals",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function freshReferrer(label: string) {
  const supabase = createClient();
  await signUpConfirmedMemberAndSignIn(
    supabase,
    `referrals-page-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
    { fullName: "Alexandra Rivas" },
  );
  return supabase;
}

/** El amigo se da de alta con el código — mismo camino que /join/[code] → /signup?ref= → /onboarding. */
async function friendJoinsWithCode(code: string, fullName = "Daniel Okonjo") {
  const service = admin();
  const { data, error } = await service.auth.admin.createUser({
    email: `friend-page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@ensoleil-test.com`,
    password: "EnSoleil!2026",
    email_confirm: true,
    user_metadata: { referral_code: code },
  });
  if (error) throw error;
  const { error: profileError } = await service.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    phone: "+15555550101",
    city: "Miami",
    industry: "Testing",
    terms_accepted_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
  return data.user.id;
}

describe("AC 'Unique referral code generation'", () => {
  it("muestra el código real del miembro", async () => {
    const supabase = await freshReferrer("code");
    const code = await ensureReferralCode(supabase);
    render(<ReferralsPage />);

    expect(await screen.findByText(code)).toBeInTheDocument();
  });
});

describe("AC 'Referral tracking and status updates'", () => {
  it("sin amigos todavía, la lista queda vacía", async () => {
    await freshReferrer("empty");
    render(<ReferralsPage />);

    expect(await screen.findByText("No one has joined with your code yet.")).toBeInTheDocument();
  });

  it("un amigo que se registra con el código aparece con el premio pendiente", async () => {
    const supabase = await freshReferrer("pending");
    await friendJoinsWithCode(await ensureReferralCode(supabase));
    render(<ReferralsPage />);

    expect(await screen.findByText("Daniel Okonjo")).toBeInTheDocument();
    expect(screen.getByText("Reward pending")).toBeInTheDocument();
  });

  it("su primer pago real acredita el day pass", async () => {
    const supabase = await freshReferrer("credited");
    const friendId = await friendJoinsWithCode(await ensureReferralCode(supabase));
    await insertSucceededTestPayment(friendId);
    render(<ReferralsPage />);

    expect(await screen.findByText("Day pass credited")).toBeInTheDocument();
    expect(screen.getByText("$75.00 · nothing pending")).toBeInTheDocument();
  });
});

describe("AC 'Easy sharing via social media, email, SMS'", () => {
  it('"Share your code" abre los destinos reales: SMS, WhatsApp y email', async () => {
    await freshReferrer("share");
    const user = userEvent.setup({ delay: null });
    render(<ReferralsPage />);

    await user.click(await screen.findByRole("button", { name: "Share your code" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "Messages" })).toHaveAttribute("href", expect.stringMatching(/^sms:/));
    expect(within(dialog).getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^https:\/\/wa\.me\//),
    );
    expect(within(dialog).getByRole("link", { name: "Email" })).toHaveAttribute("href", expect.stringMatching(/^mailto:/));
  });

  it("copiar el enlace cuenta como invitación enviada", async () => {
    const supabase = await freshReferrer("copy");
    const user = userEvent.setup({ delay: null });
    render(<ReferralsPage />);

    await user.click(await screen.findByRole("button", { name: "Share your code" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Copy" }));

    await waitFor(async () => expect((await fetchReferralOverview(supabase)).stats.sentCount).toBe(1));
  });
});

describe("AC 'Referral bonus terms and conditions'", () => {
  it('"Referral terms" abre el modal con los tres números y al menos una cláusula', async () => {
    await freshReferrer("terms");
    const user = userEvent.setup({ delay: null });
    render(<ReferralsPage />);

    await user.click(await screen.findByRole("button", { name: "Referral terms" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("48 hours")).toBeInTheDocument();
    expect(within(dialog).getByText("1. What you both get")).toBeInTheDocument();
  });
});
