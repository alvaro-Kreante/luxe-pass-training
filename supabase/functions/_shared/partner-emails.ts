// Story 7.2 / 10.7 — los emails del partner: reserva nueva, cancelación y el
// resumen de la mañana. Sin dependencias de Deno para poder testearlos con
// Vitest (`src/lib/partner-notifications.test.ts`). Desde la Story 10.7
// llegan a cada usuario activo del partner y nombran al partner y al lounge;
// el resumen agrupa por lounge cuando el partner tiene varios.

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatWeekdayDate(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateIso}T00:00:00Z`));
}

function guests(count: number): string {
  return `${count} ${count === 1 ? "guest" : "guests"}`;
}

export interface PartnerEmail {
  subject: string;
  html: string;
}

export interface PartnerBookingEventInput {
  type: "new_booking" | "cancellation";
  partnerName: string;
  loungeName: string;
  guestName: string;
  dateIso: string;
  time: string;
  reference: string;
  /** Solo en una cancelación: el recuento del día después de cancelar. */
  updatedGuestCount?: number;
}

export function renderPartnerBookingEvent(input: PartnerBookingEventInput): PartnerEmail {
  const isNew = input.type === "new_booking";
  const e = {
    partner: escape(input.partnerName),
    lounge: escape(input.loungeName),
    guest: escape(input.guestName),
    time: escape(input.time),
    reference: escape(input.reference),
  };
  const bodyLine = isNew
    ? `${e.guest} just booked ${e.time} at ${e.lounge}.`
    : `${e.guest} cancelled their ${e.time} visit. Today's count at ${e.lounge} is now ${input.updatedGuestCount ?? 0}.`;

  return {
    subject: `${isNew ? "New booking" : "Cancellation"} · ${input.time} · ${input.loungeName}`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">${e.partner} · ${e.lounge}</p>
      <h1 style="font-size:22px;color:#1a1a1a;">${isNew ? "New booking" : "Cancellation"}</h1>
      <p style="font-size:14px;color:#4a4a4a;line-height:1.6;">${bodyLine}</p>
      <table style="width:100%;font-size:13px;color:#4a4a4a;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 0;"><strong>Guest</strong></td><td>${e.guest}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Lounge</strong></td><td>${e.lounge}</td></tr>
        <tr><td style="padding:4px 0;"><strong>When</strong></td><td>${formatWeekdayDate(input.dateIso)}, ${e.time}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Reference</strong></td><td>${e.reference}</td></tr>
      </table>
    </div>
  `,
  };
}

export interface PartnerDigestLounge {
  loungeName: string;
  guestCount: number;
  guests: { name: string; slotTime: string }[];
}

export interface PartnerDigestInput {
  partnerName: string;
  dateIso: string;
  lounges: PartnerDigestLounge[];
}

export function renderPartnerDigest(input: PartnerDigestInput): PartnerEmail {
  const total = input.lounges.reduce((sum, lounge) => sum + lounge.guestCount, 0);
  const single = input.lounges.length === 1;
  const subject = single
    ? `Today at ${input.lounges[0].loungeName} · ${guests(total)} expected`
    : `Today at ${input.partnerName} · ${guests(total)} across ${input.lounges.length} lounges`;

  const sections = input.lounges
    .map((lounge) => {
      const rows = lounge.guests
        .map(
          (guest) => `
          <tr>
            <td style="padding:6px 0;font-weight:bold;width:96px;">${escape(guest.slotTime)}</td>
            <td style="padding:6px 0;">${escape(guest.name)}</td>
          </tr>`,
        )
        .join("");
      return `
      <h2 style="font-size:16px;color:#1a1a1a;margin:22px 0 4px;">${escape(lounge.loungeName)} · ${guests(lounge.guestCount)}</h2>
      <table style="width:100%;font-size:13px;color:#4a4a4a;border-collapse:collapse;">
        ${rows || `<tr><td style="padding:6px 0;">No guests expected today.</td></tr>`}
      </table>`;
    })
    .join("");

  return {
    subject,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">${escape(input.partnerName)}</p>
      <h1 style="font-size:24px;color:#1a1a1a;">${formatWeekdayDate(input.dateIso)} · ${guests(total)} expected</h1>
      <p style="font-size:14px;color:#4a4a4a;line-height:1.6;">Good morning. Here is today's guest list as it stands at 6:30 AM.</p>
      ${sections}
    </div>
  `,
  };
}
