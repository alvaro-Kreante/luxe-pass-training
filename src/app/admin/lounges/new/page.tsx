"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { LoungeDraftForm } from "@/components/admin/lounge-draft-form";
import { LoungeSavedNotice, type LoungeSavedKind } from "@/components/admin/lounge-saved-notice";
import { RequireAdminSession } from "@/components/admin/require-admin-session";

/**
 * Story 8.3 — "Add/edit/remove lounge profiles": alta de un lounge nuevo.
 * Artboard: docs/design/epic-8-admin-support/LoungeNew.dc.html (14). Al
 * guardar o publicar avisa (24, 25) y, al cerrar el aviso, sigue en el
 * detalle del lounge recién creado.
 */
export default function NewLoungePage() {
  return (
    <RequireAdminSession>
      <NewLoungeScreen />
    </RequireAdminSession>
  );
}

function NewLoungeScreen() {
  const router = useRouter();
  const [saved, setSaved] = React.useState<{ id: string; kind: LoungeSavedKind; name: string } | null>(null);

  return (
    <>
      <LoungeDraftForm onSaved={(id, kind, name) => setSaved({ id, kind, name })} />
      <LoungeSavedNotice
        kind={saved?.kind ?? null}
        loungeName={saved?.name ?? ""}
        onClose={() => saved && router.replace(`/admin/lounges/${saved.id}`)}
      />
    </>
  );
}
