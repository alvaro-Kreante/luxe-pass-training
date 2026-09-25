import { createClient as createAdminClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchNotifications } from "./notifications";
import {
  ensureReferralCode,
  fetchReferralOverview,
  normalizeReferralCode,
  recordReferralShare,
  referralInviteMessage,
} from "./referrals";
import { createClient } from "./supabase/client";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { insertSucceededTestPayment } from "./testing/membership-fixture";

/**
 * Story 9.2 (Referral Program) — conectada a Supabase real (`referrals`,
 * `referral_shares`, `profiles.referral_code`). El amigo llega con el
 * código en los metadatos de Auth (`/join/[code]` → `/signup?ref=`), y la
 * fila de `referrals` nace al crear su perfil (fin de /onboarding).
 *
 * El cliente de navegador de Supabase es un singleton en jsdom (una sola
 * sesión), así que el amigo se crea con el service role en vez de iniciar
 * sesión — su alta dispara los mismos triggers que el onboarding real.
 */

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function freshReferrer(label: string) {
  const supabase = createClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `referrer-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
    { fullName: "Alexandra Rivas" },
  );
  return { supabase, user };
}

async function friendJoinsWithCode(code: string | null, fullName = "Daniel Okonjo") {
  const service = admin();
  const email = `friend-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@ensoleil-test.com`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: "EnSoleil!2026",
    email_confirm: true,
    user_metadata: code ? { referral_code: code } : {},
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

  return { id: data.user.id, email };
}

describe("normalizeReferralCode", () => {
  it("acepta el código de /join/[code] sin importar mayúsculas ni espacios", () => {
    expect(normalizeReferralCode("  ar-soleil-24 ")).toBe("AR-SOLEIL-24");
  });

  it("descarta lo que no tiene forma de código", () => {
    expect(normalizeReferralCode("hola")).toBeNull();
  });
});

describe("AC 'Unique referral code generation'", () => {
  it("cada miembro tiene un código persistido, estable y con las iniciales de su nombre", async () => {
    const { supabase } = await freshReferrer("code");

    const first = await ensureReferralCode(supabase);
    expect(first).toMatch(/^AR-SOLEIL-\d{2,4}$/);
    expect(await ensureReferralCode(supabase)).toBe(first);
  });

  it("dos miembros con las mismas iniciales nunca comparten código", async () => {
    const { supabase } = await freshReferrer("unique-a");
    const mine = await ensureReferralCode(supabase);
    const other = await friendJoinsWithCode(null, "Alexandra Rivas");
    const { data } = await admin().from("profiles").select("referral_code").eq("id", other.id).single();

    expect(data?.referral_code).toMatch(/^AR-SOLEIL-\d{2,4}$/);
    expect(data?.referral_code).not.toBe(mine);
  });
});

describe("AC 'Easy sharing via social media, email, SMS'", () => {
  it("el mensaje de invitación lleva el nombre del miembro y su código", () => {
    expect(referralInviteMessage("Alexandra", "AR-SOLEIL-24")).toContain("AR-SOLEIL-24");
  });

  it("cada vez que el miembro comparte, cuenta como invitación enviada", async () => {
    const { supabase } = await freshReferrer("share");

    await recordReferralShare(supabase, "email");
    await recordReferralShare(supabase, "messages");

    const overview = await fetchReferralOverview(supabase);
    expect(overview.stats.sentCount).toBe(2);
  });
});

describe("AC 'Referral tracking and status updates' + 'Friend's sign up confirmation notification'", () => {
  it("un amigo que se registra con el código aparece como premio pendiente", async () => {
    const { supabase } = await freshReferrer("tracking");
    const code = await ensureReferralCode(supabase);

    const friend = await friendJoinsWithCode(code);

    const overview = await fetchReferralOverview(supabase);
    expect(overview.invitations).toHaveLength(1);
    expect(overview.invitations[0]).toMatchObject({
      name: "Daniel Okonjo",
      email: friend.email,
      status: "pending",
    });
    expect(overview.stats.joinedCount).toBe(1);
    expect(overview.stats.earnedCount).toBe(0);
  });

  it("el referidor recibe una notificación real cuando el amigo se registra", async () => {
    const { supabase } = await freshReferrer("notify-joined");
    const code = await ensureReferralCode(supabase);

    await friendJoinsWithCode(code);

    const notifications = await fetchNotifications(supabase);
    expect(notifications.some((n) => n.title === "Daniel Okonjo joined")).toBe(true);
  });

  it("un código que no existe no crea ningún referido", async () => {
    const { supabase } = await freshReferrer("unknown-code");

    await friendJoinsWithCode("ZZ-SOLEIL-00");

    expect((await fetchReferralOverview(supabase)).invitations).toHaveLength(0);
  });
});

describe("AC 'Reward crediting for successful referrals (pending)'", () => {
  it("el primer pago real del amigo acredita el day pass y avisa al referidor", async () => {
    const { supabase } = await freshReferrer("credit");
    const code = await ensureReferralCode(supabase);
    const friend = await friendJoinsWithCode(code);

    await insertSucceededTestPayment(friend.id);

    const overview = await fetchReferralOverview(supabase);
    expect(overview.invitations[0]?.status).toBe("credited");
    expect(overview.stats.earnedCount).toBe(1);
    expect(overview.readyDayPassCount).toBeGreaterThanOrEqual(1);

    const notifications = await fetchNotifications(supabase);
    expect(notifications.some((n) => n.title === "Your referral day pass is ready")).toBe(true);
  });

  it("un pago que no se liquida no acredita nada", async () => {
    const { supabase } = await freshReferrer("no-credit");
    const code = await ensureReferralCode(supabase);
    const friend = await friendJoinsWithCode(code);

    await admin().from("payments").insert({ member_id: friend.id, amount_cents: 8166, status: "failed" });

    expect((await fetchReferralOverview(supabase)).invitations[0]?.status).toBe("pending");
  });
});
