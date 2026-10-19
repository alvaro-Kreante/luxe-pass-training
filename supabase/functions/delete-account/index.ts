// Story 6.3 — borrado físico real tras los 30 días de gracia de
// `DeleteAccount.dc.html`. No es un Auth Hook ni la llama el navegador: la
// dispara `dispatch_account_deletions()` (pg_cron, ver
// `supabase/schemas/account_deletion.sql`) vía `pg_net`, mismo mecanismo de
// Database Webhook por secreto compartido que `send-booking-receipt`/
// `send-booking-reminder` — sin JWT de usuario que verificar (es Postgres,
// no un miembro con sesión).
//
// PRIV-02 — antes de borrar el usuario (que arrastra `profiles` en cascada)
// se limpia lo que Postgres no borra: la foto en `profile-photos/<uid>/` y
// el Customer de Stripe con su email y sus tarjetas. Si algo falla responde
// 500 sin borrar el usuario, y el cron lo reintenta.
import { createClient } from "npm:@supabase/supabase-js@2";

import { getStripeClient } from "../_shared/stripe-context.ts";

const webhookSecret = Deno.env.get("ACCOUNT_DELETION_WEBHOOK_SECRET") as string;

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") as string,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string,
  );
}

async function deleteDataOutsidePostgres(
  service: ReturnType<typeof getServiceClient>,
  memberId: string,
  stripeCustomerId: string | null,
): Promise<string | null> {
  const photos = service.storage.from("profile-photos");
  const { data: objects, error: listError } = await photos.list(memberId);
  if (listError) return listError.message;
  if (objects.length > 0) {
    const { error } = await photos.remove(objects.map((object) => `${memberId}/${object.name}`));
    if (error) return error.message;
  }

  if (stripeCustomerId) {
    try {
      await getStripeClient().customers.del(stripeCustomerId);
    } catch (error) {
      const alreadyGone = (error as { code?: string }).code === "resource_missing";
      if (!alreadyGone) return error instanceof Error ? error.message : "Stripe customer deletion failed";
    }
  }

  return null;
}

interface RequestBody {
  member_id: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  if (req.headers.get("x-webhook-secret") !== webhookSecret) {
    return new Response(JSON.stringify({ error: { message: "invalid webhook secret" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { member_id: memberId } = (await req.json()) as RequestBody;

  const service = getServiceClient();

  // Re-verifica el guard del cron (30 días cumplidos) del lado de la
  // function, no solo en el SQL que la invocó — defensa en profundidad
  // contra un secreto de webhook filtrado.
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("deleted_at, stripe_customer_id")
    .eq("id", memberId)
    .maybeSingle();

  if (profileError) {
    return new Response(JSON.stringify({ error: { message: profileError.message } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!profile) {
    return new Response(JSON.stringify({ skipped: true, reason: "already deleted" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const gracePeriodElapsed =
    profile.deleted_at !== null &&
    Date.now() - new Date(profile.deleted_at).getTime() >= 30 * 24 * 60 * 60 * 1000;

  if (!gracePeriodElapsed) {
    return new Response(JSON.stringify({ skipped: true, reason: "grace period not elapsed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cleanupError = await deleteDataOutsidePostgres(service, memberId, profile.stripe_customer_id);
  if (cleanupError) {
    return new Response(JSON.stringify({ error: { message: cleanupError } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: deleteError } = await service.auth.admin.deleteUser(memberId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: { message: deleteError.message } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
