import { describe, expect, it } from "vitest";

import {
  NOTIFICATIONS,
  NOTIFICATION_CHANNEL_SETTINGS,
  QUIET_HOURS_END_OPTIONS,
  QUIET_HOURS_START_OPTIONS,
  unreadNotificationCount,
  type NotificationCategory,
} from "./notifications";

/**
 * Story 6.2 (In-app Notifications) — los seis tipos de aviso y el contador
 * de no leídas que alimenta el badge de la campana.
 */
describe("unreadNotificationCount", () => {
  it("cuenta solo las notificaciones sin leer", () => {
    expect(unreadNotificationCount(NOTIFICATIONS)).toBe(
      NOTIFICATIONS.filter((item) => !item.read).length,
    );
  });

  it("devuelve 0 cuando todas están leídas", () => {
    const allRead = NOTIFICATIONS.map((item) => ({ ...item, read: true }));
    expect(unreadNotificationCount(allRead)).toBe(0);
  });
});

describe("NOTIFICATIONS", () => {
  it("cubre las cuatro categorías del rail de filtros", () => {
    const categories = new Set<NotificationCategory>(NOTIFICATIONS.map((item) => item.category));
    expect(categories).toEqual(new Set(["bookings", "lounges", "offers", "membership"]));
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
