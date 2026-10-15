"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Phone, User } from "lucide-react";

import { AuthSplit } from "@/components/patterns/auth-split";
import {
  BIRTH_DAYS,
  BIRTH_MONTHS,
  useProfileDraft,
} from "@/components/onboarding/profile-context";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StepProgress } from "@/components/ui/step-progress";

/**
 * Story 1.1 — paso 1 de 3 del perfil.
 * Artboard: docs/design/epic-1-onboarding/ProfileBasic.dc.html
 */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function ProfileBasicsPage() {
  const router = useRouter();
  const { draft, update } = useProfileDraft();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const fileInput = React.useRef<HTMLInputElement>(null);

  function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((prev) => ({ ...prev, photo: "That file is over 5MB." }));
      return;
    }
    setErrors((prev) => ({ ...prev, photo: "" }));
    update({ photoName: file.name, photoFile: file });
    const reader = new FileReader();
    reader.onload = () => update({ photoPreview: reader.result as string });
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!draft.fullName.trim()) found.fullName = "Enter your full name.";
    if (!draft.phone.trim()) found.phone = "Enter your phone number.";
    setErrors(found);

    if (Object.keys(found).length === 0) {
      router.push("/onboarding/personal");
    }
  }

  return (
    <AuthSplit
      tagline="Tell us who you are."
      cardWidth={460}
    >
      <StepProgress current={1} total={3} label="Basics" />

      <h1 className="mb-2 text-[27px] text-fg">A bit about you</h1>
      <p className="m-0 mb-[26px] text-sm leading-normal text-fg-muted">
        Basic information for your member profile.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-[26px] flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label="Upload profile photo"
            className="flex h-[72px] w-[72px] min-w-[72px] cursor-pointer items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-line text-fg-subtle transition-colors duration-150 hover:border-accent hover:text-accent-strong"
          >
            {draft.photoPreview ? (
              /* eslint-disable-next-line @next/next/no-img-element -- vista previa local (data URL), no un <Image> con loader remoto */
              <img src={draft.photoPreview} alt="Profile photo preview" className="size-full object-cover" />
            ) : (
              <Camera size={26} strokeWidth={1.6} />
            )}
          </button>
          <div>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="cursor-pointer text-[13px] font-bold text-accent-strong hover:text-fg"
            >
              {draft.photoName ? "Change profile photo" : "Upload profile photo"}
            </button>
            <p className="m-0 mt-1 text-xs text-fg-subtle">
              {errors.photo ? (
                <span role="alert" className="text-accent-strong">{errors.photo}</span>
              ) : (
                draft.photoName ?? "JPG or PNG, 5MB max"
              )}
            </p>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Upload profile photo"
            className="hidden"
            onChange={handlePhoto}
          />
        </div>

        <Field
          label="Full name"
          required
          htmlFor="full-name"
          error={errors.fullName}
        >
          <Input
            id="full-name"
            autoComplete="name"
            placeholder="Alexandra Rivas"
            value={draft.fullName}
            onChange={(e) => update({ fullName: e.target.value })}
            aria-invalid={Boolean(errors.fullName)}
            icon={<User size={18} strokeWidth={1.6} />}
          />
        </Field>

        <Field
          label="Phone number"
          required
          htmlFor="phone"
          error={errors.phone}
        >
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+1 (555) 000-0000"
            value={draft.phone}
            onChange={(e) => update({ phone: e.target.value })}
            aria-invalid={Boolean(errors.phone)}
            icon={<Phone size={18} strokeWidth={1.6} />}
          />
        </Field>

        <Field label="Date of birth (day / month)" className="mb-[30px]">
          <div className="flex gap-3">
            <Select
              aria-label="Day of birth"
              value={draft.birthDay}
              onChange={(e) => update({ birthDay: e.target.value })}
            >
              <option value="">Day</option>
              {BIRTH_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Month of birth"
              value={draft.birthMonth}
              onChange={(e) => update({ birthMonth: e.target.value })}
            >
              <option value="">Month</option>
              {BIRTH_MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </Select>
          </div>
        </Field>

        <Button type="submit" block>
          Continue
        </Button>
      </form>
    </AuthSplit>
  );
}
