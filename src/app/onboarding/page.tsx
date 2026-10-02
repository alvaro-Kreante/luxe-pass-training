import { redirect } from "next/navigation";

/** Story 1.1 — el onboarding empieza en su primer paso (ProfileBasic). */
export default function OnboardingIndexPage() {
  redirect("/onboarding/basics");
}
