import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * DESIGN-SYSTEM.md §5 patrón 1 — Split-screen de autenticación.
 *
 * Panel izquierdo de 600px fijo (radial sobre `--panel-black`, patrón de puntos
 * dorados, logo de 170px y una frase en Bodoni de 22px) + panel derecho con
 * degradado blush y card blanca de 440–460px centrada.
 *
 * Sirve para: sign up, log in, reset password, verificación y los pasos de perfil.
 *
 * Los artboards son desktop 1440×900. Por debajo de `lg` el panel de marca se
 * repliega a una banda superior para que la card siga siendo usable en móvil.
 */
export interface AuthSplitProps {
  /** Frase de marca del panel izquierdo. */
  tagline: string;
  /** Ancho de la card: 440px por defecto, 460px en los pasos de perfil. */
  cardWidth?: 440 | 460;
  /** Centra el contenido de la card — usado en la pantalla de verificación. */
  centered?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function AuthSplit({
  tagline,
  cardWidth = 440,
  centered = false,
  className,
  children,
}: AuthSplitProps) {
  return (
    <div className={cn("flex min-h-screen flex-col lg:flex-row", className)}>
      <aside className="surface-night-panel dot-pattern relative flex shrink-0 flex-col items-center justify-center px-8 py-10 text-center lg:h-screen lg:w-[600px] lg:px-16 lg:py-16">
        <Image
          src="/logo.png"
          alt="En Soleil"
          width={170}
          height={179}
          priority
          className="relative z-10 w-[104px] lg:mb-9 lg:w-[170px]"
        />
        <p className="relative z-10 mt-5 hidden max-w-[340px] font-display text-[22px] font-normal leading-[1.55] tracking-[0.2px] text-dark-ink-100 lg:mt-0 lg:block">
          {tagline}
        </p>
      </aside>

      <div className="surface-blush flex flex-1 items-center justify-center p-6 lg:h-screen lg:p-10">
        <Card
          padded={false}
          className={cn(
            "w-full px-7 py-9 sm:px-11 sm:pb-10 sm:pt-11",
            cardWidth === 460 ? "max-w-[460px]" : "max-w-[440px]",
            centered && "text-center",
          )}
        >
          {children}
        </Card>
      </div>
    </div>
  );
}
