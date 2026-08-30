import { ProfileDraftProvider } from "@/components/onboarding/profile-context";

/**
 * Story 1.1 — el borrador de perfil es compartido por los tres pasos
 * (ProfileBasic → ProfilePersonal → ProfileProfessional).
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfileDraftProvider>{children}</ProfileDraftProvider>;
}
