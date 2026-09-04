import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AINSWORTH_PASS } from "@/lib/passes";

import { DigitalPassCard } from "./digital-pass-card";

/**
 * DESIGN-SYSTEM.md §5 patrón 11 — cuatro estados de la misma tarjeta
 * (`Main`, `ArrivalDay`, `CheckedIn`, `Expired.dc.html`). El contenido que
 * cambia entre estados es lo que se prueba; los px y colores no.
 */
describe("estado próximo (upcoming)", () => {
  it("muestra el código QR y el LP# para presentar en recepción", () => {
    render(<DigitalPassCard pass={AINSWORTH_PASS} state="upcoming" />);

    expect(screen.getByRole("img", { name: /qr code/i })).toBeInTheDocument();
    expect(screen.getByText(AINSWORTH_PASS.reference)).toBeInTheDocument();
    expect(screen.queryByText(/expired/i)).not.toBeInTheDocument();
  });
});

describe("estado del día (today)", () => {
  it("marca la tarjeta como 'Live today'", () => {
    render(<DigitalPassCard pass={AINSWORTH_PASS} state="today" />);

    expect(screen.getByText("Live today")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /qr code/i })).toBeInTheDocument();
  });
});

describe("estado con check-in hecho", () => {
  it("sustituye el código QR por la confirmación de check-in", () => {
    render(<DigitalPassCard pass={AINSWORTH_PASS} state="checked-in" />);

    expect(screen.queryByRole("img", { name: /qr code/i })).not.toBeInTheDocument();
    expect(screen.getByText("Checked in")).toBeInTheDocument();
    expect(
      screen.getByText(`${AINSWORTH_PASS.checkedInAt} · welcomed by ${AINSWORTH_PASS.checkedInBy}`),
    ).toBeInTheDocument();
  });
});

describe("estado expirado", () => {
  it("muestra el sello de expirado y ningún botón para guardar la imagen", () => {
    render(<DigitalPassCard pass={AINSWORTH_PASS} state="expired" />);

    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save image/i })).not.toBeInTheDocument();
  });
});
