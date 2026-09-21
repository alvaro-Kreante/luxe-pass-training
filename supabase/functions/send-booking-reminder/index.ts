// Story 5.3 — "I want to receive an email so that I can be reminded of my
// booking the next day", "24 hrs before the booking time" (`Reminder.dc.html`).
// Gemelo de `send-booking-receipt`, pero disparado por el paso del tiempo en
// vez de un insert: `dispatch_booking_reminders()` (pg_cron, ver
// supabase/schemas/booking_reminders.sql) llama aquí cada 30 minutos por
// cada reserva que entra en la ventana de 24h. Mismo motivo de
// `x-webhook-secret` en vez de `verify_jwt` que send-booking-receipt/
// stripe-webhook: quien llama es Postgres, no un miembro autenticado.
import { createClient } from "npm:@supabase/supabase-js@2";

import { sendBrevoEmail } from "../_shared/brevo.ts";

const webhookSecret = Deno.env.get("BOOKING_REMINDER_WEBHOOK_SECRET") as string;

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") as string,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string,
  );
}

function formatWeekdayDate(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateIso}T00:00:00Z`));
}

interface BookingRecord {
  id: string;
  member_id: string;
  lounge_id: string;
  date: string;
  slot_time: string;
  special_requests: string;
  status: string;
  /** Columna generada (`booking_reference`, ver bookings.sql) — ya viene en la fila, no hace falta recalcularla. */
  confirmation_code: string;
}

interface WebhookPayload {
  record: BookingRecord;
}

function renderReminderHtml(input: {
  memberFirstName: string;
  loungeName: string;
  loungeAddress: string;
  receptionNote: string;
  dateIso: string;
  time: string;
  reference: string;
  specialRequests: string;
}): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">See you tomorrow</p>
      <h1 style="font-size:24px;color:#1a1a1a;">${formatWeekdayDate(input.dateIso)}, ${input.time}</h1>
      <p style="font-size:14px;color:#4a4a4a;line-height:1.6;">
        ${input.memberFirstName}, your lounge visit is tomorrow. Nothing to print — give the number
        below at reception, or let them scan the code.
      </p>
      <table style="width:100%;font-size:13px;color:#4a4a4a;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 0;"><strong>Where</strong></td><td>${input.loungeName} — ${input.loungeAddress} (${input.receptionNote})</td></tr>
        <tr><td style="padding:4px 0;"><strong>When</strong></td><td>${formatWeekdayDate(input.dateIso)}, arrive ${input.time}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Confirmation</strong></td><td>${input.reference}</td></tr>
        ${input.specialRequests ? `<tr><td style="padding:4px 0;"><strong>Special requests</strong></td><td>${input.specialRequests}</td></tr>` : ""}
      </table>
      <p style="font-size:12px;color:#8a8a8a;line-height:1.6;">
        Plans changed? Cancel free of charge until today at ${input.time}. A visit you do not attend
        is recorded as a no-show.
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

  const { record: booking } = (await req.json()) as WebhookPayload;

  const service = getServiceClient();

  const [{ data: authUser, error: authError }, { data: profile }, { data: lounge, error: loungeError }] =
    await Promise.all([
      service.auth.admin.getUserById(booking.member_id),
      service.from("profiles").select("full_name").eq("id", booking.member_id).maybeSingle(),
      service.from("lounges").select("name, address, reception_note").eq("id", booking.lounge_id).single(),
    ]);

  if (authError || !authUser.user?.email || loungeError) {
    return new Response(
      JSON.stringify({
        error: {
          message: `could not resolve member/lounge: ${authError?.message ?? loungeError?.message}`,
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const memberFirstName = (profile?.full_name ?? authUser.user.email.split("@")[0]).split(" ")[0]!;

  try {
    await sendBrevoEmail(
      authUser.user.email,
      `Tomorrow at ${booking.slot_time} — your visit at ${lounge.name}`,
      renderReminderHtml({
        memberFirstName,
        loungeName: lounge.name,
        loungeAddress: lounge.address,
        receptionNote: lounge.reception_note,
        dateIso: booking.date,
        time: booking.slot_time,
        reference: booking.confirmation_code,
        specialRequests: booking.special_requests,
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
