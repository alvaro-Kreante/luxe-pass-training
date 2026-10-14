// Story 7.2 — "Email notification for each new booking" / "Cancellation
// notifications with updated guest count". Database Webhook (dos triggers,
// `booking_confirmed_notify_partner` y `booking_cancelled_notify_partner` en
// `supabase/schemas/partner_notifications.sql`) — mismo mecanismo que
// send-booking-receipt (pg_net + x-webhook-secret, sin verify_jwt: quien
// llama es Postgres, no un miembro autenticado). Una sola function para los
// dos eventos (distinguidos por `type` en el payload) porque comparten
// destinatario y casi todo el render. Story 10.7: los triggers llaman una vez
// por cada usuario activo del partner (`partner_notification_recipients`) y
// el render vive en `_shared/partner-emails.ts`.
import { createClient } from "npm:@supabase/supabase-js@2";

import { sendBrevoEmail } from "../_shared/brevo.ts";
import { renderPartnerBookingEvent } from "../_shared/partner-emails.ts";

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
    service.from("profiles").select("full_name, privacy_share_with_lounge").eq("id", booking.member_id).maybeSingle(),
  ]);

  // PRIV-01: sin "Share your details with the lounge", el lounge no recibe el nombre.
  const guestName =
    profile?.privacy_share_with_lounge === false
      ? "Private guest"
      : (profile?.full_name ?? authUser.user?.email?.split("@")[0] ?? "A guest");

  const email = renderPartnerBookingEvent({
    type: payload.type,
    partnerName: payload.partner_business_name,
    loungeName: payload.lounge_name,
    guestName,
    dateIso: booking.date,
    time: booking.slot_time,
    reference: booking.confirmation_code,
    updatedGuestCount: payload.updated_guest_count,
  });

  try {
    await sendBrevoEmail(payload.partner_email, email.subject, email.html);
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
