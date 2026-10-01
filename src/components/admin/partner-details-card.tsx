import { MapPin } from "lucide-react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PartnerDetailsInput } from "@/lib/admin-partners";

export const ADMIN_CARD = "rounded-content border border-line bg-dark-card px-5 py-4.5";
export const ADMIN_EYEBROW = "m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle";

export const EMPTY_PARTNER_DETAILS: PartnerDetailsInput = {
  name: "",
  contactEmail: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};

/**
 * Story 10.3 — "Partner details" de PartnerNew.dc.html (2) y
 * PartnerDetail.dc.html (3): nombre, email de contacto y el edificio central
 * en campos de texto, sin Google Maps (solo informativo). City es la ciudad
 * principal del listado.
 */
export function PartnerDetailsCard({
  value,
  onChange,
}: {
  value: PartnerDetailsInput;
  onChange: (value: PartnerDetailsInput) => void;
}) {
  const field = (key: keyof PartnerDetailsInput, label: string, options: { optional?: boolean; type?: string } = {}) => (
    <Field label={label} optional={options.optional} htmlFor={`partner-${key}`} className="mb-0">
      <Input
        id={`partner-${key}`}
        inputSize="compact"
        type={options.type ?? "text"}
        autoComplete="off"
        value={value[key]}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
      />
    </Field>
  );

  return (
    <div className={ADMIN_CARD}>
      <p className={ADMIN_EYEBROW}>Partner details</p>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {field("name", "Partner name")}
        {field("contactEmail", "Contact email", { type: "email" })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <MapPin size={15} strokeWidth={1.8} className="text-accent" aria-hidden />
        <span className="text-[12.5px] font-bold text-fg-muted">Central building</span>
        <span className="text-[11.5px] text-fg-subtle">· for reference only, members never see it</span>
      </div>
      <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
        {field("addressLine1", "Street address")}
        {field("addressLine2", "Address line 2", { optional: true })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {field("city", "City")}
        {field("region", "State / region")}
        {field("postalCode", "Postal code")}
        {field("country", "Country")}
      </div>
      <p className="mb-0 mt-2.5 text-[11.5px] text-fg-subtle">The city is the partner&apos;s main city in the partner list.</p>
    </div>
  );
}
