import { ProfileSkeleton } from "@/components/lounges/profile-skeleton";
import { AppShell } from "@/components/patterns/app-shell";

/** `Loading.dc.html` (Fase 4) mientras el servidor carga el perfil — PERF-02. */
export default function LoungeProfileLoading() {
  return (
    <AppShell padded={false}>
      <ProfileSkeleton />
    </AppShell>
  );
}
