// Envío real de email transaccional vía Brevo — usado por `send-email`
// (Auth Hook, Story 1.1/1.2) y `send-booking-receipt` (Database Webhook,
// Story 4.2/5.1). Factorizado aquí porque ambas functions lo hacían igual:
// mismo remitente, misma api-key, mismo prefijo de ambiente en el subject.
const brevoApiKey = Deno.env.get("BREVO_API_KEY") as string;
const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") as string;
const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "LuxePass";
const envLabel = Deno.env.get("APP_ENV");

/** "[LOCAL] Subject" / "[STAGING] Subject" / "[PROD] Subject" — regla del subject, ver CLAUDE.md. */
export function envSubject(subject: string): string {
  return envLabel ? `[${envLabel}] ${subject}` : subject;
}

export async function sendBrevoEmail(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": brevoApiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject: envSubject(subject),
      htmlContent,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`brevo error: ${detail}`);
  }
}

/**
 * Story 8.2 — reporte programado con el CSV como adjunto real (no en el
 * cuerpo del email). `content` ya viene en base64 (una celda de texto, no
 * un archivo binario) — Brevo lo espera así en `attachment[].content`.
 */
export async function sendBrevoEmailWithAttachment(
  to: string,
  subject: string,
  htmlContent: string,
  attachments: { name: string; content: string }[],
): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": brevoApiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject: envSubject(subject),
      htmlContent,
      attachment: attachments,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`brevo error: ${detail}`);
  }
}
