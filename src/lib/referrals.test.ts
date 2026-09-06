import { describe, expect, it } from "vitest";

import { REFERRAL_INVITATIONS, REFERRAL_STATS, referralViewState } from "./referrals";

/**
 * Story 9.2 — "Referral tracking and status updates" y "Reward crediting for
 * successful referrals (pending)". `Referrals.dc.html` / `RewardCredited.dc.html`
 * son dos estados de la misma vista: `referralViewState` deriva el segundo a
 * partir del primero, sin backend que dispare el cambio de verdad.
 */
describe("referralViewState", () => {
  it("en el estado por defecto, Daniel Okonjo tiene el premio pendiente", () => {
    const { invitations } = referralViewState("default");
    const daniel = invitations.find((invitation) => invitation.id === "daniel");

    expect(daniel?.status).toBe("pending");
  });

  it("en el estado credited, el premio de Daniel Okonjo se acredita", () => {
    const { invitations } = referralViewState("credited");
    const daniel = invitations.find((invitation) => invitation.id === "daniel");

    expect(daniel?.status).toBe("credited");
    expect(daniel?.recentlyChanged).toBe(true);
  });

  it("no cambia el estado de las demás invitaciones", () => {
    const before = referralViewState("default").invitations;
    const after = referralViewState("credited").invitations;

    for (const id of ["priya", "marta", "theo", "rosalind"]) {
      const beforeStatus = before.find((invitation) => invitation.id === id)?.status;
      const afterStatus = after.find((invitation) => invitation.id === id)?.status;
      expect(afterStatus).toBe(beforeStatus);
    }
  });

  it("actualiza el stat de day passes earned de 1 a 2", () => {
    expect(referralViewState("default").stats.earnedCount).toBe(1);
    expect(referralViewState("credited").stats.earnedCount).toBe(2);
  });

  it("mantiene sin cambios el resto de invitaciones y el número total enviado", () => {
    expect(REFERRAL_INVITATIONS).toHaveLength(5);
    expect(REFERRAL_STATS.sentCount).toBe(5);
  });
});
