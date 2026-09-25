import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBooking } from "@/components/booking/booking-context";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { grantTestMembership } from "@/lib/testing/membership-fixture";

import BookLayout from "./layout";

/**
 * Epic 9 × Epic 4 — la variante "cubierta por la membresía"
 * (`MembershipCovered.dc.html`) ya no se elige con `?covered=1`: la decide el
 * servidor (`booking_coverage`) según el plan real y las visitas del mes, la
 * misma regla que luego aplica `confirm_booking`.
 *
 * Backend real (Epic 4): el layout resuelve el lounge con `fetchLoungeProfile`
 * contra Supabase, así que estos tests corren con sesión real.
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

async function freshMember(label: string) {
  const supabase = createClient();
  return signUpConfirmedMemberAndSignIn(
    supabase,
    `book-layout-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
}

function CoveredProbe() {
  const { covered, coverage } = useBooking();
  return (
    <p data-testid="covered">
      {String(covered)}:{coverage ? coverage.kind : "loading"}
    </p>
  );
}

describe("quién paga la visita — decidido por el servidor", () => {
  it("sin plan, la visita no está cubierta: se paga el day pass", async () => {
    await freshMember("no-plan");
    render(
      <BookLayout>
        <CoveredProbe />
      </BookLayout>,
    );

    await waitFor(() => expect(screen.getByTestId("covered")).toHaveTextContent("false:none"));
  });

  it("con un plan activo y visitas libres, la cubre la membresía", async () => {
    const user = await freshMember("plan");
    await grantTestMembership(user.id, "annual");
    render(
      <BookLayout>
        <CoveredProbe />
      </BookLayout>,
    );

    await waitFor(() => expect(screen.getByTestId("covered")).toHaveTextContent("true:membership"));
  });

  it("?covered=1 ya no fuerza la variante cubierta", async () => {
    await freshMember("query-param");
    currentSearchParams = new URLSearchParams("covered=1");
    render(
      <BookLayout>
        <CoveredProbe />
      </BookLayout>,
    );

    await waitFor(() => expect(screen.getByTestId("covered")).toHaveTextContent("false:none"));
    currentSearchParams = new URLSearchParams();
  });

  it("con las visitas del mes agotadas, vuelve a pagarse", async () => {
    const user = await freshMember("exhausted");
    await grantTestMembership(user.id, "monthly");
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await admin.from("bookings").insert(
      Array.from({ length: 8 }, (_, index) => ({
        member_id: user.id,
        lounge_id: "the-ainsworth",
        date: `2025-09-0${index + 1}`,
        band: "late",
        slot_time: "6:00 PM",
        status: "completed",
      })),
    );
    render(
      <BookLayout>
        <CoveredProbe />
      </BookLayout>,
    );

    await waitFor(() => expect(screen.getByTestId("covered")).toHaveTextContent("false:none"));
  });
});
