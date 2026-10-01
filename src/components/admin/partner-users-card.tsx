"use client";

import * as React from "react";
import { Info, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { ADMIN_CARD, ADMIN_EYEBROW } from "@/components/admin/partner-details-card";
import { EMPTY_PARTNER_USER, PartnerUserFields } from "@/components/admin/partner-user-fields";
import { Button } from "@/components/ui/button";
import {
  isPartnerMemberComplete,
  type AdminPartnerMember,
  type PartnerMemberInput,
  type PartnerMemberStatus,
} from "@/lib/admin-partners";
import { cn } from "@/lib/utils";

const GRID = "md:grid-cols-[36px_minmax(0,1fr)_128px_112px_156px_102px]";

const STATUS_LABEL: Record<PartnerMemberStatus, string> = {
  on_activation: "On activation",
  invited: "Invited",
  active: "Active",
  suspended: "Suspended",
};

function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

function AccessChip({ status }: { status: PartnerMemberStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.04em]",
        status === "active" ? "border border-gold-600 bg-accent/16 text-fg" : "border border-dashed",
        (status === "invited" || status === "on_activation") && "border-gold-600 text-fg-muted",
        status === "suspended" && "border-fg-subtle text-fg-subtle",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

/**
 * Story 10.3 — "Partner users" de PartnerDetail.dc.html (3) y
 * PartnerUserEdit.dc.html (4). Lápiz para editar en la misma fila (sin
 * email), "Make representative" y borrar; el representante no se borra
 * mientras queden otros (el servidor lo vuelve a comprobar). Cada acción la
 * resuelve la pantalla (`on*`); un error se muestra aquí.
 */
export function PartnerUsersCard({
  users,
  hint,
  onAdd,
  onEdit,
  onMakeRepresentative,
  onDelete,
}: {
  users: AdminPartnerMember[];
  hint: string;
  onAdd: (input: PartnerMemberInput) => Promise<void>;
  onEdit: (id: string, input: PartnerMemberInput) => Promise<void>;
  onMakeRepresentative: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState<PartnerMemberInput>(EMPTY_PARTNER_USER);
  const [editing, setEditing] = React.useState<{ id: string; value: PartnerMemberInput } | null>(null);
  const [blockedRepresentative, setBlockedRepresentative] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function remove(user: AdminPartnerMember) {
    if (user.isRepresentative && users.length > 1) {
      setBlockedRepresentative(fullName(user));
      return;
    }
    setBlockedRepresentative(null);
    void run(() => onDelete(user.id));
  }

  const taken = users.some((u) => u.email.toLowerCase() === draft.email.trim().toLowerCase());

  return (
    <div className={ADMIN_CARD}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={ADMIN_EYEBROW}>Partner users · {users.length}</p>
        <div className="flex-1" />
        <p className="m-0 text-[11.5px] text-fg-subtle">{hint}</p>
        {!adding ? (
          <Button type="button" variant="ghost" size="md" className="h-8 rounded-pill px-3 normal-case" onClick={() => setAdding(true)}>
            <Plus size={14} strokeWidth={2.2} />
            Add user
          </Button>
        ) : null}
      </div>

      {blockedRepresentative ? (
        <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-xl border border-line bg-panel-black px-3.5 py-3">
          <Info size={16} strokeWidth={1.8} className="mt-px shrink-0 text-accent-strong" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[12.5px] font-bold text-accent-strong">{blockedRepresentative} is the representative</p>
            <p className="m-0 mt-0.5 text-[11.5px] text-fg-muted">
              Make another user the representative before deleting them. The partner always keeps one while it has users.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBlockedRepresentative(null)}
            className="text-xs font-bold text-accent-strong transition-colors duration-150 hover:text-accent"
          >
            Got it
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 mt-3 text-[12.5px] font-bold text-accent-strong">
          {error}
        </p>
      ) : null}

      <div role="table" aria-label="Partner users" className="mt-3">
        {users.length > 0 ? (
          <div role="row" className={cn("hidden items-center gap-3 pb-2 md:grid", GRID)}>
            <span role="columnheader" />
            <p role="columnheader" className={ADMIN_EYEBROW}>Name and email</p>
            <p role="columnheader" className={ADMIN_EYEBROW}>Mobile</p>
            <p role="columnheader" className={ADMIN_EYEBROW}>Access</p>
            <span role="columnheader" />
            <span role="columnheader" />
          </div>
        ) : null}

        {users.map((user) =>
          editing?.id === user.id ? (
            <div
              key={user.id}
              role="row"
              aria-label={`Editing ${fullName(user)}`}
              className="my-1.5 rounded-[14px] border-[1.5px] border-gold-600 bg-accent/6 p-3.5"
            >
              <p className="m-0 mb-3 text-[13px] font-bold text-fg">Editing {fullName(user)}</p>
              <PartnerUserFields value={editing.value} onChange={(value) => setEditing({ id: user.id, value })} emailLocked />
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="text-[11.5px] text-fg-subtle">The email is the sign-in and can&apos;t be changed.</span>
                <div className="flex-1" />
                <Button type="button" variant="ghost" size="md" className="normal-case" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="md"
                  className="normal-case"
                  aria-label={`Save changes to ${user.firstName}`}
                  disabled={busy || !editing.value.firstName.trim() || !editing.value.lastName.trim()}
                  onClick={async () => {
                    if (await run(() => onEdit(user.id, editing.value))) setEditing(null);
                  }}
                >
                  Save changes
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={user.id}
              role="row"
              aria-label={fullName(user)}
              className={cn("grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line/60 py-2.5", GRID)}
            >
              <span
                role="cell"
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border border-gold-600 bg-accent/14 font-display text-sm text-accent",
                  user.status === "suspended" && "opacity-50",
                )}
              >
                {`${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()}
              </span>
              <div role="cell" className="min-w-0">
                <p className={cn("m-0 truncate text-[13px] font-bold", user.status === "suspended" ? "text-fg-subtle" : "text-fg")}>
                  {fullName(user)}
                </p>
                <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">{user.email}</p>
              </div>
              <p role="cell" className="m-0 hidden whitespace-nowrap text-[12.5px] text-fg-muted md:block">
                {user.mobile || "—"}
              </p>
              <div role="cell" className="hidden md:block">
                <AccessChip status={user.status} />
              </div>
              <div role="cell" className="hidden md:block">
                {user.isRepresentative ? (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-pill bg-accent px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.04em] text-on-accent">
                    <Star size={11} strokeWidth={2.2} aria-hidden />
                    Representative
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Make ${fullName(user)} the representative`}
                    disabled={busy}
                    onClick={() => void run(() => onMakeRepresentative(user.id))}
                    className="inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] font-bold text-accent-strong transition-colors duration-150 hover:text-accent"
                  >
                    <Star size={12} strokeWidth={2} aria-hidden />
                    Make representative
                  </button>
                )}
              </div>
              <div role="cell" className="flex justify-end gap-1.5">
                <IconAction
                  label={`Edit ${fullName(user)}`}
                  onClick={() =>
                    setEditing({ id: user.id, value: { firstName: user.firstName, lastName: user.lastName, email: user.email, mobile: user.mobile } })
                  }
                >
                  <Pencil size={14} strokeWidth={1.9} />
                </IconAction>
                <IconAction label={`Delete ${fullName(user)}`} onClick={() => remove(user)}>
                  <Trash2 size={14} strokeWidth={1.8} />
                </IconAction>
              </div>
            </div>
          ),
        )}
      </div>

      {adding ? (
        <div className="mt-2 rounded-[14px] border-[1.5px] border-dashed border-fg-subtle p-3.5">
          <PartnerUserFields value={draft} onChange={setDraft} />
          {taken ? <p className="m-0 mt-2 text-[11.5px] font-bold text-accent-strong">That email is already on this partner.</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="text-[11.5px] text-fg-subtle">
              {users.length === 0
                ? "The first user becomes the representative."
                : "Must be a brand-new account — an email already used by a member, a partner or an admin is refused."}
            </span>
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="normal-case"
              onClick={() => {
                setDraft(EMPTY_PARTNER_USER);
                setAdding(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="md"
              className="normal-case"
              disabled={busy || taken || !isPartnerMemberComplete(draft)}
              onClick={async () => {
                if (await run(() => onAdd({ ...draft, email: draft.email.trim().toLowerCase() }))) {
                  setDraft(EMPTY_PARTNER_USER);
                  setAdding(false);
                }
              }}
            >
              Save user
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
