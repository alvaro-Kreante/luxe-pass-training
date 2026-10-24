import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoungeProfileView } from "@/components/lounges/lounge-profile-view";
import { createClient } from "@/lib/supabase/client";
import { today } from "@/lib/availability";
import { loadLoungeProfile } from "@/lib/lounge-profile";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";
import { fillSlot } from "@/lib/testing/lounge-fixture";

/**
 * Story 3.1 — Detailed Lounge Information.
 * Criterios en
 * docs/specs/epic-3-lounge-profiles-details/story-3.1-detailed-lounge-information.md
 * y el segmento "Story 3.1" de flow-complete-booking-journey.md.
 *
 * El estado "Not available" (Story 3.2) vive en esta misma pantalla — la card
 * de disponibilidad del perfil, no una vista aparte — así que también se
 * cubre aquí, con Céleste Rooftop, que la disponibilidad real ya sembrada
 * trae sin plazas hoy (2025-09-09) en las tres franjas que soporta.
 *
 * Backend real (Supabase local). PERF-02: la página es un Server Component
 * que solo comprueba la sesión y llama a `loadLoungeProfile`; los tests
 * hacen lo mismo con la sesión de test (Supabase real) y renderizan la
 * vista con esos datos. La página en sí se verifica con build + Playwright.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/lounges/the-ainsworth",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

async function renderProfile(id = "the-ainsworth", { loading = false } = {}) {
  const data = await loadLoungeProfile(createClient(), id);
  if (!data) throw new Error(`lounge ${id} not found`);
  return render(<LoungeProfileView {...data} forceLoading={loading} />);
}

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `lounge-page-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
});

/**
 * Mediodía de hoy: pasadas las 11 PM todas las franjas de hoy son "past" y
 * la card dice "Not available" con razón — el CI lo veía de noche. El reloj
 * solo se atrasa, nunca se adelanta: adelantarlo deja la sesión de Supabase
 * (JWT de 1 h) caducada y la página no carga. Solo se falsea `Date` (no los
 * timers) para no colgar `waitFor`.
 */
function pinClockToMiddayToday() {
  const midday = new Date();
  midday.setHours(12, 0, 0, 0);
  if (Date.now() <= midday.getTime()) return;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(midday);
}

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  pinClockToMiddayToday();
});

describe("información básica del lounge", () => {
  it("muestra el nombre, la dirección y el teléfono", async () => {
    await renderProfile();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "The Ainsworth" })).toBeInTheDocument(),
    );
    expect(screen.getByText("122 E 45th St, New York, NY 10017")).toBeInTheDocument();
    expect(screen.getAllByText("+1 (212) 555-0184").length).toBeGreaterThan(0);
  });

  it("enlaza a la lista de resultados", async () => {
    await renderProfile();

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Back to results" })).toHaveAttribute(
        "href",
        "/explore",
      ),
    );
  });
});

describe("carousel de fotos", () => {
  it("muestra al menos tres fotos y avanza con la flecha siguiente", async () => {
    const user = userEvent.setup({ delay: null });
    await renderProfile();

    await waitFor(() => expect(screen.getByText("1 / 6")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Next photo" }));

    expect(screen.getByText("2 / 6")).toBeInTheDocument();
  });

  it("abre la galería a pantalla completa y se puede cerrar", async () => {
    const user = userEvent.setup({ delay: null });
    await renderProfile();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /View all \d photos/ })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /View all \d photos/ }));

    const dialog = screen.getByRole("dialog", { name: /Photo gallery/ });
    expect(within(dialog).getByText("The Ainsworth")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close gallery" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("compartir el lounge", () => {
  it("abre la hoja de compartir desde las quick actions", async () => {
    const user = userEvent.setup({ delay: null });
    await renderProfile();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Share" }));

    const dialog = screen.getByRole("dialog", { name: "Share this lounge" });
    expect(within(dialog).getByText(/luxepass\.co\/l\/the-ainsworth/)).toBeInTheDocument();
  });

  it("copia el enlace al portapapeles", async () => {
    const user = userEvent.setup({ delay: null });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await renderProfile();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Share" }));
    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("the-ainsworth"));
  });
});

