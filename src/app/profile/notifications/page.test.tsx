import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NOTIFICATION_CHANNEL_SETTINGS, QUIET_HOURS_END_OPTIONS, QUIET_HOURS_START_OPTIONS } from "@/lib/notifications";

import NotificationSettingsPage from "./page";

/**
 * Story 6.2 — "ajustes de notificación por canal (push/email/sms) con el
 * email de reservas siempre activo". `NotificationSettings.dc.html`.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/notifications",
}));

describe("ajustes de notificación por canal", () => {
  it("lista los siete tipos de aviso", () => {
    render(<NotificationSettingsPage />);

    for (const setting of NOTIFICATION_CHANNEL_SETTINGS) {
      expect(screen.getByText(setting.title)).toBeInTheDocument();
    }
  });

  it("el email de reservas está siempre activo y no se puede apagar", () => {
    render(<NotificationSettingsPage />);

    expect(screen.queryByRole("switch", { name: /email for booking confirmations/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Always").length).toBeGreaterThanOrEqual(2);
  });

  it("permite apagar el push de un canal que sí se puede desactivar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NotificationSettingsPage />);

    const pushSwitch = screen.getByRole("switch", { name: /push for new lounges near you/i });
    expect(pushSwitch).toHaveAttribute("aria-checked", "true");

    await user.click(pushSwitch);

    expect(pushSwitch).toHaveAttribute("aria-checked", "false");
  });
});

describe("horas de silencio", () => {
  it("el desplegable de inicio solo ofrece horas de tarde/noche", () => {
    render(<NotificationSettingsPage />);

    const start = screen.getByRole("combobox", { name: "Quiet hours start" });
    const options = within(start).getAllByRole("option").map((option) => option.textContent);

    expect(options).toEqual(QUIET_HOURS_START_OPTIONS);
  });

  it("el desplegable de fin solo ofrece horas de madrugada/mañana, evitando combinaciones como '10 PM to 3 PM'", () => {
    render(<NotificationSettingsPage />);

    const end = screen.getByRole("combobox", { name: "Quiet hours end" });
    const options = within(end).getAllByRole("option").map((option) => option.textContent);

    expect(options).toEqual(QUIET_HOURS_END_OPTIONS);
    expect(options).not.toContain("3:00 PM");
  });

  it("permite elegir un rango distinto", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NotificationSettingsPage />);

    const start = screen.getByRole("combobox", { name: "Quiet hours start" });
    const end = screen.getByRole("combobox", { name: "Quiet hours end" });

    await user.selectOptions(start, "11:00 PM");
    await user.selectOptions(end, "6:00 AM");

    expect(start).toHaveValue("11:00 PM");
    expect(end).toHaveValue("6:00 AM");
  });
});
