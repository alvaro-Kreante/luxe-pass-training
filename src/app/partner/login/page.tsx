"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";

import { PartnerAuthSplit } from "@/components/patterns/partner-auth-split";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { hasDashboardAccess, loadPartnerContext } from "@/lib/partner-lounges";
import { createClient } from "@/lib/supabase/client";

const INVALID_CREDENTIALS_MESSAGE =
  "We could not find a partner account with that email and password.";
// Story 10.1 — su partner, o su propia cuenta, está suspendido.
const SUSPENDED_MESSAGE = "Your access to the Partner Dashboard is suspended. Contact En Soleil if you think this is a mistake.";

/**
 * Flow: flow-partner-experience.md — "Partner Login". Sin historia ni
 * criterios propios: DESIGN-SYSTEM.md §6 Fase 2 lo cubre como "acceso de
 * partner con cuenta emitida por En Soleil y la separación explícita
 * respecto al login de miembro". Artboard: Login.dc.html.
 *
 * A diferencia del patrón 1 (split-screen de autenticación), aquí las dos
 * mitades son oscuras — `PartnerAuthSplit`, compartido con /partner/welcome.
 *
 * Backend real (22 sept 2026, ver CLAUDE.md §Alcance y
 * docs/DATA-MODEL-MAP.md): Supabase Auth real + tabla `user_roles`
 * (`has_role('partner')`, `supabase/schemas/user_roles.sql`) — una cuenta de
 * miembro con contraseña correcta pero sin ese rol se rechaza igual que una
 * contraseña equivocada, y cierra la sesión que `signInWithPassword` acaba
 * de abrir para no dejarla a medias.
 */
export default function PartnerLoginPage() {
  // `useSearchParams` obliga a un límite de Suspense para prerenderizar.
  return (
    <React.Suspense>
      <PartnerLoginScreen />
    </React.Suspense>
  );
}

function PartnerLoginScreen() {
  const router = useRouter();
  const suspendedOnArrival = useSearchParams().has("suspended");
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberDevice, setRememberDevice] = React.useState(false);
  const [error, setError] = React.useState(suspendedOnArrival ? SUSPENDED_MESSAGE : "");
  const [submitting, setSubmitting] = React.useState(false);

  /** Story 10.1 — el guard de servidor (PERF-02) no puede cerrar la sesión al
   * redirigir a un partner suspendido: se cierra aquí, al llegar. */
  React.useEffect(() => {
    if (suspendedOnArrival) supabase.auth.signOut();
  }, [suspendedOnArrival, supabase]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(INVALID_CREDENTIALS_MESSAGE);
        return;
      }

      const { data: isPartner } = await supabase.rpc("has_role", { p_role: "partner" });
      if (!isPartner) {
        await supabase.auth.signOut();
        setError(INVALID_CREDENTIALS_MESSAGE);
        return;
      }

      if (!hasDashboardAccess(await loadPartnerContext(supabase))) {
        await supabase.auth.signOut();
        setError(SUSPENDED_MESSAGE);
        return;
      }

      router.push("/partner");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PartnerAuthSplit
      headline="Every arrival, prepared for."
      body="The day's guest list, who has walked in, and what the month looked like — the house side of the pass your members carry."
      footer="The Ainsworth · a LuxePass partner lounge since 2024"
    >
      <div className="w-full max-w-[460px] rounded-panel border border-line bg-dark-card p-11 shadow-panel">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
          Partner access
        </p>
        <h2 className="mb-2 mt-3 text-[30px] text-fg">Sign in</h2>
        <p className="m-0 mb-7 text-[13.5px] leading-[1.6] text-fg-subtle">
          Use the work address En Soleil issued for your venue.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <Field label="Work email" htmlFor="partner-email" className="mb-4.5">
            <Input
              id="partner-email"
              type="email"
              autoComplete="email"
              inputSize="compact"
              placeholder="you@yourvenue.example"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              icon={<Mail size={18} strokeWidth={1.8} />}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="partner-password"
            className="mb-1"
            error={error}
          >
            <Input
              id="partner-password"
              type="password"
              autoComplete="current-password"
              inputSize="compact"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(error)}
              icon={<Lock size={18} strokeWidth={1.7} />}
            />
          </Field>

          <div className="mb-6.5 mt-4 flex items-center justify-between">
            <Checkbox align="center" checked={rememberDevice} onCheckedChange={setRememberDevice}>
              Remember this device
            </Checkbox>
            <span className="cursor-pointer text-[13px] font-bold text-accent-strong">
              Forgot password
            </span>
          </div>

          <Button type="submit" block disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="my-7 h-px bg-line" />

        <p className="m-0 text-xs leading-[1.65] text-fg-subtle">
          Members sign in at <span className="text-accent-strong">app.luxepass.co</span>.
          Partner accounts are issued by En Soleil — ask your account manager to add a
          colleague to this venue.
        </p>
      </div>
    </PartnerAuthSplit>
  );
}
