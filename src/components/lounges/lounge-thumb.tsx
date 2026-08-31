import { cn } from "@/lib/utils";

/**
 * Placeholder de imagen de lounge. No hay fotografía del cliente: los artboards
 * resuelven la miniatura con el radial de marca y los puntos dorados.
 * El tono sale del id para que un mismo lounge se vea igual en todas las vistas.
 */
function toneOf(id: string): 1 | 2 | 3 {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);

  return ((sum % 3) + 1) as 1 | 2 | 3;
}

export function LoungeThumb({
  loungeId,
  className,
}: {
  loungeId: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      data-tone={toneOf(loungeId)}
      className={cn("lounge-hero shrink-0", className)}
    />
  );
}
