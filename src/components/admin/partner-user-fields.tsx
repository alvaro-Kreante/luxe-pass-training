import { Lock } from "lucide-react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PartnerMemberInput } from "@/lib/admin-partners";

export const EMPTY_PARTNER_USER: PartnerMemberInput = { firstName: "", lastName: "", email: "", mobile: "" };

/**
 * Story 10.3 — los cuatro campos de un usuario partner en una fila, la misma
 * lógica que el formulario de partners del lounge (LoungePartnersMain.dc.html
 * 23). Al editar (PartnerUserEdit.dc.html 4) el email queda bloqueado: es el
 * inicio de sesión.
 */
export function PartnerUserFields({
  value,
  onChange,
  emailLocked = false,
}: {
  value: PartnerMemberInput;
  onChange: (value: PartnerMemberInput) => void;
  emailLocked?: boolean;
}) {
  const set = (key: keyof PartnerMemberInput) => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: event.target.value });

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Field label="First name" htmlFor="partner-user-first" className="mb-0">
        <Input id="partner-user-first" inputSize="compact" autoComplete="off" value={value.firstName} onChange={set("firstName")} />
      </Field>
      <Field label="Last name" htmlFor="partner-user-last" className="mb-0">
        <Input id="partner-user-last" inputSize="compact" autoComplete="off" value={value.lastName} onChange={set("lastName")} />
      </Field>
      <Field label="Work email" htmlFor="partner-user-email" className="mb-0">
        <Input
          id="partner-user-email"
          inputSize="compact"
          type="email"
          autoComplete="off"
          value={value.email}
          onChange={set("email")}
          readOnly={emailLocked}
          trailing={emailLocked ? <Lock size={13} strokeWidth={1.8} aria-hidden /> : undefined}
          className={emailLocked ? "border-dashed bg-transparent text-fg-subtle" : undefined}
        />
      </Field>
      <Field label="Mobile" optional htmlFor="partner-user-mobile" className="mb-0">
        <Input id="partner-user-mobile" inputSize="compact" type="tel" autoComplete="off" value={value.mobile} onChange={set("mobile")} />
      </Field>
    </div>
  );
}
