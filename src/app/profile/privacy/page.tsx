"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, PhoneCall } from "lucide-react";

import { DeleteAccountModal } from "@/components/account/delete-account-modal";
import { RequireSession } from "@/components/onboarding/require-session";
import { AccountShell, SavedIndicatorChip } from "@/components/patterns/account-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { downloadTextFile } from "@/lib/download";
import {
  exportMemberData,
  fetchEmergencyContact,
  fetchPrivacySettings,
  fetchProfile,
  requestAccountDeletion,
  updatePrivacySettings,
  type EmergencyContact,
  type PrivacySettings,
} from "@/lib/profile";
import { fetchPastBookings, fetchUpcomingBookings, type PastBooking } from "@/lib/passes";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 6.3 — "Privacy settings for data usage", "Export personal data
 * option (GDPR compliance)" y "Account deletion option with confirmation".
 * `Privacy.dc.html`, backend real (autoguarda cada switch).
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

const DEFAULT_SETTINGS: PrivacySettings = {
  personalizedRecommendations: true,
  shareWithLounge: true,
  productResearch: false,
  marketingAnalytics: false,
};

const NO_EMERGENCY_CONTACT: EmergencyContact = { name: null, relation: null, phone: null };

export default function PrivacyPage() {
  return (
    <RequireSession>
      <PrivacyScreen />
    </RequireSession>
  );
}

function PrivacyScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [settings, setSettings] = React.useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [emergencyContact, setEmergencyContact] = React.useState<EmergencyContact>(NO_EMERGENCY_CONTACT);
  const [memberName, setMemberName] = React.useState("");
  const [upcomingBookingsCount, setUpcomingBookingsCount] = React.useState(0);
  const [pastBookings, setPastBookings] = React.useState<PastBooking[]>([]);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    Promise.all([
      fetchPrivacySettings(supabase),
      fetchEmergencyContact(supabase),
      fetchProfile(supabase),
      fetchUpcomingBookings(supabase),
      fetchPastBookings(supabase),
    ]).then(([privacy, contact, profile, upcoming, past]) => {
      if (!active) return;
      setSettings(privacy);
      setEmergencyContact(contact);
      setMemberName(profile.fullName);
      setUpcomingBookingsCount(upcoming.filter((booking) => booking.status !== "in-progress").length);
      setPastBookings(past);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  async function toggle(key: keyof PrivacySettings, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
    await updatePrivacySettings(supabase, { [key]: value });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const bundle = await exportMemberData(supabase);
      downloadTextFile(
        "luxepass-data-export.json",
        JSON.stringify(bundle, null, 2),
        "application/json;charset=utf-8",
      );
    } finally {
      setExporting(false);
    }
  }

  function handleDownloadHistory() {
    const rows = pastBookings.map(
      (booking) => `${booking.reference},"${booking.loungeName}","${booking.dateTimeLabel}",${booking.outcome}`,
    );
    downloadTextFile("luxepass-booking-history.csv", ["Reference,Lounge,When,Outcome", ...rows].join("\n"));
  }

  async function handleConfirmDelete() {
    await requestAccountDeletion(supabase);
    await supabase.auth.signOut();
    router.push("/login");
  }

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
          <Switch checked={settings[key]} onCheckedChange={(checked) => toggle(key, checked)} label={title} />
        </div>
      ))}

      <div className="mt-4 flex items-center gap-4 rounded-content border border-dashed border-accent-strong bg-surface p-4.5">
        <span className="flex size-9.5 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft">
          <PhoneCall size={18} strokeWidth={1.7} className="text-gold-600" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-bold text-fg">
            {emergencyContact.name
              ? `Emergency contact · ${emergencyContact.name} · ${emergencyContact.phone}`
              : "No emergency contact on file"}
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
              Profile, favorites, bookings and notifications in a machine-readable file, downloaded straight away
              — no waiting on an email.
            </p>
          </div>
          <Button variant="secondary" size="md" type="button" className="normal-case" onClick={handleExport} disabled={exporting}>
            {exporting ? "Preparing…" : "Request export"}
          </Button>
        </div>

        <div className="flex items-center gap-3.5 rounded-content border border-line bg-surface p-4">
          <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
            <FileText size={17} strokeWidth={1.7} className="text-gold-600" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13.5px] font-bold text-fg">Download your booking history</p>
            <p className="m-0 mt-0.5 text-xs text-fg-subtle">A CSV of all {pastBookings.length} past visits, ready straight away</p>
          </div>
          <Button variant="secondary" size="md" type="button" className="normal-case" onClick={handleDownloadHistory}>
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
        memberName={memberName}
        upcomingBookingsCount={upcomingBookingsCount}
        onConfirmDelete={handleConfirmDelete}
      />
    </AccountShell>
  );
}
