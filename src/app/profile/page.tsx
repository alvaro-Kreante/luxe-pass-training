"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Check } from "lucide-react";

import { RequireSession } from "@/components/onboarding/require-session";
import { AccountShell } from "@/components/patterns/account-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RemovableChip, AddChip } from "@/components/ui/chip";
import { ReferralCode } from "@/components/ui/referral-code";
import {
  fetchMembership,
  fetchVisitsThisMonth,
  formatLongDate,
  formatMonthYear,
  type MemberMembership,
} from "@/lib/membership";
import { fetchProfile, updateProfile, type ProfileDraft } from "@/lib/profile";
import { resolveProfilePhotoUrl, uploadProfilePhoto } from "@/lib/profile-photo";
import { ensureReferralCode } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/client";

const EMPTY_DRAFT: ProfileDraft = {
  fullName: "",
  email: "",
  emailVerified: false,
  phone: "",
  phoneVerified: false,
  dateOfBirth: "",
  city: "",
  industry: "",
  jobTitle: "",
  company: "",
  travelCities: [],
  photoUrl: null,
};

/**
 * Story 6.3 — "Edit profile all fields input before" y "Referral code
 * sharing functionality". `Profile.dc.html`, backend real.
 */
export default function ProfilePage() {
  return (
    <RequireSession>
      <ProfileScreen />
    </RequireSession>
  );
}

function ProfileScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [draft, setDraft] = React.useState<ProfileDraft>(EMPTY_DRAFT);
  const [membership, setMembership] = React.useState<MemberMembership | null>(null);
  const [visits, setVisits] = React.useState<{ used: number; included: number } | null>(null);
  const [referralCode, setReferralCode] = React.useState("");
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [savedPhotoSrc, setSavedPhotoSrc] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let active = true;

    Promise.all([
      fetchProfile(supabase),
      fetchMembership(supabase),
      fetchVisitsThisMonth(supabase),
      ensureReferralCode(supabase),
    ]).then(([profile, nextMembership, nextVisits, code]) => {
      if (!active) return;
      setDraft(profile);
      setMembership(nextMembership);
      setVisits(nextVisits);
      setReferralCode(code);
      resolveProfilePhotoUrl(supabase, profile.photoUrl).then((src) => {
        if (active) setSavedPhotoSrc(src);
      });
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  function set<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        photoUrl = await uploadProfilePhoto(supabase, photoFile).catch(() => undefined);
      }

      await updateProfile(supabase, { ...draft, photoUrl });
      if (photoUrl) set("photoUrl", photoUrl);
      setPhotoFile(null);
    } finally {
      setSaving(false);
    }
  }

  const avatarSrc = photoPreview ?? savedPhotoSrc;
  const isActive = membership?.status === "active";
  const memberSince = membership?.startedAt ? formatMonthYear(membership.startedAt) : null;

  return (
    <AccountShell
      active="profile"
      breadcrumb="Profile details"
      actionAfterBell
      topbarRight={
        <Button size="md" onClick={handleSave} disabled={saving}>
          Save changes
        </Button>
      }
    >
      <div className="flex gap-7">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[34px] text-fg">Profile details</h1>
          <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
            Everything you told us when you joined. Change any of it here.
          </p>

          <div className="mt-5.5 flex items-center gap-4">
            <span className="flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-display text-[26px] font-bold text-on-accent">
              {avatarSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL firmada del bucket privado, no un <Image> con loader remoto */
                <img src={avatarSrc} alt={draft.fullName} className="size-full object-cover" />
              ) : (
                initialsOf(draft.fullName)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[15px] font-bold text-fg">{draft.fullName}</p>
              {memberSince ? <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">Member since {memberSince}</p> : null}
            </div>
            <Button variant="secondary" size="md" type="button" onClick={() => fileInputRef.current?.click()}>
              <Camera size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
              Upload photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="Upload photo"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          <div className="mt-5.5 grid grid-cols-2 gap-x-4.5 gap-y-1">
            <Field label="Full name" htmlFor="full-name">
              <Input id="full-name" value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} />
            </Field>
            <Field label="Email address" htmlFor="email" labelExtra={draft.emailVerified ? <VerifiedBadge /> : undefined}>
              <Input id="email" type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone number" htmlFor="phone" labelExtra={draft.phoneVerified ? <VerifiedBadge /> : undefined}>
              <Input id="phone" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Date of birth" htmlFor="dob">
              <Input id="dob" value={draft.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </Field>
            <Field label="City of residence" htmlFor="city">
              <Input id="city" value={draft.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Industry" htmlFor="industry">
              <Input id="industry" value={draft.industry} onChange={(e) => set("industry", e.target.value)} />
            </Field>
            <Field label="Job title" htmlFor="job-title">
              <Input id="job-title" value={draft.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
            </Field>
            <Field label="Company" htmlFor="company">
              <Input id="company" value={draft.company} onChange={(e) => set("company", e.target.value)} />
            </Field>
          </div>

          <Field label="Cities you travel to most">
            <div className="flex flex-wrap gap-2">
              {draft.travelCities.map((city) => (
                <RemovableChip
                  key={city}
                  label={city}
                  onRemove={() => set("travelCities", draft.travelCities.filter((c) => c !== city))}
                />
              ))}
              <AddChip type="button">Add a city</AddChip>
            </div>
          </Field>

          <p className="m-0 mt-2 text-[11.5px] leading-[1.55] text-fg-subtle">
            Your date of birth is only used for the birthday month promotion — we never show your age to
            anyone.
          </p>
        </div>

        <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-surface p-5 shadow-content">
            <div className="flex items-center justify-between">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Membership</p>
              {membership ? (
                <span
                  className={
                    isActive
                      ? "inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-[11.5px] font-bold text-fg"
                      : "inline-flex items-center gap-1.5 rounded-pill bg-blush-1 px-3 py-1 text-[11.5px] font-bold text-fg-muted"
                  }
                >
                  <span aria-hidden className={isActive ? "size-1.5 rounded-full bg-accent" : "size-1.5 rounded-full bg-fg-subtle"} />
                  {isActive ? "Active" : "Inactive"}
                </span>
              ) : null}
            </div>
            {membership ? (
              <>
                <h2 className="mt-2.5 font-display text-[27px] text-fg">
                  {!isActive ? "No active plan" : membership.plan === "annual" ? "Annual" : "Monthly"}
                </h2>
                {isActive ? (
                  <>
                    <div className="my-4 h-px bg-line" />
                    <div className="flex flex-col gap-2.5">
                      {memberSince ? <SummaryRow label="Member since" value={memberSince} /> : null}
                      <SummaryRow
                        label={membership.plan === "annual" ? "Renews" : "Next charge"}
                        value={membership.currentPeriodEnd ? formatLongDate(membership.currentPeriodEnd) : "—"}
                      />
                      {visits ? (
                        <SummaryRow label="Visits this month" value={`${visits.used} of ${visits.included}`} />
                      ) : null}
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
            <Button
              variant="secondary"
              size="md"
              block
              className="mt-4.5"
              type="button"
              onClick={() => router.push("/profile/membership")}
            >
              Manage membership
            </Button>
          </div>

          <div className="rounded-content border border-line bg-surface p-5 shadow-content">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Refer a friend</p>
            <p className="m-0 mt-2 text-[12.5px] leading-[1.55] text-fg-muted">
              Share your code. You each get a complimentary day pass when they join.
            </p>
            <ReferralCode code={referralCode} className="mt-3.5" />
            <Button block className="mt-3" type="button" onClick={() => router.push("/profile/membership/referrals")}>
              Share your code
            </Button>
          </div>
        </div>
      </div>
    </AccountShell>
  );
}

function initialsOf(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "—"
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2.5 py-1 text-[10.5px] font-bold text-fg">
      <Check size={11} strokeWidth={2.6} aria-hidden />
      Verified
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px] text-fg-muted">{label}</span>
      <span className="text-[12.5px] font-bold text-fg">{value}</span>
    </div>
  );
}
