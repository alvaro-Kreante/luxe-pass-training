"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const INVALID_CREDENTIALS_MESSAGE =
  "We could not find an admin account with that email and password.";

/**
 * Epic 8 — sin artboard propio: la Fase 8 del design system fija el App
 * shell del admin (patrón 21) pero nunca dibujó una pantalla de login (el
 * nodo "Admin login" del flow no llegó a tener su `.dc.html`) — desviación
 * consciente, confirmada con el usuario el 22 sept 2026: reutiliza el mismo
 * layout/componentes que `/partner/login` (Story de Epic 7), solo con el
 * copy cambiado a "Admin access". Ver docs/design/COMPONENT-MAP.md.
 *
 * Backend real: Supabase Auth real + `has_role('admin')`
 * (`supabase/schemas/user_roles.sql`) — mismo criterio que
 * `/partner/login`: una cuenta con contraseña correcta pero sin ese rol se
 * rechaza igual que una contraseña equivocada, cerrando la sesión que
 * `signInWithPassword` acaba de abrir.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberDevice, setRememberDevice] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

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

      const { data: isAdmin } = await supabase.rpc("has_role", { p_role: "admin" });
      if (!isAdmin) {
        await supabase.auth.signOut();
        setError(INVALID_CREDENTIALS_MESSAGE);
        return;
      }

      router.push("/admin/support");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div data-theme="dark" className="flex min-h-screen flex-col lg:flex-row">
      <aside className="relative flex shrink-0 flex-col justify-between overflow-hidden bg-panel-black px-8 py-10 text-center lg:h-screen lg:w-[600px] lg:items-start lg:px-[60px] lg:py-16 lg:text-left">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 26% 12%, #2c241c, #15110d 64%)" }}
        />
        <div aria-hidden className="dot-pattern absolute inset-0" />

        <Image src="/logo.png" alt="En Soleil" width={170} height={179} priority className="relative z-10 mx-auto w-[104px] lg:mx-0 lg:w-[170px]" />

        <div className="relative z-10 mx-auto max-w-[420px] lg:mx-0">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
            En Soleil · LuxePass
          </p>
          <h1 className="mt-4 text-[30px] leading-[1.2] text-fg lg:text-[38px]">
            Every case, every reversal, every review.
          </h1>
          <p className="mt-4.5 text-[14.5px] leading-[1.65] text-fg-muted">
            Support, analytics and content — the console behind the pass every member carries.
          </p>
        </div>

        <p className="relative z-10 mx-auto text-xs text-fg-subtle lg:mx-0">
          En Soleil · admin console
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center bg-panel-black p-6 lg:h-screen lg:p-10">
        <div className="w-full max-w-[460px] rounded-panel border border-line bg-dark-card p-11 shadow-panel">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            Admin access
          </p>
          <h2 className="mb-2 mt-3 text-[30px] text-fg">Sign in</h2>
          <p className="m-0 mb-7 text-[13.5px] leading-[1.6] text-fg-subtle">
            Use the work address En Soleil issued for support and operations.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <Field label="Work email" htmlFor="admin-email" className="mb-4.5">
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                inputSize="compact"
                placeholder="you@ensoleil.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                icon={<Mail size={18} strokeWidth={1.8} />}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="admin-password"
              className="mb-1"
              error={error}
            >
              <Input
                id="admin-password"
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
            Members sign in at <span className="text-accent-strong">app.luxepass.co</span>. Admin
            accounts are issued by En Soleil IT — ask your lead to add a colleague to this console.
          </p>
        </div>
      </div>
    </div>
  );
}
