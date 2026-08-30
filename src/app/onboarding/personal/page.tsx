"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Plus } from "lucide-react";

import { AuthSplit } from "@/components/patterns/auth-split";
import {
  INTERESTS,
  useProfileDraft,
} from "@/components/onboarding/profile-context";
import { Button } from "@/components/ui/button";
import { AddChip, RemovableChip, SelectableChip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { StepProgress } from "@/components/ui/step-progress";

/**
 * Story 1.1 — paso 2 de 3 del perfil.
 * Artboard: docs/design/epic-1-onboarding/ProfilePersonal.dc.html
 */
export default function ProfilePersonalPage() {
  const router = useRouter();
  const { draft, update } = useProfileDraft();

  const [customInterest, setCustomInterest] = React.useState("");
  const [addingInterest, setAddingInterest] = React.useState(false);
  const [cityInput, setCityInput] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Los intereses propios se muestran junto a los del catálogo.
  const extraInterests = draft.interests.filter(
    (interest) => !INTERESTS.includes(interest),
  );

  function toggleInterest(interest: string) {
    update({
      interests: draft.interests.includes(interest)
        ? draft.interests.filter((i) => i !== interest)
        : [...draft.interests, interest],
    });
  }

  function addCustomInterest() {
    const value = customInterest.trim();
    if (value && !draft.interests.includes(value)) {
      update({ interests: [...draft.interests, value] });
    }
    setCustomInterest("");
    setAddingInterest(false);
  }

  function addTravelCity() {
    const value = cityInput.trim();
    if (value && !draft.travelCities.includes(value)) {
      update({ travelCities: [...draft.travelCities, value] });
    }
    setCityInput("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.city.trim()) {
      setErrors({ city: "Enter your city of residence." });
      return;
    }
    setErrors({});
    router.push("/onboarding/professional");
  }

  return (
    <AuthSplit
      tagline="Join a community of discerning travelers."
      cardWidth={460}
    >
      <StepProgress current={2} total={3} label="Personal" />

      <h1 className="mb-2 text-[27px] text-fg">Your interests</h1>
      <p className="m-0 mb-5 text-sm leading-normal text-fg-muted">
        Help us tailor your experience.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6 flex flex-wrap gap-2">
          {[...INTERESTS, ...extraInterests].map((interest) => (
            <SelectableChip
              key={interest}
              selected={draft.interests.includes(interest)}
              onToggle={() => toggleInterest(interest)}
            >
              {interest}
            </SelectableChip>
          ))}

          {addingInterest ? (
            <input
              autoFocus
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              onBlur={addCustomInterest}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomInterest();
                }
                if (e.key === "Escape") {
                  setCustomInterest("");
                  setAddingInterest(false);
                }
              }}
              placeholder="Add an interest"
              aria-label="Add an interest"
              className="rounded-pill border border-accent bg-surface px-4 py-2 text-[13px] font-semibold text-fg placeholder:text-fg-subtle focus:shadow-ring focus:outline-none"
            />
          ) : (
            <AddChip onClick={() => setAddingInterest(true)}>Other</AddChip>
          )}
        </div>

        <Field
          label="City of residence"
          required
          htmlFor="city"
          className="mb-5"
          hint={
            errors.city ? (
              <span className="text-accent-strong">{errors.city}</span>
            ) : null
          }
        >
          <Input
            id="city"
            placeholder="New York, USA"
            value={draft.city}
            onChange={(e) => update({ city: e.target.value })}
            aria-invalid={Boolean(errors.city)}
            icon={<MapPin size={18} strokeWidth={1.6} />}
          />
        </Field>

        <Field
          label="Cities you travel to most"
          htmlFor="travel-city"
          className="mb-3"
        >
          <Input
            id="travel-city"
            placeholder="Add a city"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTravelCity();
              }
            }}
            icon={<Plus size={18} strokeWidth={1.6} />}
          />
        </Field>

        {draft.travelCities.length > 0 ? (
          <div className="mb-7 flex flex-wrap gap-2">
            {draft.travelCities.map((city) => (
              <RemovableChip
                key={city}
                label={city}
                onRemove={() =>
                  update({
                    travelCities: draft.travelCities.filter((c) => c !== city),
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="mb-7" />
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="square"
            aria-label="Back to basics"
            onClick={() => router.push("/onboarding/basics")}
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
          </Button>
          <Button type="submit" className="flex-1">
            Continue
          </Button>
        </div>
      </form>
    </AuthSplit>
  );
}
