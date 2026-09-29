import * as React from "react";
import Image from "next/image";

/**
 * Epic 7 · Login.dc.html / SetPassword.dc.html / InviteExpired.dc.html — el
 * split de acceso de partner: las dos mitades oscuras (a diferencia de
 * `AuthSplit`, cuyo panel derecho es claro). Cada artboard trae su propia
 * frase de marca; el panel derecho recibe la tarjeta.
 */
export function PartnerAuthSplit({
  headline,
  body,
  footer,
  children,
}: {
  headline: string;
  body: string;
  footer: string;
  children: React.ReactNode;
}) {
  return (
    <div data-theme="dark" className="flex min-h-screen flex-col lg:flex-row">
      <aside className="relative flex shrink-0 flex-col justify-between overflow-hidden bg-panel-black px-8 py-10 text-center lg:min-h-screen lg:w-[600px] lg:items-start lg:px-[60px] lg:py-16 lg:text-left">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 26% 12%, #2c241c, #15110d 64%)" }}
        />
        <div aria-hidden className="dot-pattern absolute inset-0" />

        <Image src="/logo.png" alt="En Soleil" width={170} height={179} priority className="relative z-10 mx-auto w-[104px] lg:mx-0 lg:w-[170px]" />

        <div className="relative z-10 mx-auto max-w-[420px] lg:mx-0">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
            En Soleil · LuxePass
          </p>
          <h1 className="mt-4 text-[30px] leading-[1.2] text-fg lg:text-[38px]">{headline}</h1>
          <p className="mt-4.5 text-[14.5px] leading-[1.65] text-fg-muted">{body}</p>
        </div>

        <p className="relative z-10 mx-auto text-xs text-fg-subtle lg:mx-0">{footer}</p>
      </aside>

      <div className="flex flex-1 items-center justify-center bg-panel-black p-6 lg:min-h-screen lg:p-10">
        {children}
      </div>
    </div>
  );
}
