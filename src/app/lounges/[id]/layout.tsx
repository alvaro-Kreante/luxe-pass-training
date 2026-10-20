import { requireSession } from "@/lib/supabase/server";

/**
 * PERF-02 — la sesión se comprueba aquí, por encima de `loading.tsx`: así
 * `/login` llega como redirección (307) antes de que empiece el streaming.
 * Todas las rutas de `/lounges/[id]/*` ya exigían sesión (`RequireSession`).
 */
export default async function LoungeLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return children;
}
