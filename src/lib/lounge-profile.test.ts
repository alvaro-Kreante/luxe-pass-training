import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { today, addDays } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import {
  WEEK_BANDS,
  fetchClosuresForWeek,
  fetchLoungeImages,
  fetchLoungeProfile,
  fetchNextAvailableSlot,
  fetchWeeklyAvailability,
  mentionsFor,
  mondayOf,
  operatingHoursFor,
  ratingBreakdownFor,
  reviewsFor,
  type LoungeProfile,
} from "./lounge-profile";

/**
 * Story 3.1 / 3.2 — perfil real de un lounge contra Supabase local. Ningún
 * story permite mockear Supabase (ver CLAUDE.md §Metodología de test), así
 * que estos tests corren contra la instancia real ya sembrada por
 * `supabase/migrations/..._seed_lounge_profiles_story_3.sql`.
 */

let supabase: SupabaseClient;
const email = `lounge-profile-${Date.now()}@ensoleil-test.example`;
const password = "EnSoleil!2026";

beforeAll(async () => {
  supabase = createClient();
  await signUpConfirmedAndSignIn(supabase, email, password);
});

async function ainsworth(): Promise<LoungeProfile> {
  return (await fetchLoungeProfile(supabase, "the-ainsworth"))!;
}

async function belmont(): Promise<LoungeProfile> {
  return (await fetchLoungeProfile(supabase, "belmont-terrace"))!;
}

describe("fetchLoungeProfile", () => {
  it("trae el contacto real de The Ainsworth, tal como lo cita Main.dc.html", async () => {
    const lounge = await ainsworth();

    expect(lounge).toMatchObject({
      name: "The Ainsworth",
      address: "122 E 45th St, New York, NY 10017",
      phone: "+1 (212) 555-0184",
      email: "reception@ainsworth.example",
      website: "ainsworth.example",
      receptionNote:
        "Reception is on Level 2. Show your booking confirmation on arrival.",
      reviewCount: 128,
      capacity: 40,
    });
    expect(lounge.bookingRestrictions).toContain("Admission for one member");
    expect(lounge.weeklyHours).toHaveLength(7);
  });

  it("Belmont Terrace no tiene reseñas todavía, como en NoRatings.dc.html", async () => {
    const lounge = await belmont();

    expect(lounge.reviewCount).toBe(0);
  });

  it("devuelve null para un id que no existe", async () => {
    const lounge = await fetchLoungeProfile(supabase, "no-existe");

    expect(lounge).toBeNull();
  });

  it("RLS bloquea a un cliente sin sesión", async () => {
    const anon = createClient();
    /** El storage de auth es compartido en jsdom: cerrar sesión aquí
     * cerraría también la del cliente de `beforeAll`, así que se
     * restablece al terminar para no afectar al resto del archivo. */
    await anon.auth.signOut();

    const lounge = await fetchLoungeProfile(anon, "the-ainsworth");

    expect(lounge).toBeNull();

    await supabase.auth.signInWithPassword({ email, password });
  });
});

