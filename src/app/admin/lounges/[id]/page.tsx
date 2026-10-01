"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";

import { LoungeDraftForm } from "@/components/admin/lounge-draft-form";
import { LoungeLiveView } from "@/components/admin/lounge-live-view";
import { LoungeSavedNotice, type LoungeSavedKind } from "@/components/admin/lounge-saved-notice";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { getLoungeContentDetail, type LoungeContentDetail } from "@/lib/admin-content";
import { createClient } from "@/lib/supabase/client";

/**
 * Epic 8 · LoungeLive.dc.html (17) y LoungeDraftPartners.dc.html (19) — el
 * detalle de un lounge desde la tabla de lounges. Publicado se ve entero y
 * bloqueado (`LoungeLiveView`); en borrador se edita con el mismo formulario
 * del alta (`LoungeDraftForm`), ubicación incluida. Sustituye al editor de
 * LoungeEdit.dc.html y a su cola de aprobación (decisión 29 sept 2026:
 * cualquier admin publica, sin revisión). Guardar o publicar avisa y deja
 * al admin en el lounge (LoungeDraftSaved 24 · LoungePublished 25).
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
  const [notice, setNotice] = React.useState<LoungeSavedKind | null>(null);

  const load = React.useCallback(async () => {
    const detail = await getLoungeContentDetail(supabase, id);
    setLounge(detail ?? null);
  }, [supabase, id]);

  React.useEffect(() => {
    let active = true;
    getLoungeContentDetail(supabase, id).then((detail) => {
      if (!active) return;
      setLounge(detail ?? null);
    });
    return () => {
      active = false;
    };
  }, [supabase, id]);

  if (lounge === null) notFound();
  if (lounge === undefined) return null;

  const savedNotice = <LoungeSavedNotice kind={notice} loungeName={lounge.name} onClose={() => setNotice(null)} />;

  if (lounge.contentStatus === "draft") {
    return (
      <>
        <LoungeDraftForm
          key={`draft-${lounge.id}`}
          lounge={lounge}
          onSaved={async (_, kind) => {
            await load();
            setNotice(kind);
          }}
        />
        {savedNotice}
      </>
    );
  }

  return (
    <>
      <LoungeLiveView lounge={lounge} onMovedToDraft={load} onStatusChanged={load} />
      {savedNotice}
    </>
  );
}
