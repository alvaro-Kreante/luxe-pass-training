import { StatusChip } from "@/components/ui/status-chip";
import type { AdminLoungeRow } from "@/lib/admin-content";

/**
 * "Los mismos estados sirven para el estado de un lounge (Live / N to
 * approve / Draft)" — DESIGN-SYSTEM.md §4, nota del chip de estado de caso.
 */
export function LoungeStatusChip({ lounge }: { lounge: AdminLoungeRow }) {
  if (lounge.contentStatus === "draft") return <StatusChip dashed>Draft</StatusChip>;
  if (lounge.contentStatus === "archived") return <StatusChip available={false}>Archived</StatusChip>;
  return (
    <StatusChip available outlined>
      Live
    </StatusChip>
  );
}
