import { createClient as createAdminClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { uploadProfilePhoto } from "./profile-photo";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { giveTestMemberSavedCard } from "./testing/membership-fixture";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 6.3 / PRIV-02 — el borrado físico tras los 30 días de gracia
 * (`delete-account`, disparado por `dispatch_account_deletions`) no deja
 * datos del miembro fuera de Postgres: ni la foto en Storage ni el Customer
 * de Stripe con su email y sus tarjetas. Los tests invocan la function
 * directamente con el secreto compartido, igual que `runMembershipRenewalCharge`.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function memberPastGracePeriod(prefix: string) {
  const email = `${prefix}-${Date.now()}@ensoleil-test.example`;
  const member = isolatedClient();
  await signUpConfirmedMemberAndSignIn(member, email, "EnSoleil!2026");
  const {
    data: { user },
  } = await member.auth.getUser();
  const memberId = user!.id;

  await uploadProfilePhoto(member, new File([new Uint8Array([255, 216, 255])], "avatar.jpg", { type: "image/jpeg" }));
  await giveTestMemberSavedCard(memberId, email);
  const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", memberId).single();

  const deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("profiles").update({ deleted_at: deletedAt }).eq("id", memberId);

  return { memberId, customerId: profile!.stripe_customer_id as string };
}

function runAccountDeletion(memberId: string, secret = process.env.ACCOUNT_DELETION_WEBHOOK_SECRET!) {
  return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
    body: JSON.stringify({ member_id: memberId }),
  });
}

async function photosOf(memberId: string) {
  const { data } = await admin.storage.from("profile-photos").list(memberId);
  return data ?? [];
}

async function stripeCustomer(customerId: string) {
  const res = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  return (await res.json()) as { id: string; deleted?: boolean };
}

describe("delete-account", () => {
  it("sin el secreto compartido no borra nada", async () => {
    const { memberId, customerId } = await memberPastGracePeriod("delete-unauthorized");

    const res = await runAccountDeletion(memberId, "not-the-secret");

    expect(res.status).toBe(401);
    expect((await admin.auth.admin.getUserById(memberId)).data.user).not.toBeNull();
    expect(await photosOf(memberId)).toHaveLength(1);
    expect((await stripeCustomer(customerId)).deleted).toBeUndefined();
  });

  it("borra la cuenta, la foto de Storage y el Customer de Stripe", async () => {
    const { memberId, customerId } = await memberPastGracePeriod("delete-cleanup");

    const res = await runAccountDeletion(memberId);

    expect(res.status).toBe(200);
    expect((await admin.auth.admin.getUserById(memberId)).data.user).toBeNull();
    expect(await photosOf(memberId)).toHaveLength(0);
    expect((await stripeCustomer(customerId)).deleted).toBe(true);
  });
});
