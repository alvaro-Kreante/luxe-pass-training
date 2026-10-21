import { describe, expect, it } from "vitest";

import { today } from "./availability";
import { confirmBooking } from "./booking";
import { LATE_CANCELLATION_FEE_CENTS } from "./passes";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 6.1 — "24-hour advance notice requirement for cancellation".
 * PAY-05 (docs/audit/pagos-y-logica-de-negocio.md): el plazo de 24h lo mide
 * el servidor con su propio reloj; un `p_today` viejo enviado por el
 * cliente no convierte una cancelación tardía en gratuita (y reembolsable).
 */
describe("cancel_booking mide el plazo con el reloj del servidor", () => {
  it("una reserva de hoy paga el fee aunque el cliente diga que hoy es otro día", async () => {
    const supabase = isolatedClient();
    await signUpConfirmedMemberAndSignIn(supabase, `cancel-today-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026", {
      membership: "annual",
    });
    const booking = await confirmBooking(supabase, {
      loungeId: "the-ainsworth",
      dateIso: today("America/New_York"),
      band: "morning",
      time: "8:00 AM",
      specialRequests: "",
    });

    const { data, error } = await supabase.rpc("cancel_booking", { p_booking_id: booking!.id, p_today: "2000-01-01" });

    expect(error).toBeNull();
    expect(data.cancellation_fee_cents).toBe(LATE_CANCELLATION_FEE_CENTS);
  });
});
