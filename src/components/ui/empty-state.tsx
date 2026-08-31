import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 "Estados" — vacío / error.
 * Card blanca de 440–660px con medallón `--gold-100` de 72px, h2 de 27px,
 * párrafo y dos botones (secundario + primario).
 * Usado por `NoResults.dc.html` y `MapError.dc.html`.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  footnote,
  width = 440,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  /** Los botones y, en "no results", las sugerencias que preceden a la fila. */
  children?: React.ReactNode;
  footnote?: React.ReactNode;
  width?: number;
  className?: string;
}) {
  return (
    <Card
      variant="panel"
      padded={false}
      style={{ maxWidth: width }}
      className={cn("w-full p-9 text-center", className)}
    >
      <span className="mx-auto mb-5 flex size-[72px] items-center justify-center rounded-full bg-accent-soft">
        <Icon size={30} strokeWidth={1.6} className="text-accent-strong" />
      </span>

      <h2 className="mb-3 text-[27px] text-fg">{title}</h2>
      <p className="m-0 mb-6 text-sm leading-[1.6] text-fg-muted">
        {description}
      </p>

      {children}

      {footnote ? (
        <p className="m-0 mt-4 text-xs text-fg-subtle">{footnote}</p>
      ) : null}
    </Card>
  );
}
