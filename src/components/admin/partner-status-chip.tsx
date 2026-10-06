import { StatusChip } from "@/components/ui/status-chip";
import type { PartnerStatus } from "@/lib/admin-partners";

/**
 * Epic 10 — status de un partner sobre `StatusChip`, con el mismo mapa que
 * `LoungeStatusChip`: Active = Live, Draft discontinuo. Suspended usa el chip
 * de "no disponible" y no el rojo de Partners.dc.html: la paleta cálida es
 * el único sistema (DESIGN-SYSTEM.md §5 "Estados"), ver COMPONENT-MAP.md.
 */
export function PartnerStatusChip({ status }: { status: PartnerStatus }) {
  if (status === "draft") return <StatusChip dashed>Draft</StatusChip>;
  if (status === "suspended") return <StatusChip available={false}>Suspended</StatusChip>;
  return (
    <StatusChip available outlined>
      Active
    </StatusChip>
  );
}
