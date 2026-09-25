"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, House, LogOut, Ticket, UserRound } from "lucide-react";

import { useCurrentMember } from "@/lib/current-member";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 patrón 3 — App shell del área de miembro.
 * Sidebar blanca de 248px (logo 52px, nav, bloque de usuario abajo) + área de
 * contenido con padding 52px 56px. Fija la navegación de los Epics 2–6.
 *
 * Artboard: docs/design/epic-1-onboarding/Home.dc.html
 */

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/my-pass", label: "My Pass", icon: Ticket },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

/** El Home solo está activo en su propia ruta; el resto, también en sus sub-rutas. */
function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  /** El perfil de un lounge (Epic 3) se llega desde Explore: cuenta como su sub-ruta. */
  if (href === "/explore") return pathname.startsWith("/explore") || pathname.startsWith("/lounges");

  return pathname.startsWith(href);
}

export interface AppShellProps {
  children: React.ReactNode;
  /**
   * El patrón 5 (Explore) ocupa la columna sin padding porque su topbar va a
   * sangre. El resto de vistas usan el padding del patrón 3.
   */
  padded?: boolean;
  /**
   * Patrón 4: la pantalla entera — sidebar incluida — se difumina detrás de un
   * diálogo. El modal vive en un portal, así que no puede aplicárselo él mismo.
   */
  blurred?: boolean;
  /** Marcador del contenedor raíz, para poder comprobar el desenfoque. */
  className?: string;
  /**
   * Story 9.1 — `MonthlyPlan.dc.html`/`Upgrade.dc.html` son la cuenta de Naomi
   * Feldstein, no la de Alexandra: "el bloque de usuario de la sidebar lo
   * dice" (`DESIGN-SYSTEM.md` §6 Fase 9). Por defecto, el miembro con sesión
   * (`useCurrentMember`).
   */
  member?: { name: string; initials: string; tier: string; photoUrl?: string | null };
}

export function AppShell({
  children,
  padded = true,
  blurred = false,
  className,
  member: memberOverride,
}: AppShellProps) {
  const currentMember = useCurrentMember();
  const member = memberOverride ?? currentMember;
  /** Las vistas que pasan `member` no traen foto: es la del miembro con sesión. */
  const photoUrl = member.photoUrl ?? currentMember.photoUrl;
  const pathname = usePathname();

  /**
   * Un diálogo de Radix vive en un portal, que el servidor no renderiza: si el
   * desenfoque viajara en el HTML, la pantalla llegaría borrosa y sin nada que
   * lo explique, y así se quedaría si el JavaScript tarda o falla. Así que el
   * desenfoque espera al cliente, donde el diálogo sí existe.
   */
  const onClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div
      data-app-shell
      className={cn(
        "flex min-h-screen w-full bg-blush-2 lg:h-screen lg:overflow-hidden",
        blurred && onClient && "blur-[3px]",
      )}
    >
      <nav
        aria-label="Member area"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex shrink-0 gap-1 border-t border-line bg-surface px-3 py-2",
          "lg:static lg:h-screen lg:w-[248px] lg:flex-col lg:gap-0 lg:border-t-0 lg:border-r lg:px-5 lg:py-8",
        )}
      >
        <Image
          src="/logo.png"
          alt="En Soleil"
          width={52}
          height={55}
          priority
          className="mb-10 ml-3 hidden h-auto w-[52px] lg:block"
        />

        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const current = isCurrent(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-nav px-3 py-2 text-[11px] font-semibold transition-colors duration-150",
                "lg:mb-1 lg:flex-none lg:flex-row lg:gap-3 lg:px-3.5 lg:py-3 lg:text-sm",
                current
                  ? "bg-accent-soft font-bold text-fg"
                  : "text-fg-muted hover:bg-accent-soft",
              )}
            >
              <Icon
                size={19}
                strokeWidth={1.6}
                className={current ? "text-accent-strong" : "text-fg-subtle"}
              />
              {label}
            </Link>
          );
        })}

        <div className="hidden flex-1 lg:block" />

        <div className="hidden items-center gap-2.5 border-t border-line px-3.5 pt-5 lg:flex">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-display text-[13px] font-bold text-on-accent"
          >
            {photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- URL firmada del bucket privado, no un <Image> con loader remoto */
              <img src={photoUrl} alt={member.name} className="size-full object-cover" />
            ) : (
              member.initials
            )}
          </span>
          <span className="flex-1 overflow-hidden">
            <span className="block truncate text-[13px] font-bold text-fg">
              {member.name}
            </span>
            <span className="mt-0.5 block text-[11.5px] text-fg-subtle">
              {member.tier}
            </span>
          </span>
          <Link href="/login" aria-label="Log out">
            <LogOut size={17} strokeWidth={1.6} className="text-fg-subtle" />
          </Link>
        </div>
      </nav>

      <main
        className={cn(
          "flex-1 pb-20 lg:h-screen lg:overflow-y-auto lg:pb-0",
          padded && "px-6 py-10 lg:px-14 lg:py-13",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}
