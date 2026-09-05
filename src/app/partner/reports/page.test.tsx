import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReportsPage from "./page";

/**
 * Story 7.3 — "downloadable reports in CSV". Artboard: Reports.dc.html.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/partner/reports",
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Reports.dc.html", () => {
  it("lista los seis informes, con 'Monthly booking volume' preseleccionado", () => {
    render(<ReportsPage />);

    expect(screen.getByRole("radio", { name: /Monthly booking volume/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Daily guest list/ })).not.toBeChecked();
    expect(screen.getByText("Repeat guests")).toBeVisible();
    expect(screen.getByText("No-show log")).toBeVisible();
  });

  it("muestra los informes descargados recientemente", () => {
    render(<ReportsPage />);

    expect(screen.getByText("ainsworth-guest-list-2026-09-13.csv")).toBeVisible();
    expect(screen.getByText(/412 rows/)).toBeVisible();
  });

  it("el rail refleja el informe seleccionado", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReportsPage />);

    expect(screen.getAllByText("Monthly booking volume").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("radio", { name: /Repeat guests/ }));

    expect(screen.getAllByText("Repeat guests").length).toBeGreaterThan(0);
  });

  it('"Download CSV" descarga el informe seleccionado', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReportsPage />);

    await user.click(screen.getByRole("button", { name: "Download CSV" }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toContain("monthly-booking-volume");
  });
});
