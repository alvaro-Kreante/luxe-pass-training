import Link from "next/link";

/** Miga de la top bar de las pantallas de partner: Partners › {nombre}. */
export function PartnerBreadcrumb({ name }: { name: string }) {
  return (
    <>
      <Link href="/admin/partners" className="text-[13.5px] font-bold text-fg-subtle transition-colors duration-150 hover:text-accent">
        Partners
      </Link>
      <span className="text-[13.5px] text-fg-subtle">›</span>
      <span className="text-[13.5px] font-bold text-fg">{name}</span>
    </>
  );
}

/**
 * Cabecera de PartnerNew.dc.html (2) y PartnerDetail.dc.html (3): iniciales
 * del partner, nombre, status y acciones — misma anatomía que la cabecera de
 * lounge de la Fase 8 (LoungeLive 17).
 */
export function PartnerHeader({
  name,
  status,
  meta,
  actions,
}: {
  name: string;
  status: React.ReactNode;
  meta: string;
  actions: React.ReactNode;
}) {
  const initials = name
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-line pb-5">
      <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl border border-gold-600 bg-accent/14 font-display text-xl text-accent">
        {initials || "—"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="m-0 font-display text-[22px] text-fg">{name}</h1>
          {status}
        </div>
        <p className="mt-1.5 text-[12.5px] text-fg-subtle">{meta}</p>
      </div>
      <div className="flex items-center gap-2.5">{actions}</div>
    </div>
  );
}

export function DraftStatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-dashed border-fg-subtle px-3 py-1.5 text-[11.5px] font-bold text-fg-muted">
      {children}
    </span>
  );
}
