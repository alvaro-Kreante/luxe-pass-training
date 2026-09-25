"use client";

import * as React from "react";
import { CheckCircle2, ChevronRight, CreditCard, Info, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { StatusChip } from "@/components/ui/status-chip";
import { createClient } from "@/lib/supabase/client";
import { getTicketCounts, searchMembers, type AdminMember, type TicketCounts } from "@/lib/admin";
import { cn } from "@/lib/utils";

/**
 * Story 8.1 — "Member search by email, phone, or name". Artboard:
 * docs/design/epic-8-admin-support/MemberSearch.dc.html.
 *
 * Backend real (22 sept 2026): `admin_search_members`
 * (`supabase/schemas/support_tickets.sql`) — busca por subcadena de
 * nombre/email, últimos 4+ dígitos de teléfono, o "LP-######" directo a la
 * reserva. Reglas más simples que el mock (que tokenizaba por palabra), ver
 * desviación en `docs/design/COMPONENT-MAP.md`.
 *
 * Las tres sugerencias de "Not the person you are looking for?" no llevan a
 * ningún sitio propio: las tres capacidades que describen ya las cubre el
 * mismo cuadro de búsqueda de arriba — quedan como leyenda, no como botones.
 *
 * Sin consulta se listan todos los miembros (desviación del artboard, que
 * solo muestra resultados tras buscar — pedido explícito, 25 sept 2026).
 *
 * `useSearchParams` obliga a un límite de Suspense para poder prerenderizar
 * (ver la misma nota en `/explore`).
 */
export default function MemberSearchPage() {
  return (
    <RequireAdminSession>
      <React.Suspense>
        <MemberSearchScreen />
      </React.Suspense>
    </RequireAdminSession>
  );
}

function MemberSearchScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = React.useMemo(() => createClient(), []);
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");
  const [results, setResults] = React.useState<AdminMember[]>([]);
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);
  const hasQuery = query.trim().length > 0;

  React.useEffect(() => {
    let active = true;
    getTicketCounts(supabase).then((row) => {
      if (active) setCounts(row);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  React.useEffect(() => {
    let active = true;
    searchMembers(supabase, query).then((rows) => {
      if (active) setResults(rows);
    });
    return () => {
      active = false;
    };
  }, [supabase, query]);

  return (
    <AdminShell
      topbarLabel={<span className="text-[13.5px] font-bold text-fg">Members</span>}
      topbarMeta="· Search"
      supportBadge={counts?.open}
    >
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Find a member</p>
      <h1 className="mt-2 font-display text-[34px] text-fg">Find a member</h1>

      <label className="mt-4 flex h-16 items-center gap-3.5 rounded-2xl border-[1.5px] border-accent bg-panel-black px-5 shadow-ring">
        <Search size={22} strokeWidth={1.8} className="text-accent" aria-hidden />
        <input
          type="search"
          role="searchbox"
          aria-label="Name, email, phone or LP number"
          placeholder="Name, email, phone or LP number"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-transparent text-lg font-bold text-fg placeholder:text-fg-subtle focus:outline-none"
        />
        <span className="h-6.5 w-px shrink-0 bg-line" />
        <span className="shrink-0 text-[12.5px] text-fg-subtle">Name, email, phone or LP number</span>
      </label>

      {hasQuery ? (
        <div className="mt-3.5 flex items-center gap-2.5">
          <StatusChip available outlined>
            {results.length} {results.length === 1 ? "match" : "matches"}
          </StatusChip>
          <span className="text-[12.5px] font-bold text-fg-muted">Matched on name, email, phone or LP#</span>
        </div>
      ) : null}

      <div className="mt-4.5 flex min-h-0 gap-4">
        <div className="min-w-0 flex-1">
          {results.length > 0 ? (
            <MemberResultsTable results={results} onOpen={(id) => router.push(`/admin/members/${id}`)} />
          ) : null}

          {hasQuery ? (
            <p className="mt-3.5 flex items-start gap-2.5 text-xs text-fg-subtle">
              <Info size={15} strokeWidth={1.8} className="mt-px shrink-0" aria-hidden />
              Opening a member record is itself a logged event. Names, emails and phone numbers are visible to
              support roles only, and never leave this console except through an export you have to justify.
            </p>
          ) : null}

          <div className="mt-4 rounded-content border border-line bg-dark-card px-5.5 py-4.5">
            <p className="m-0 text-[13px] font-bold text-fg">Not the person you are looking for?</p>
            <div className="mt-3.5 flex gap-2.5">
              <NoMatchHint icon={CreditCard}>Search by booking reference</NoMatchHint>
              <NoMatchHint icon={CreditCard}>Search Stripe by charge ID</NoMatchHint>
              <NoMatchHint icon={Info}>Accounts closed in the last 30 days</NoMatchHint>
            </div>
          </div>
        </div>

        <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">How search matches</p>
            <div className="mt-3.5 flex flex-col gap-3">
              <MatchHint>
                Any part of a name or email matches — <b>duforest</b> finds Duforest-Marin too.
              </MatchHint>
              <MatchHint>The last four digits of a phone number are enough — formatting is ignored.</MatchHint>
              <MatchHint>
                A booking reference like <b>LP-840388</b> goes straight to that member.
              </MatchHint>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function MemberResultsTable({
  results,
  onOpen,
}: {
  results: AdminMember[];
  onOpen: (id: string) => void;
}) {
  const GRID = "grid-cols-[2fr_1.1fr_0.9fr_1fr_0.9fr_24px]";

  return (
    <div className="overflow-hidden rounded-content border border-line bg-dark-card">
      <div className={cn("grid items-center gap-3.5 border-b border-line px-5.5", GRID)} style={{ height: 42 }}>
        <Th>Member</Th>
        <Th>Phone</Th>
        <Th>Membership</Th>
        <Th>Status</Th>
        <Th>Last visit</Th>
        <span />
      </div>

      {results.map((member) => (
        <button
          key={member.id}
          type="button"
          aria-label={`Open ${member.name}`}
          onClick={() => onOpen(member.id)}
          className={cn(
            "grid w-full items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-surface-hover",
            GRID,
          )}
          style={{ minHeight: 62 }}
        >
          <span className="flex min-w-0 items-center gap-3">
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage, efímera
              <img src={member.photoUrl} alt={member.name} className="size-9 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[13px] font-bold text-on-accent">
                {member.initials}
              </span>
            )}
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate text-sm font-bold text-fg">{member.name}</span>
                {member.openCasesCount > 0 ? (
                  <StatusChip size="sm" outlined>
                    {member.openCasesCount} open {member.openCasesCount === 1 ? "case" : "cases"}
                  </StatusChip>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-xs text-fg-subtle">
                {member.email} · {member.memberSinceLabel}
              </span>
            </span>
          </span>

          <span className="text-[12.5px] text-fg-muted">{member.phone}</span>
          <span className="text-[12.5px] font-bold text-fg">{member.membershipLabel}</span>
          <span>
            {member.status === "active" ? (
              <StatusChip available outlined>
                Active
              </StatusChip>
            ) : (
              <StatusChip available={false}>{member.status === "deleted" ? "Deleted" : "Inactive"}</StatusChip>
            )}
          </span>
          <span>
            <span className="block text-[12.5px] font-bold text-fg">{member.lastVisitLabel}</span>
            <span className="block text-[11px] text-fg-subtle">{member.lastVisitNote}</span>
          </span>
          <ChevronRight size={17} strokeWidth={1.8} className="justify-self-end text-accent" aria-hidden />
        </button>
      ))}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{children}</p>;
}

function MatchHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <CheckCircle2 size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-accent" aria-hidden />
      <p className="m-0 text-[12.5px] text-fg-muted">{children}</p>
    </div>
  );
}

function NoMatchHint({ icon: Icon, children }: { icon: typeof Info; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[11px] border-[1.5px] border-line px-4 py-2.5">
      <Icon size={16} strokeWidth={1.8} className="shrink-0 text-accent" aria-hidden />
      <span className="text-[12.5px] font-bold text-fg-muted">{children}</span>
    </div>
  );
}
