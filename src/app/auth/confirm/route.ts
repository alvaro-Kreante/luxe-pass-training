import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Story 1.1 — destino del enlace de `supabase/templates/confirmation.html`.
 * Verifica el token del correo y redirige al primer paso del perfil.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
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
      const verified = new URLSearchParams({ verified: "1", next });
      return NextResponse.redirect(
        `${origin}/verify-email?${verified.toString()}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid-verification-link`);
}
