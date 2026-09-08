import { createBrowserClient } from "@supabase/ssr";

/**
 * Story 1.1 — cliente de Supabase para componentes "use client".
 * Apunta siempre al proyecto local (ver CLAUDE.md §Supabase Local Development).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
