"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";

/**
 * Epic 7 · SetPassword.dc.html — "Profile photo". La foto elegida se ve en
 * el círculo al instante (data URL local); solo se sube al crear la cuenta.
 */
export function PartnerPhotoPicker({
  initials,
  currentUrl,
  file,
  onChange,
  disabled,
}: {
  initials: string;
  currentUrl: string | null;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = React.useState<{ file: File; url: string } | null>(null);

  React.useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreview({ file, url: reader.result });
    };
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);

  const shown = (file && preview?.file === file ? preview.url : null) ?? currentUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-16 shrink-0">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL local, next/image no aporta nada
          <img src={shown} alt="Your photo" className="size-16 rounded-full border-[1.5px] border-accent object-cover" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full border-[1.5px] border-dashed border-accent-strong bg-panel-black font-display text-[22px] text-accent">
            {initials}
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-dark-card bg-accent text-white">
          {shown ? <Pencil size={11} strokeWidth={2.4} /> : <Plus size={12} strokeWidth={2.6} />}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="m-0 text-[13px] font-semibold text-fg-muted">
          Profile photo{" "}
          <span className="font-medium text-fg-subtle">· {file ? file.name : "optional"}</span>
        </p>
        <p className="m-0 mt-1 text-xs text-fg-subtle">
          {file
            ? "Preview only until you create the account. JPG or PNG, up to 5 MB."
            : "JPG or PNG, up to 5 MB. Shown next to your name in the dashboard."}
        </p>
      </div>

      <label className="flex h-10 shrink-0 cursor-pointer items-center rounded-[11px] border-[1.5px] border-line px-4 text-xs font-bold tracking-[0.06em] text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover">
        {shown ? "Change photo" : "Upload photo"}
        <input
          type="file"
          accept="image/png,image/jpeg"
          aria-label="Upload photo"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
