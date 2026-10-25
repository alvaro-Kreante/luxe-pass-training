import { describe, expect, it } from "vitest";

import { bookingReferenceFromId, confirmBooking } from "./booking";
import {
  NOTIFICATION_CHANNEL_SETTINGS,
  QUIET_HOURS_END_OPTIONS,
  QUIET_HOURS_START_OPTIONS,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
  type NotificationCategory,
} from "./notifications";
import { today } from "./availability";
import { createClient } from "./supabase/client";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { OPEN_EVERY_DAY_LOUNGE } from "./testing/lounge-fixture";

/**
 * Story 6.2 (In-app Notifications). Criterios en
 * docs/specs/epic-6-member-experience-notifications/story-6.2-in-app-notifications.md.
 * `fetchNotifications`/`markNotificationRead`/`markAllNotificationsRead`
 * corren contra Supabase local real (RLS ya limita a las notificaciones del
 * miembro con sesión, ver `supabase/schemas/notifications.sql`), como exige
 * la metodología de test del proyecto. `unreadNotificationCount` es pura.
 */


describe("unreadNotificationCount", () => {
  it("cuenta solo las notificaciones sin leer", () => {
    const items = [
      { id: "a", category: "offers" as const, icon: "offer" as const, title: "A", body: "", time: "", read: false },
      { id: "b", category: "offers" as const, icon: "offer" as const, title: "B", body: "", time: "", read: true },
    ];
    expect(unreadNotificationCount(items)).toBe(1);
  });

  it("devuelve 0 cuando todas están leídas", () => {
    const items = [
      { id: "a", category: "offers" as const, icon: "offer" as const, title: "A", body: "", time: "", read: true },
    ];
    expect(unreadNotificationCount(items)).toBe(0);
  });
});

async function signUpFreshMember(label: string) {
  const supabase = createClient();
  await signUpConfirmedMemberAndSignIn(
    supabase,
    `notifications-${Date.now()}-${label}@ensoleil-test.example`,
    "EnSoleil!2026",
    { membership: "annual" },
  );
  return supabase;
}

describe("fetchNotifications", () => {
  it("AC 'New lounge partner announcements' / 'Membership renewal reminders' / 'Special offers and promotions' / 'Birthday month promotion' — se siembran cuatro notificaciones de muestra al crear el perfil", async () => {
    const supabase = await signUpFreshMember("seed-1");

    const items = await fetchNotifications(supabase);

    const categories = new Set<NotificationCategory>(items.map((item) => item.category));
    expect(items).toHaveLength(4);
    expect(categories).toEqual(new Set(["lounges", "membership", "offers"]));
  });

  it("AC 'Booking confirmation notification' — confirmar una reserva añade una notificación real", async () => {
    const supabase = await signUpFreshMember("booking-1");
    const before = await fetchNotifications(supabase);

    const booking = await confirmBooking(supabase, {
      loungeId: OPEN_EVERY_DAY_LOUNGE,
      dateIso: today(),
      band: "morning",
      time: "8:00 AM",
      specialRequests: "",
    });
    if (!booking) throw new Error("No se pudo confirmar la reserva de prueba");

    const after = await fetchNotifications(supabase);

    expect(after).toHaveLength(before.length + 1);
    const confirmation = after.find((item) => item.icon === "booking")!;
    expect(confirmation.title).toBe(`Booking confirmed · ${bookingReferenceFromId(booking.id)}`);
    expect(confirmation.category).toBe("bookings");
    expect(confirmation.read).toBe(false);
    expect(confirmation.showBookingActions).toBe(false);
  });

  it("no ve las notificaciones de otro miembro (RLS)", async () => {
    // `createClient()` cachea un único cliente de navegador (`@supabase/ssr`,
    // ver el aviso "Multiple GoTrueClient instances") — la sesión activa es
    // una sola a la vez, así que cada lectura tiene que ocurrir con su
    // miembro todavía en sesión, antes de que el siguiente `signIn` la
    // reemplace (mismo motivo por el que el resto de tests "de otro miembro"
    // en este proyecto nunca vuelven a leer con el primer cliente).
    const mine = await signUpFreshMember("rls-1");
    const mineItems = await fetchNotifications(mine);

    const other = await signUpFreshMember("rls-1-other");
    const otherItems = await fetchNotifications(other);

    expect(mineItems.every((item) => !otherItems.some((o) => o.id === item.id))).toBe(true);
  });
});

describe("markNotificationRead / markAllNotificationsRead", () => {
  it("marca una notificación como leída sin tocar el resto", async () => {
    const supabase = await signUpFreshMember("mark-1");
    const [first, ...rest] = await fetchNotifications(supabase);

    await markNotificationRead(supabase, first!.id);

    const after = await fetchNotifications(supabase);
    expect(after.find((item) => item.id === first!.id)?.read).toBe(true);
    for (const item of rest) {
      expect(after.find((i) => i.id === item.id)?.read).toBe(false);
    }
  });

  it("AC de la campana — marca todas como leídas de una vez", async () => {
    const supabase = await signUpFreshMember("mark-2");

    await markAllNotificationsRead(supabase);

    const after = await fetchNotifications(supabase);
    expect(unreadNotificationCount(after)).toBe(0);
  });
});

describe("las horas de silencio", () => {
  it("solo ofrece horas de tarde/noche para empezar y de madrugada/mañana para terminar", () => {
    expect(QUIET_HOURS_START_OPTIONS.every((time) => time.endsWith("PM"))).toBe(true);
    expect(QUIET_HOURS_END_OPTIONS.every((time) => time.endsWith("AM"))).toBe(true);
  });

  it("no hay ninguna hora que aparezca en ambas listas", () => {
    const overlap = QUIET_HOURS_START_OPTIONS.filter((time) => (QUIET_HOURS_END_OPTIONS as string[]).includes(time));
    expect(overlap).toHaveLength(0);
  });
});

describe("NOTIFICATION_CHANNEL_SETTINGS", () => {
  it("las confirmaciones de reserva siempre llegan por email", () => {
    const bookingChanges = NOTIFICATION_CHANNEL_SETTINGS.find((setting) => setting.id === "booking-changes");
    expect(bookingChanges?.email).toBe("always");
  });
});
