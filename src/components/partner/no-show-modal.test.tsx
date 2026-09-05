import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NoShowModal } from "./no-show-modal";
import { PARTNER_GUESTS, findPartnerGuest } from "@/lib/partner";

/**
 * Story 7.1 — "No-show reporting functionality". Artboard: NoShow.dc.html.
 */
const idris = findPartnerGuest(PARTNER_GUESTS, "LP-842407")!;

function renderModal() {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();

  render(
    <NoShowModal open onOpenChange={onOpenChange} guest={idris} onConfirm={onConfirm} />,
  );

  return { onOpenChange, onConfirm };
}

describe("NoShow.dc.html", () => {
  it("identifica al invitado que se está reportando", () => {
    renderModal();

    expect(screen.getByText("Report a no-show")).toBeVisible();
    expect(screen.getByText("Idris Fontaine")).toBeVisible();
    expect(screen.getByText(/4:30 PM/)).toBeVisible();
    expect(screen.getByText(/LP-842407/)).toBeVisible();
  });

  it('ofrece tres motivos, con "Never arrived" preseleccionado', () => {
    renderModal();

    expect(screen.getByRole("radio", { name: /Never arrived/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Arrived after the window closed/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Something else/ })).not.toBeChecked();
  });

  it("avisa de la tarifa y de la pausa de 30 días a los tres no-shows", () => {
    renderModal();

    expect(screen.getByText(/\$35\.00 no-show fee/)).toBeVisible();
    expect(screen.getByText(/pause their bookings for 30 days/)).toBeVisible();
  });

  it('"Report no-show" confirma con el motivo elegido', async () => {
    const user = userEvent.setup({ delay: null });
    const { onConfirm } = renderModal();

    await user.click(screen.getByRole("radio", { name: /Arrived after the window closed/ }));
    await user.click(screen.getByRole("button", { name: "Report no-show" }));

    expect(onConfirm).toHaveBeenCalledWith(idris.id, "arrived-after-window");
  });

  it('"Keep as pending" cierra el modal sin confirmar', async () => {
    const user = userEvent.setup({ delay: null });
    const { onOpenChange, onConfirm } = renderModal();

    await user.click(screen.getByRole("button", { name: "Keep as pending" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
