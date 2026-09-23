// Story 8.2 — "Automated daily/weekly report generation" + "Scheduled email
// delivery of reports". pg_cron (`dispatch_scheduled_reports`,
// `supabase/schemas/admin_reports.sql`) llama aquí cada 15 min por cada
// reporte programado cuya `next_run_at` ya venció — mismo mecanismo de
// secreto compartido (Postgres, no un admin autenticado) que
// `send-partner-digest`. El CSV llega ya generado desde SQL
// (`admin_generate_report_csv`), como adjunto real de Brevo (no en el
// cuerpo del email).
import { sendBrevoEmailWithAttachment } from "../_shared/brevo.ts";

const webhookSecret = Deno.env.get("ADMIN_REPORT_WEBHOOK_SECRET") as string;

interface WebhookPayload {
  report_name: string;
  recipients: string[];
  csv: string;
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
  const filename = `${payload.report_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  const attachmentContent = btoa(unescape(encodeURIComponent(payload.csv)));

  try {
    await Promise.all(
      payload.recipients.map((to) =>
        sendBrevoEmailWithAttachment(
          to,
          `${payload.report_name} — your scheduled report`,
          `<p style="font-family:Arial,sans-serif;font-size:14px;color:#4a4a4a;">Attached: <b>${payload.report_name}</b>, delivered on schedule.</p>`,
          [{ name: filename, content: attachmentContent }],
        ),
      ),
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
