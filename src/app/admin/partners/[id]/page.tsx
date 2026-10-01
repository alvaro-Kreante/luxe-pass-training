"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import { ActivationNote, PartnerActivationChecklist } from "@/components/admin/partner-activation-checklist";
import { PartnerDetailsCard } from "@/components/admin/partner-details-card";
import { DraftStatusPill, PartnerBreadcrumb, PartnerHeader } from "@/components/admin/partner-header";
import { PartnerLoungesCard } from "@/components/admin/partner-lounges-card";
import { PartnerStatusChip } from "@/components/admin/partner-status-chip";
import { PartnerUsersCard } from "@/components/admin/partner-users-card";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { Button } from "@/components/ui/button";
import {
  activatePartner,
  addPartnerMember,
  deletePartnerMember,
  reactivatePartner,
  reactivatePartnerMember,
  resendPartnerMemberInvite,
  suspendPartner,
  suspendPartnerMember,
  getAdminPartner,
  setPartnerRepresentative,
  updatePartner,
  updatePartnerMember,
  type AdminPartnerDetail,
  type PartnerDetailsInput,
} from "@/lib/admin-partners";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 10.3 — detalle de un partner. Artboards:
 * docs/design/epic-10-partner-organizations/PartnerDetail.dc.html (3) y
 * PartnerUserEdit.dc.html (4). Datos editables, usuarios (lápiz,
 * representante, borrar) y sus lounges, que abren la vista de lounge. Story
 * 10.4: activar (PartnerActivate 5), activo (PartnerActive 6), suspender
 * (PartnerSuspend 7) y suspendido (PartnerSuspended 8).
 */
export default function PartnerDetailPage() {
  return (
    <RequireAdminSession>
      <PartnerDetailScreen />
    </RequireAdminSession>
  );
}

function detailsOf(partner: AdminPartnerDetail): PartnerDetailsInput {
  const { name, contactEmail, addressLine1, addressLine2, city, region, postalCode, country } = partner;
  return { name, contactEmail, addressLine1, addressLine2, city, region, postalCode, country };
}

function PartnerDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const supabase = React.useMemo(() => createClient(), []);
  const [partner, setPartner] = React.useState<AdminPartnerDetail | null | undefined>(undefined);
  const [details, setDetails] = React.useState<PartnerDetailsInput | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [confirming, setConfirming] = React.useState<"activate" | "suspend" | null>(null);
  const [acting, setActing] = React.useState(false);
  const [actionError, setActionError] = React.useState("");

  const reload = React.useCallback(async () => {
    const next = await getAdminPartner(supabase, id);
    setPartner(next);
    return next;
  }, [supabase, id]);

  React.useEffect(() => {
    let active = true;
    getAdminPartner(supabase, id).then((next) => {
      if (!active) return;
      setPartner(next);
      setDetails(next ? detailsOf(next) : null);
    });
    return () => {
      active = false;
    };
  }, [supabase, id]);

  if (partner === null) notFound();
  if (!partner || !details) return null;

  async function saveDetails() {
    if (!details) return;
    setSaving(true);
    setMessage("");
    try {
      await updatePartner(supabase, id, details);
      await reload();
      setMessage("Changes saved");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not save the partner");
    } finally {
      setSaving(false);
    }
  }

  const draft = partner.status === "draft";
  const representative = partner.users.find((user) => user.isRepresentative);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const suspended = partner.status === "suspended";
  const since = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

  async function runAction(action: () => Promise<void>) {
    setActing(true);
    setActionError("");
    try {
      await action();
      setConfirming(null);
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  }

  const statusPill = draft ? (
    <DraftStatusPill>Draft · users not invited yet</DraftStatusPill>
  ) : suspended ? (
    <DraftStatusPill>Suspended · hidden from members</DraftStatusPill>
  ) : (
    <PartnerStatusChip status={partner.status} />
  );

  return (
    <AdminShell topbarLabel={<PartnerBreadcrumb name={partner.name} />}>
      <PartnerHeader
        name={partner.name}
        status={statusPill}
        meta={[
          suspended ? `Suspended ${since(partner.suspendedAt)}` : !draft ? `Active since ${since(partner.activatedAt)}` : "",
          plural(partner.users.length, "user"),
          plural(partner.lounges.length, "lounge"),
          partner.city,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            {partner.status === "active" ? (
              <Button variant="ghost" size="md" onClick={() => setConfirming("suspend")}>
                Suspend partner
              </Button>
            ) : null}
            {suspended ? (
              <Button size="md" disabled={acting} onClick={() => runAction(() => reactivatePartner(supabase, id))}>
                Reactivate partner
              </Button>
            ) : null}
            <Button variant="ghost" size="md" disabled={saving || details.name.trim() === ""} onClick={saveDetails}>
              Save changes
            </Button>
          </>
        }
      />

      {message ? (
        <p role="status" className="mt-4 text-[13px] font-bold text-accent-strong">
          {message}
        </p>
      ) : null}
      {actionError && !confirming ? (
        <p role="alert" className="mt-4 text-[13px] font-bold text-accent-strong">
          {actionError}
        </p>
      ) : null}

      <div className="mt-4.5 flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <PartnerDetailsCard value={details} onChange={setDetails} />
          <PartnerUsersCard
            users={partner.users}
            hint={
              draft
                ? "No email goes out until you activate the partner"
                : suspended
                  ? "No one can sign in while the partner is suspended"
                  : "Users added now are invited right away"
            }
            onAdd={async (input) => {
              await addPartnerMember(supabase, id, input);
              await reload();
            }}
            onEdit={async (memberId, input) => {
              await updatePartnerMember(supabase, memberId, input);
              await reload();
            }}
            onMakeRepresentative={async (memberId) => {
              await setPartnerRepresentative(supabase, id, memberId);
              await reload();
            }}
            onDelete={async (memberId) => {
              await deletePartnerMember(supabase, memberId);
              await reload();
            }}
            onSuspend={async (memberId) => {
              await suspendPartnerMember(supabase, memberId);
              await reload();
            }}
            onReactivate={async (memberId) => {
              await reactivatePartnerMember(supabase, memberId);
              await reload();
            }}
            onResend={(memberId) => resendPartnerMemberInvite(supabase, memberId)}
          />
          <PartnerLoungesCard
            lounges={partner.lounges}
            hint={
              draft
                ? "Linked while draft · they publish once the partner is active"
                : suspended
                  ? "Hidden from members while the partner is suspended"
                  : "Linked from the lounge form"
            }
          />
        </div>

        <div className="flex h-fit w-full shrink-0 flex-col gap-3 lg:w-[344px]">
          {draft ? (
            <>
              <PartnerActivationChecklist
                items={[
                  { label: "Partner details", detail: "Name, contact email and central building", done: partner.name.trim() !== "" },
                  {
                    label: "At least one user",
                    detail: partner.users.length
                      ? `${plural(partner.users.length, "user")} · invited when you activate`
                      : "Add the people who run its lounges",
                    done: partner.users.length > 0,
                  },
                  {
                    label: "A representative",
                    detail: representative ? `${representative.firstName} ${representative.lastName}` : "The first user you add",
                    done: Boolean(representative),
                  },
                ]}
              >
                <Button block size="md" className="mb-3 mt-1" disabled={partner.users.length === 0} onClick={() => setConfirming("activate")}>
                  Activate partner
                </Button>
              </PartnerActivationChecklist>
              <ActivationNote />
            </>
          ) : suspended ? (
            <>
              <PartnerActivationChecklist
                title="When you reactivate"
                items={[
                  ...partner.lounges.map((lounge) =>
                    lounge.contentStatus === "suspended" && lounge.suspendedBy === "partner"
                      ? { label: `${lounge.name} → Draft`, detail: "It was live · review and publish it again", done: true }
                      : lounge.contentStatus === "suspended"
                        ? { label: `${lounge.name} stays suspended`, detail: "You suspended it on its own", done: false }
                        : { label: `${lounge.name} stays in draft`, detail: "It was never published", done: false },
                  ),
                  { label: "Users can sign in again", detail: "Except the ones you suspended one by one", done: true },
                ]}
              />
              <AdminNote>Bookings already made are kept. Members can&apos;t make new ones while its lounges are hidden.</AdminNote>
            </>
          ) : (
            <>
              <div className="rounded-content border border-line bg-dark-card px-5 py-4.5">
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Active since</p>
                <p className="m-0 mt-2 text-[13px] font-bold text-fg">{since(partner.activatedAt)}</p>
                <p className="m-0 mt-1 text-[11.5px] text-fg-subtle">
                  {partner.lounges.filter((lounge) => lounge.contentStatus === "live").length} of{" "}
                  {plural(partner.lounges.length, "lounge")} live
                </p>
              </div>
              <AdminNote>
                A user added now gets the invitation <strong className="text-fg">right away</strong>. Suspending the partner suspends
                every lounge and blocks every user; suspending one user only blocks that person.
              </AdminNote>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirming === "activate"}
        onOpenChange={(open) => !open && setConfirming(null)}
        eyebrow={`${partner.name} · partner`}
        title="Activate this partner?"
        intro="Each user gets an email to set their password and sign in to the Partner Dashboard."
        points={[
          {
            title: `${plural(partner.users.length, "invitation")} ${partner.users.length === 1 ? "goes" : "go"} out now`,
            detail: (
              <ul className="m-0 list-none p-0">
                {partner.users.map((user) => (
                  <li key={user.id} className="mt-1.5">
                    <span className="font-bold text-fg">
                      {user.firstName} {user.lastName}
                      {user.isRepresentative ? " · representative" : ""}
                    </span>
                    <span className="block">{user.email}</span>
                  </li>
                ))}
              </ul>
            ),
          },
          { title: "Its lounges can be published", detail: "They stay in draft until you publish each one. Publishing sends no email." },
        ]}
        confirmLabel="Activate and invite"
        busy={acting}
        error={actionError}
        onConfirm={() => runAction(() => activatePartner(supabase, id))}
      />
      <ConfirmModal
        open={confirming === "suspend"}
        onOpenChange={(open) => !open && setConfirming(null)}
        eyebrow={`${partner.name} · partner`}
        title="Suspend this partner?"
        intro="Members stop seeing its lounges and its users can't sign in until you reactivate it."
        points={[
          { title: "Every lounge is suspended", detail: "Live lounges leave the member app. Drafts stay in draft." },
          { title: "Every user loses access", detail: "They are signed out of the Partner Dashboard." },
          { title: "Reactivating doesn't republish", detail: "Lounges that were live come back as drafts, ready to review and publish again." },
        ]}
        confirmLabel="Suspend partner"
        busy={acting}
        error={actionError}
        onConfirm={() => runAction(() => suspendPartner(supabase, id))}
      />
    </AdminShell>
  );
}

function AdminNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4 py-3.5">
      <p className="m-0 text-[11.5px] leading-[1.55] text-fg-muted">{children}</p>
    </div>
  );
}
