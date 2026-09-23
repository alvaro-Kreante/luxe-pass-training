// Story 9.1 — "Renewal date: auto-renewal settings, notice a month in
// advance" (flow) / `Main.dc.html`: "We email you on October 3 — a month
// before — so nothing renews unannounced". Disparada por el paso del
// tiempo: `dispatch_membership_renewals()` (pg_cron diario, ver
// supabase/schemas/memberships.sql) llama aquí por cada plan anual con
// auto-renovación que entra en su último mes. Mismo motivo de
// `x-webhook-secret` en vez de `verify_jwt` que send-booking-reminder:
// quien llama es Postgres, no un miembro autenticado.
//
// Ningún artboard dibuja este email (solo la promesa en pantalla) — mismo
// esqueleto sobrio que `send-booking-reminder`, anotado como desviación en
// docs/design/COMPONENT-MAP.md.
import { createClient } from "npm:@supabase/supabase-js@2";

import { sendBrevoEmail } from "../_shared/brevo.ts";

const webhookSecret = Deno.env.get("MEMBERSHIP_RENEWAL_WEBHOOK_SECRET") as string;

/** Debe coincidir con `ANNUAL_PRICE` de `src/lib/membership.ts`. */
const ANNUAL_PRICE_LABEL = "$2,400.00";

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") as string,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string,
  );
}

function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

interface MembershipRecord {
  member_id: string;
  plan: "monthly" | "annual";
  current_period_end: string;
}

interface WebhookPayload {
  record: MembershipRecord;
}

function renderRenewalHtml(input: { memberFirstName: string; renewsOn: string; appUrl: string }): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">Your membership</p>
      <h1 style="font-size:24px;color:#1a1a1a;">Renews on ${input.renewsOn}</h1>
      <p style="font-size:14px;color:#4a4a4a;line-height:1.6;">
        ${input.memberFirstName}, your annual LuxePass membership renews in a month, for another year at
        ${ANNUAL_PRICE_LABEL}. Nothing to do if you want to keep it.
      </p>
      <p style="font-size:14px;color:#4a4a4a;line-height:1.6;">
        To change the plan, or turn auto-renewal off, go to
        <a href="${input.appUrl}/profile/membership" style="color:#AD8A5C;">Profile › Membership</a>.
      </p>
    </div>
  `;
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

  const { record: membership } = (await req.json()) as WebhookPayload;
  const service = getServiceClient();

  const [{ data: authUser, error: authError }, { data: profile }] = await Promise.all([
    service.auth.admin.getUserById(membership.member_id),
    service.from("profiles").select("full_name").eq("id", membership.member_id).maybeSingle(),
  ]);

  if (authError || !authUser.user?.email) {
    return new Response(
      JSON.stringify({ error: { message: `could not resolve member: ${authError?.message}` } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const memberFirstName = (profile?.full_name ?? authUser.user.email.split("@")[0]).split(" ")[0]!;
  const renewsOn = formatLongDate(membership.current_period_end);

  try {
    await sendBrevoEmail(
      authUser.user.email,
      `Your LuxePass membership renews on ${renewsOn}`,
      renderRenewalHtml({ memberFirstName, renewsOn, appUrl: Deno.env.get("APP_URL") as string }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "brevo error";
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
