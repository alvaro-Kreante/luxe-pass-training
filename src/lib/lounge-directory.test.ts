import { describe, expect, it } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import { fetchLounges, withDistance, type LoungeRow } from "./lounge-directory";

/**
 * Story 2.1 — el catálogo de lounges real (Supabase local), reemplaza el
 * array de muestra de `lib/lounges.ts` (que sigue siendo el mock de
 * Epic 3-9) solo para /explore.
 */

describe("fetchLounges (Supabase local)", () => {
  it("trae el catálogo completo para un miembro con sesión", async () => {
    const supabase = createClient();
    await signUpConfirmedAndSignIn(
      supabase,
      `explora-${Date.now()}@ensoleil-test.com`,
      "EnSoleil!2026",
    );

    const lounges = await fetchLounges(supabase);

    expect(lounges.length).toBe(17);

    const ainsworth = lounges.find((lounge) => lounge.id === "the-ainsworth");
    expect(ainsworth).toMatchObject({
      name: "The Ainsworth",
      neighborhood: "Midtown East",
      cityId: "new-york",
      amenities: ["wifi", "co-working", "lounge", "luggage-storage"],
      bands: ["morning", "afternoon", "evening"],
      closedWeekdays: [0],
      featured: true,
    });
    expect(typeof ainsworth?.lat).toBe("number");
    expect(typeof ainsworth?.lng).toBe("number");
  });

  it("RLS bloquea a un cliente sin sesión", async () => {
    const supabase = createClient();
    /** Un test anterior puede haber dejado una sesión en el mismo jsdom. */
    await supabase.auth.signOut();

    await expect(fetchLounges(supabase)).resolves.toEqual([]);
  });
});

describe("withDistance", () => {
  const lounges: LoungeRow[] = [
    {
      id: "far",
      name: "Far Lounge",
      neighborhood: "",
      city: "",
      cityId: "new-york",
      lat: 40.9115,
      lng: -73.7824,
      amenities: [],
      rating: 4.5,
      openNow: true,
      slotsToday: 1,
      hours: "",
      bands: [],
      closedWeekdays: [],
      featured: false,
    },
    {
      id: "near",
      name: "Near Lounge",
      neighborhood: "",
      city: "",
      cityId: "new-york",
      lat: 40.7536,
      lng: -73.9832,
      amenities: [],
      rating: 4.5,
      openNow: true,
      slotsToday: 1,
      hours: "",
      bands: [],
      closedWeekdays: [],
      featured: false,
    },
  ];

  it("añade distanceMiles calculada desde el origen", () => {
    const [result] = withDistance(
      [lounges[1]],
      { lat: 40.758, lng: -73.968 },
    );

    expect(result.distanceMiles).toBeGreaterThan(0);
    expect(result.distanceMiles).toBeLessThan(1);
  });

  it("ordena de más cerca a más lejos", () => {
    const result = withDistance(lounges, { lat: 40.758, lng: -73.968 });

    expect(result.map((lounge) => lounge.id)).toEqual(["near", "far"]);
  });
});
