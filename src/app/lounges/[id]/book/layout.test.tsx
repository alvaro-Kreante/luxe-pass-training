import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { useBooking } from "@/components/booking/booking-context";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import BookLayout from "./layout";

/**
 * Bug: `covered` se recalculaba desde `useSearchParams()` en cada render del
 * layout. Al navegar de `/book?covered=1` a `/book/payment` (sin el query
 * string), el layout seguía montado pero `covered` volvía a `false` a mitad
 * de flujo — justo lo contrario de "el borrador de reserva es compartido por
 * los tres pasos".
 *
 * Backend real (Epic 4): el layout resuelve el lounge con `fetchLoungeProfile`
 * contra Supabase (mismo patrón que Epic 3), así que estos tests corren con
 * sesión real, no con el catálogo mock.
 */
const params = vi.fn(() => ({ id: "the-ainsworth" }));
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => params(),
  useSearchParams: () => currentSearchParams,
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/lounges/the-ainsworth/book",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `book-layout-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
});

function CoveredProbe() {
  const { covered } = useBooking();
  return <p data-testid="covered">{String(covered)}</p>;
}

describe("covered persiste entre pasos", () => {
  it("no se pierde al navegar a una URL sin el query param", async () => {
    currentSearchParams = new URLSearchParams("covered=1");
    const { rerender } = render(
      <BookLayout>
        <CoveredProbe />
      </BookLayout>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("covered")).toHaveTextContent("true"),
    );

    currentSearchParams = new URLSearchParams();
    rerender(
      <BookLayout>
        <CoveredProbe />
      </BookLayout>,
    );

    expect(screen.getByTestId("covered")).toHaveTextContent("true");
  });

  it("por defecto, sin el query param, la visita no está cubierta", async () => {
    currentSearchParams = new URLSearchParams();
    render(
      <BookLayout>
        <CoveredProbe />
      </BookLayout>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("covered")).toHaveTextContent("false"),
    );
  });
});
