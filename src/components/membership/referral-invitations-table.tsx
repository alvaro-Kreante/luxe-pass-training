import type * as React from "react";

import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import type { ReferralInvitation, ReferralStatus } from "@/lib/referrals";

/**
 * "Lista de datos clara" (patrón 25, DESIGN-SYSTEM.md §5) — gemela clara del
 * patrón 16 (fila de datos oscura). Sigue inline en vez de subir a primitivo
 * compartido, igual que su gemela oscura (`GuestListTable`/`RepeatGuests`,
 * ver "Pendiente de implementar" en COMPONENT-MAP.md): esta tabla tiene su
 * propia rejilla de 4 columnas que no coincide con ninguna otra del proyecto.
 *
 * `Referrals.dc.html` — Story 9.2 "Referral tracking and status updates".
 * Backend real: cada fila es un amigo que se registró con el código (no una
 * invitación a un email concreto — `Share.dc.html` no lo pide), así que la
 * columna "Sent" del artboard pasa a "Joined" y los estados "Invited"/
 * "Invite expired" no llegan a darse; ver COMPONENT-MAP.md.
 */
const STATUS_LABEL: Record<ReferralStatus, string> = {
  credited: "Day pass credited",
  pending: "Reward pending",
  invited: "Invited",
  expired: "Invite expired",
};

/**
 * `Referrals.dc.html` fija esta rejilla en `minmax(0, 1fr) 148px 196px 128px`
 * con `gap:14px` y `padding:0 20px` — pero medido en un navegador real a
 * 1440×900 (el propio artboard, sin tocar nuestro código) esas cifras ya
 * exceden el ancho de la columna principal (512px menos el rail de 344px y
 * el subnav de 232px deja ~470px de contenido, y 148+196+128+3×14=514 no
 * cabe): la columna "Friend" queda a 0px y el resto se solapa. Mismo defecto
 * que ya documentó COMPONENT-MAP.md para `MemberSearch.dc.html` — se reparte
 * con mínimos (`minmax`) en vez de los píxeles literales, y el hueco que
 * sobra ($24px) lo absorbe la columna de nombre en vez de partirla a 0.
 */
const GRID_STYLE: React.CSSProperties = { gridTemplateColumns: "minmax(96px,1fr) 74px 146px 100px" };

export function ReferralInvitationsTable({
  invitations,
  className,
}: {
  invitations: ReferralInvitation[];
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-content border border-line bg-surface shadow-content", className)}>
      <div className="grid items-center gap-2.5 bg-blush-1 px-5 py-2.5" style={GRID_STYLE}>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-fg-muted">Friend</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-fg-muted">Joined</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-fg-muted">Status</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-fg-muted">Your reward</span>
      </div>

      {invitations.length === 0 ? (
        <p className="m-0 border-t border-line px-5 py-4.5 text-[12.5px] text-fg-muted">
          No one has joined with your code yet.
        </p>
      ) : null}

      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          style={GRID_STYLE}
          className={cn(
            "grid h-[58px] items-center gap-2.5 border-t border-line px-5",
            invitation.recentlyChanged && "bg-accent/[0.09] shadow-[inset_3px_0_0_var(--accent)]",
            invitation.inactive && "bg-blush-1",
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full font-display text-[12.5px] font-semibold",
                invitation.inactive
                  ? "border border-line bg-surface text-fg-subtle"
                  : invitation.status === "invited"
                    ? "bg-blush-1 text-fg-subtle"
                    : "bg-accent-soft text-accent-strong",
              )}
            >
              {invitation.initials}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "m-0 truncate text-[13.5px] font-bold",
                  invitation.inactive ? "text-fg-subtle" : "text-fg",
                )}
              >
                {invitation.name}
              </p>
              <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">{invitation.email}</p>
            </div>
          </div>
          <span className={cn("text-[12.5px]", invitation.inactive ? "text-fg-subtle" : "text-fg-muted")}>
            {invitation.sentLabel}
          </span>
          <ReferralStatusChip status={invitation.status} />
          {invitation.status === "expired" ? (
            <a className="cursor-pointer text-[12.5px] font-bold text-accent-strong">Send again</a>
          ) : (
            <span
              className={cn("text-[12.5px]", invitation.status === "credited" ? "font-bold text-fg" : "text-fg-muted")}
            >
              {invitation.rewardLabel}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * "Chip de estado de referido" (DESIGN-SYSTEM.md §4, Fase 9) — el chip de
 * estado de reserva de la Fase 7 sin cambiar geometría: Day pass credited =
 * Confirmed · Reward pending = In progress · Invited = Completed · Invite
 * expired = Cancelled.
 */
function ReferralStatusChip({ status }: { status: ReferralStatus }) {
  const label = STATUS_LABEL[status];
  if (status === "credited") return <StatusChip available>{label}</StatusChip>;
  if (status === "pending") return <StatusChip emphasis>{label}</StatusChip>;
  if (status === "expired")
    return (
      <StatusChip dashed dot={false}>
        {label}
      </StatusChip>
    );
  return <StatusChip available={false}>{label}</StatusChip>;
}
