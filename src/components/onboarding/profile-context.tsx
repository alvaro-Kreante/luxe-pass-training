"use client";

import * as React from "react";

/**
 * Story 1.1 — "Profile creation includes: name*, phone*, profile photo,
 * interests, location*, cities where they travel the most, job position,
 * Industry*, Company, DOB (just day/month)".
 *
 * El perfil se completa en tres pasos (artboards ProfileBasic /
 * ProfilePersonal / ProfileProfessional), así que el borrador vive por encima
 * de las tres pantallas. Sin backend todavía: se guarda en sessionStorage para
 * que recargar o volver atrás no pierda lo escrito. Cuando exista la API,
 * `useProfileDraft` es el único punto que cambia.
 */

export interface ProfileDraft {
  photoName: string | null;
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

const STORAGE_KEY = "luxepass:profile-draft";

interface ProfileContextValue {
  draft: ProfileDraft;
  update: (patch: Partial<ProfileDraft>) => void;
  reset: () => void;
}

const ProfileContext = React.createContext<ProfileContextValue | null>(null);

export function ProfileDraftProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [draft, setDraft] = React.useState<ProfileDraft>(EMPTY_PROFILE);

  /**
   * Hidratación desde sessionStorage. Tiene que ocurrir en un efecto y no en el
   * estado inicial: `window` no existe en el render del servidor, y leerlo en el
   * primer render de cliente desalinearía el HTML hidratado. Es la lectura
   * inicial de un sistema externo, se ejecuta una sola vez al montar.
   */
  React.useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft({ ...EMPTY_PROFILE, ...JSON.parse(stored) });
      }
    } catch {
      // Un almacenamiento bloqueado no debe impedir completar el alta.
    }
  }, []);

  const update = React.useCallback((patch: Partial<ProfileDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Idem.
      }
      return next;
    });
  }, []);

  const reset = React.useCallback(() => {
    setDraft(EMPTY_PROFILE);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Idem.
    }
  }, []);

  const value = React.useMemo(
    () => ({ draft, update, reset }),
    [draft, update, reset],
  );

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
