"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { ActivationNote, PartnerActivationChecklist } from "@/components/admin/partner-activation-checklist";
import { ADMIN_CARD, ADMIN_EYEBROW, EMPTY_PARTNER_DETAILS, PartnerDetailsCard } from "@/components/admin/partner-details-card";
import { DraftStatusPill, PartnerBreadcrumb, PartnerHeader } from "@/components/admin/partner-header";
import { EMPTY_PARTNER_USER, PartnerUserFields } from "@/components/admin/partner-user-fields";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { Button } from "@/components/ui/button";
import { createPartnerDraft, isPartnerMemberComplete, type PartnerDetailsInput, type PartnerMemberInput } from "@/lib/admin-partners";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 10.3 — alta de un partner. Artboard:
 * docs/design/epic-10-partner-organizations/PartnerNew.dc.html (2). Nace en
 * draft con sus datos y, si se rellena, su primer usuario (el
 * representante); ningún usuario recibe nada hasta activarlo. Guardar abre
 * su detalle.
 */
export default function NewPartnerPage() {
  return (
    <RequireAdminSession>
      <NewPartnerScreen />
    </RequireAdminSession>
  );
}

function NewPartnerScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [details, setDetails] = React.useState<PartnerDetailsInput>(EMPTY_PARTNER_DETAILS);
  const [firstUser, setFirstUser] = React.useState<PartnerMemberInput>(EMPTY_PARTNER_USER);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const userStarted = Object.values(firstUser).some((value) => value.trim() !== "");
  const userReady = isPartnerMemberComplete(firstUser);
  const canSave = details.name.trim() !== "" && (!userStarted || userReady) && !busy;

  async function save() {
    setBusy(true);
    setError("");
    try {
      const id = await createPartnerDraft(supabase, details, userReady ? [{ ...firstUser, email: firstUser.email.trim().toLowerCase() }] : []);
      router.replace(`/admin/partners/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the partner");
      setBusy(false);
    }
  }

  return (
    <AdminShell topbarLabel={<PartnerBreadcrumb name="New partner" />}>
      <PartnerHeader
        name={details.name.trim() || "New partner"}
        status={<DraftStatusPill>Draft · not saved yet</DraftStatusPill>}
        meta="Saved as a draft · no one is invited until you activate it"
        actions={
          <>
            <Button variant="ghost" size="md" className="normal-case" onClick={() => router.push("/admin/partners")}>
              Cancel
            </Button>
            <Button size="md" disabled={!canSave} onClick={save}>
              Save draft
            </Button>
          </>
        }
      />

      {error ? (
        <p role="alert" className="mt-4 text-[13px] font-bold text-accent-strong">
          {error}
        </p>
      ) : null}

      <div className="mt-4.5 flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <PartnerDetailsCard value={details} onChange={setDetails} />
          <div className={ADMIN_CARD}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className={ADMIN_EYEBROW}>Partner users · 0</p>
              <div className="flex-1" />
              <p className="m-0 text-[11.5px] text-fg-subtle">Optional now · at least one is needed to activate</p>
            </div>
            <div className="mt-2.5 rounded-[14px] border-[1.5px] border-dashed border-fg-subtle p-3.5">
              <PartnerUserFields value={firstUser} onChange={setFirstUser} />
              <p className="mb-0 mt-3 flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
                <Star size={12} strokeWidth={2} className="text-accent" aria-hidden />
                The first user becomes the representative.
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-fit w-full shrink-0 flex-col gap-3 lg:w-[344px]">
          <PartnerActivationChecklist
            items={[
              { label: "Partner details", detail: "Name, contact email and central building", done: details.name.trim() !== "" },
              { label: "At least one user", detail: "They will run its lounges in the Partner Dashboard", done: userReady },
              { label: "A representative", detail: "The first user, until you choose another", done: userReady },
            ]}
          />
          <ActivationNote />
        </div>
      </div>
    </AdminShell>
  );
}
