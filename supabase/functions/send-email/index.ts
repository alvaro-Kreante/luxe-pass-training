// Auth Hook "Send Email" (Story 1.1 User Registration, Story 1.2 Login &
// Authentication). Sustituye el SMTP simulado de Supabase Auth: Auth llama a
// esta function por cada email de confirmación/recovery y nosotros lo
// despachamos vía Brevo. El link y la copy replican
// supabase/templates/{confirmation,recovery}.html — mantener ambos en sync.

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const hookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string).replace(
  "v1,whsec_",
  "",
);
const brevoApiKey = Deno.env.get("BREVO_API_KEY") as string;
const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") as string;
const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "LuxePass";
// `email_data.site_url` del hook NO es el site_url de la app (auth.site_url
// en config.toml): en local resuelve al host:puerto del API de Supabase
// (54331), no al dev server de Next. Por eso la URL de la app es su propio
// secret, independiente del payload del hook.
const appUrl = Deno.env.get("APP_URL") as string;
const envLabel = Deno.env.get("APP_ENV");

interface EmailData {
  token_hash: string;
  email_action_type: string;
}

interface HookPayload {
  user: { email: string };
  email_data: EmailData;
}

const TEMPLATES: Record<
  string,
  { subject: string; next: string; render: (confirmUrl: string) => string }
> = {
  signup: {
    subject: "Confirm your LuxePass account",
    next: "/onboarding/basics",
    render: (confirmUrl) => `
      <h2>Confirm your email</h2>
      <p>Welcome to LuxePass. Confirm your email address to activate your account.</p>
      <p><a href="${confirmUrl}">Confirm email address</a></p>
    `,
  },
  recovery: {
    subject: "Reset your LuxePass password",
    next: "/reset-password",
    render: (confirmUrl) => `
      <h2>Reset your password</h2>
      <p>We received a request to reset your LuxePass password.</p>
      <p><a href="${confirmUrl}">Reset password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  },
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let user: HookPayload["user"];
  let emailData: EmailData;
  try {
    const wh = new Webhook(hookSecret);
    ({ user, email_data: emailData } = wh.verify(payload, headers) as HookPayload);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : "invalid signature",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const template = TEMPLATES[emailData.email_action_type];
  if (!template) {
    return new Response(
      JSON.stringify({
        error: {
          message: `unsupported email_action_type: ${emailData.email_action_type}`,
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const confirmUrl = `${appUrl}/auth/confirm?token_hash=${emailData.token_hash}&type=${emailData.email_action_type}&next=${template.next}`;
  const subject = envLabel ? `[${envLabel}] ${template.subject}` : template.subject;

  const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": brevoApiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: user.email }],
      subject,
      htmlContent: template.render(confirmUrl),
    }),
  });

  if (!brevoResponse.ok) {
    const detail = await brevoResponse.text();
    return new Response(
      JSON.stringify({ error: { message: `brevo error: ${detail}` } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