describe("fetchLoungeImages", () => {
  it("trae las 6 fotos de The Ainsworth en orden, como en Gallery.dc.html", async () => {
    const images = await fetchLoungeImages(supabase, "the-ainsworth");

    expect(images).toHaveLength(6);
    expect(images.map((image) => image.position)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(images[0].caption).toBe("Main lounge · Level 2");
  });
});

describe("horario de apertura", () => {
  it("marca el día de hoy en la primera fila", async () => {
    const lounge = await ainsworth();
    const rows = operatingHoursFor(lounge.weeklyHours);

    expect(rows[0].isToday).toBe(true);
    expect(rows[0].label).toContain("Today");
  });

  it("cubre los siete días de la semana sin repetir ninguno", async () => {
    const lounge = await ainsworth();
    const rows = operatingHoursFor(lounge.weeklyHours);
    const daysCovered = rows.reduce((total, row) => {
      const range = row.label.replace(" · Today", "");
      const [start, end] = range.split(" – ");
      if (!end) return total + 1;
      const names = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      return total + (names.indexOf(end) - names.indexOf(start) + 1);
    }, 0);

    expect(daysCovered).toBe(7);
  });
});

describe("reseñas (datos de muestra — sin tabla, ver DATA-MODEL-MAP.md)", () => {
  it("The Ainsworth tiene las reseñas del artboard Reviews.dc.html", async () => {
    const lounge = await ainsworth();

    expect(reviewsFor(lounge)).toHaveLength(3);
    expect(
      ratingBreakdownFor(lounge).reduce((sum, row) => sum + row.count, 0),
    ).toBe(128);
  });

  it("Belmont Terrace no tiene reseñas ni menciones", async () => {
    const lounge = await belmont();

    expect(reviewsFor(lounge)).toHaveLength(0);
    expect(mentionsFor(lounge)).toHaveLength(0);
  });
});

describe("calendario semanal de disponibilidad", () => {
  it("mondayOf devuelve el lunes de la semana de una fecha", () => {
    expect(mondayOf("2025-09-09")).toBe("2025-09-08");
    expect(mondayOf("2025-09-14")).toBe("2025-09-08");
  });

  it("genera 28 celdas — 4 franjas por cada uno de los 7 días", async () => {
    const lounge = await ainsworth();
    const cells = await fetchWeeklyAvailability(supabase, lounge, "2025-09-08");

    expect(cells).toHaveLength(7 * WEEK_BANDS.length);
  });

  it("cierra las franjas de los días marcados en closedWeekdays", async () => {
    const lounge = await ainsworth();
    expect(lounge.closedWeekdays).toContain(0);

    const cells = await fetchWeeklyAvailability(supabase, lounge, "2025-09-08");
    const sunday = cells.filter((cell) => cell.dateIso === "2025-09-14");

    expect(sunday.every((cell) => cell.status === "closed")).toBe(true);
  });

  it("cierra las franjas que caen dentro del cierre por festivo sembrado", async () => {
    const lounge = await ainsworth();
    const cells = await fetchWeeklyAvailability(supabase, lounge, "2025-11-24");
    const closedDay = cells.filter((cell) => cell.dateIso === "2025-11-27");

    expect(closedDay.every((cell) => cell.status === "closed")).toBe(true);
    expect(closedDay[0].closureReason).toBe("Thanksgiving");
  });

  it("marca como pasadas las franjas de hoy anteriores a la franja actual", async () => {
    const lounge = await ainsworth();
    const cells = await fetchWeeklyAvailability(supabase, lounge, "2025-09-08");
    const morningToday = cells.find(
      (cell) => cell.dateIso === "2025-09-09" && cell.band === "morning",
    )!;

    expect(morningToday.status).toBe("past");
  });

  it("una franja fuera de closedWeekdays y sin cierre queda disponible o completa, nunca cerrada", async () => {
    const lounge = await ainsworth();
    const cells = await fetchWeeklyAvailability(supabase, lounge, "2025-09-15");

    expect(
      cells
        .filter((cell) => cell.dateIso !== "2025-09-21")
        .every((cell) => cell.status !== "closed"),
    ).toBe(true);
  });
});

describe("fetchClosuresForWeek", () => {
  it("devuelve el cierre de Thanksgiving para la semana que lo cubre", async () => {
    const closures = await fetchClosuresForWeek(
      supabase,
      "the-ainsworth",
      "2025-11-24",
    );

    expect(closures).toHaveLength(1);
    expect(closures[0]).toMatchObject({
      startIso: "2025-11-27",
      endIso: "2025-11-28",
      reason: "Thanksgiving",
      reopensLabel: "Sat Nov 29 at 10:00 AM",
    });
  });

  it("no devuelve nada para una semana sin cierre", async () => {
    const closures = await fetchClosuresForWeek(
      supabase,
      "the-ainsworth",
      "2025-09-08",
    );

    expect(closures).toHaveLength(0);
  });
});

describe("fetchNextAvailableSlot", () => {
  it("encuentra un hueco libre para The Ainsworth dentro de 3 semanas", async () => {
    const lounge = await ainsworth();
    const next = await fetchNextAvailableSlot(supabase, lounge);

    expect(next).toBeDefined();
    expect(next!.dateIso >= "2025-09-09").toBe(true);
    expect(next!.seatsLeft).toBeGreaterThan(0);
  });
});

/** Story 10.9 — durante una temporada, la ficha muestra su horario, no el habitual. */
describe("horario de temporada en la ficha", () => {
  it("si hoy cae en una temporada, la ficha usa su horario y sus días cerrados", async () => {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const id = `test-lounge-profile-season-${Date.now()}`;
    const regular = ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 6 PM"];
    const summer = ["10 AM – 4 PM", "Closed", "7 AM – 11 PM", "7 AM – 11 PM", "7 AM – 11 PM", "7 AM – 11 PM", "9 AM – 6 PM"];
    await service.from("lounges").insert({
      id, name: "Season profile", neighborhood: "Midtown", city: "New York", city_id: "new-york", lat: 0, lng: 0,
      hours: "Open until 9 PM", bands: ["morning"], closed_weekdays: [0], weekly_hours: regular, content_status: "live",
    });
    await service.from("lounge_seasons").insert([
      { lounge_id: id, name: "Summer", starts_on: addDays(today(), -3), ends_on: addDays(today(), 3), weekly_hours: summer },
      { lounge_id: id, name: "Later", starts_on: addDays(today(), 30), ends_on: addDays(today(), 40), weekly_hours: Array(7).fill("Closed") },
    ]);

    const profile = (await fetchLoungeProfile(supabase, id))!;
    expect(profile.weeklyHours).toEqual(summer);
    expect(profile.closedWeekdays).toEqual([1]);

    await service.from("lounge_seasons").delete().eq("lounge_id", id);
    expect((await fetchLoungeProfile(supabase, id))!.weeklyHours).toEqual(regular);
    await service.from("lounges").delete().eq("id", id);
  });
});
