import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AnalyticsPage from "./page";

/**
 * Story 7.3 — "Weekly/monthly booking volume reports" y "revenue attribution
 * from Luxe Pass bookings". Artboard: Analytics.dc.html.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/partner/analytics",
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Analytics.dc.html", () => {
  it("muestra los cuatro tiles de métrica del mes", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText("187")).toBeVisible();
    expect(screen.getByText("171")).toBeVisible();
    const noShowTile = screen.getByText("No-shows").parentElement!;
    expect(within(noShowTile).getByText("9")).toBeVisible();
    expect(screen.getAllByText("$8,616.50").length).toBeGreaterThan(0);
  });

  it("el desglose de ingresos cuadra con el total atribuido", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText("$3,975.00")).toBeVisible();
    expect(screen.getByText("$4,484.00")).toBeVisible();
    expect(screen.getByText("$157.50")).toBeVisible();
  });

  it('cambiar a "Week" reduce el gráfico diario a 7 barras', async () => {
    const user = userEvent.setup({ delay: null });
    render(<AnalyticsPage />);

    expect(screen.getAllByTestId("daily-bar")).toHaveLength(14);

    await user.click(screen.getByRole("button", { name: "Week" }));

    expect(screen.getAllByTestId("daily-bar")).toHaveLength(7);
  });

  it('"Download revenue CSV" descarga el desglose de ingresos', async () => {
    const user = userEvent.setup({ delay: null });
    render(<AnalyticsPage />);

    await user.click(screen.getByRole("button", { name: "Download revenue CSV" }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename, csv] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toMatch(/\.csv$/);
    expect(csv).toContain("$8,616.50");
  });
});
