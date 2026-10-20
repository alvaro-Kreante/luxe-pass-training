import { notFound } from "next/navigation";

import { LoungeProfileView } from "@/components/lounges/lounge-profile-view";
import { loadLoungeProfile } from "@/lib/lounge-profile";
import { requireSession } from "@/lib/supabase/server";

/**
 * Story 3.1 + 3.2 — perfil de lounge (`Main.dc.html` de la Fase 4).
 * PERF-02: se carga en el servidor (perfil y, en paralelo, fotos,
 * disponibilidad, favorito y temporadas) y el HTML llega con los datos; la
 * parte interactiva vive en `LoungeProfileView`.
 */
export default async function LoungeProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ loading?: string }>;
}) {
  const [{ id }, { loading }] = await Promise.all([params, searchParams]);
  const supabase = await requireSession();
  const data = await loadLoungeProfile(supabase, id);
  if (!data) notFound();

  return <LoungeProfileView {...data} forceLoading={loading === "1"} />;
}