describe("quick actions", () => {
  it("Call marca el teléfono y Directions abre Google Maps", async () => {
    await renderProfile();

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute(
        "href",
        "tel:+12125550184",
      ),
    );
    expect(screen.getByRole("link", { name: "Directions" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://www.google.com/maps"),
    );
  });
});

describe("amenities", () => {
  it("lista cada amenity del lounge con su descripción", async () => {
    await renderProfile();

    await waitFor(() => expect(screen.getByText("High-speed WiFi")).toBeInTheDocument());
    expect(screen.getByText("1 Gbps, private member network")).toBeInTheDocument();
  });
});

describe("horario", () => {
  it("destaca el horario de hoy", async () => {
    await renderProfile();

    await waitFor(() => expect(screen.getByText(/· Today$/)).toBeInTheDocument());
  });
});

describe("valoración y reseñas", () => {
  it("enlaza el recuento de reseñas reales a la pantalla de reseñas", async () => {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const id = `test-lounge-profile-reviews-${Date.now()}`;
    await admin.from("lounges").insert({
      id,
      name: `Profile Reviews ${Date.now()}`,
      neighborhood: "Test Neighborhood",
      city: "Test City",
      city_id: "test-city",
      lat: 0,
      lng: 0,
      hours: "Open 24 hours",
      content_status: "live",
    });
    await admin.from("lounge_images").insert(
      [0, 1, 2].map((position) => ({ lounge_id: id, url: "/logo.png", caption: "Lounge", position })),
    );
    const { data: created } = await admin.auth.admin.createUser({
      email: `profile-reviewer-${Date.now()}@ensoleil-test.example`,
      password: "EnSoleil!2026",
      email_confirm: true,
    });
    const { data: booking } = await admin
      .from("bookings")
      .insert({
        member_id: created.user!.id,
        lounge_id: id,
        date: today(),
        band: "morning",
        slot_time: "8:00 AM",
        status: "completed",
        checked_in_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    await admin.from("reviews").insert({ booking_id: booking!.id, member_id: created.user!.id, rating: 4 });

    await renderProfile(id);

    expect(screen.getByRole("link", { name: "1 review" })).toHaveAttribute("href", `/lounges/${id}/reviews`);
  });

  it("cuando el lounge no tiene reseñas, lo dice en vez de un recuento", async () => {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const id = `test-lounge-profile-noreviews-${Date.now()}`;
    await admin.from("lounges").insert({
      id,
      name: `No Reviews ${Date.now()}`,
      neighborhood: "Test Neighborhood",
      city: "Test City",
      city_id: "test-city",
      lat: 0,
      lng: 0,
      hours: "Open 24 hours",
      content_status: "live",
    });
    await admin.from("lounge_images").insert(
      [0, 1, 2].map((position) => ({ lounge_id: id, url: "/logo.png", caption: "Lounge", position })),
    );

    await renderProfile(id);

    expect(screen.getByRole("link", { name: "No reviews yet" })).toHaveAttribute("href", `/lounges/${id}/reviews`);
  });
});

describe("disponibilidad en tiempo real", () => {
  it("muestra Available y el botón de reserva cuando hay plazas", async () => {
    await renderProfile();

    await waitFor(() => expect(screen.getByText("Available")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Book now" })).toBeInTheDocument();
  });

  it("enlaza la disponibilidad semanal", async () => {
    await renderProfile();

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "View weekly availability" }),
      ).toHaveAttribute("href", "/lounges/the-ainsworth/availability"),
    );
  });

  it("muestra Not available y una sugerencia cuando el lounge está completo hoy", async () => {
    for (const band of ["morning", "afternoon", "evening", "late"] as const) {
      await fillSlot("celeste-rooftop", today(), band);
    }
    await renderProfile("celeste-rooftop");

    await waitFor(() => expect(screen.getByText("Not available")).toBeInTheDocument());
    expect(screen.getByText("Fully booked today")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Book now" })).toBeNull();
  });

  it("muestra el sello de frescura", async () => {
    await renderProfile();

    await waitFor(() =>
      expect(screen.getByText(/refreshes every 5 min/)).toBeInTheDocument(),
    );
  });
});

describe("lounge inexistente", () => {
  it("no hay ficha que cargar para un id que no existe", async () => {
    expect(await loadLoungeProfile(createClient(), "test-no-such-lounge")).toBeNull();
  });
});

describe("carga", () => {
  it("muestra el estado de carga cuando ?loading=1", async () => {
    await renderProfile("the-ainsworth", { loading: true });

    await waitFor(() =>
      expect(screen.getByText("Checking live availability…")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("heading", { name: "The Ainsworth" })).toBeNull();
  });
});

describe("botón de favorito (Story 6.3)", () => {
  it("AC 'Favorite lounges list' — guardar y quitar de favoritos escribe de verdad en Supabase", async () => {
    const user = userEvent.setup({ delay: null });
    await renderProfile();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Save$/ })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /^Save$/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true"),
    );

    await user.click(screen.getByRole("button", { name: "Saved" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Save$/ })).toHaveAttribute("aria-pressed", "false"),
    );
  });
});
