import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExportGuestListPopover } from "./export-guest-list-popover";
import { PARTNER_GUESTS } from "@/lib/partner";

/**
 * Story 7.1 — "print-friendly guest list format CSV". Artboard: Export.dc.html.
 */
vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

const filtered = PARTNER_GUESTS.slice(0, 2);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Export.dc.html", () => {
  it("muestra cuántos invitados coinciden con los filtros de pantalla", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportGuestListPopover guests={filtered} />);

    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(screen.getByText(/2 guests · matching the filters on screen/)).toBeVisible();
  });

  it('"Special requests" empieza sin marcar; el resto marcado', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportGuestListPopover guests={filtered} />);

    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(screen.getByRole("checkbox", { name: "Guest name" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Special requests" })).not.toBeChecked();
  });

  it('"Download CSV" descarga el CSV con las columnas seleccionadas', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportGuestListPopover guests={filtered} />);

    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    await user.click(screen.getByRole("checkbox", { name: "Special requests" }));
    await user.click(screen.getByRole("button", { name: "Download CSV" }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename, csv] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toMatch(/\.csv$/);
    expect(csv).toContain("Special requests");
    expect(csv).toContain(filtered[0].name);
  });
});
