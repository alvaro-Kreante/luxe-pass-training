import { MyPassView } from "@/components/passes/my-pass-view";
import { loadMyPass } from "@/lib/passes";
import { requireSession } from "@/lib/supabase/server";

/**
 * Story 5.1 / 6.1 — My Pass (`Main.dc.html` y `History.dc.html` de la Fase 7).
 * PERF-02: se carga en el servidor y el HTML llega con las reservas.
 */
export default async function MyPassPage() {
  const supabase = await requireSession();
  return <MyPassView {...await loadMyPass(supabase)} />;
}
