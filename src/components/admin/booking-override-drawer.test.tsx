import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";
import { fillSlot } from "@/lib/testing/lounge-fixture";

import { BookingOverrideDrawer } from "./booking-override-drawer";

/**
 * Story 8.1 — "Booking modification capabilities", con override de
 * restricciones. Backend real (22 sept 2026):
 * `admin_reschedule_booking`/`admin_cancel_booking`
 * (`supabase/schemas/support_tickets.sql`). Un lounge/reserva efímeros
 * propios de este archivo (aforo 20 por franja), con la tarde llena de
 * reservas reales (`fillSlot`) para distinguir una franja llena de una con
 * plazas — mismo patrón que `analytics/page.test.tsx` (Epic 7).
 */

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let loungeId: string;
let memberId: string;
const bookingDate = "2026-10-01";

async function createBooking(band: string, slotTime: string) {
  const { data, error } = await admin
    .from("bookings")
    .insert({
      member_id: memberId,
      lounge_id: loungeId,
      date: bookingDate,
      band,
      slot_time: slotTime,
      status: "confirmed",
    })
    .select("id, confirmation_code")
    .single();
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  const stamp = Date.now();
  loungeId = `test-lounge-override-${stamp}`;

  const { error: loungeError } = await admin.from("lounges").insert({
    id: loungeId,
    name: "Override Test Lounge",
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    bands: ["morning", "afternoon", "evening"],
    capacity: 20,
  });
  if (loungeError) throw loungeError;

  await fillSlot(loungeId, bookingDate, "afternoon");

  const memberClient = createClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: `override-member-${stamp}@ensoleil-test.example`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (createError) throw createError;
  memberId = created.user.id;
  await memberClient.auth.signOut();

  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `override-admin-${stamp}@ensoleil-test.example`, "SupportDesk!24");
});

afterAll(async () => {
  await admin.from("lounges").delete().eq("id", loungeId);
});

/** Espera a que la consulta real de disponibilidad resuelva — antes de eso todas las franjas aparecen "—", nunca bloqueadas. */
async function waitForAvailabilityLoaded() {
  await waitFor(() => expect(screen.getByRole("button", { name: /1:00 PM.*full/ })).toBeInTheDocument());
}

function bookingPropFor(row: { id: string; confirmation_code: string }, band: string, slotTime: string) {
  return {
    lounge: "Override Test Lounge",
    area: "Test",
    detail: `Test · ${slotTime}`,
    reference: row.confirmation_code,
    bookingId: row.id,
    loungeId,
    date: bookingDate,
    band,
    slotTime,
  };
}

describe("BookingOverrideDrawer", () => {
  it("muestra los cinco horarios reales del dominio, con las plazas de cada franja", async () => {
    const row = await createBooking("morning", "8:00 AM");

    render(
      <BookingOverrideDrawer
        open
        onOpenChange={() => {}}
        memberName="Camille Duforest"
        booking={bookingPropFor(row, "morning", "8:00 AM")}
        onApply={() => {}}
      />,
    );

    expect(screen.getByRole("radio", { name: "Date or arrival time" })).toHaveAttribute("aria-checked", "true");
    await waitForAvailabilityLoaded();
    // Aforo 20 menos la reserva de mañana recién creada.
    expect(screen.getByRole("button", { name: /10:30 AM.*19 left/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1:00 PM.*full/ })).toBeInTheDocument();
  });

  it("hides the arrival time slots when cancelling instead", async () => {
    const user = userEvent.setup({ delay: null });
    const row = await createBooking("morning", "8:00 AM");

    render(
      <BookingOverrideDrawer
        open
        onOpenChange={() => {}}
        memberName="Camille Duforest"
        booking={bookingPropFor(row, "morning", "8:00 AM")}
        onApply={() => {}}
      />,
    );
    await waitForAvailabilityLoaded();

    await user.click(screen.getByRole("radio", { name: "Cancel the booking" }));

    expect(screen.queryByRole("button", { name: /8:00 AM/ })).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(`cancels ${row.confirmation_code}`))).toBeInTheDocument();
  });

  it("blocks picking a full slot until the lounge override is switched on", async () => {
    const user = userEvent.setup({ delay: null });
    const row = await createBooking("morning", "8:00 AM");

    render(
      <BookingOverrideDrawer
        open
        onOpenChange={() => {}}
        memberName="Camille Duforest"
        booking={bookingPropFor(row, "morning", "8:00 AM")}
        onApply={() => {}}
      />,
    );
    await waitForAvailabilityLoaded();

    await user.click(screen.getByRole("button", { name: /1:00 PM/ }));
    expect(screen.getByRole("button", { name: /8:00 AM/ })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("switch", { name: /override/i }));
    await user.click(screen.getByRole("button", { name: /1:00 PM/ }));
    expect(screen.getByRole("button", { name: /1:00 PM/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("applies a real reschedule and updates the booking's slot", async () => {
    const user = userEvent.setup({ delay: null });
    const onApply = vi.fn();
    const onOpenChange = vi.fn();
    const row = await createBooking("morning", "8:00 AM");

    render(
      <BookingOverrideDrawer
        open
        onOpenChange={onOpenChange}
        memberName="Camille Duforest"
        booking={bookingPropFor(row, "morning", "8:00 AM")}
        onApply={onApply}
      />,
    );
    await waitForAvailabilityLoaded();

    await user.click(screen.getByRole("button", { name: /10:30 AM/ }));
    await user.click(screen.getByRole("button", { name: "Apply change" }));

    await waitFor(() => expect(onApply).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);

    const { data: updated } = await admin.from("bookings").select("slot_time, band").eq("id", row.id).single();
    expect(updated?.slot_time).toBe("10:30 AM");
    expect(updated?.band).toBe("morning");
  });

  it("cancels a real booking", async () => {
    const user = userEvent.setup({ delay: null });
    const onApply = vi.fn();
    const onOpenChange = vi.fn();
    const row = await createBooking("evening", "6:00 PM");

    render(
      <BookingOverrideDrawer
        open
        onOpenChange={onOpenChange}
        memberName="Camille Duforest"
        booking={bookingPropFor(row, "evening", "6:00 PM")}
        onApply={onApply}
      />,
    );
    await waitForAvailabilityLoaded();

    await user.click(screen.getByRole("radio", { name: "Cancel the booking" }));
    await user.click(screen.getByRole("button", { name: "Apply change" }));

    await waitFor(() => expect(onApply).toHaveBeenCalled());

    const { data: updated } = await admin.from("bookings").select("status").eq("id", row.id).single();
    expect(updated?.status).toBe("cancelled");
  });
});
