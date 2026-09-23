// Story 7.2 — "Email notification for each new booking" / "Cancellation
// notifications with updated guest count". Database Webhook (dos triggers,
// `booking_confirmed_notify_partner` y `booking_cancelled_notify_partner` en
// `supabase/schemas/partner_notifications.sql`) — mismo mecanismo que
// send-booking-receipt (pg_net + x-webhook-secret, sin verify_jwt: quien
// llama es Postgres, no un miembro autenticado). Una sola function para los
// dos eventos (distinguidos por `type` en el payload) porque comparten
// destinatario (el partner) y casi todo el render.
import { createClient } from "npm:@supabase/supabase-js@2";

import { sendBrevoEmail } from "../_shared/brevo.ts";

const webhookSecret = Deno.env.get("PARTNER_NOTIFICATION_WEBHOOK_SECRET") as string;

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") as string,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string,
  );
}

interface BookingRecord {
  id: string;
  member_id: string;
  lounge_id: string;
  date: string;
  slot_time: string;
  confirmation_code: string;
}

interface WebhookPayload {
  type: "new_booking" | "cancellation";
  record: BookingRecord;
  lounge_name: string;
  partner_email: string;
  partner_business_name: string;
  /** Solo en `type: "cancellation"`. */
  updated_guest_count?: number;
}

function formatWeekdayDate(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateIso}T00:00:00Z`));
}

function renderHtml(input: {
  heading: string;
  guestName: string;
  loungeName: string;
  dateIso: string;
  time: string;
  reference: string;
  bodyLine: string;
}): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">${input.loungeName}</p>
      <h1 style="font-size:22px;color:#1a1a1a;">${input.heading}</h1>
      <p style="font-size:14px;color:#4a4a4a;line-height:1.6;">${input.bodyLine}</p>
      <table style="width:100%;font-size:13px;color:#4a4a4a;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 0;"><strong>Guest</strong></td><td>${input.guestName}</td></tr>
        <tr><td style="padding:4px 0;"><strong>When</strong></td><td>${formatWeekdayDate(input.dateIso)}, ${input.time}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Reference</strong></td><td>${input.reference}</td></tr>
      </table>
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

  const payload = (await req.json()) as WebhookPayload;
  const { record: booking } = payload;

  const service = getServiceClient();

  const [{ data: authUser }, { data: profile }] = await Promise.all([
    service.auth.admin.getUserById(booking.member_id),
    service.from("profiles").select("full_name").eq("id", booking.member_id).maybeSingle(),
  ]);

  const guestName = profile?.full_name ?? authUser.user?.email?.split("@")[0] ?? "A guest";

  const isNewBooking = payload.type === "new_booking";
  const subject = isNewBooking
    ? `New booking · ${booking.slot_time} · ${payload.lounge_name}`
    : `Cancellation · ${booking.slot_time} · ${payload.lounge_name}`;
  const heading = isNewBooking ? "New booking" : "Cancellation";
  const bodyLine = isNewBooking
    ? `${guestName} just booked ${booking.slot_time} at ${payload.lounge_name}.`
    : `${guestName} cancelled their ${booking.slot_time} visit. Today's count at ${payload.lounge_name} is now ${payload.updated_guest_count}.`;

  try {
    await sendBrevoEmail(
      payload.partner_email,
      subject,
      renderHtml({
        heading,
        guestName,
        loungeName: payload.lounge_name,
        dateIso: booking.date,
        time: booking.slot_time,
        reference: booking.confirmation_code,
        bodyLine,
      }),
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
