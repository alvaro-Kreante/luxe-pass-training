"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, PhoneCall } from "lucide-react";

import { DeleteAccountModal } from "@/components/account/delete-account-modal";
import { AccountShell, SavedIndicatorChip } from "@/components/patterns/account-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DATA_EXPORT_EMAIL_HOURS,
  DATA_EXPORT_LINK_VALID_DAYS,
  EMERGENCY_CONTACT,
  SAMPLE_PRIVACY_SETTINGS,
  type PrivacySettings,
} from "@/lib/profile";
import { BOOKING_RECORD_SUMMARY } from "@/lib/passes";

/**
 * Story 6.3 — "Privacy settings for data usage", "Export personal data
 * option (GDPR compliance)" y "Account deletion option with confirmation".
 * `Privacy.dc.html`.
 */
const TOGGLES: { key: keyof PrivacySettings; title: string; subtitle: string }[] = [
  {
    key: "personalizedRecommendations",
    title: "Personalised recommendations",
    subtitle: "Your visits and preferences order what you see in Explore",
  },
  {
    key: "shareWithLounge",
    title: "Share your details with the lounge you booked",
    subtitle: "Reception sees your name, arrival time and any special request. Turn this off and you check in by number only.",
  },
  { key: "productResearch", title: "Product research", subtitle: "Occasional surveys and interview invitations" },
  { key: "marketingAnalytics", title: "Marketing analytics", subtitle: "Measuring how members find and use Luxe Pass" },
];

export default function PrivacyPage() {
  const router = useRouter();
  const [settings, setSettings] = React.useState<PrivacySettings>(SAMPLE_PRIVACY_SETTINGS);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <AccountShell active="privacy" breadcrumb="Privacy and data" topbarRight={<SavedIndicatorChip />}>
      <h1 className="m-0 text-[34px] text-fg">Privacy and data</h1>
      <p className="m-0 mt-2 text-[13.5px] text-fg-muted">
        What we do with your data, what the lounge sees, and how to take it all with you.
      </p>

      <p className="m-0 mt-5.5 mb-1 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">How your data is used</p>
      {TOGGLES.map(({ key, title, subtitle }) => (
        <div key={key} className="flex items-center gap-4.5 border-b border-line py-2.5">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-bold text-fg">{title}</p>
            <p className="m-0 mt-0.5 text-xs text-fg-subtle">{subtitle}</p>
          </div>
          <Switch
            checked={settings[key]}
            onCheckedChange={(checked) => setSettings((current) => ({ ...current, [key]: checked }))}
            label={title}
          />
        </div>
      ))}

      <div className="mt-4 flex items-center gap-4 rounded-content border border-dashed border-accent-strong bg-surface p-4.5">
        <span className="flex size-9.5 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft">
          <PhoneCall size={18} strokeWidth={1.7} className="text-gold-600" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-bold text-fg">
            Emergency contact · {EMERGENCY_CONTACT.name} · {EMERGENCY_CONTACT.phone}
          </p>
          <p className="m-0 mt-0.5 text-xs text-fg-subtle">
            Reception can open it only while you are inside the lounge, and every time it is opened we record who
            did it and when.
          </p>
        </div>
        <Button variant="secondary" size="md" type="button" className="normal-case">
          Edit
        </Button>
      </div>

      <p className="m-0 mt-5 mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">Your data</p>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3.5 rounded-content border border-line bg-surface p-4">
          <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
            <Download size={17} strokeWidth={1.7} className="text-gold-600" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13.5px] font-bold text-fg">Export your personal data</p>
            <p className="m-0 mt-0.5 text-xs text-fg-subtle">
              Profile, bookings, preferences and messages in a machine-readable file. We email a link within{" "}
              {DATA_EXPORT_EMAIL_HOURS} hours; it stays valid for {DATA_EXPORT_LINK_VALID_DAYS} days.
            </p>
          </div>
          <Button variant="secondary" size="md" type="button" className="normal-case">
            Request export
          </Button>
        </div>

        <div className="flex items-center gap-3.5 rounded-content border border-line bg-surface p-4">
          <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
            <FileText size={17} strokeWidth={1.7} className="text-gold-600" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13.5px] font-bold text-fg">Download your booking history</p>
            <p className="m-0 mt-0.5 text-xs text-fg-subtle">
              A CSV of all {BOOKING_RECORD_SUMMARY.totalVisits} visits, ready straight away
            </p>
          </div>
          <Button variant="secondary" size="md" type="button" className="normal-case">
            Download
          </Button>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-4.5 rounded-content border border-dashed border-fg-subtle bg-surface-sunken p-4.5">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13.5px] font-bold text-fg">Delete your account</p>
          <p className="m-0 mt-0.5 text-xs text-fg-subtle">
            Ends your membership, cancels your upcoming bookings and removes your data after 30 days. Export it
            first if you want to keep it.
          </p>
        </div>
        <Button variant="secondary" size="md" type="button" className="normal-case" onClick={() => setDeleteOpen(true)}>
          Delete account
        </Button>
      </div>

      <DeleteAccountModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirmDelete={() => {
          setDeleteOpen(false);
          router.push("/login");
        }}
      />
    </AccountShell>
  );
}
