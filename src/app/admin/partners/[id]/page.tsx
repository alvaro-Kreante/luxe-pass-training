"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { ActivationNote, PartnerActivationChecklist } from "@/components/admin/partner-activation-checklist";
import { PartnerDetailsCard } from "@/components/admin/partner-details-card";
import { DraftStatusPill, PartnerBreadcrumb, PartnerHeader } from "@/components/admin/partner-header";
import { PartnerLoungesCard } from "@/components/admin/partner-lounges-card";
import { PartnerStatusChip } from "@/components/admin/partner-status-chip";
import { PartnerUsersCard } from "@/components/admin/partner-users-card";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { Button } from "@/components/ui/button";
import {
  addPartnerMember,
  deletePartnerMember,
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
 * representante, borrar) y sus lounges, que abren la vista de lounge. Activar
 * y suspender llegan con la Story 10.4.
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

  return (
    <AdminShell topbarLabel={<PartnerBreadcrumb name={partner.name} />}>
      <PartnerHeader
        name={partner.name}
        status={draft ? <DraftStatusPill>Draft · users not invited yet</DraftStatusPill> : <PartnerStatusChip status={partner.status} />}
        meta={[plural(partner.users.length, "user"), plural(partner.lounges.length, "lounge"), partner.city].filter(Boolean).join(" · ")}
        actions={
          <Button variant="ghost" size="md" disabled={saving || details.name.trim() === ""} onClick={saveDetails}>
            Save changes
          </Button>
        }
      />

      {message ? (
        <p role="status" className="mt-4 text-[13px] font-bold text-accent-strong">
          {message}
        </p>
      ) : null}

      <div className="mt-4.5 flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <PartnerDetailsCard value={details} onChange={setDetails} />
          <PartnerUsersCard
            users={partner.users}
            hint={draft ? "No email goes out until you activate the partner" : "Users added now are invited right away"}
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
          />
          <PartnerLoungesCard
            lounges={partner.lounges}
            hint={draft ? "Linked while draft · they publish once the partner is active" : "Linked from the lounge form"}
          />
        </div>

        {draft ? (
          <div className="flex h-fit w-full shrink-0 flex-col gap-3 lg:w-[344px]">
            <PartnerActivationChecklist
              items={[
                { label: "Partner details", detail: "Name, contact email and central building", done: partner.name.trim() !== "" },
                {
                  label: "At least one user",
                  detail: partner.users.length ? `${plural(partner.users.length, "user")} · invited when you activate` : "Add the people who run its lounges",
                  done: partner.users.length > 0,
                },
                { label: "A representative", detail: representative ? `${representative.firstName} ${representative.lastName}` : "The first user you add", done: Boolean(representative) },
              ]}
            />
            <ActivationNote />
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
