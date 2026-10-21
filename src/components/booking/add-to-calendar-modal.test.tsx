import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AddToCalendarModal } from "./add-to-calendar-modal";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";

/**
 * Story 4.3 — Calendar Integration (`Calendar.dc.html`). A diferencia del
 * resto del Epic 4, esto genera un `.ics` real y una URL real de Google
 * Calendar: se verifica la conexión con `lib/calendar-export`, ya probado
 * por separado en `calendar-export.test.ts`.
 */
vi.mock("@/lib/calendar-export", () => ({
  buildGoogleCalendarUrl: vi.fn(() => "https://calendar.google.com/calendar/render?mock=1"),
  buildIcs: vi.fn(() => "BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
  downloadIcsFile: vi.fn(),
}));

import { buildGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar-export";

let ainsworth: LoungeProfile;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `add-to-calendar-modal-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);
});

function props() {
  return {
    lounge: ainsworth,
    address: "122 E 45th St, New York, NY 10017",
    dateIso: "2025-09-14",
    time: "3:30 PM",
    bookingReference: "LP-842193",
  };
}

let windowOpenSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  vi.clearAllMocks();
});

afterEach(() => {
  windowOpenSpy.mockRestore();
});

describe("Calendar.dc.html", () => {
  it("muestra el evento pre-poblado con dirección y referencia", () => {
    render(<AddToCalendarModal open onOpenChange={vi.fn()} {...props()} />);

    expect(screen.getByText("Add to your calendar")).toBeInTheDocument();
    expect(screen.getByText(/122 E 45th St/)).toBeInTheDocument();
    expect(screen.getByText(/LP-842193/)).toBeInTheDocument();
    expect(screen.getByText(/15 minutes before/)).toBeInTheDocument();
  });

  it("iOS Calendar está preseleccionado y 'Add event' descarga el .ics", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AddToCalendarModal open onOpenChange={vi.fn()} {...props()} />);

    await user.click(screen.getByRole("button", { name: "Add event" }));

    expect(downloadIcsFile).toHaveBeenCalledTimes(1);
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it("elegir Google Calendar y 'Add event' abre la URL de Google Calendar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AddToCalendarModal open onOpenChange={vi.fn()} {...props()} />);

    await user.click(screen.getByRole("radio", { name: /Google Calendar/ }));
    await user.click(screen.getByRole("button", { name: "Add event" }));

    expect(buildGoogleCalendarUrl).toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://calendar.google.com/calendar/render?mock=1",
      "_blank",
    );
    expect(downloadIcsFile).not.toHaveBeenCalled();
  });

  it("elegir Outlook y 'Add event' también descarga el .ics", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AddToCalendarModal open onOpenChange={vi.fn()} {...props()} />);

    await user.click(screen.getByRole("radio", { name: /Outlook/ }));
    await user.click(screen.getByRole("button", { name: "Add event" }));

    expect(downloadIcsFile).toHaveBeenCalledTimes(1);
  });

  it("'Not now' cierra el modal sin descargar nada", async () => {
    const user = userEvent.setup({ delay: null });
    const onOpenChange = vi.fn();
    render(<AddToCalendarModal open onOpenChange={onOpenChange} {...props()} />);

    await user.click(screen.getByRole("button", { name: "Not now" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(downloadIcsFile).not.toHaveBeenCalled();
  });
});
