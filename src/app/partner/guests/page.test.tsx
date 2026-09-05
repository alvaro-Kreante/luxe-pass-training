import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RepeatGuestsPage from "./page";

/**
 * Story 7.3 — "Repeat guest identification: loyalty trackers" y
 * "downloadable reports in CSV". Artboard: RepeatGuests.dc.html.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/partner/guests",
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RepeatGuests.dc.html", () => {
  it("resume el total de miembros y la tasa de repetición", () => {
    render(<RepeatGuestsPage />);

    expect(screen.getByText("412 members visited")).toBeVisible();
    expect(screen.getByText("148 came back at least once")).toBeVisible();
    expect(screen.getByText("35.9% return rate")).toBeVisible();
  });

  it("marca el nivel de lealtad de cada invitado", () => {
    render(<RepeatGuestsPage />);

    expect(screen.getAllByText("Regular").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Returning").length).toBeGreaterThan(0);
    expect(screen.getAllByText("First visit").length).toBeGreaterThan(0);
  });

  it("filtra por nombre", async () => {
    const user = userEvent.setup({ delay: null });
    render(<RepeatGuestsPage />);

    await user.type(screen.getByLabelText("Search guests"), "elena");

    expect(screen.getByText("Elena Vasquez")).toBeVisible();
    expect(screen.queryByText("Alexandra Rivas")).not.toBeInTheDocument();
  });

  it('"Came back" excluye a quien solo tiene una visita', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RepeatGuestsPage />);

    await user.click(screen.getByRole("button", { name: "Came back" }));

    expect(screen.queryByText("Elena Vasquez")).not.toBeInTheDocument();
    expect(screen.getByText("Alexandra Rivas")).toBeVisible();
  });

  it('"Export CSV" descarga la lista de invitados recurrentes', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RepeatGuestsPage />);

    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toMatch(/\.csv$/);
  });
});
