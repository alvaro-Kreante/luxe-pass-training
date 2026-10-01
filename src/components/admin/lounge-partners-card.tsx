"use client";

import * as React from "react";
import { Pause, Play, Plus, RotateCw, Trash2, X } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  addLoungePartner,
  deleteLoungePartner,
  reactivateLoungePartner,
  resendPartnerInvite,
  suspendLoungePartner,
  type LoungePartner,
  type LoungePartnerStatus,
} from "@/lib/admin-content";
import { isPartnerComplete, type PartnerInviteInput } from "@/lib/lounge-draft";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const CARD = "rounded-content border border-line bg-dark-card px-5 py-4.5";
const EYEBROW = "m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle";

const STATUS_LABEL: Record<LoungePartnerStatus, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
  on_publish: "On publish",
};

const EMPTY: PartnerInviteInput = { firstName: "", lastName: "", email: "", mobile: "" };

function fullName(partner: { firstName: string; lastName: string }) {
  return `${partner.firstName} ${partner.lastName}`.trim();
}

function StatusChip({ status }: { status: LoungePartnerStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.04em]",
        status === "active" && "border border-gold-600 bg-accent/16 text-fg",
        (status === "invited" || status === "on_publish") && "border border-dashed border-gold-600 text-fg-muted",
        status === "suspended" && "border border-dashed border-fg-subtle text-fg-subtle",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] border border-line text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
    >
      {children}
    </button>
  );
}

