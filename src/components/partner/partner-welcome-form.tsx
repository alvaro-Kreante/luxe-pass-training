"use client";

import * as React from "react";
import { Check, Eye, EyeOff, House, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { passwordRules, type PartnerInviteCompletion, type PartnerWelcome } from "@/lib/partner-invite";

import { PartnerPhotoPicker } from "./partner-photo-picker";

/**
 * Epic 7 · SetPassword.dc.html — lo que escribió el admin, editable salvo el
 * email, más la foto y la contraseña. La validación de aquí solo pinta el
 * estado; Supabase Auth y el trigger de `partners` son los que mandan.
 */
export function PartnerWelcomeForm({
  welcome,
  onSubmit,
}: {
  welcome: PartnerWelcome;
  onSubmit: (input: PartnerInviteCompletion) => Promise<void>;
}) {
  const [firstName, setFirstName] = React.useState(welcome.firstName);
  const [lastName, setLastName] = React.useState(welcome.lastName);
  const [mobile, setMobile] = React.useState(welcome.mobile);
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [password, setPassword] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const rules = passwordRules(password, confirmation);
  const ready = rules.length && rules.number && rules.match && firstName.trim() !== "" && lastName.trim() !== "";
  const initials = `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase();
  const lounge = welcome.lounges[0];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ firstName, lastName, mobile, password, photo });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  const eye = (
    <button
      type="button"
      onClick={() => setShowPassword((shown) => !shown)}
      aria-label={showPassword ? "Hide passwords" : "Show passwords"}
      className="flex cursor-pointer text-fg-subtle"
    >
      {showPassword ? <EyeOff size={18} strokeWidth={1.7} /> : <Eye size={18} strokeWidth={1.7} />}
    </button>
  );

  return (
    <div className="w-full max-w-[580px] rounded-panel border border-line bg-dark-card px-6 py-9 shadow-panel sm:px-10">
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Partner invitation</p>
      <h2 className="mb-2 mt-3 text-[30px] text-fg">Create your password</h2>
      <p className="m-0 text-[13.5px] leading-[1.6] text-fg-subtle">
        Check the details En Soleil entered for you, add a photo your team will recognise, and choose a password.
      </p>

      {lounge ? (
        <div className="mt-5 flex items-center gap-3.5 rounded-[14px] border border-accent-strong bg-accent/8 px-4 py-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[11px] border border-line bg-panel-black text-accent">
            <House size={19} strokeWidth={1.7} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">You&apos;re joining</p>
            <p className="m-0 mt-0.5 font-display text-[19px] text-fg">{lounge.name}</p>
          </div>
          <span className="hidden text-xs text-fg-subtle sm:inline">{lounge.address}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5">
          <PartnerPhotoPicker
            initials={initials}
            currentUrl={welcome.photoUrl}
            file={photo}
            onChange={setPhoto}
            disabled={submitting}
          />
        </div>

        <div className="my-5 h-px bg-line" />

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="First name" htmlFor="partner-first-name">
            <Input id="partner-first-name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={submitting} />
          </Field>
          <Field label="Last name" htmlFor="partner-last-name">
            <Input id="partner-last-name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={submitting} />
          </Field>
          <Field label="Work email" htmlFor="partner-email">
            <Input
              id="partner-email"
              type="email"
              value={welcome.email}
              readOnly
              className="cursor-default border-dashed bg-transparent text-fg-subtle focus:border-line focus:shadow-none"
              trailing={<Lock size={16} strokeWidth={1.7} />}
            />
          </Field>
          <Field label="Mobile" htmlFor="partner-mobile">
            <Input id="partner-mobile" type="tel" autoComplete="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={submitting} />
          </Field>
          <Field label="Password" htmlFor="partner-password">
            <Input
              id="partner-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              trailing={eye}
            />
          </Field>
          <Field label="Confirm password" htmlFor="partner-password-confirm">
            <Input
              id="partner-password-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={submitting}
            />
          </Field>
        </div>

        <ul className="m-0 mb-5.5 mt-3 flex list-none flex-wrap gap-x-4.5 gap-y-2 p-0">
          <Rule met={rules.length}>At least 8 characters</Rule>
          <Rule met={rules.number}>A number</Rule>
          <Rule met={rules.match}>Both passwords match</Rule>
        </ul>

        {error ? (
          <p role="alert" className="m-0 mb-4 text-[13px] text-accent-strong">
            {error}
          </p>
        ) : null}

        <Button type="submit" block disabled={!ready || submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="m-0 mt-4 text-xs leading-[1.6] text-fg-subtle">
        The email is the one En Soleil issued for your venue and can&apos;t be changed here. Wrong address? Ask your
        account manager.
      </p>
    </div>
  );
}

function Rule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full transition-colors duration-150",
          met ? "bg-accent text-white" : "border border-line text-transparent",
        )}
      >
        <Check size={9} strokeWidth={3.2} />
      </span>
      {children}
    </li>
  );
}
