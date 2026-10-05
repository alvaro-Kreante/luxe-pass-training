import { cn } from "@/lib/utils";

/**
 * Miniatura de lounge: su foto principal (`lounge_images`). Sin `src` (datos
 * de muestra del mock) queda el radial de marca de los artboards; el tono
 * sale del id para que un mismo lounge se vea igual en todas las vistas.
 */
export function toneOf(id: string): 1 | 2 | 3 {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);

  return ((sum % 3) + 1) as 1 | 2 | 3;
}

export function LoungeThumb({
  loungeId,
  src,
  alt = "",
  className,
}: {
  loungeId: string;
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL de Storage, ya recortada y comprimida (Story 10.10)
      <img src={src} alt={alt} className={cn("shrink-0 object-cover", className)} />
    );
  }

  return (
    <div
      aria-hidden
      data-tone={toneOf(loungeId)}
      className={cn("lounge-hero shrink-0", className)}
    />
  );
}
