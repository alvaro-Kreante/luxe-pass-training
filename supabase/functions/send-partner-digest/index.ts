// Story 7.2 — "Morning digest email with day's guest list". pg_cron
// (`dispatch_partner_morning_digest`, `supabase/schemas/partner_notifications.sql`)
// llama aquí cada día a las 6:30 AM (hora real, no el "hoy" de mockup) una vez
// por usuario activo de cada partner, con todos sus lounges agrupados (Story
// 10.7, `partner_digest_batches`) — mismo mecanismo de secreto
// compartido que `send-partner-booking-event` (Postgres, no un miembro
// autenticado).
import { sendBrevoEmail } from "../_shared/brevo.ts";
import { renderPartnerDigest } from "../_shared/partner-emails.ts";

const webhookSecret = Deno.env.get("PARTNER_DIGEST_WEBHOOK_SECRET") as string;

interface DigestGuest {
  name: string;
  slot_time: string;
  status: string;
}

interface DigestLounge {
  lounge_id: string;
  lounge_name: string;
  guest_count: number;
  guests: DigestGuest[];
}

interface WebhookPayload {
  partner_email: string;
  partner_business_name: string;
  date: string;
  lounges: DigestLounge[];
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

  const email = renderPartnerDigest({
    partnerName: payload.partner_business_name,
    dateIso: payload.date,
    lounges: payload.lounges.map((lounge) => ({
      loungeName: lounge.lounge_name,
      guestCount: lounge.guest_count,
      guests: lounge.guests.map((guest) => ({ name: guest.name, slotTime: guest.slot_time })),
    })),
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
