import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoungeList } from "./lounge-list";

/**
 * Story 2.3 — "Loading states while fetching data". Antes se alcanzaba con
 * `?list=loading` en /explore; ahora que la lista fetchea de verdad contra
 * Supabase, este es el test determinista del estado (la página ya no puede
 * fijar el instante exacto de una petición de red real) — ver
 * docs/design/COMPONENT-MAP.md "Backend real — Epic 2".
 */
describe("LoungeList mientras carga", () => {
  it("no lista ningún lounge todavía", () => {
    render(
      <LoungeList lounges={[]} unit="mi" loading distanceNote="Searching near New York" />,
    );

    expect(screen.getByText("Finding lounges near you")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });
});
