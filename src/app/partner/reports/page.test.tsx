import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedPartnerAndSignIn } from "@/lib/testing/confirmed-user";

import ReportsPage from "./page";

/**
 * Story 7.3 — "downloadable reports in CSV". Artboard: Reports.dc.html.
 *
 * Backend real (22 sept 2026): la pantalla exige sesión de partner
 * (`RequirePartnerSession`). El informe por defecto ("Monthly booking
 * volume") sigue siendo la cabecera-placeholder que ya era en el mockup
 * (nunca tuvo CSV completo) — no depende de datos reales, así que este
 * archivo no necesita sembrar reservas, solo la sesión.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/partner/reports",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

beforeAll(async () => {
  const partner = createClient();
  await signUpConfirmedPartnerAndSignIn(
    partner,
    `reports-partner-${Date.now()}@theainsworth-test.com`,
    "AinsworthFOH!24",
    { businessName: "The Ainsworth", loungeIds: ["the-ainsworth"] },
  );
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Reports.dc.html", () => {
  it("lista los seis informes, con 'Monthly booking volume' preseleccionado", async () => {
    render(<ReportsPage />);

    expect(await screen.findByRole("radio", { name: /Monthly booking volume/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Daily guest list/ })).not.toBeChecked();
    expect(screen.getByText("Repeat guests")).toBeVisible();
    expect(screen.getByText("No-show log")).toBeVisible();
  });

  it("muestra los informes descargados recientemente", async () => {
    render(<ReportsPage />);

    expect(await screen.findByText("ainsworth-guest-list-2026-09-13.csv")).toBeVisible();
    expect(screen.getByText(/412 rows/)).toBeVisible();
  });

  it("el rail refleja el informe seleccionado", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReportsPage />);

    expect((await screen.findAllByText("Monthly booking volume")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("radio", { name: /Repeat guests/ }));

    expect(screen.getAllByText("Repeat guests").length).toBeGreaterThan(0);
  });

  it('"Download CSV" descarga el informe seleccionado', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReportsPage />);

    await user.click(await screen.findByRole("button", { name: "Download CSV" }));

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));
    const [filename] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toContain("monthly-booking-volume");
  });
});
