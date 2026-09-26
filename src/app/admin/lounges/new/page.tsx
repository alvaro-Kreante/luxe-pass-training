"use client";

import { LoungeDraftForm } from "@/components/admin/lounge-draft-form";
import { RequireAdminSession } from "@/components/admin/require-admin-session";

/**
 * Story 8.3 — "Add/edit/remove lounge profiles": alta de un lounge nuevo.
 * Artboard: docs/design/epic-8-admin-support/LoungeNew.dc.html (14).
 */
export default function NewLoungePage() {
  return (
    <RequireAdminSession>
      <LoungeDraftForm />
    </RequireAdminSession>
  );
}
