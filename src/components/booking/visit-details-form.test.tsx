import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { BookingProvider, useBooking } from "./booking-context";
import { VisitDetailsForm } from "./visit-details-form";
import { TODAY } from "@/lib/availability";
import { monthCalendar, startOfMonth } from "@/lib/booking";
import { LOUNGES } from "@/lib/lounges";

/**
 * Story 4.1 — Seamless Booking Flow.
 * Criterios: date picker starting from today, admission for one only,
 * special requests field with 100 char limit.
 */
const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

/** Un día futuro abierto de verdad — evita el domingo, que el lounge no admite. */
const futureDate = monthCalendar(ainsworth, startOfMonth(TODAY)).find(
  (day) => day.status === "open" && day.dateIso > TODAY,
)!.dateIso;

function DraftInspector() {
  const { draft } = useBooking();
  return (
    <p data-testid="draft">
      {draft.dateIso ?? "none"} · {draft.time ?? "none"} · {draft.specialRequests}
    </p>
  );
}

function renderForm() {
  return render(
    <BookingProvider lounge={ainsworth} covered={false}>
      <VisitDetailsForm />
      <DraftInspector />
    </BookingProvider>,
  );
}

describe("date picker — arranca en hoy", () => {
  it("no permite retroceder antes del mes de hoy", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
  });

  it("hoy es seleccionable", async () => {
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.click(screen.getByRole("button", { name: String(Number(TODAY.slice(-2))) }));

    expect(screen.getByTestId("draft").textContent).toContain(TODAY);
  });
});

describe("admisión para uno", () => {
  it("declara la admisión para un solo miembro, sin opción de invitados", () => {
    renderForm();

    expect(screen.getByText("Admission for one")).toBeInTheDocument();
    expect(screen.getByText("1 member")).toBeInTheDocument();
  });
});

describe("selección de hora tras elegir fecha", () => {
  it("muestra los slots de llegada al elegir un día futuro disponible", async () => {
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.click(screen.getByRole("button", { name: String(Number(futureDate.slice(-2))) }));

    expect(screen.getByText(/Arrival time/)).toBeInTheDocument();
  });

  it("elegir un slot actualiza el borrador de reserva", async () => {
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.click(screen.getByRole("button", { name: String(Number(futureDate.slice(-2))) }));
    const openSlot = screen
      .getAllByRole("button")
      .find((button) => /^\d{1,2}:\d{2} (AM|PM) ·/.test(button.getAttribute("aria-label") ?? ""));

    await user.click(openSlot!);

    expect(screen.getByTestId("draft").textContent).not.toContain("· none ·");
  });
});

describe("peticiones especiales — límite de 100 caracteres", () => {
  it("muestra el contador de caracteres", () => {
    renderForm();

    expect(screen.getByText("0 / 100")).toBeInTheDocument();
  });

  it("no admite más de 100 caracteres", async () => {
    const user = userEvent.setup({ delay: null });
    renderForm();

    const textarea = screen.getByRole("textbox", { name: /Special requests/ });
    await user.type(textarea, "a".repeat(110));

    expect((textarea as HTMLTextAreaElement).value).toHaveLength(100);
    expect(screen.getByText("100 / 100")).toBeInTheDocument();
  });
});
