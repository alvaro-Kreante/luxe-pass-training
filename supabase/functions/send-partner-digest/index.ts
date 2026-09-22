// Story 7.2 — "Morning digest email with day's guest list". pg_cron
// (`dispatch_partner_morning_digest`, `supabase/schemas/partner_notifications.sql`)
// llama aquí cada día a las 6:30 AM (hora real, no el "hoy" de mockup) por
// cada lounge que gestiona un partner — mismo mecanismo de secreto
// compartido que `send-partner-booking-event` (Postgres, no un miembro
// autenticado).
import { sendBrevoEmail } from "../_shared/brevo.ts";

const webhookSecret = Deno.env.get("PARTNER_DIGEST_WEBHOOK_SECRET") as string;

interface DigestGuest {
  name: string;
  slot_time: string;
  status: string;
}

interface WebhookPayload {
  partner_email: string;
  partner_business_name: string;
  lounge_id: string;
  lounge_name: string;
  date: string;
  guest_count: number;
  guests: DigestGuest[];
}

function formatWeekdayDate(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateIso}T00:00:00Z`));
}

function renderDigestHtml(input: WebhookPayload): string {
  const rows = input.guests
    .map(
      (guest) => `
        <tr>
          <td style="padding:6px 0;font-weight:bold;">${guest.slot_time}</td>
          <td style="padding:6px 0;">${guest.name}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">${input.lounge_name}</p>
      <h1 style="font-size:24px;color:#1a1a1a;">${formatWeekdayDate(input.date)} · ${input.guest_count} guests expected</h1>
      <p style="font-size:14px;color:#4a4a4a;line-height:1.6;">Good morning. Here is today's guest list as it stands at 6:30 AM.</p>
      <table style="width:100%;font-size:13px;color:#4a4a4a;border-collapse:collapse;margin:16px 0;">
        ${rows || `<tr><td style="padding:6px 0;">No guests expected today.</td></tr>`}
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

  try {
    await sendBrevoEmail(
      payload.partner_email,
      `Today at ${payload.lounge_name} · ${payload.guest_count} guests expected`,
      renderDigestHtml(payload),
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
