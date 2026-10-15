// @vitest-environment node
import type { RealtimeChannel } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

import { today } from "./availability";
import { confirmBooking } from "./booking";
import { signUpConfirmedMemberAndSignIn, signUpConfirmedPartnerAndSignIn } from "./testing/confirmed-user";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 7.1 — "Real-time updates" del Today Dashboard
 * (`components/partner/today-dashboard.tsx`). DB-01 (docs/audit/base-de-datos.md):
 * `bookings` no estaba en la publicación `supabase_realtime`, así que el
 * canal del partner se suscribía pero nunca recibía nada. Entorno `node`
 * para usar el `WebSocket` nativo y una conexión de Realtime real.
 */

const LOUNGE = "the-ainsworth";
let channel: RealtimeChannel | undefined;

afterEach(async () => {
  await channel?.unsubscribe();
});

describe("Realtime de reservas para el partner", () => {
  it("el partner recibe en vivo una reserva nueva de su lounge", async () => {
    const partner = isolatedClient();
    await signUpConfirmedPartnerAndSignIn(partner, `realtime-staff-${Date.now()}@ensoleil-test.com`, "EnSoleil!2026", {
      businessName: "Ainsworth Hospitality",
      loungeIds: [LOUNGE],
    });
    const { data: session } = await partner.auth.getSession();
    partner.realtime.setAuth(session.session!.access_token);

    const received: string[] = [];
    await new Promise<void>((resolve, reject) => {
      channel = partner
        .channel(`bookings-${Date.now()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings", filter: `lounge_id=eq.${LOUNGE}` }, (change) => {
          received.push((change.new as { id: string }).id);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(status));
        });
    });

    const member = isolatedClient();
    await signUpConfirmedMemberAndSignIn(member, `realtime-member-${Date.now()}@ensoleil-test.com`, "EnSoleil!2026", {
      membership: "annual",
    });
    const booking = await confirmBooking(member, {
      loungeId: LOUNGE,
      dateIso: today(),
      band: "morning",
      time: "8:00 AM",
      specialRequests: "",
    });

    await expect.poll(() => received, { timeout: 10_000 }).toContain(booking!.id);
  });
});
