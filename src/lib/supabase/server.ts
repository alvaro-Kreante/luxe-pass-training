import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Story 1.1 — cliente de Supabase para el único Route Handler del repo
 * (`src/app/auth/confirm/route.ts`). Apunta siempre al proyecto local.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Se llama desde un Server Component en algún render; el
            // middleware ya se encarga de refrescar la sesión en ese caso.
          }
        },
      },
    },
  );
}
