// Story 7.3 — Reports.dc.html, "Email it to the team". El partner
// autenticado envía el CSV que acaba de generar como adjunto real de Brevo.
// Los destinatarios no los elige el navegador: `partner_report_recipients()`
// los resuelve con el JWT de quien llama (su equipo, sin suspendidos).
import { createClient } from "npm:@supabase/supabase-js@2";

import { sendBrevoEmailWithAttachment } from "../_shared/brevo.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  reportTitle: string;
  filename: string;
  csv: string;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const caller = createClient(Deno.env.get("SUPABASE_URL") as string, Deno.env.get("SUPABASE_ANON_KEY") as string, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: recipients, error } = await caller.rpc("partner_report_recipients");
  if (error) return json({ error: error.message }, 401);
  const emails = ((recipients ?? []) as { email: string }[]).map((r) => r.email);
  if (emails.length === 0) return json({ error: "No one on the team to send it to" }, 403);

  const body = (await req.json()) as RequestBody;
  const filename = body.filename.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const title = escapeHtml(body.reportTitle);
  const attachment = btoa(unescape(encodeURIComponent(body.csv)));

  try {
    await Promise.all(
      emails.map((to) =>
        sendBrevoEmailWithAttachment(
          to,
          `${body.reportTitle} — your LuxePass report`,
          `<p style="font-family:Arial,sans-serif;font-size:14px;color:#4a4a4a;">Attached: <b>${title}</b>, sent from the partner dashboard.</p>`,
          [{ name: filename, content: attachment }],
        ),
      ),
    );
  } catch (sendError) {
    return json({ error: sendError instanceof Error ? sendError.message : "brevo error" }, 500);
  }

  return json({ recipients: emails.length }, 200);
});
