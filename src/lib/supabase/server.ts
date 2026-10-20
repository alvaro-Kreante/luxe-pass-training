import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasDashboardAccess, loadPartnerContext } from "@/lib/partner-lounges";

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

/**
 * PERF-02 — gemelo de servidor de `RequireAdminSession`: sin sesión o sin el
 * rol `admin` (`has_role`), a `/admin/login`. Devuelve el cliente ya
 * autenticado.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/admin/login");
  const { data: isAdmin } = await supabase.rpc("has_role", { p_role: "admin" });
  if (!isAdmin) redirect("/admin/login");
  return supabase;
}

/**
 * PERF-02 — gemelo de servidor de `RequirePartnerSession`: sin sesión o sin el
 * rol `partner`, a `/partner/login`; partner o usuario suspendido (Story
 * 10.1), a `/partner/login?suspended=1`, que cierra la sesión al llegar (un
 * Server Component no puede escribir cookies). Devuelve el cliente y el
 * contexto del partner, para no volver a pedirlo.
 */
export async function requirePartner() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/partner/login");
  const { data: isPartner } = await supabase.rpc("has_role", { p_role: "partner" });
  if (!isPartner) redirect("/partner/login");
  const context = await loadPartnerContext(supabase);
  if (!hasDashboardAccess(context)) redirect("/partner/login?suspended=1");
  return { supabase, context };
}
