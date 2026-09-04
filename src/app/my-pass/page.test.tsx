import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AINSWORTH_PASS, LATE_CANCELLATION_FEE_LABEL } from "@/lib/passes";

import MyPassPage from "./page";

/**
 * Story 5.1 (Digital Pass Generation) — "Information available from My
 * Bookings section", extendida por la Story 6.1 (Booking Management):
 * estados de reserva, cancelar con la política de 24 horas y el historial.
 * `Main.dc.html` (Upcoming), `Cancel.dc.html` / `CancelFee.dc.html` y
 * `History.dc.html` (Past) de la Fase 7.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/my-pass",
}));

describe("campana de notificaciones", () => {
  it("está disponible desde My Pass, como fija Main.dc.html", () => {
    render(<MyPassPage />);

    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
  });
});

describe("pestaña Upcoming (por defecto)", () => {
  it("muestra la próxima visita con su número de confirmación y un enlace al pase", () => {
    render(<MyPassPage />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { name: AINSWORTH_PASS.loungeName, level: 2 }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /view pass/i })).toHaveAttribute(
      "href",
      `/my-pass/${AINSWORTH_PASS.reference}`,
    );
  });

  it("muestra cuántas visitas del mes ya se han usado", () => {
    render(<MyPassPage />);

    expect(screen.getByText("3 of 8")).toBeInTheDocument();
  });

  it("distingue los estados de una reserva: in progress, confirmed y waitlisted", () => {
    render(<MyPassPage />);

    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getAllByText("Confirmed").length).toBeGreaterThan(0);
    expect(screen.getByText("Waitlisted")).toBeInTheDocument();
  });

  it("no ofrece cancelar una reserva en progreso — ya se hizo el check-in", () => {
    render(<MyPassPage />);

    const vestryRow = screen.getByRole("heading", { name: "The Vestry", level: 2 }).closest("li");
    expect(vestryRow).not.toBeNull();
    expect(within(vestryRow as HTMLElement).queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });
});

describe("cancelar una reserva con más de 24 horas de antelación", () => {
  it("abre el diálogo de cancelación gratuita y, al confirmar, la quita de Upcoming", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    const ainsworthHeadings = screen.getAllByRole("heading", { name: "The Ainsworth", level: 2 });
    const ainsworthRow = ainsworthHeadings
      .map((heading) => heading.closest("li"))
      .find((row) => row?.textContent?.includes("free until"));
    await user.click(within(ainsworthRow as HTMLElement).getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("heading", { name: "Cancel this visit?" })).toBeInTheDocument();
    expect(screen.queryByText(LATE_CANCELLATION_FEE_LABEL)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(screen.queryByText(/free until Friday/)).not.toBeInTheDocument();
  });
});

describe("cancelar una reserva dentro de las 24 horas", () => {
  it("abre el diálogo con la tarifa plana y, al confirmar, cobra la tarifa y la quita de Upcoming", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    const bergdorfRow = screen.getByRole("heading", { name: "Bergdorf Lounge", level: 2 }).closest("li");
    await user.click(within(bergdorfRow as HTMLElement).getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("heading", { name: "Cancelling within 24 hours" })).toBeInTheDocument();
    expect(screen.getAllByText(LATE_CANCELLATION_FEE_LABEL).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: `Cancel and pay ${LATE_CANCELLATION_FEE_LABEL}` }));

    expect(screen.queryByRole("heading", { name: "Bergdorf Lounge", level: 2 })).not.toBeInTheDocument();
  });

  it("mantiene la reserva si el miembro decide no cancelar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    const bergdorfRow = screen.getByRole("heading", { name: "Bergdorf Lounge", level: 2 }).closest("li");
    await user.click(within(bergdorfRow as HTMLElement).getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Keep booking" }));

    expect(screen.getByRole("heading", { name: "Bergdorf Lounge", level: 2 })).toBeInTheDocument();
  });
});

describe("pestaña Past", () => {
  it("al activarla, muestra el historial con sus estados y explica el no-show", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    await user.click(screen.getByRole("tab", { name: /past/i }));

    expect(screen.getByRole("tab", { name: /past/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Bergdorf Lounge")).toBeInTheDocument();
    expect(
      screen.getByText(/booking window closed at 11:00 PM without a check-in/i),
    ).toBeInTheDocument();
  });

  it("filtra el historial por estado", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    await user.click(screen.getByRole("tab", { name: /past/i }));
    await user.click(screen.getByRole("button", { name: /no-show/i }));

    expect(screen.getByText("Bergdorf Lounge")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "The Vestry", level: 3 })).not.toBeInTheDocument();
  });
});
