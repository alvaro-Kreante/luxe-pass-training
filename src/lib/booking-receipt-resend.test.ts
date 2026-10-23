import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { addDays, today } from "./availability";
import { resendBookingReceipt } from "./passes";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 6.1 — "Email receipt" de My Pass › Past (`History.dc.html`: "Every
 * booking is confirmed by email with its number. Send any of them again from
 * here."). `resend_booking_receipt` valida la reserva y marca la petición;
 * el trigger la manda a `send-booking-receipt` con el secreto de Vault (sin
 * esos secretos, como el recibo original, no envía nada).
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
const owner = isolatedClient();
const stranger = isolatedClient();
let ownerId = "";

beforeAll(async () => {
  const user = await signUpConfirmedMemberAndSignIn(owner, `receipt-owner-${stamp}@ensoleil-test.example`, "EnSoleil!2026");
  ownerId = user.id;
  await signUpConfirmedMemberAndSignIn(stranger, `receipt-stranger-${stamp}@ensoleil-test.example`, "EnSoleil!2026");
});

async function booking(status: "completed" | "cancelled") {
  const date = addDays(today(), -4);
  const { data, error } = await admin
    .from("bookings")
    .insert({ member_id: ownerId, lounge_id: "the-ainsworth", date, band: "morning", slot_time: "8:00 AM", status, checked_in_at: status === "completed" ? `${date}T08:00:00Z` : null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function requestedAt(id: string) {
  const { data } = await admin.from("bookings").select("receipt_requested_at").eq("id", id).single();
  return data!.receipt_requested_at as string | null;
}

describe("reenviar el recibo de una visita", () => {
  it("el dueño de la reserva lo pide y queda registrado", async () => {
    const id = await booking("completed");

    await resendBookingReceipt(owner, id);

    expect(await requestedAt(id)).not.toBeNull();
  });

  it("no se puede pedir dos veces en 5 minutos", async () => {
    const id = await booking("completed");
    await resendBookingReceipt(owner, id);

    await expect(resendBookingReceipt(owner, id)).rejects.toThrow(/few minutes/);
  });

  it("nadie más puede pedir el recibo de una reserva ajena", async () => {
    const id = await booking("completed");

    await expect(resendBookingReceipt(stranger, id)).rejects.toThrow();
    expect(await requestedAt(id)).toBeNull();
  });

  it("una reserva cancelada no tiene recibo que reenviar", async () => {
    const id = await booking("cancelled");

    await expect(resendBookingReceipt(owner, id)).rejects.toThrow();
  });
});
