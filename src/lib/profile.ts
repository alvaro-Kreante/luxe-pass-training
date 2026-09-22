import type { SupabaseClient } from "@supabase/supabase-js";

import type { AmenityId } from "./amenities";
import { VISITS_THIS_MONTH } from "./passes";

/**
 * Story 6.3 (Member Profile & Preferences) — conectada a Supabase real
 * (tabla `profiles`, extendida; `member_favorite_lounges`, nace aquí — ver
 * `supabase/schemas/profiles.sql`/`member_favorite_lounges.sql`). Plan,
 * renovación y visitas de `MEMBERSHIP_SUMMARY` siguen siendo dato de
 * muestra — dueño real `memberships` (Epic 9, todavía mockup); solo
 * `membership_status` (Active/Inactive) es un stub real, ver
 * `fetchMembershipStatus`.
 */

/** Debe coincidir con `BIRTH_MONTHS` en `components/onboarding/profile-context.tsx`. */
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "14 September" a partir de las columnas reales `birth_day`/`birth_month`. */
export function formatDateOfBirth(day: number | null, month: number | null): string {
  if (!day || !month || month < 1 || month > 12) return "";
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

/** Inverso de `formatDateOfBirth` — vacío o irreconocible vuelve `{ day: null, month: null }`. */
export function parseDateOfBirth(value: string): { day: number | null; month: number | null } {
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)$/);
  if (!match) return { day: null, month: null };

  const day = Number(match[1]);
  const monthIndex = MONTH_NAMES.findIndex((name) => name.toLowerCase() === match[2]!.toLowerCase());
  if (monthIndex === -1 || day < 1 || day > 31) return { day: null, month: null };

  return { day, month: monthIndex + 1 };
}

export interface ProfileDraft {
  fullName: string;
  email: string;
  emailVerified: boolean;
  phone: string;
  /** Story 1.1 nunca construyó verificación de teléfono (solo email) — siempre `true`, desviación documentada en COMPONENT-MAP. */
  phoneVerified: boolean;
  dateOfBirth: string;
  city: string;
  industry: string;
  jobTitle: string;
  company: string;
  travelCities: string[];
  photoUrl: string | null;
}

interface ProfileRow {
  full_name: string;
  phone: string;
  photo_url: string | null;
  birth_day: number | null;
  birth_month: number | null;
  city: string;
  travel_cities: string[];
  job_title: string | null;
  industry: string;
  company: string | null;
}

const PROFILE_SELECT =
  "full_name, phone, photo_url, birth_day, birth_month, city, travel_cities, job_title, industry, company";

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

/** AC "Edit profile all fields input before". RLS ya limita a la fila propia. */
export async function fetchProfile(supabase: SupabaseClient): Promise<ProfileDraft> {
  const user = await requireUser(supabase);

  const { data, error } = await supabase.from("profiles").select(PROFILE_SELECT).eq("id", user.id).single();
  if (error) throw error;

  const row = data as ProfileRow;
  return {
    fullName: row.full_name,
    email: user.email ?? "",
    emailVerified: user.email_confirmed_at != null,
    phone: row.phone,
    phoneVerified: true,
    dateOfBirth: formatDateOfBirth(row.birth_day, row.birth_month),
    city: row.city,
    industry: row.industry,
    jobTitle: row.job_title ?? "",
    company: row.company ?? "",
    travelCities: row.travel_cities,
    photoUrl: row.photo_url,
  };
}

export interface ProfileEdits {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  city: string;
  industry: string;
  jobTitle: string;
  company: string;
  travelCities: string[];
  /** `undefined` = no tocar; `null` = quitar la foto. */
  photoUrl?: string | null;
}

export async function updateProfile(supabase: SupabaseClient, edits: ProfileEdits): Promise<void> {
  const user = await requireUser(supabase);
  const { day, month } = parseDateOfBirth(edits.dateOfBirth);

  const update: Record<string, unknown> = {
    full_name: edits.fullName,
    phone: edits.phone,
    birth_day: day,
    birth_month: month,
    city: edits.city,
    industry: edits.industry,
    job_title: edits.jobTitle || null,
    company: edits.company || null,
    travel_cities: edits.travelCities,
  };
  if (edits.photoUrl !== undefined) update.photo_url = edits.photoUrl;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) throw error;
}

/**
 * `memberSince`/`renews`/`plan`/`visitsThisMonth` siguen siendo dato de
 * muestra — dueño real `memberships` (Epic 9). No formaban un término de
 * doce meses ("March 2026" → "November 3, 2026"): se conserva la
 * renovación y se corrige el alta a "November 2025", ver `DESIGN-SYSTEM.md`
 * §6 Fase 9.
 */
export const MEMBERSHIP_SUMMARY = {
  plan: "Annual",
  memberSince: "November 2025",
  renews: "November 3, 2026",
  visitsThisMonth: VISITS_THIS_MONTH,
};

