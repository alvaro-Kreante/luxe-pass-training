"use client";

import * as React from "react";

import { AlwaysOnChip, Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type ChannelValue = boolean | "always";

/**
 * DESIGN-SYSTEM.md §4 — Fila de ajuste por canal. Título 14px/700, subtítulo
 * 12px `--ink-400` y tres columnas fijas de 72px (Push · Email · SMS) con el
 * switch o el chip "Always". `NotificationSettings.dc.html`.
 */
export function ChannelSettingRow({
  title,
  subtitle,
  push,
  email,
  sms,
  onChange,
  titleExtra,
  className,
}: {
  title: string;
  subtitle: string;
  push: ChannelValue;
  email: ChannelValue;
  sms: ChannelValue;
  onChange: (channel: "push" | "email" | "sms", checked: boolean) => void;
  titleExtra?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 border-b border-line py-3.5 last:border-b-0", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <p className="m-0 text-sm font-bold text-fg">{title}</p>
          {titleExtra}
        </div>
        <p className="m-0 mt-1 text-xs text-fg-subtle">{subtitle}</p>
      </div>
      <ChannelCell value={push} onChange={(checked) => onChange("push", checked)} label={`Push for ${title}`} />
      <ChannelCell value={email} onChange={(checked) => onChange("email", checked)} label={`Email for ${title}`} />
      <ChannelCell value={sms} onChange={(checked) => onChange("sms", checked)} label={`SMS for ${title}`} />
    </div>
  );
}

function ChannelCell({
  value,
  onChange,
  label,
}: {
  value: ChannelValue;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex w-[72px] shrink-0 justify-center">
      {value === "always" ? <AlwaysOnChip /> : <Switch checked={value} onCheckedChange={onChange} label={label} />}
    </div>
  );
}
