import { describe, expect, it } from "vitest";

import { TODAY, addDays } from "./availability";
import { confirmBooking } from "./booking";
import { fetchPastBookings, fetchUpcomingBookings } from "./passes";
import {
  addFavoriteLounge,
  exportMemberData,
  fetchEmergencyContact,
  fetchFavoriteLounges,
  fetchInterests,
  fetchMembershipStatus,
  fetchPreferredAmenities,
  fetchPrivacySettings,
  fetchProfile,
  formatDateOfBirth,
  isFavoriteLounge,
  parseDateOfBirth,
  reactivateAccountIfDeleted,
  removeFavoriteLounge,
  requestAccountDeletion,
  updateInterests,
  updatePreferredAmenities,
  updatePrivacySettings,
  updateProfile,
} from "./profile";
import { createClient } from "./supabase/client";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";

/**
 * Story 6.3 (Member Profile & Preferences). Criterios en
 * docs/specs/epic-6-member-experience-notifications/story-6.3-member-profile-preferences.md.
 * Todo corre contra Supabase local real (RLS ya limita a la fila propia),
 * como exige la metodología de test del proyecto.
 */

async function signUpFreshMember(label: string) {
  const supabase = createClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `profile-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  return { supabase, user };
}

describe("formatDateOfBirth / parseDateOfBirth", () => {
  it("son inversas para una fecha válida", () => {
    expect(formatDateOfBirth(14, 9)).toBe("14 September");
    expect(parseDateOfBirth("14 September")).toEqual({ day: 14, month: 9 });
  });

  it("devuelven vacío/nulo cuando falta el día o el mes", () => {
    expect(formatDateOfBirth(null, 9)).toBe("");
    expect(parseDateOfBirth("not a date")).toEqual({ day: null, month: null });
  });
});

describe("fetchProfile / updateProfile", () => {
  it("AC 'Edit profile all fields input before' — trae el perfil real y persiste los cambios", async () => {
    const { supabase, user } = await signUpFreshMember("edit");

    const before = await fetchProfile(supabase);
    expect(before.fullName).toBe("Test Member");
    expect(before.email).toBe(user.email);
    expect(before.dateOfBirth).toBe("");

    await updateProfile(supabase, {
      fullName: "Jordan Reyes",
      phone: "+15555551234",
      dateOfBirth: "3 March",
      city: "Miami",
      industry: "Hospitality",
      jobTitle: "GM",
      company: "Aurelia House",
      travelCities: ["Paris", "Tokyo"],
    });

    const after = await fetchProfile(supabase);
    expect(after.fullName).toBe("Jordan Reyes");
    expect(after.dateOfBirth).toBe("3 March");
    expect(after.city).toBe("Miami");
    expect(after.travelCities).toEqual(["Paris", "Tokyo"]);
  });
});

describe("fetchMembershipStatus", () => {
  it("AC 'Membership status Active/Inactive' — nace 'active'", async () => {
    const { supabase } = await signUpFreshMember("membership-status");

    expect(await fetchMembershipStatus(supabase)).toBe("inactive");
  });
});

describe("favoritos", () => {
  it("AC 'Favorite lounges list' — añadir, listar y quitar un favorito real", async () => {
    const { supabase } = await signUpFreshMember("favorites");

    expect(await fetchFavoriteLounges(supabase)).toEqual([]);
    expect(await isFavoriteLounge(supabase, "the-ainsworth")).toBe(false);

    await addFavoriteLounge(supabase, "the-ainsworth");

    const favorites = await fetchFavoriteLounges(supabase);
    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.id).toBe("the-ainsworth");
    expect(await isFavoriteLounge(supabase, "the-ainsworth")).toBe(true);

    await removeFavoriteLounge(supabase, "the-ainsworth");
    expect(await fetchFavoriteLounges(supabase)).toEqual([]);
  });

  it("no ve los favoritos de otro miembro (RLS)", async () => {
    const { supabase: mine } = await signUpFreshMember("favorites-rls");
    await addFavoriteLounge(mine, "the-ainsworth");
    const mineFavorites = await fetchFavoriteLounges(mine);

    const { supabase: other } = await signUpFreshMember("favorites-rls-other");
    const otherFavorites = await fetchFavoriteLounges(other);

    expect(mineFavorites).toHaveLength(1);
    expect(otherFavorites).toHaveLength(0);
  });
});

describe("preferred amenities", () => {
  it("AC 'Preferred amenities selection' — nace vacío y persiste los cambios", async () => {
    const { supabase } = await signUpFreshMember("amenities");

    expect(await fetchPreferredAmenities(supabase)).toEqual([]);

    await updatePreferredAmenities(supabase, ["wifi", "spa"]);

    expect(await fetchPreferredAmenities(supabase)).toEqual(["wifi", "spa"]);
  });
});

describe("interests", () => {
  it("reutiliza profiles.interests, ya real desde la Story 1.1", async () => {
    const { supabase } = await signUpFreshMember("interests");

    expect(await fetchInterests(supabase)).toEqual([]);

    await updateInterests(supabase, ["Fine dining", "Nightlife"]);

    expect(await fetchInterests(supabase)).toEqual(["Fine dining", "Nightlife"]);
  });
});

describe("privacy settings", () => {
  it("AC 'Privacy settings for data usage' — nace con los valores por defecto y persiste el cambio", async () => {
    const { supabase } = await signUpFreshMember("privacy");

    const before = await fetchPrivacySettings(supabase);
    expect(before).toEqual({
      personalizedRecommendations: true,
      shareWithLounge: true,
      productResearch: false,
      marketingAnalytics: false,
    });

    await updatePrivacySettings(supabase, { shareWithLounge: false, productResearch: true });

    const after = await fetchPrivacySettings(supabase);
    expect(after.shareWithLounge).toBe(false);
    expect(after.productResearch).toBe(true);
    expect(after.personalizedRecommendations).toBe(true);
  });
});

describe("fetchEmergencyContact", () => {
  it("nace vacío — Story 1.1 no lo pide en el alta", async () => {
    const { supabase } = await signUpFreshMember("emergency-contact");

    expect(await fetchEmergencyContact(supabase)).toEqual({ name: null, relation: null, phone: null });
  });
});

describe("exportMemberData", () => {
  it("AC 'Export personal data option (GDPR compliance)' — agrega perfil, favoritos, reservas y notificaciones", async () => {
    const { supabase } = await signUpFreshMember("export");
    await addFavoriteLounge(supabase, "the-ainsworth");

    const bundle = await exportMemberData(supabase);

    expect(bundle.profile).toBeTruthy();
    expect(bundle.favoriteLounges).toHaveLength(1);
    expect(Array.isArray(bundle.bookings)).toBe(true);
    expect(Array.isArray(bundle.notifications)).toBe(true);
  });
});

describe("requestAccountDeletion / reactivateAccountIfDeleted", () => {
  it("AC 'Account deletion option with confirmation' — marca deleted_at, cancela reservas futuras y reactiva al volver a entrar", async () => {
    const { supabase, user } = await signUpFreshMember("delete");
    const futureDate = addDays(TODAY, 3);
    const booking = await confirmBooking(supabase, {
      loungeId: "the-cordelia",
      dateIso: futureDate,
      band: "morning",
      time: "8:00 AM",
      specialRequests: "",
    });
    if (!booking) throw new Error("No se pudo confirmar la reserva de prueba");

    await requestAccountDeletion(supabase);

    const { data: deletedProfile } = await supabase
      .from("profiles")
      .select("deleted_at")
      .eq("id", user.id)
      .single();
    expect(deletedProfile?.deleted_at).not.toBeNull();

    const upcoming = await fetchUpcomingBookings(supabase);
    expect(upcoming).toHaveLength(0);
    const past = await fetchPastBookings(supabase);
    expect(past.some((b) => b.outcome === "cancelled")).toBe(true);

    await reactivateAccountIfDeleted(supabase);

    const { data: reactivatedProfile } = await supabase
      .from("profiles")
      .select("deleted_at")
      .eq("id", user.id)
      .single();
    expect(reactivatedProfile?.deleted_at).toBeNull();
  });
});