export type MembershipStatus = "active" | "inactive";

/** Story 6.3 — "Membership status Active/Inactive". Stub real en `profiles.membership_status`. */
export async function fetchMembershipStatus(supabase: SupabaseClient): Promise<MembershipStatus> {
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .select("membership_status")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return (data as { membership_status: MembershipStatus }).membership_status;
}

/** Story 9.1/9.2 (Epic 9, sin conectar) — código fijo de la cuenta de muestra de Alexandra Rivas, reutilizado por `lib/membership.ts`/`lib/referrals.ts`. No confundir con `referralCodeFor`, el código real por miembro de `/profile`. */
export const REFERRAL_CODE = "AR-SOLEIL-24";

/** "AR-SOLEIL-42" — determinista por miembro, sin tabla `referrals` propia (Epic 9 no está conectada). */
export function referralCodeFor(fullName: string, memberId: string): string {
  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "LP";

  let hash = 0;
  for (const char of memberId) hash = (hash * 31 + char.charCodeAt(0)) % 90;

  return `${initials}-SOLEIL-${String(10 + hash)}`;
}

/* ------------------------------------------------------------------ */
/* Preferences — lounges favoritos, amenities e intereses              */
/* ------------------------------------------------------------------ */

export interface FavoriteLounge {
  id: string;
  name: string;
  neighborhood: string;
}

interface FavoriteLoungeRow {
  lounge_id: string;
  lounges: { id: string; name: string; neighborhood: string } | null;
}

