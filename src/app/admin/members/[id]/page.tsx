"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Mail, PencilLine, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { BookingOverrideDrawer } from "@/components/admin/booking-override-drawer";
import { MetricTile } from "@/components/ui/metric-tile";
import { StatusChip } from "@/components/ui/status-chip";
import { downloadTextFile } from "@/lib/download";
import { ADMIN_CASE_COUNTS, getMemberProfile, type BookingHistoryStatus } from "@/lib/admin";
import { cn } from "@/lib/utils";

/**
 * Story 8.1 — "Complete booking history view", "Payment transaction
 * details", "Account status and membership level" y "Booking modification
 * capabilities" (el drawer `BookingOverrideDrawer`). Artboard:
 * docs/design/epic-8-admin-support/MemberProfile.dc.html.
 * DESIGN-SYSTEM.md §5 patrón 22 — Ficha de miembro (360).
 */
const HISTORY_GRID = "grid-cols-[104px_1fr_122px_132px_128px_30px]";

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [overrideOpen, setOverrideOpen] = React.useState(false);

  const profile = getMemberProfile(id);
  if (!profile) notFound();

  function exportHistory() {
    const header = "Date,Lounge,Reference,Status,Charged";
    const rows = profile!.bookingHistory.map((row) =>
      [row.dateLabel, row.lounge, row.reference, row.status, row.charged].join(","),
    );
    downloadTextFile(`${profile!.id}-booking-history.csv`, [header, ...rows].join("\n"));
  }

  return (
    <AdminShell
      topbarLabel={
        <>
          <Link href="/admin/members" className="text-[13.5px] font-bold text-fg-subtle transition-colors duration-150 hover:text-accent">
            Members
          </Link>
          <span className="text-[13.5px] text-fg-subtle">›</span>
          <span className="text-[13.5px] font-bold text-fg">{profile.name}</span>
        </>
      }
      supportBadge={ADMIN_CASE_COUNTS.open}
      blurred={overrideOpen}
    >
      <div className="flex items-center gap-4.5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xl font-bold text-on-accent">
          {profile.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="m-0 font-display text-[30px] text-fg">{profile.name}</h1>
            {profile.status === "active" ? (
              <StatusChip available outlined>
                {profile.membershipLabel} · Active
              </StatusChip>
            ) : (
              <StatusChip available={false}>No membership</StatusChip>
            )}
          </div>
          <p className="mt-1.5 text-[13px] text-fg-subtle">
            {profile.email} · {profile.phone} · {profile.memberSinceLabel}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <QuickAction icon={Mail}>Email member</QuickAction>
          {profile.upcomingBooking ? (
            <button
              type="button"
              onClick={() => setOverrideOpen(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line px-4 transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
            >
              <PencilLine size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
              <span className="text-[12.5px] font-bold tracking-[0.06em] text-fg-muted">Modify booking</span>
            </button>
          ) : null}
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-[11px] bg-accent px-5 transition-colors duration-150 hover:bg-accent-strong"
          >
            <Plus size={16} strokeWidth={2} className="text-on-accent" aria-hidden />
            <span className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-on-accent">Open case</span>
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3.5">
        <MetricTile label="Visits" value={String(profile.visits)} note={profile.visitsNote} />
        <MetricTile label="No-shows" value={String(profile.noShows)} note={profile.noShowsNote} />
        <MetricTile label="Paid to date" value={profile.paidToDate} note={profile.paidNote} />
        <MetricTile label="Open cases" value={String(profile.openCasesCount)} note={profile.openCasesNote} />
      </div>

      <div className="mt-4.5 flex min-h-0 gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="m-0 font-display text-[22px] text-fg">Booking history</h2>
            <div className="flex-1" />
            <button type="button" className="text-xs font-bold text-accent-strong">
              All bookings
            </button>
            <span className="text-xs text-fg-subtle">·</span>
            <button type="button" onClick={exportHistory} className="text-xs font-bold text-accent-strong">
              Export this member&apos;s history
            </button>
          </div>

          <div className="mt-3.5 overflow-hidden rounded-content border border-line bg-dark-card">
            <div
              className={cn("grid items-center gap-3.5 border-b border-line px-5.5", HISTORY_GRID)}
              style={{ height: 42 }}
            >
              <Th>Date</Th>
              <Th>Lounge</Th>
              <Th>Reference</Th>
              <Th>Status</Th>
              <Th>Charged</Th>
              <span />
            </div>

            {profile.bookingHistory.map((row) => (
              <div
                key={row.reference}
                className={cn(
                  "grid items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 last:border-b-0",
                  HISTORY_GRID,
                )}
                style={{ height: 54 }}
              >
                <span>
                  <span className="block text-[13.5px] font-bold text-fg">{row.dateLabel}</span>
                  <span className="block text-[11.5px] text-fg-subtle">{row.dayLabel}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-bold text-fg">{row.lounge}</span>
                  <span className="block truncate text-[11.5px] text-fg-subtle">{row.detail}</span>
                </span>
                <span className="text-[13px] font-bold tracking-[0.04em] text-fg">{row.reference}</span>
                <span>
                  <BookingHistoryStatusChip status={row.status} />
                </span>
                <span className="text-[12.5px] font-bold text-fg-muted">{row.charged}</span>
                <ChevronRight size={17} strokeWidth={1.8} className="justify-self-end text-fg-subtle" aria-hidden />
              </div>
            ))}

            <div className="flex items-center gap-2.5 px-5.5" style={{ height: 34 }}>
              <ChevronDown size={15} strokeWidth={1.9} className="text-fg-subtle" aria-hidden />
              <span className="text-xs font-semibold text-fg-subtle">{profile.bookingHistorySummary}</span>
            </div>
          </div>
        </div>

        <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Membership</p>
            <div className="mt-2.5 flex items-baseline gap-2.5">
              <p className="m-0 font-display text-[27px] text-fg">{profile.membershipLabel}</p>
              <p className="m-0 text-[13px] text-fg-subtle">{profile.membershipPriceLabel}</p>
            </div>
            <RailRow label="Renews" value={profile.renewsLabel} />
            <RailRow label="Visits this month" value={profile.visitsThisMonthLabel} />
            <RailRow label="Referrals" value={profile.referralsLabel} />
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Payments</p>
            {profile.payments.length === 0 ? (
              <p className="mt-2.5 text-[12.5px] text-fg-subtle">No payments on file.</p>
            ) : (
              profile.payments.map((payment) => (
                <div
                  key={payment.title}
                  className="flex items-center gap-3 border-t border-[rgba(58,50,42,0.6)] py-3 first:mt-2.5 first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[12.5px] font-bold text-fg">{payment.title}</p>
                    <p className="m-0 mt-0.5 text-[11px] text-fg-subtle">{payment.detail}</p>
                  </div>
                  <p className="m-0 text-[13px] font-bold text-fg">{payment.amount}</p>
                </div>
              ))
            )}
            {profile.payments.length > 0 ? (
              <div className="flex items-center gap-3 border-t border-line pt-3">
                <p className="m-0 flex-1 text-[12.5px] font-bold text-fg-muted">{profile.paidToDateNote}</p>
                <p className="m-0 text-[13.5px] font-extrabold text-accent">{profile.paidToDate}</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4 py-3.5">
            <p className="m-0 text-[11.5px] text-fg-muted">
              Card numbers live in Stripe, never on a LuxePass server — this console shows the brand, the last four
              digits and the charge ID only.
            </p>
          </div>
        </div>
      </div>

      {profile.upcomingBooking ? (
        <BookingOverrideDrawer
          open={overrideOpen}
          onOpenChange={setOverrideOpen}
          memberName={profile.name}
          booking={profile.upcomingBooking}
          onApply={() => {
            router.refresh();
          }}
        />
      ) : null}
    </AdminShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{children}</p>;
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-[rgba(58,50,42,0.6)] py-2.5">
      <span className="text-[12.5px] text-fg-subtle">{label}</span>
      <span className="text-[12.5px] font-bold text-fg">{value}</span>
    </div>
  );
}

function QuickAction({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-11 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line px-4 transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
    >
      <Icon size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
      <span className="text-[12.5px] font-bold tracking-[0.06em] text-fg-muted">{children}</span>
    </button>
  );
}

function BookingHistoryStatusChip({ status }: { status: BookingHistoryStatus }) {
  if (status === "confirmed")
    return (
      <StatusChip available outlined>
        Confirmed
      </StatusChip>
    );
  if (status === "no-show") return <StatusChip dashed>No-show</StatusChip>;
  if (status === "cancelled")
    return (
      <StatusChip dashed dot={false}>
        Cancelled
      </StatusChip>
    );
  return <StatusChip available={false}>Completed</StatusChip>;
}
