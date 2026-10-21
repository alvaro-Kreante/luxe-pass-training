import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import { BookingProvider, useBooking } from "./booking-context";
import { VisitDetailsForm } from "./visit-details-form";
import { today, addDays } from "@/lib/availability";
import { mondayOf, weeklyAvailability, type LoungeProfile } from "@/lib/lounge-profile";
import { LOUNGES } from "@/lib/lounges";
import { createClient } from "@/lib/supabase/client";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

/**
 * Story 4.1 — Seamless Booking Flow.
 * Criterios: date picker starting from today, admission for one only,
 * special requests field with 100 char limit.
 *
 * Backend real: `VisitDetailsForm` trae la disponibilidad del mes con
 * `fetchAvailability` contra Supabase local — estos tests corren con sesión
 * real, no con el catálogo mock (ver CLAUDE.md §Metodología de test).
 */
const ainsworthMock = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

/** Día futuro abierto de verdad (predicho con la misma fórmula que la semilla). */
const futureDate = Array.from({ length: 30 }, (_, i) => addDays(today(), i + 1))
  .map((dateIso) => ({
    dateIso,
    cells: weeklyAvailability(ainsworthMock, mondayOf(dateIso)).filter(
      (cell) => cell.dateIso === dateIso,
    ),
  }))
  .find(({ cells }) => cells.some((cell) => cell.status === "available"))!.dateIso;

let ainsworth: LoungeProfile;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `visit-details-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);
});

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

    const todayButton = await screen.findByRole("button", {
      name: String(Number(today().slice(-2))),
    });
    await user.click(todayButton);

    expect(screen.getByTestId("draft").textContent).toContain(today());
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

    const dayButton = await screen.findByRole("button", {
      name: String(Number(futureDate.slice(-2))),
    });
    await user.click(dayButton);

    expect(screen.getByText(/Arrival time/)).toBeInTheDocument();
  });

  it("elegir un slot actualiza el borrador de reserva", async () => {
    const user = userEvent.setup({ delay: null });
    renderForm();

    const dayButton = await screen.findByRole("button", {
      name: String(Number(futureDate.slice(-2))),
    });
    await user.click(dayButton);

    const openSlot = await waitFor(() => {
      const slot = screen
        .getAllByRole("button")
        .find((button) => /^\d{1,2}:\d{2} (AM|PM) ·/.test(button.getAttribute("aria-label") ?? ""));
      if (!slot) throw new Error("no open slot rendered yet");
      return slot;
    });

    await user.click(openSlot);

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
