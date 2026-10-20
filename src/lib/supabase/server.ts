import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Cliente de Supabase con la sesión de las cookies: el Route Handler de
 * `auth/confirm` (Story 1.1) y las páginas que cargan en el servidor
 * (PERF-02). Misma RLS que el cliente de navegador.
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

/**
 * PERF-02 — gemelo de servidor de `RequireSession`: sin sesión, a `/login`
 * antes de consultar nada. Devuelve el cliente ya autenticado.
 */
export async function requireSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return supabase;
}
