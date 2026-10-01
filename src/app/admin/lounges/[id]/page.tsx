"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";

import { LoungeDraftForm } from "@/components/admin/lounge-draft-form";
import { LoungeLiveView } from "@/components/admin/lounge-live-view";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import {
  getLoungeContentDetail,
  getLoungePartners,
  type LoungeContentDetail,
  type LoungePartner,
} from "@/lib/admin-content";
import { createClient } from "@/lib/supabase/client";

/**
 * Epic 8 · LoungeLive.dc.html (17) y LoungeDraftPartners.dc.html (19) — el
 * detalle de un lounge desde la tabla de lounges. Publicado se ve entero y
 * bloqueado (`LoungeLiveView`); en borrador se edita con el mismo formulario
 * del alta (`LoungeDraftForm`), ubicación incluida. Sustituye al editor de
 * LoungeEdit.dc.html y a su cola de aprobación (decisión 29 sept 2026:
 * cualquier admin publica, sin revisión).
 */
export default function LoungeEditPage() {
  return (
    <RequireAdminSession>
      <LoungeEditScreen />
    </RequireAdminSession>
  );
}

function LoungeEditScreen() {
  const { id } = useParams<{ id: string }>();
  const supabase = React.useMemo(() => createClient(), []);
  const [lounge, setLounge] = React.useState<LoungeContentDetail | null | undefined>(undefined);
  const [partners, setPartners] = React.useState<LoungePartner[]>([]);

  const load = React.useCallback(async () => {
    const [detail, list] = await Promise.all([getLoungeContentDetail(supabase, id), getLoungePartners(supabase, id)]);
    setPartners(list);
    setLounge(detail ?? null);
  }, [supabase, id]);

  React.useEffect(() => {
    let active = true;
    Promise.all([getLoungeContentDetail(supabase, id), getLoungePartners(supabase, id)]).then(([detail, list]) => {
      if (!active) return;
      setPartners(list);
      setLounge(detail ?? null);
    });
    return () => {
      active = false;
    };
  }, [supabase, id]);

  if (lounge === null) notFound();
  if (lounge === undefined) return null;

  if (lounge.contentStatus === "draft") {
    return (
      <LoungeDraftForm
        key={`draft-${lounge.id}`}
        lounge={lounge}
        linkedPartners={partners.filter((partner) => partner.status !== "on_publish")}
        pendingPartners={partners
          .filter((partner) => partner.status === "on_publish")
          .map(({ firstName, lastName, email, mobile }) => ({ firstName, lastName, email, mobile }))}
      />
    );
  }

  return <LoungeLiveView lounge={lounge} partners={partners} onPartnersChanged={load} onMovedToDraft={load} />;
}
