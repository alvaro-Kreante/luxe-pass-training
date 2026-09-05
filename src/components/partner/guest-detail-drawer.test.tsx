import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GuestDetailDrawer } from "./guest-detail-drawer";
import { PARTNER_GUESTS, findPartnerGuest } from "@/lib/partner";

/**
 * Story 7.1 — "guest details: name, contact, email" y "guest contact
 * information for communication". Artboard: GuestDetail.dc.html.
 */
const idris = findPartnerGuest(PARTNER_GUESTS, "LP-842407")!;
const alexandra = findPartnerGuest(PARTNER_GUESTS, "LP-842193")!;

function renderDrawer(guest = idris) {
  const onOpenChange = vi.fn();
  const onMarkArrived = vi.fn();
  const onReportNoShow = vi.fn();

  render(
    <GuestDetailDrawer
      open
      onOpenChange={onOpenChange}
      guest={guest}
      onMarkArrived={onMarkArrived}
      onReportNoShow={onReportNoShow}
    />,
  );

  return { onOpenChange, onMarkArrived, onReportNoShow };
}

describe("GuestDetail.dc.html", () => {
  it("muestra el nombre, la referencia y la hora de llegada reservada", () => {
    renderDrawer();

    expect(screen.getByRole("heading", { name: "Idris Fontaine" })).toBeVisible();
    expect(screen.getByText("LP-842407")).toBeVisible();
    expect(screen.getByText("4:30 PM")).toBeVisible();
  });

  it("muestra el contacto del invitado para poder comunicarse", () => {
    renderDrawer();

    expect(screen.getByText("idris.fontaine@example.com")).toBeVisible();
    expect(screen.getByText("+1 (555) 604-3318")).toBeVisible();
  });

  it("muestra las peticiones especiales y el contacto de emergencia", () => {
    renderDrawer();

    expect(screen.getByText(/somewhere to leave a cabin bag/)).toBeVisible();
    expect(screen.getByText(/Noor Fontaine/)).toBeVisible();
  });

  it('"Mark as arrived" llama a onMarkArrived con el invitado', async () => {
    const user = userEvent.setup({ delay: null });
    const { onMarkArrived } = renderDrawer();

    await user.click(screen.getByRole("button", { name: "Mark as arrived" }));

    expect(onMarkArrived).toHaveBeenCalledWith(idris.id);
  });

  it('"No-show" llama a onReportNoShow con el invitado', async () => {
    const user = userEvent.setup({ delay: null });
    const { onReportNoShow } = renderDrawer();

    await user.click(screen.getByRole("button", { name: "No-show" }));

    expect(onReportNoShow).toHaveBeenCalledWith(idris.id);
  });

  it("no ofrece marcar como llegado a un invitado que ya llegó", () => {
    renderDrawer(alexandra);

    expect(screen.queryByRole("button", { name: "Mark as arrived" })).not.toBeInTheDocument();
    expect(screen.getByText("Arrived")).toBeVisible();
  });
});
