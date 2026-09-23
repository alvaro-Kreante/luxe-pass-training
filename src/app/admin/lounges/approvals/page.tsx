"use client";

import * as React from "react";
import { CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { ApprovalDiff } from "@/components/ui/approval-diff";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { getTicketCounts, type TicketCounts } from "@/lib/admin";
import {
  approveLoungeSubmission,
  listPendingApprovals,
  rejectLoungeSubmission,
  type PendingApproval,
} from "@/lib/admin-content";
import { cn } from "@/lib/utils";

/**
 * Story 8.3 — "Content approval workflow". Artboard:
 * docs/design/epic-8-admin-support/Approval.dc.html.
 *
 * Backend real (22 sept 2026): recorre `admin_lounge_list`/
 * `admin_lounge_detail` (`supabase/schemas/admin_content.sql`) por cada
 * lounge con un cambio pendiente — el mock solo dibujaba The Vestry con
 * cambios; aquí la cola es real y puede traer cualquier lounge.
 */
export default function ApprovalsPage() {
  return (
    <RequireAdminSession>
      <ApprovalsScreen />
    </RequireAdminSession>
  );
}

function ApprovalsScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [approvals, setApprovals] = React.useState<PendingApproval[] | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);

  const load = React.useCallback(async () => {
    const rows = await listPendingApprovals(supabase);
    setApprovals(rows);
    setSelectedIndex(0);
  }, [supabase]);

  React.useEffect(() => {
    let active = true;
    listPendingApprovals(supabase).then((rows) => {
      if (!active) return;
      setApprovals(rows);
      setSelectedIndex(0);
    });
    getTicketCounts(supabase).then((row) => {
      if (active) setCounts(row);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const current = approvals?.[selectedIndex];

  async function approve() {
    if (!current) return;
    await approveLoungeSubmission(supabase, current.submissionId);
    await load();
  }

  async function reject() {
    if (!current) return;
    await rejectLoungeSubmission(supabase, current.submissionId, "");
    await load();
  }

  return (
    <AdminShell
      topbarLabel={
        <>
          <Link
            href="/admin/lounges"
            className="text-[13.5px] font-bold text-fg-subtle transition-colors duration-150 hover:text-accent"
          >
            Lounges
          </Link>
          <span className="text-[13.5px] text-fg-subtle">›</span>
          <span className="text-[13.5px] font-bold text-fg">Approvals</span>
        </>
      }
      supportBadge={counts?.open}
      loungesBadge={approvals?.length ?? 0}
    >
      {approvals && approvals.length === 0 ? (
        <EmptyState icon={CheckCheck} title="All caught up" description="No content changes are waiting for approval right now." />
      ) : current ? (
        <>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {approvals!.length} {approvals!.length === 1 ? "change" : "changes"} waiting
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Approve before members see it</h1>

          <div className="mt-4.5 flex min-h-0 gap-4">
            <div className="h-fit w-[380px] shrink-0 overflow-hidden rounded-content border border-line bg-dark-card">
              <div className="flex h-[42px] items-center border-b border-line px-5.5">
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">The queue</p>
              </div>

              {approvals!.map((approval, index) => (
                <button
                  key={approval.submissionId}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-[rgba(58,50,42,0.6)] px-5.5 py-3.5 text-left last:border-b-0",
                    index === selectedIndex && "bg-[rgba(201,168,118,0.09)] shadow-[inset_3px_0_0_var(--gold-500)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-[10px] border",
                      index === selectedIndex ? "border-gold-600 bg-[rgba(201,168,118,0.16)]" : "border-line bg-panel-black",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("m-0 text-[13px] font-bold", index === selectedIndex ? "text-fg" : "text-fg-muted")}>
                      {approval.loungeName}
                    </p>
                    <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">
                      {approval.changes.length} {approval.changes.length === 1 ? "change" : "changes"} ·{" "}
                      {approval.submittedAtLabel}
                    </p>
                  </div>
                </button>
              ))}

              <div className="px-5.5 py-4">
                <Button
                  variant="ghost"
                  block
                  className="normal-case"
                  onClick={() => router.push(`/admin/lounges/${current.loungeId}`)}
                >
                  Open the lounge editor
                </Button>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="rounded-content border border-line bg-dark-card px-5.5 py-4.5">
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                  {current.loungeName}
                </p>
                {current.submittedBy ? (
                  <p className="mt-1 text-[11.5px] text-fg-subtle">Submitted by {current.submittedBy}</p>
                ) : null}

                {current.changes.map((change) => (
                  <ApprovalDiff key={change.id} change={change} />
                ))}

                <div className="mt-4 flex items-center gap-3">
                  <Button variant="ghost" className="border-dashed normal-case" onClick={reject}>
                    Send back with a note
                  </Button>
                  <div className="flex-1" />
                  <Button onClick={approve}>Approve and publish</Button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
