import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isZoned, primaryRole, zoneRedirect } from "@/lib/role-zones";

/**
 * Story 1.1 — refresco de la sesión de Supabase Auth en cada request.
 * Los Server Components no pueden escribir cookies, así que esto corre en
 * el middleware raíz. `getClaims()` verifica el JWT localmente (no hace una
 * llamada de red) y es el método recomendado para proteger rutas.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  // Aislamiento por rol (`lib/role-zones.ts`): sin sesión decide cada
  // `Require*Session`; con sesión, nadie sale de su espacio.
  const { pathname } = request.nextUrl;
  if (data?.claims && isZoned(pathname)) {
    const { data: rows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.claims.sub);
    const target = zoneRedirect(pathname, primaryRole((rows ?? []).map((r) => r.role)));
    if (target) {
      const redirect = NextResponse.redirect(new URL(target, request.url));
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  }

  return response;
}
