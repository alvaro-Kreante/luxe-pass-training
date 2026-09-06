import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Story 1.1/1.2 — destino común de los enlaces de `supabase/templates/`
 * (`confirmation.html` y `recovery.html`). Verifica el token del correo y
 * redirige según el tipo:
 * - `signup` pasa primero por el estado "Email confirmed" de
 *   `/verify-email` (no tiene sentido para una recuperación de contraseña).
 * - Cualquier otro tipo (`recovery`, …) va directo a `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // En `next dev`, `new URL(request.url).origin` puede devolver "localhost"
  // sin importar por qué host llegó la petición — si el navegador entró por
  // 127.0.0.1 (como fija `site_url` en config.toml), redirigir con ese origin
  // saltaría a un dominio distinto y perdería la cookie de sesión recién
  // puesta. La cabecera Host real evita ese salto.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${protocol}://${host}` : new URL(request.url).origin;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/onboarding/basics";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      if (type === "signup") {
        const verified = new URLSearchParams({ verified: "1", next });
        return NextResponse.redirect(
          `${origin}/verify-email?${verified.toString()}`,
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid-verification-link`);
}
