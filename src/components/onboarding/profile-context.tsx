"use client";

import * as React from "react";

/**
 * Story 1.1 — "Profile creation includes: name*, phone*, profile photo,
 * interests, location*, cities where they travel the most, job position,
 * Industry*, Company, DOB (just day/month)".
 *
 * El perfil se completa en tres pasos (artboards ProfileBasic /
 * ProfilePersonal / ProfileProfessional), así que el borrador vive por encima
 * de las tres pantallas: el layout de /onboarding no se remonta al navegar
 * entre ellas, y eso basta para que el botón "atrás" conserve lo escrito.
 *
 * Sin persistencia: recargar empieza de cero, que es lo correcto para un
 * mockup navegable.
 */

export interface ProfileDraft {
  photoName: string | null;
  photoFile: File | null;
  fullName: string;
  phone: string;
  birthDay: string;
  birthMonth: string;
  interests: string[];
  city: string;
  travelCities: string[];
  jobTitle: string;
  industry: string;
  company: string;
}

export const EMPTY_PROFILE: ProfileDraft = {
  photoName: null,
  photoFile: null,
  fullName: "",
  phone: "",
  birthDay: "",
  birthMonth: "",
  interests: [],
  city: "",
  travelCities: [],
  jobTitle: "",
  industry: "",
  company: "",
};

interface ProfileContextValue {
  draft: ProfileDraft;
  update: (patch: Partial<ProfileDraft>) => void;
}

const ProfileContext = React.createContext<ProfileContextValue | null>(null);

export function ProfileDraftProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [draft, setDraft] = React.useState<ProfileDraft>(EMPTY_PROFILE);

  const update = React.useCallback((patch: Partial<ProfileDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = React.useMemo(() => ({ draft, update }), [draft, update]);

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfileDraft(): ProfileContextValue {
  const context = React.useContext(ProfileContext);
  if (!context) {
    throw new Error(
      "useProfileDraft must be used inside <ProfileDraftProvider>",
    );
  }
  return context;
}

/** Opciones de los selectores de fecha de nacimiento (solo día y mes). */
export const BIRTH_DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

export const BIRTH_MONTHS = [
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

export const INTERESTS = [
  "Fine dining",
  "Wellness & Spa",
  "Nightlife",
  "Art & Culture",
  "Sports",
  "Business travel",
  "Fashion",
];

export const INDUSTRIES = [
  "Finance",
  "Technology",
  "Fashion & luxury",
  "Hospitality",
  "Real estate",
  "Healthcare",
  "Legal",
  "Media",
  "Other",
];
