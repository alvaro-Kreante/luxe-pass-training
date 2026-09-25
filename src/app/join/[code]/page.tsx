import { redirect } from "next/navigation";

import { normalizeReferralCode } from "@/lib/referrals";

/**
 * Story 9.2 — el enlace que comparte el miembro (`Share.dc.html`). Sin
 * pantalla propia: ningún artboard dibuja un aterrizaje de invitación, así
 * que lleva directo al alta (`/signup`, Story 1.1) con el código en `?ref=`
 * — decisión de producto del 23 sept 2026, ver COMPONENT-MAP.md.
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const referralCode = normalizeReferralCode(code);
  redirect(referralCode ? `/signup?ref=${referralCode}` : "/signup");
}
