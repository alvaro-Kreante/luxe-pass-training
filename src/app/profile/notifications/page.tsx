"use client";

import * as React from "react";
import { ChevronDown, Clock, Moon } from "lucide-react";

import { AccountShell, SavedIndicatorChip } from "@/components/patterns/account-shell";
import { ChannelSettingRow } from "@/components/ui/channel-setting-row";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  NOTIFICATION_CHANNEL_SETTINGS,
  QUIET_HOURS,
  QUIET_HOURS_END_OPTIONS,
  QUIET_HOURS_START_OPTIONS,
  type NotificationChannelSetting,
} from "@/lib/notifications";

/**
 * Story 6.2 — ajustes de notificación por canal (push/email/sms), el
 * control horario del aviso matinal y las horas de silencio.
 * `NotificationSettings.dc.html`.
 */
export default function NotificationSettingsPage() {
  const [settings, setSettings] = React.useState<NotificationChannelSetting[]>(NOTIFICATION_CHANNEL_SETTINGS);
  const [quietHoursOn, setQuietHoursOn] = React.useState(true);
  const [quietStart, setQuietStart] = React.useState(QUIET_HOURS.start);
  const [quietEnd, setQuietEnd] = React.useState(QUIET_HOURS.end);

  function updateChannel(id: string, channel: "push" | "email" | "sms", checked: boolean) {
    setSettings((current) =>
      current.map((setting) => (setting.id === id ? { ...setting, [channel]: checked } : setting)),
    );
  }

  return (
    <AccountShell active="notifications" breadcrumb="Notifications" topbarRight={<SavedIndicatorChip />}>
      <h1 className="m-0 text-[34px] text-fg">Notifications</h1>
      <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
        Pick how each kind of message reaches you. Anything about a live booking always reaches you by email.
      </p>

      <div className="mt-6 flex items-center gap-4 border-b border-line pb-2.5">
        <span className="flex-1" />
        <span className="w-18 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Push</span>
        <span className="w-18 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Email</span>
        <span className="w-18 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">SMS</span>
      </div>

      {settings.map((setting) => (
        <ChannelSettingRow
          key={setting.id}
          title={setting.title}
          subtitle={setting.subtitle}
          push={setting.push}
          email={setting.email}
          sms={setting.sms}
          onChange={(channel, checked) => updateChannel(setting.id, channel, checked)}
          titleExtra={
            setting.time ? (
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 py-1.5 text-xs font-bold text-fg"
              >
                <Clock size={13} strokeWidth={1.8} className="text-gold-600" aria-hidden />
                {setting.time}
                <ChevronDown size={13} strokeWidth={1.9} className="text-fg-subtle" aria-hidden />
              </button>
            ) : undefined
          }
        />
      ))}

      <div className="mt-5 flex items-center gap-4.5 rounded-content border border-line bg-surface p-4.5 shadow-content">
        <span className="flex size-9.5 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft">
          <Moon size={19} strokeWidth={1.7} className="text-gold-600" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-bold text-fg">Quiet hours</p>
          <p className="m-0 mt-0.5 text-xs text-fg-subtle">Nothing but live booking alerts comes through</p>
        </div>
        <Select
          aria-label="Quiet hours start"
          value={quietStart}
          onChange={(e) => setQuietStart(e.target.value)}
          inputSize="compact"
          className="w-[132px] shrink-0 pl-3.5 text-[12.5px] font-bold"
        >
          {QUIET_HOURS_START_OPTIONS.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </Select>
        <span className="text-[12.5px] text-fg-subtle">to</span>
        <Select
          aria-label="Quiet hours end"
          value={quietEnd}
          onChange={(e) => setQuietEnd(e.target.value)}
          inputSize="compact"
          className="w-[132px] shrink-0 pl-3.5 text-[12.5px] font-bold"
        >
          {QUIET_HOURS_END_OPTIONS.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </Select>
        <Switch checked={quietHoursOn} onCheckedChange={setQuietHoursOn} label="Quiet hours" />
      </div>
    </AccountShell>
  );
}