function PartnerRow({
  partner,
  actions,
  footer,
  wide = false,
}: {
  partner: { firstName: string; lastName: string; email: string; status: LoungePartnerStatus };
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** LoungePartnersMain.dc.html (23): una sola línea, a todo el ancho de la columna principal. */
  wide?: boolean;
}) {
  const suspended = partner.status === "suspended";
  const initials = `${partner.firstName[0] ?? ""}${partner.lastName[0] ?? ""}`.toUpperCase();
  const avatar = (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-600 bg-accent/14 font-display text-sm text-accent",
        suspended && "opacity-50",
      )}
    >
      {initials}
    </span>
  );
  if (wide) {
    return (
      <li
        aria-label={`${fullName(partner)} · ${STATUS_LABEL[partner.status]}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/60 py-2.5"
      >
        {avatar}
        <p className="m-0 w-50 truncate text-[13px] font-bold text-fg">{fullName(partner)}</p>
        <p className="m-0 min-w-0 flex-1 truncate text-[12.5px] text-fg-subtle">{partner.email}</p>
        <StatusChip status={partner.status} />
        <div className="flex w-[30px] justify-end">{actions}</div>
      </li>
    );
  }
  return (
    <li aria-label={`${fullName(partner)} · ${STATUS_LABEL[partner.status]}`} className="border-t border-line/60 py-3">
      <div className="flex items-center gap-2.5">
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className={cn("m-0 truncate text-[13px] font-bold", suspended ? "text-fg-subtle" : "text-fg")}>{fullName(partner)}</p>
            <StatusChip status={partner.status} />
          </div>
          <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">{partner.email}</p>
        </div>
        {actions ? <div className="flex gap-1.5">{actions}</div> : null}
      </div>
      {footer}
    </li>
  );
}

function PartnerFields({
  value,
  onChange,
  inline,
}: {
  value: PartnerInviteInput;
  onChange: (value: PartnerInviteInput) => void;
  /** Los cuatro campos en una fila (LoungePartnersMain.dc.html, 23); si no, 2×2 como el popup 20. */
  inline?: boolean;
}) {
  const set = (key: keyof PartnerInviteInput) => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: event.target.value });
  const suffix = inline ? "draft" : "modal";
  return (
    <div className={cn("grid grid-cols-2 gap-3.5", inline && "md:grid-cols-4 md:gap-3")}>
      <Field label="First name" htmlFor={`partner-first-${suffix}`} className="mb-0">
        <Input id={`partner-first-${suffix}`} autoComplete="off" value={value.firstName} onChange={set("firstName")} />
      </Field>
      <Field label="Last name" htmlFor={`partner-last-${suffix}`} className="mb-0">
        <Input id={`partner-last-${suffix}`} autoComplete="off" value={value.lastName} onChange={set("lastName")} />
      </Field>
      <Field label="Work email" htmlFor={`partner-email-${suffix}`} className="mb-0">
        <Input id={`partner-email-${suffix}`} type="email" autoComplete="off" value={value.email} onChange={set("email")} />
      </Field>
      <Field label="Mobile" optional htmlFor={`partner-mobile-${suffix}`} className="mb-0">
        <Input id={`partner-mobile-${suffix}`} type="tel" autoComplete="off" value={value.mobile} onChange={set("mobile")} />
      </Field>
    </div>
  );
}

/**
 * Epic 8 · LoungeDraftPartners.dc.html (19) — los partners de un borrador: los
 * que ya tienen cuenta (de cuando estuvo live) se listan tal cual; los nuevos
 * se escriben aquí y se invitan al publicar.
 */
export function DraftPartnersCard({
  linked,
  pending,
  onPendingChange,
}: {
  linked: LoungePartner[];
  pending: PartnerInviteInput[];
  onPendingChange: (pending: PartnerInviteInput[]) => void;
}) {
  const [draft, setDraft] = React.useState<PartnerInviteInput>(EMPTY);
  const [open, setOpen] = React.useState(linked.length + pending.length === 0);
  const taken = [...linked, ...pending].some((p) => p.email.trim().toLowerCase() === draft.email.trim().toLowerCase());
  const canAdd = isPartnerComplete(draft) && !taken;

  return (
    <div className={CARD}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={EYEBROW}>Partners · {linked.length + pending.length}</p>
        <div className="flex-1" />
        <p className="m-0 text-[11.5px] text-fg-subtle">New partners are invited when you publish · at least one is needed</p>
      </div>
      <ul aria-label="Partners" className="m-0 mt-2.5 list-none p-0">
        {linked.map((partner) => (
          <PartnerRow key={partner.email} partner={partner} wide />
        ))}
        {pending.map((partner) => (
          <PartnerRow
            key={partner.email}
            wide
            partner={{ ...partner, status: "on_publish" }}
            actions={
              <IconAction label={`Remove ${fullName(partner)}`} onClick={() => onPendingChange(pending.filter((p) => p !== partner))}>
                <X size={13} strokeWidth={2.2} />
              </IconAction>
            }
          />
        ))}
      </ul>
      {open ? (
        <div className="mt-2 rounded-[14px] border-[1.5px] border-dashed border-fg-subtle p-3.5">
          <PartnerFields value={draft} onChange={setDraft} inline />
          {taken ? <p className="m-0 mt-2 text-[11.5px] font-bold text-accent-strong">That email is already on this lounge.</p> : null}
          <div className="mt-3 flex justify-end gap-2.5">
            {linked.length + pending.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="normal-case"
                onClick={() => {
                  setDraft(EMPTY);
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="button"
              size="md"
              className="normal-case"
              disabled={!canAdd}
              onClick={() => {
                onPendingChange([...pending, { ...draft, email: draft.email.trim().toLowerCase() }]);
                setDraft(EMPTY);
                setOpen(false);
              }}
            >
              Save partner
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="md" className="ml-auto mt-3 flex normal-case" onClick={() => setOpen(true)}>
          <Plus size={14} strokeWidth={2.2} />
          Add partner
        </Button>
      )}
    </div>
  );
}

type Pending = { kind: "suspend" | "delete"; partner: LoungePartner } | null;

/**
 * Epic 8 · LoungeLive.dc.html (17) y los popups 20–22 — los partners de un
 * lounge live se gestionan sin despublicarlo. Cada acción va a la Edge
 * Function `admin-lounge-partners`, que también impide dejar el lounge sin
 * ningún partner activo.
 */
export function LivePartnersCard({
  loungeId,
  loungeName,
  partners,
  onChanged,
}: {
  loungeId: string;
  loungeName: string;
  partners: LoungePartner[];
  onChanged: () => Promise<void>;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [adding, setAdding] = React.useState(false);
  const [newPartner, setNewPartner] = React.useState<PartnerInviteInput>(EMPTY);
  const [confirming, setConfirming] = React.useState<Pending>(null);
  const [understood, setUnderstood] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await onChanged();
      setNotice(success);
      setAdding(false);
      setConfirming(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  }

  function openConfirm(kind: "suspend" | "delete", partner: LoungePartner) {
    setUnderstood(false);
    setConfirming({ kind, partner });
  }

  const target = confirming?.partner;
  const targetName = target ? fullName(target) : "";

  return (
    <div className={CARD}>
      <div className="flex items-center gap-3">
        <p className={EYEBROW}>Partners · {partners.length}</p>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => {
            setNewPartner(EMPTY);
            setError("");
            setAdding(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-pill border-[1.5px] border-line px-3 py-1.5 text-[11.5px] font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
        >
          <Plus size={14} strokeWidth={2.2} className="text-accent" />
          Add partner
        </button>
      </div>
      <p className="m-0 mb-2.5 mt-2 text-[11.5px] leading-[1.5] text-fg-subtle">
        They run the lounge in the Partner Dashboard. Managed here while the lounge is live.
      </p>

      {notice ? <p role="status" className="m-0 mb-2 text-[12px] font-bold text-accent">{notice}</p> : null}
      {error && !adding ? <p role="alert" className="m-0 mb-2 text-[12px] font-bold text-accent-strong">{error}</p> : null}

      <ul aria-label="Partners" className="m-0 list-none p-0">
        {partners.map((partner) => {
          const name = fullName(partner);
          const userId = partner.userId!;
          return (
            <PartnerRow
              key={userId}
              partner={partner}
              actions={
                <>
                  {partner.status === "suspended" ? (
                    <IconAction label={`Reactivate ${name}`} onClick={() => run(() => reactivateLoungePartner(supabase, loungeId, userId), `${name} can sign in again.`)}>
                      <Play size={13} strokeWidth={2} />
                    </IconAction>
                  ) : (
                    <IconAction label={`Suspend ${name}`} onClick={() => openConfirm("suspend", partner)}>
                      <Pause size={13} strokeWidth={2} />
                    </IconAction>
                  )}
                  <IconAction label={`Delete ${name}`} onClick={() => openConfirm("delete", partner)}>
                    <Trash2 size={13} strokeWidth={1.8} />
                  </IconAction>
                </>
              }
              footer={
                partner.status === "invited" ? (
                  <div className="ml-[46px] mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-fg-subtle">No password yet</span>
                    <span className="text-fg-subtle">·</span>
                    <button
                      type="button"
                      aria-label={`Resend invitation to ${name}`}
                      disabled={busy}
                      onClick={() => run(() => resendPartnerInvite(supabase, loungeId, userId), `Invitation sent to ${partner.email}.`)}
                      className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-gold-600 transition-colors duration-150 hover:text-accent"
                    >
                      <RotateCw size={13} strokeWidth={1.9} className="text-accent" />
                      Resend invitation
                    </button>
                  </div>
                ) : null
              }
            />
          );
        })}
      </ul>

      <Modal
        open={adding}
        onOpenChange={setAdding}
        dark
        width={600}
        eyebrow={`${loungeName} · live`}
        title="Add a partner"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="normal-case" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <div className="flex-1" />
            <Button
              disabled={!isPartnerComplete(newPartner) || busy}
              onClick={() => run(() => addLoungePartner(supabase, loungeId, newPartner), `Invitation sent to ${newPartner.email.trim()}.`)}
            >
              {busy ? "Sending…" : "Send invitation"}
            </Button>
          </div>
        }
      >
        <PartnerFields value={newPartner} onChange={setNewPartner} />
        {error && adding ? <p role="alert" className="m-0 mt-3 text-[12.5px] font-bold text-accent-strong">{error}</p> : null}
        <p className="m-0 mt-4 rounded-[14px] border border-line px-3.5 py-3 text-xs leading-[1.55] text-fg-muted">
          The invitation goes out now — the lounge stays live. The link works for 24 hours; you can resend it from the list.
          An email already used by another lounge — or by any other account — cannot be added.
        </p>
      </Modal>

      <Modal
        open={confirming?.kind === "suspend"}
        onOpenChange={(open) => !open && setConfirming(null)}
        dark
        width={540}
        eyebrow={`${targetName} · partner`}
        title="Suspend this account?"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="normal-case" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <div className="flex-1" />
            <Button disabled={busy} onClick={() => target && run(() => suspendLoungePartner(supabase, loungeId, target.userId!), `${targetName} is suspended.`)}>
              Suspend account
            </Button>
          </div>
        }
      >
        <p className="m-0 text-[13.5px] leading-[1.6] text-fg-muted">
          {target?.firstName} will not be able to sign in to the Partner Dashboard until the account is reactivated.
        </p>
        <ConfirmPoint title="Every lounge they run">The suspension covers {loungeName} and any other lounge on this account.</ConfirmPoint>
        <ConfirmPoint title="Nothing else changes">
          Bookings, guest lists and the other partners keep working. Reactivate it from the same list.
        </ConfirmPoint>
      </Modal>

      <Modal
        open={confirming?.kind === "delete"}
        onOpenChange={(open) => !open && setConfirming(null)}
        dark
        width={540}
        eyebrow={`${targetName} · partner`}
        title="Delete this account?"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="normal-case" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <div className="flex-1" />
            <Button
              disabled={!understood || busy}
              onClick={() => target && run(() => deleteLoungePartner(supabase, loungeId, target.userId!), `${targetName}'s account was deleted.`)}
            >
              Delete account
            </Button>
          </div>
        }
      >
        <p className="m-0 text-[13.5px] leading-[1.6] text-fg-muted">
          This removes {target?.firstName}&apos;s partner account for good. It cannot be undone — to bring them back you would add
          them again.
        </p>
        <ConfirmPoint title="Every lounge they run">They lose access to any other lounge on this account too. Suspend instead if it is only for a while.</ConfirmPoint>
        <div className="mt-3 rounded-[14px] border border-dashed border-gold-600 px-3.5 py-3">
          <Checkbox align="center" checked={understood} onCheckedChange={setUnderstood}>
            <span className="text-[12.5px] font-bold text-fg">I understand this cannot be undone</span>
          </Checkbox>
        </div>
      </Modal>
    </div>
  );
}

function ConfirmPoint({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 flex gap-3 border-t border-line/60 pt-3">
      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
      <div>
        <p className="m-0 text-[13px] font-bold text-fg">{title}</p>
        <p className="m-0 mt-0.5 text-xs leading-[1.5] text-fg-subtle">{children}</p>
      </div>
    </div>
  );
}
