"use client";

import * as React from "react";
import { Info } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { CaseStatusChip } from "@/components/admin/case-status-chip";
import { RefundModal } from "@/components/admin/refund-modal";
import { Button } from "@/components/ui/button";
import { CommLogEntry } from "@/components/ui/comm-log-entry";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  DUTY_MANAGER,
  MANAGER_APPROVAL_LIMIT,
  RESOLUTION_REASONS,
  addTicketMessage,
  assignTicketToMe,
  displayNameFromEmail,
  escalateTicket,
  formatCurrency,
  getCaseDetail,
  getTicketCounts,
  listTicketMessages,
  refundPayment,
  resolveTicket,
  waiveBookingFee,
  type CaseDetail,
  type CaseStatus,
  type CommLogEntryData,
  type TicketCounts,
} from "@/lib/admin";

/**
 * Story 8.1 — "Issue tracking and resolution notes", "Communication log with
 * customer", "Booking modification capabilities" (enlace a Modify booking
 * en la ficha) y "Escalation to manager functionality". El reembolso
 * (`RefundModal`) solo aparece cuando el caso trae un cargo real de Stripe
 * (`succeeded`); una tarifa solo registrada se "waives" directamente, sin
 * modal — ver la desviación anotada en `COMPONENT-MAP.md`.
 *
 * Artboard: docs/design/epic-8-admin-support/CaseDetail.dc.html.
 *
 * Backend real (22 sept 2026): `admin_get_ticket` +
 * `support_ticket_messages` (`supabase/schemas/support_tickets.sql`).
 */
export default function CaseDetailPage() {
  return (
    <RequireAdminSession>
      <CaseDetailScreen />
    </RequireAdminSession>
  );
}

function CaseDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const supabase = React.useMemo(() => createClient(), []);

  const [caseDetail, setCaseDetail] = React.useState<CaseDetail | null | undefined>(undefined);
  const [commLog, setCommLog] = React.useState<CommLogEntryData[]>([]);
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);
  const [composerMode, setComposerMode] = React.useState<"reply" | "note">("reply");
  const [composerText, setComposerText] = React.useState("");
  const [resolutionReason, setResolutionReason] = React.useState(RESOLUTION_REASONS[0]);
  const [resolutionNote, setResolutionNote] = React.useState("");
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [adminName, setAdminName] = React.useState("");
  const [reloadToken, setReloadToken] = React.useState(0);
  const reload = React.useCallback(() => setReloadToken((t) => t + 1), []);

  React.useEffect(() => {
    let active = true;
    getCaseDetail(supabase, id).then(async (detail) => {
      if (!active) return;
      setCaseDetail(detail ?? null);
      if (!detail) return;
      const messages = await listTicketMessages(supabase, detail.ticketId);
      if (!active) return;
      setCommLog(messages);
      setResolutionReason(detail.resolutionReason ?? RESOLUTION_REASONS[0]);
      setResolutionNote(detail.resolutionNote);
    });
    getTicketCounts(supabase).then((row) => {
      if (active) setCounts(row);
    });
    supabase.auth.getUser().then(({ data }) => {
      if (active && data.user?.email) setAdminName(displayNameFromEmail(data.user.email));
    });
    return () => {
      active = false;
    };
  }, [supabase, id, reloadToken]);

  if (caseDetail === null) notFound();
  if (caseDetail === undefined) return null;

  async function setStatus(status: CaseStatus) {
    if (status === "escalated") await escalateTicket(supabase, caseDetail!.ticketId);
    reload();
  }

  async function assignToMe() {
    await assignTicketToMe(supabase, caseDetail!.ticketId);
    reload();
  }

  async function resolveKeepingFee() {
    await resolveTicket(supabase, caseDetail!.ticketId, resolutionReason, resolutionNote);
    reload();
  }

  async function sendComposer() {
    const body = composerText.trim();
    if (!body) return;
    await addTicketMessage(
      supabase,
      caseDetail!.ticketId,
      composerMode === "reply" ? "staff-reply" : "internal-note",
      adminName || "Support",
      body,
    );
    setComposerText("");
    reload();
  }

  async function confirmWaiveFee() {
    await waiveBookingFee(supabase, caseDetail!.waivableFee!.bookingId);
    await addTicketMessage(
      supabase,
      caseDetail!.ticketId,
      "system",
      "System · fee waived",
      `${adminName || "Support"} waived ${formatCurrency(caseDetail!.waivableFee!.amountCents / 100)} — it was never charged, so nothing was reversed at Stripe.`,
    );
    await resolveTicket(supabase, caseDetail!.ticketId, resolutionReason, resolutionNote);
    reload();
  }

  async function confirmRefund(amount: number) {
    await refundPayment(supabase, caseDetail!.refundablePayment!.paymentId, Math.round(amount * 100));
    await addTicketMessage(
      supabase,
      caseDetail!.ticketId,
      "system",
      "System · refund processed",
      `${adminName || "Support"} refunded ${formatCurrency(amount)} to the card on file.`,
    );
    await resolveTicket(supabase, caseDetail!.ticketId, resolutionReason, resolutionNote);
    reload();
  }

  const status = caseDetail.status;
  const headerStatusLabel = status === "new" && !caseDetail.assignee ? "New · unassigned" : undefined;

  const title = caseDetail.bookingReference
    ? caseDetail.subject.replace(` — ${caseDetail.bookingReference}`, "")
    : caseDetail.subject;

  return (
    <AdminShell
      topbarLabel={
        <>
          <Link
            href="/admin/support"
            className="text-[13.5px] font-bold text-fg-subtle transition-colors duration-150 hover:text-accent"
          >
            Support
          </Link>
          <span className="text-[13.5px] text-fg-subtle">›</span>
          <span className="text-[13.5px] font-bold text-fg">{caseDetail.id}</span>
        </>
      }
      supportBadge={counts?.open}
      blurred={refundOpen}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            Case {caseDetail.id} · opened {caseDetail.openedLabel.toLowerCase()} {caseDetail.openedTimeLabel} ·{" "}
            {caseDetail.memberName}
            {caseDetail.bookingReference ? ` · ${caseDetail.bookingReference}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="m-0 font-display text-[30px] text-fg">{title}</h1>
            <CaseStatusChip status={status}>{headerStatusLabel}</CaseStatusChip>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {caseDetail.assignee ? (
            <p className="m-0 text-[12.5px] font-bold text-fg-muted">Assigned to {caseDetail.assignee}</p>
          ) : (
            <Button variant="ghost" size="md" className="normal-case" onClick={assignToMe}>
              Assign to me
            </Button>
          )}
          <Button variant="ghost" size="md" className="normal-case" onClick={() => setStatus("escalated")}>
            Escalate
          </Button>
          <Button size="md" onClick={resolveKeepingFee}>
            Resolve
          </Button>
        </div>
      </div>

      <div className="mt-4.5 flex min-h-0 gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="m-0 font-display text-[22px] text-fg">Communication log</h2>
            <span className="text-xs text-fg-subtle">{commLog.length} entries · newest last</span>
          </div>

          <div className="mt-3.5 rounded-content border border-line bg-dark-card px-5.5 pb-3.5 pt-1">
            {commLog.map((entry) => (
              <CommLogEntry key={entry.id} entry={entry} />
            ))}
          </div>

          <div className="mt-3.5 rounded-content border border-line bg-dark-card px-5 py-4">
            <Segmented
              label="Message type"
              size="sm"
              value={composerMode}
              onChange={setComposerMode}
              options={[
                { value: "reply", label: "Reply to member" },
                { value: "note", label: "Internal note" },
              ]}
            />
            <textarea
              aria-label="Message"
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              placeholder={
                composerMode === "reply"
                  ? `Write to ${caseDetail.memberName.split(" ")[0]}. Anything you send here goes to the member and is kept on this case…`
                  : "Add a note for other agents — not sent to the member…"
              }
              className="mt-2.5 min-h-[70px] w-full resize-none rounded-xl border border-line bg-panel-black p-3.5 text-[13px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
            />
            <div className="mt-3 flex items-center gap-3">
              <p className="m-0 flex-1 text-[11.5px] text-fg-subtle">
                {composerMode === "reply"
                  ? "Replies are kept on this case as the member's record of what was said"
                  : "Only visible to support and managers"}
              </p>
              <Button size="md" onClick={sendComposer}>
                {composerMode === "reply" ? "Send reply" : "Save note"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Resolution</p>

            <p className="mb-1.5 mt-3.5 text-xs font-bold text-fg-muted">Reason</p>
            <Select value={resolutionReason} onChange={(event) => setResolutionReason(event.target.value)}>
              {RESOLUTION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </Select>

            <p className="mb-1.5 mt-3.5 text-xs font-bold text-fg-muted">Resolution note</p>
            <textarea
              aria-label="Resolution note"
              value={resolutionNote}
              onChange={(event) => setResolutionNote(event.target.value)}
              className="min-h-[70px] w-full resize-none rounded-xl border border-line bg-panel-black p-3 text-[12.5px] text-fg-muted focus:border-accent focus:outline-none"
            />

            <div className="mt-3.5 flex flex-col gap-2.5">
              {caseDetail.waivableFee ? (
                <>
                  <Button size="lg" block onClick={confirmWaiveFee}>
                    Waive the fee · {formatCurrency(caseDetail.waivableFee.amountCents / 100)}
                  </Button>
                  <Button variant="ghost" block className="normal-case" onClick={resolveKeepingFee}>
                    Keep the fee and reply
                  </Button>
                </>
              ) : caseDetail.refundablePayment ? (
                <>
                  <Button size="lg" block onClick={() => setRefundOpen(true)}>
                    Refund {formatCurrency(caseDetail.refundablePayment.amountCents / 100)}
                  </Button>
                  <Button variant="ghost" block className="normal-case" onClick={resolveKeepingFee}>
                    Keep the charge and reply
                  </Button>
                </>
              ) : (
                <Button size="lg" block onClick={resolveKeepingFee}>
                  Resolve case
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              Escalate to a manager
            </p>
            <p className="mt-2.5 text-[12.5px] text-fg-muted">
              A refund over {formatCurrency(MANAGER_APPROVAL_LIMIT)}, a second waiver in twelve months or anything
              touching a partner agreement needs a manager.
            </p>
            <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-line bg-panel-black px-3.5 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xs font-bold text-on-accent">
                {DUTY_MANAGER.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold text-fg">{DUTY_MANAGER.name}</span>
                <span className="block text-[11px] text-fg-subtle">{DUTY_MANAGER.roleLabel}</span>
              </span>
            </div>
            {status === "escalated" ? (
              <p className="mt-3 text-[12.5px] font-bold text-accent-strong">
                Escalated to {DUTY_MANAGER.name} · marked on the case.
              </p>
            ) : (
              <Button variant="ghost" block className="mt-3 normal-case" onClick={() => setStatus("escalated")}>
                Escalate with this thread
              </Button>
            )}
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4 py-3.5">
            <Info size={15} strokeWidth={1.8} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden />
            <p className="m-0 text-[11.5px] text-fg-muted">
              Escalating moves the case to the manager&apos;s queue. The member sees nothing change until someone
              replies.
            </p>
          </div>
        </div>
      </div>

      {caseDetail.refundablePayment ? (
        <RefundModal
          open={refundOpen}
          onOpenChange={setRefundOpen}
          charge={{
            title: title,
            amount: caseDetail.refundablePayment.amountCents / 100,
            cardLabel: "card on file",
            dateLabel: caseDetail.openedLabel,
            chargeId: caseDetail.refundablePayment.paymentId,
          }}
          onConfirm={confirmRefund}
        />
      ) : null}
    </AdminShell>
  );
}
