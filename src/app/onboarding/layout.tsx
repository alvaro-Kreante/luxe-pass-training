import { ProfileDraftProvider } from "@/components/onboarding/profile-context";
import { RequireSession } from "@/components/onboarding/require-session";

/**
 * Story 1.1 — el borrador de perfil es compartido por los tres pasos
 * (ProfileBasic → ProfilePersonal → ProfileProfessional). Los tres exigen
 * sesión: son el paso siguiente a /auth/confirm.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireSession>
      <ProfileDraftProvider>{children}</ProfileDraftProvider>
    </RequireSession>
  );
}