/** AC "Favorite lounges list". RLS ya limita a los favoritos propios. */
export async function fetchFavoriteLounges(supabase: SupabaseClient): Promise<FavoriteLounge[]> {
  const { data, error } = await supabase
    .from("member_favorite_lounges")
    .select("lounge_id, lounges(id, name, neighborhood)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data as unknown as FavoriteLoungeRow[])
    .filter((row) => row.lounges !== null)
    .map((row) => ({ id: row.lounges!.id, name: row.lounges!.name, neighborhood: row.lounges!.neighborhood }));
}

/** "Tap the heart on any lounge profile to save it here" (`Preferences.dc.html`). */
export async function addFavoriteLounge(supabase: SupabaseClient, loungeId: string): Promise<void> {
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("member_favorite_lounges")
    .insert({ member_id: user.id, lounge_id: loungeId });
  if (error) throw error;
}

export async function removeFavoriteLounge(supabase: SupabaseClient, loungeId: string): Promise<void> {
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("member_favorite_lounges")
    .delete()
    .eq("member_id", user.id)
    .eq("lounge_id", loungeId);
  if (error) throw error;
}

export async function isFavoriteLounge(supabase: SupabaseClient, loungeId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("member_favorite_lounges")
    .select("lounge_id")
    .eq("member_id", user.id)
    .eq("lounge_id", loungeId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/**
 * AC "Preferred amenities selection". Reutiliza los ids de `lib/amenities.ts`
 * (Story 2.2) — mismo criterio que ya fija COMPONENT-MAP para el perfil de
 * lounge: una sola fuente de datos entre el filtro de Explore y aquí.
 */
export async function fetchPreferredAmenities(supabase: SupabaseClient): Promise<AmenityId[]> {
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_amenities")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return (data as { preferred_amenities: AmenityId[] }).preferred_amenities;
}

export async function updatePreferredAmenities(supabase: SupabaseClient, amenityIds: AmenityId[]): Promise<void> {
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("profiles")
    .update({ preferred_amenities: amenityIds })
    .eq("id", user.id);
  if (error) throw error;
}

export const INTERESTS = [
  "Fine dining",
  "Wellness and spa",
  "Nightlife",
  "Art and culture",
  "Sports",
  "Business travel",
  "Fashion",
] as const;

/** `profiles.interests` ya es real desde la Story 1.1 (paso 2 de /onboarding). */
export async function fetchInterests(supabase: SupabaseClient): Promise<string[]> {
  const user = await requireUser(supabase);
  const { data, error } = await supabase.from("profiles").select("interests").eq("id", user.id).single();
  if (error) throw error;
  return (data as { interests: string[] }).interests;
}

export async function updateInterests(supabase: SupabaseClient, interests: string[]): Promise<void> {
  const user = await requireUser(supabase);
  const { error } = await supabase.from("profiles").update({ interests }).eq("id", user.id);
  if (error) throw error;
}

export type DistanceUnit = "mi" | "km";

/* ------------------------------------------------------------------ */
/* Privacy and data — `Privacy.dc.html`                                 */
/* ------------------------------------------------------------------ */

export interface PrivacySettings {
  personalizedRecommendations: boolean;
  shareWithLounge: boolean;
  productResearch: boolean;
  marketingAnalytics: boolean;
}

interface PrivacyRow {
  privacy_personalized_recommendations: boolean;
  privacy_share_with_lounge: boolean;
  privacy_product_research: boolean;
  privacy_marketing_analytics: boolean;
}

/** AC "Privacy settings for data usage". */
export async function fetchPrivacySettings(supabase: SupabaseClient): Promise<PrivacySettings> {
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "privacy_personalized_recommendations, privacy_share_with_lounge, privacy_product_research, privacy_marketing_analytics",
    )
    .eq("id", user.id)
    .single();
  if (error) throw error;

  const row = data as PrivacyRow;
  return {
    personalizedRecommendations: row.privacy_personalized_recommendations,
    shareWithLounge: row.privacy_share_with_lounge,
    productResearch: row.privacy_product_research,
    marketingAnalytics: row.privacy_marketing_analytics,
  };
}

export async function updatePrivacySettings(
  supabase: SupabaseClient,
  patch: Partial<PrivacySettings>,
): Promise<void> {
  const user = await requireUser(supabase);
  const update: Record<string, boolean> = {};
  if (patch.personalizedRecommendations !== undefined)
    update.privacy_personalized_recommendations = patch.personalizedRecommendations;
  if (patch.shareWithLounge !== undefined) update.privacy_share_with_lounge = patch.shareWithLounge;
  if (patch.productResearch !== undefined) update.privacy_product_research = patch.productResearch;
  if (patch.marketingAnalytics !== undefined) update.privacy_marketing_analytics = patch.marketingAnalytics;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) throw error;
}

/**
 * Story 5.2 (Epic 5) — el contacto de emergencia ya era real, pero editarlo
 * desde aquí (`/profile/privacy`) era el gap explícito que dejó esta misma
 * historia. Sin artboard para el formulario de edición ("Edit" queda inerte
 * en la pantalla, ver COMPONENT-MAP), pero el dato en sí ya se puede leer.
 */
export interface EmergencyContact {
  name: string | null;
  relation: string | null;
  phone: string | null;
}

export async function fetchEmergencyContact(supabase: SupabaseClient): Promise<EmergencyContact> {
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .select("emergency_contact_name, emergency_contact_relation, emergency_contact_phone")
    .eq("id", user.id)
    .single();
  if (error) throw error;

  return {
    name: data.emergency_contact_name,
    relation: data.emergency_contact_relation,
    phone: data.emergency_contact_phone,
  };
}

/**
 * AC "Export personal data option (GDPR compliance)". Descarga instantánea
 * en el navegador (`downloadTextFile`/`Blob`, misma capacidad real que el
 * `.ics` de la Story 4.3) en vez del link emailado en 48h que dibuja
 * `Privacy.dc.html` — desviación consciente, documentada en COMPONENT-MAP:
 * entregar el archivo al instante no rompe ninguna promesa de seguridad
 * (a diferencia del borrado de cuenta), solo mejora el tiempo de espera.
 */
export async function exportMemberData(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const user = await requireUser(supabase);

  const [profile, favorites] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    fetchFavoriteLounges(supabase),
  ]);
  if (profile.error) throw profile.error;

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("confirmation_code, lounge_id, date, slot_time, status, no_show, created_at")
    .order("date", { ascending: false });
  if (bookingsError) throw bookingsError;

  const { data: notifications, error: notificationsError } = await supabase
    .from("notifications")
    .select("category, icon, title, body, read_at, created_at")
    .order("created_at", { ascending: false });
  if (notificationsError) throw notificationsError;

  return {
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    favoriteLounges: favorites,
    bookings,
    notifications,
  };
}

/* ------------------------------------------------------------------ */
/* Delete account — `DeleteAccount.dc.html`                             */
/* ------------------------------------------------------------------ */

export const ACCOUNT_DELETION_GRACE_DAYS = 30;
export const DELETE_ACCOUNT_CONFIRMATION_WORD = "DELETE";

/**
 * AC "Account deletion option with confirmation". Soft-delete reversible
 * (`profiles.deleted_at`) — el artboard promete "sign in before then and
 * everything comes back", así que esto no borra nada todavía; también
 * cancela las reservas futuras, tal como el propio modal declara. El
 * borrado físico real (30 días cumplidos) es un cron aparte, ver
 * `supabase/schemas/account_deletion.sql`.
 */
export async function requestAccountDeletion(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("request_account_deletion");
  if (error) throw error;
}

/**
 * El login llama a esto tras autenticar — "sign in before then and
 * everything comes back". `maybeSingle`, no `single`: un miembro que nunca
 * terminó /onboarding no tiene fila en `profiles` todavía, y eso no debe
 * romper el login.
 */
export async function reactivateAccountIfDeleted(supabase: SupabaseClient): Promise<void> {
  const user = await requireUser(supabase);
  const { data, error } = await supabase.from("profiles").select("deleted_at").eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (!data?.deleted_at) return;

  const { error: updateError } = await supabase.from("profiles").update({ deleted_at: null }).eq("id", user.id);
  if (updateError) throw updateError;
}
