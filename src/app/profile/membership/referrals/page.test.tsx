import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ensureReferralCode, fetchReferralOverview } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { grantTestMembership, insertSucceededTestPayment } from "@/lib/testing/membership-fixture";

import ReferralsPage from "./page";

/** La pantalla hace varias llamadas reales (Supabase + Stripe); bajo la suite completa en paralelo 1 s no alcanza. */
const LOAD = { timeout: 10000 };

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
    `referrals-page-${Date.now()}-${label}@ensoleil-test.example`,
    "EnSoleil!2026",
    { fullName: "Alexandra Rivas" },
  );
  return supabase;
}

/** El amigo se da de alta con el código — mismo camino que /join/[code] → /signup?ref= → /onboarding. */
async function friendJoinsWithCode(code: string, fullName = "Daniel Okonjo") {
  const service = admin();
  const { data, error } = await service.auth.admin.createUser({
    email: `friend-page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@ensoleil-test.example`,
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

    expect(await screen.findByText(code, {}, LOAD)).toBeInTheDocument();
  });
});

describe("AC 'Referral tracking and status updates'", () => {
  it("sin amigos todavía, la lista queda vacía", async () => {
    await freshReferrer("empty");
    render(<ReferralsPage />);

    expect(await screen.findByText("No one has joined with your code yet.", {}, LOAD)).toBeInTheDocument();
  });

  it("un amigo que se registra con el código aparece con el premio pendiente", async () => {
    const supabase = await freshReferrer("pending");
    await friendJoinsWithCode(await ensureReferralCode(supabase));
    render(<ReferralsPage />);

    expect(await screen.findByText("Daniel Okonjo", {}, LOAD)).toBeInTheDocument();
    expect(screen.getByText("Reward pending")).toBeInTheDocument();
  });

  it("su primer pago real acredita el day pass", async () => {
    const supabase = await freshReferrer("credited");
    const friendId = await friendJoinsWithCode(await ensureReferralCode(supabase));
    await insertSucceededTestPayment(friendId);
    render(<ReferralsPage />);

    expect(await screen.findByText("Day pass credited", {}, LOAD)).toBeInTheDocument();
    expect(screen.getByText("$75.00 · nothing pending")).toBeInTheDocument();
  });
});

describe("AC 'Easy sharing via social media, email, SMS'", () => {
  it('"Share your code" abre los destinos reales: SMS, WhatsApp y email', async () => {
    await freshReferrer("share");
    const user = userEvent.setup({ delay: null });
    render(<ReferralsPage />);

    await user.click(await screen.findByRole("button", { name: "Share your code" }, LOAD));

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

    await user.click(await screen.findByRole("button", { name: "Share your code" }, LOAD));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Copy" }));

    await waitFor(async () => expect((await fetchReferralOverview(supabase)).stats.sentCount).toBe(1));
  });
});

describe("AC 'Referral bonus terms and conditions'", () => {
  it('"Referral terms" abre el modal con los tres números y al menos una cláusula', async () => {
    await freshReferrer("terms");
    const user = userEvent.setup({ delay: null });
    render(<ReferralsPage />);

    await user.click(await screen.findByRole("button", { name: "Referral terms" }, LOAD));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("48 hours")).toBeInTheDocument();
    expect(within(dialog).getByText("1. What you both get")).toBeInTheDocument();
  });
});

describe("Usar un day pass (Terms §4)", () => {
  async function referrerWithCreditedFriend(label: string) {
    const supabase = await freshReferrer(label);
    const friendId = await friendJoinsWithCode(await ensureReferralCode(supabase));
    await insertSucceededTestPayment(friendId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { supabase, userId: user!.id };
  }

  it("con membresía activa, 'Use a day pass' lleva a elegir lounge", async () => {
    const { userId } = await referrerWithCreditedFriend("use-active");
    await grantTestMembership(userId, "annual");
    render(<ReferralsPage />);

    const link = await screen.findByRole("link", { name: "Use a day pass" }, LOAD);
    expect(link).toHaveAttribute("href", "/explore");
  });

  it("sin membresía activa, avisa de que hay que activarla y lleva a Membership", async () => {
    await referrerWithCreditedFriend("use-inactive");
    render(<ReferralsPage />);

    const link = await screen.findByRole("link", { name: "Activate membership" }, LOAD);
    expect(link).toHaveAttribute("href", "/profile/membership");
    expect(screen.getByText(/activate your membership to use your day passes/i)).toBeInTheDocument();
  });

  it("un day pass ya gastado en una reserva deja de contar como listo", async () => {
    const { supabase, userId } = await referrerWithCreditedFriend("use-spent");
    const service = admin();
    const { data: booking, error } = await service
      .from("bookings")
      .insert({
        member_id: userId,
        lounge_id: "the-ainsworth",
        date: "2026-12-10",
        band: "late",
        slot_time: "6:00 PM",
        status: "confirmed",
      })
      .select("id")
      .single();
    if (error) throw error;
    const { error: redemptionError } = await service
      .from("day_pass_redemptions")
      .insert({ member_id: userId, booking_id: booking.id, source: "referral" });
    if (redemptionError) throw redemptionError;

    const overview = await fetchReferralOverview(supabase);
    expect(overview.dayPasses.find((entry) => entry.id === "referral")).toBeUndefined();
    expect(overview.readyDayPassCount).toBe(0);
    expect(overview.stats.earnedCount).toBe(1);
  });
});
