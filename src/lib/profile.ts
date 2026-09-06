import { VISITS_THIS_MONTH } from "./passes";

/**
 * Story 6.3 (Member Profile & Preferences). Sin backend: el perfil, las
 * preferencias y los ajustes de privacidad son datos de muestra
 * deterministas para Alexandra Rivas, el mismo miembro de `lib/member.ts`.
 */

export interface ProfileDraft {
  fullName: string;
  email: string;
  emailVerified: boolean;
  phone: string;
  phoneVerified: boolean;
  dateOfBirth: string;
  city: string;
  industry: string;
  jobTitle: string;
  company: string;
  travelCities: string[];
}

export const SAMPLE_PROFILE: ProfileDraft = {
  fullName: "Alexandra Rivas",
  email: "alexandra.rivas@email.com",
  emailVerified: true,
  phone: "+1 (555) 018-2245",
  phoneVerified: true,
  dateOfBirth: "14 September",
  city: "New York, USA",
  industry: "Finance",
  jobTitle: "Director of Operations",
  company: "Meridian Partners",
  travelCities: ["London", "Miami", "Paris"],
};

/**
 * `memberSince`/`renews` no formaban un término de doce meses ("March 2026"
 * → "November 3, 2026" son ocho meses, no doce). La Fase 9 (`DESIGN-SYSTEM.md`
 * §6) exige elegir uno de los dos al implementar: se conserva la fecha de
 * renovación, citada en varios artboards de esa fase, y se corrige el alta a
 * "November 2025" — mismo criterio que el corazón de favorito que la Fase 7
 * dejó pendiente para que lo resolviera la Fase 4.
 */
export const MEMBERSHIP_SUMMARY = {
  plan: "Annual",
  status: "Active" as const,
  memberSince: "November 2025",
  renews: "November 3, 2026",
  visitsThisMonth: VISITS_THIS_MONTH,
};

export const REFERRAL_CODE = "AR-SOLEIL-24";

/* ------------------------------------------------------------------ */
/* Preferences — lounges favoritos, amenities e intereses              */
/* ------------------------------------------------------------------ */

export interface FavoriteLounge {
  id: string;
  name: string;
  neighborhood: string;
  distanceMi: number;
  visitCount: number;
}

/**
 * The Ainsworth, The Vestry y Bergdorf Lounge son los mismos nombres de
 * muestra que ya usa `lib/passes.ts` — no todos están en el catálogo real de
 * 12 lounges de `lib/lounges.ts` (solo The Ainsworth lo está), así que esta
 * lista es literal en vez de derivada, igual que las reservas de My Pass.
 */
export const FAVORITE_LOUNGES: FavoriteLounge[] = [
  { id: "the-ainsworth", name: "The Ainsworth", neighborhood: "Midtown East", distanceMi: 2.1, visitCount: 6 },
  { id: "the-vestry", name: "The Vestry", neighborhood: "SoHo", distanceMi: 1.8, visitCount: 4 },
  { id: "bergdorf-lounge", name: "Bergdorf Lounge", neighborhood: "Midtown", distanceMi: 1.4, visitCount: 2 },
];

/**
 * Reutiliza los seis ids de `lib/amenities.ts` (Story 2.2) en vez de la
 * lista propia de ocho de `Preferences.dc.html` — misma regla que ya fija
 * COMPONENT-MAP.md para las amenities del perfil de lounge: una sola fuente
 * de datos entre el filtro de Explore y aquí.
 */
export const PREFERRED_AMENITY_IDS = ["wifi", "spa"] as const;

export const INTERESTS = [
  "Fine dining",
  "Wellness and spa",
  "Nightlife",
  "Art and culture",
  "Sports",
  "Business travel",
  "Fashion",
] as const;

export const SAMPLE_SELECTED_INTERESTS = ["Fine dining", "Wellness and spa", "Art and culture", "Business travel"];

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

export const SAMPLE_PRIVACY_SETTINGS: PrivacySettings = {
  personalizedRecommendations: true,
  shareWithLounge: true,
  productResearch: false,
  marketingAnalytics: false,
};

export const EMERGENCY_CONTACT = {
  name: "Daniel Rivas",
  relation: "brother",
  phone: "+1 (555) 662-0184",
};

export const DATA_EXPORT_EMAIL_HOURS = 48;
export const DATA_EXPORT_LINK_VALID_DAYS = 7;

/* ------------------------------------------------------------------ */
/* Delete account — `DeleteAccount.dc.html`                             */
/* ------------------------------------------------------------------ */

export const ACCOUNT_DELETION_GRACE_DAYS = 30;
export const DELETE_ACCOUNT_CONFIRMATION_WORD = "DELETE";
