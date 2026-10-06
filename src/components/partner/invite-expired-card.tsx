import Link from "next/link";
import { Clock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

/** Epic 7 · InviteExpired.dc.html — un enlace de invitación usado, caducado o inventado. */
export function InviteExpiredCard() {
  return (
    <div className="w-full max-w-[460px] rounded-panel border border-line bg-dark-card p-11 shadow-panel">
      <div className="flex size-[52px] items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-accent-strong text-accent">
        <Clock size={22} strokeWidth={1.7} />
      </div>

      <p className="m-0 mt-5.5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
        Partner invitation
      </p>
      <h2 className="mb-2 mt-3 text-[30px] text-fg">This link has expired</h2>
      <p className="m-0 text-[13.5px] leading-[1.6] text-fg-subtle">
        Invitation links work once and for 24 hours. This one has already been used or has run out
        of time.
      </p>

      <div className="mt-5.5 rounded-[14px] border border-line bg-panel-black px-4 py-3.5">
        <p className="m-0 text-[13px] leading-[1.6] text-fg-muted">
          Ask your En Soleil account manager to send a new invitation. If you already created your
          password, sign in instead.
        </p>
      </div>

      <Link href="/partner/login" className={buttonVariants({ block: true, className: "mt-6.5" })}>
        Go to sign in
      </Link>

      <div className="my-7 h-px bg-line" />

      <p className="m-0 text-xs leading-[1.65] text-fg-subtle">
        Partner accounts are issued by En Soleil —{" "}
        <span className="text-accent-strong">partners@luxepass.co</span>
      </p>
    </div>
  );
}
