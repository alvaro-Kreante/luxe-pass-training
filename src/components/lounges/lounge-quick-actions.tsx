"use client";

import * as React from "react";
import { Heart, Navigation2, Phone, Share2 } from "lucide-react";

import { ShareDialog } from "@/components/lounges/share-dialog";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { addFavoriteLounge, removeFavoriteLounge } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 3.1 — Call, Directions y Share de la topbar del perfil (`Main.dc.html`,
 * `Share.dc.html`), más el favorito de la Story 6.3 (sin artboard propio en
 * esta pantalla: reutiliza el mismo botón, desviación anotada en
 * COMPONENT-MAP). Isla cliente de `/lounges/[id]` (PERF-02).
 */
const QUICK_ACTION_CLASS =
  "flex h-10 items-center gap-2 rounded-[11px] border-[1.5px] border-line bg-surface px-4 text-[12.5px] font-bold tracking-[0.06em] text-fg-muted transition-colors duration-150 hover:bg-accent-soft";

export function LoungeQuickActions({
  lounge,
  favorite: initialFavorite,
}: {
  lounge: LoungeProfile;
  favorite: boolean;
}) {
  const [shareOpen, setShareOpen] = React.useState(false);
  const [favorite, setFavorite] = React.useState(initialFavorite);
  const supabase = React.useMemo(() => createClient(), []);

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    if (next) await addFavoriteLounge(supabase, lounge.id);
    else await removeFavoriteLounge(supabase, lounge.id);
  }

  return (
    <div className="flex items-center gap-2.5">
      <a href={`tel:${lounge.phone.replace(/[^\d+]/g, "")}`} className={QUICK_ACTION_CLASS}>
        <Phone size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
        Call
      </a>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lounge.address)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={QUICK_ACTION_CLASS}
      >
        <Navigation2 size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
        Directions
      </a>
      <button type="button" onClick={() => setShareOpen(true)} className={QUICK_ACTION_CLASS}>
        <Share2 size={16} strokeWidth={1.8} className="text-gold-600" aria-hidden />
        Share
      </button>
      <button
        type="button"
        onClick={toggleFavorite}
        aria-pressed={favorite}
        className={cn(QUICK_ACTION_CLASS, favorite && "border-accent bg-accent-soft text-accent-strong")}
      >
        <Heart
          size={16}
          strokeWidth={1.8}
          className={favorite ? "fill-accent-strong text-accent-strong" : "text-gold-600"}
          aria-hidden
        />
        {favorite ? "Saved" : "Save"}
      </button>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} lounge={lounge} />
    </div>
  );
}
