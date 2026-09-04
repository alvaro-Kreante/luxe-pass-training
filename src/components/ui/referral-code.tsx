"use client";

import * as React from "react";
import { Copy } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Código de referido. Caja de 50px con borde
 * discontinuo dorado, el código en 15px/800 y un botón "Copy" de 36px.
 */
export function ReferralCode({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }

  return (
    <div
      className={cn(
        "flex h-[50px] items-center gap-2.5 rounded-control border-[1.5px] border-dashed border-accent bg-surface-subtle pl-4 pr-2",
        className,
      )}
    >
      <span className="flex-1 font-display text-[15px] font-extrabold tracking-[0.1em] text-fg">{code}</span>
      <button
        type="button"
        onClick={copy}
        className={cn(buttonVariants({ variant: "secondary", size: "md" }), "h-9 px-3 text-xs")}
      >
        <Copy size={14} strokeWidth={1.8} className="text-gold-600" aria-hidden />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
