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
  MEMBERSHIP_SUMMARY,
  fetchMembershipStatus,
  fetchProfile,
  referralCodeFor,
  updateProfile,
  type MembershipStatus,
  type ProfileDraft,
} from "@/lib/profile";
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
  const [memberId, setMemberId] = React.useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = React.useState<MembershipStatus>("active");
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let active = true;

    Promise.all([
      supabase.auth.getUser(),
      fetchProfile(supabase),
      fetchMembershipStatus(supabase),
    ]).then(([{ data: { user } }, profile, status]) => {
      if (!active) return;
      if (user) setMemberId(user.id);
      setDraft(profile);
      setMembershipStatus(status);
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
      let photoUrl: string | null | undefined;
      if (photoFile && memberId) {
        const extension = photoFile.name.split(".").pop() ?? "jpg";
        const path = `${memberId}/avatar.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(path, photoFile, { upsert: true });
        if (!uploadError) {
          photoUrl = supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
        }
      }

      await updateProfile(supabase, { ...draft, photoUrl });
      if (photoUrl) set("photoUrl", photoUrl);
      setPhotoFile(null);
    } finally {
      setSaving(false);
    }
  }

  const avatarSrc = photoPreview ?? draft.photoUrl;
  const referralCode = memberId ? referralCodeFor(draft.fullName, memberId) : "";

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
                /* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL pública del bucket, no un <Image> con loader remoto */
                <img src={avatarSrc} alt={draft.fullName} className="size-full object-cover" />
              ) : (
                initialsOf(draft.fullName)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[15px] font-bold text-fg">{draft.fullName}</p>
              <p className="m-0 mt-1 text-[12.5px] text-fg-subtle">Member since {MEMBERSHIP_SUMMARY.memberSince}</p>
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
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-[11.5px] font-bold text-fg">
                <span aria-hidden className="size-1.5 rounded-full bg-accent" />
                {membershipStatus === "active" ? "Active" : "Inactive"}
              </span>
            </div>
            <h2 className="mt-2.5 font-display text-[27px] text-fg">{MEMBERSHIP_SUMMARY.plan}</h2>
            <div className="my-4 h-px bg-line" />
            <div className="flex flex-col gap-2.5">
              <SummaryRow label="Member since" value={MEMBERSHIP_SUMMARY.memberSince} />
              <SummaryRow label="Renews" value={MEMBERSHIP_SUMMARY.renews} />
              <SummaryRow
                label="Visits this month"
                value={`${MEMBERSHIP_SUMMARY.visitsThisMonth.used} of ${MEMBERSHIP_SUMMARY.visitsThisMonth.included}`}
              />
            </div>
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
            <Button block className="mt-3" type="button">
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
