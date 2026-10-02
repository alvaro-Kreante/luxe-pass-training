import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { TODAY } from "@/lib/availability";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import {
  fetchLounges,
  searchLounges,
  withDistance,
  type LoungeRow,
} from "./lounge-directory";

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

    // Otros archivos crean lounges efímeros (`test-lounge-*`) en paralelo.
    expect(lounges.filter((lounge) => !lounge.id.startsWith("test-lounge-")).length).toBe(17);

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

  /**
   * Regresión: `slotsToday` salía de la columna `slots_today`, una instantánea
   * sembrada del mock. Un lounge creado desde el admin nacía con 0 y Explore
   * lo marcaba "Full" aunque tuviera todo el aforo libre.
   */
  it("las plazas de hoy son las libres de verdad, sumando las franjas abiertas", async () => {
    const supabase = createClient();
    await signUpConfirmedAndSignIn(
      supabase,
      `plazas-${Date.now()}@ensoleil-test.com`,
      "EnSoleil!2026",
    );

    const lounges = await fetchLounges(supabase);

    for (const id of ["the-ainsworth", "the-ironbound-salon"]) {
      const { data: cells } = await supabase.rpc("lounge_availability_range", {
        p_lounge_id: id,
        p_from: TODAY,
        p_to: TODAY,
      });
      const free = (cells as { seats_left: number }[]).reduce(
        (sum, cell) => sum + cell.seats_left,
        0,
      );

      expect(lounges.find((lounge) => lounge.id === id)?.slotsToday).toBe(free);
    }
  });

  it("RLS bloquea a un cliente sin sesión", async () => {
    const supabase = createClient();
    /** Un test anterior puede haber dejado una sesión en el mismo jsdom. */
    await supabase.auth.signOut();

    await expect(fetchLounges(supabase)).resolves.toEqual([]);
  });
});

describe("searchLounges (Supabase local)", () => {
  async function signedIn() {
    const supabase = createClient();
    await signUpConfirmedAndSignIn(
      supabase,
      `busca-${Date.now()}@ensoleil-test.com`,
      "EnSoleil!2026",
    );
    return supabase;
  }

  function names(lounges: LoungeRow[]) {
    return lounges.map((lounge) => lounge.name);
  }

  it("encuentra por nombre, sin distinguir mayúsculas", async () => {
    const supabase = await signedIn();

    expect(names(await searchLounges(supabase, "ironbound salon"))).toEqual([
      "The Ironbound Salon",
    ]);
  });

  it("encuentra por ciudad y por barrio", async () => {
    const supabase = await signedIn();

    expect(names(await searchLounges(supabase, "miami"))).toContain("Marbella Sky Lounge");
    expect(names(await searchLounges(supabase, "Brickell"))).toContain("Marbella Sky Lounge");
  });

  it("encuentra por el nombre visible de un amenity", async () => {
    const supabase = await signedIn();
    const results = await searchLounges(supabase, "day rooms");

    expect(names(results)).toContain("Marbella Sky Lounge");
    expect(results.every((lounge) => lounge.amenities.includes("day-rooms") || /day rooms/i.test(lounge.name))).toBe(true);
  });

  it("no se rompe con caracteres que tienen significado en el filtro", async () => {
    const supabase = await signedIn();

    await expect(searchLounges(supabase, "a,b(c)*%")).resolves.toEqual([]);
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

describe("un lounge en borrador no está en el catálogo", () => {
  it("ni siquiera para un miembro con una reserva allí (que sí ve el lounge de su pase)", async () => {
    const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const id = `test-lounge-draft-${Date.now()}`;
    await service.from("lounges").insert({
      id,
      name: "Draft Lounge",
      neighborhood: "NoHo",
      city: "New York",
      city_id: "new-york",
      lat: 40.7262,
      lng: -73.9936,
      hours: "8 AM – 9 PM",
      bands: ["morning"],
      content_status: "draft",
    });
    const supabase = createClient();
    await signUpConfirmedAndSignIn(supabase, `draft-booker-${Date.now()}@ensoleil-test.com`, "EnSoleil!2026");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await service.from("bookings").insert({ member_id: user!.id, lounge_id: id, date: "2026-10-02", band: "morning", slot_time: "8:00 AM" });

    const lounges = await fetchLounges(supabase);

    expect(lounges.map((lounge) => lounge.id)).not.toContain(id);
    await service.from("lounges").delete().eq("id", id);
  });
});
