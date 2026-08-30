"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, ChevronLeft } from "lucide-react";

import { AuthSplit } from "@/components/patterns/auth-split";
import {
  INDUSTRIES,
  useProfileDraft,
} from "@/components/onboarding/profile-context";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StepProgress } from "@/components/ui/step-progress";

/**
 * Story 1.1 — paso 3 de 3 del perfil.
 * Artboard: docs/design/epic-1-onboarding/ProfileProfessional.dc.html
 */
export default function ProfileProfessionalPage() {
  const router = useRouter();
  const { draft, update } = useProfileDraft();
  const [error, setError] = React.useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.industry) {
      setError("Select your industry.");
      return;
    }
    setError("");
    router.push("/welcome");
  }

  return (
    <AuthSplit
      tagline="Join a community of discerning travelers."
      cardWidth={460}
    >
      <StepProgress current={3} total={3} label="Professional" />

      <h1 className="mb-2 text-[27px] text-fg">Professional details</h1>
      <p className="m-0 mb-[26px] text-sm leading-normal text-fg-muted">
        Mostly optional — it helps us curate better recommendations for you.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <Field label="Job title" optional htmlFor="job-title">
          <Input
            id="job-title"
            autoComplete="organization-title"
            placeholder="Director of Operations"
            value={draft.jobTitle}
            onChange={(e) => update({ jobTitle: e.target.value })}
            icon={<Briefcase size={18} strokeWidth={1.6} />}
          />
        </Field>

        <Field
          label="Industry"
          required
          htmlFor="industry"
          hint={error ? <span className="text-accent-strong">{error}</span> : null}
        >
          <Select
            id="industry"
            value={draft.industry}
            onChange={(e) => update({ industry: e.target.value })}
            aria-invalid={Boolean(error)}
            icon={<Building2 size={18} strokeWidth={1.6} />}
          >
            <option value="">Select an industry</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Company"
          optional
          htmlFor="company"
          className="mb-[30px]"
        >
          <Input
            id="company"
            autoComplete="organization"
            placeholder="Company name"
            value={draft.company}
            onChange={(e) => update({ company: e.target.value })}
            icon={<Building2 size={18} strokeWidth={1.6} />}
          />
        </Field>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="square"
            aria-label="Back to personal details"
            onClick={() => router.push("/onboarding/personal")}
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
          </Button>
          <Button type="submit" className="flex-1">
            Complete profile
          </Button>
        </div>
      </form>
    </AuthSplit>
  );
}
