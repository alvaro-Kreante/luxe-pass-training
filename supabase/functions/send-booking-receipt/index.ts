// Story 4.2/5.1 — email real de recibo de reserva (`Receipt.dc.html`). No es
// un Auth Hook (esos solo cubren signup/recovery): la dispara un Database
// Webhook (`supabase/schemas/booking_receipts.sql`, trigger AFTER INSERT en
// `bookings` cuando `status = 'confirmed'`), vía `pg_net` -> esta function.
//
// Sin JWT de usuario en la llamada (es Postgres, no un miembro autenticado),
// así que se verifica con un secreto compartido (`x-webhook-secret`, guardado
// en Supabase Vault del lado de Postgres y en el secret de esta function del
// lado de Deno) en vez de `verify_jwt` — mismo motivo por el que
// `stripe-webhook` tampoco usa `verify_jwt` (Stripe firma con su propio
// esquema). Ver CLAUDE.md §Email de recibo de reserva.
import { createClient } from "npm:@supabase/supabase-js@2";

import { sendBrevoEmail } from "../_shared/brevo.ts";
import { DAY_PASS_PRICE, TAX_RATE } from "../_shared/stripe-context.ts";

const webhookSecret = Deno.env.get("BOOKING_RECEIPT_WEBHOOK_SECRET") as string;

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") as string,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string,
  );
}

/** Debe coincidir con `bookingReferenceFromId` de `src/lib/booking.ts` (y `booking_reference` en `bookings.sql`) — SQL/Deno no pueden importar TS del proyecto Next.js. */
function hashOf(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 900000;
  }
  return hash;
}

function bookingReferenceFromId(bookingId: string): string {
  const digits = String(100000 + hashOf(bookingId));
  return `LP-${digits}`;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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
}

interface WebhookPayload {
  type: string;
  table: string;
  record: BookingRecord;
}

interface PaymentRow {
  status: string;
  amount_cents: number;
}

/**
 * El pago de una tarjeta nueva se liga a `payments.booking_id` en la misma
 * transacción que crea la reserva, pero su `status` solo pasa a 'succeeded'
 * cuando el webhook de Stripe lo confirma — algo asíncrono, sin garantía de
 * haber llegado ya cuando este trigger dispara. Reintenta unos segundos
 * antes de mandar el recibo con un estado de pago que podría ser transitorio.
 */
async function findSettledPayment(
  service: ReturnType<typeof getServiceClient>,
  bookingId: string,
): Promise<PaymentRow | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data } = await service
      .from("payments")
      .select("status, amount_cents")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (!data || data.status !== "pending") return data;
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

function renderReceiptHtml(input: {
  memberFirstName: string;
  loungeName: string;
  loungeAddress: string;
  dateIso: string;
  time: string;
  reference: string;
  specialRequests: string;
  payment: PaymentRow | null;
}): string {
  const paymentSection = !input.payment
    ? `<p>Included in your membership — no charge for this visit.</p>`
    : input.payment.status === "succeeded"
      ? `
        <table style="width:100%;font-size:14px;color:#4a4a4a;border-collapse:collapse;">
          <tr><td>Day pass · 1 visit</td><td style="text-align:right;">${formatCurrency(DAY_PASS_PRICE * 100)}</td></tr>
          <tr><td>Sales tax · ${(TAX_RATE * 100).toFixed(3)}%</td><td style="text-align:right;">${formatCurrency(Math.round(DAY_PASS_PRICE * TAX_RATE * 100))}</td></tr>
          <tr style="font-weight:bold;color:#1a1a1a;"><td>Total charged</td><td style="text-align:right;">${formatCurrency(input.payment.amount_cents)}</td></tr>
        </table>
        <p style="font-size:12px;color:#8a8a8a;">Processed by Stripe.</p>
      `
      : `<p>Your payment is still processing — you'll see the charge confirmed shortly in My Pass.</p>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">Booking confirmed</p>
      <h1 style="font-size:24px;color:#1a1a1a;">${input.reference}</h1>
      <p style="font-size:14px;color:#4a4a4a;line-height:1.6;">
        ${input.memberFirstName}, your lounge visit is booked. Show the reference number above at
        reception — no printing needed.
      </p>
      <table style="width:100%;font-size:13px;color:#4a4a4a;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 0;"><strong>Lounge</strong></td><td>${input.loungeName} — ${input.loungeAddress}</td></tr>
        <tr><td style="padding:4px 0;"><strong>When</strong></td><td>${formatWeekdayDate(input.dateIso)}, arrive ${input.time}</td></tr>
        ${input.specialRequests ? `<tr><td style="padding:4px 0;"><strong>Special requests</strong></td><td>${input.specialRequests}</td></tr>` : ""}
      </table>
      <p style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;color:#8a6d3b;">Payment receipt</p>
      ${paymentSection}
      <p style="font-size:12px;color:#8a8a8a;line-height:1.6;">
        Plans changed? Cancel free of charge until ${formatWeekdayDate(input.dateIso)} from My Pass.
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

  if (booking.status !== "confirmed") {
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const service = getServiceClient();

  const [{ data: authUser, error: authError }, { data: profile }, { data: lounge, error: loungeError }] =
    await Promise.all([
      service.auth.admin.getUserById(booking.member_id),
      // `maybeSingle`, no `single`: un miembro sin fila en `profiles` (p. ej.
      // un fixture de test que crea el usuario de Auth sin perfil completo)
      // no debe hacer fallar el recibo — cae al email como nombre.
      service.from("profiles").select("full_name").eq("id", booking.member_id).maybeSingle(),
      service.from("lounges").select("name, address").eq("id", booking.lounge_id).single(),
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

  const payment = await findSettledPayment(service, booking.id);
  const reference = bookingReferenceFromId(booking.id);

  try {
    await sendBrevoEmail(
      authUser.user.email,
      `Your visit at ${lounge.name} is confirmed — ${reference}`,
      renderReceiptHtml({
        memberFirstName,
        loungeName: lounge.name,
        loungeAddress: lounge.address,
        dateIso: booking.date,
        time: booking.slot_time,
        reference,
        specialRequests: booking.special_requests,
        payment,
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
