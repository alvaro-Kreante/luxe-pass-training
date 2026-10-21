import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Story 1.1 — mantiene viva la sesión de Supabase Auth (Auth es la única
 * excepción de backend real que autoriza CLAUDE.md; esto no es un sistema
 * de auth propio, es el mecanismo que Supabase exige para Next.js).
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
