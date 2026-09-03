import { Globe, Info, Mail, Phone } from "lucide-react";

import { contactFor } from "@/lib/lounge-profile";
import type { Lounge } from "@/lib/lounges";

/** Story 3.1 — "Lounge name, address, and contact information". */
export function ContactInfo({ lounge }: { lounge: Lounge }) {
  const contact = contactFor(lounge);

  return (
    <div>
      <p className="m-0 mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
        Contact
      </p>
      <div className="flex flex-col gap-2.5">
        <p className="m-0 flex items-center gap-2.5 text-[12.5px] text-fg-muted">
          <Phone size={15} strokeWidth={1.7} className="text-fg-subtle" aria-hidden />
          {contact.phone}
        </p>
        <p className="m-0 flex items-center gap-2.5 text-[12.5px] text-fg-muted">
          <Mail size={15} strokeWidth={1.7} className="text-fg-subtle" aria-hidden />
          {contact.email}
        </p>
        <p className="m-0 flex items-center gap-2.5 text-[12.5px] text-fg-muted">
          <Globe size={15} strokeWidth={1.7} className="text-fg-subtle" aria-hidden />
          {contact.website}
        </p>
        <p className="m-0 flex items-start gap-2.5 text-[12.5px] leading-[1.5] text-fg-muted">
          <Info
            size={15}
            strokeWidth={1.7}
            className="mt-0.5 shrink-0 text-fg-subtle"
            aria-hidden
          />
          {contact.receptionNote}
        </p>
      </div>
    </div>
  );
}
