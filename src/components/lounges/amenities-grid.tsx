import { AmenityIcon } from "@/components/explore/amenity-icon";
import { amenityDescription, amenityLabel, type AmenityId } from "@/lib/amenities";

const AMENITY_NAMES: Record<AmenityId, string> = {
  wifi: "High-speed WiFi",
  "co-working": "Co-working",
  lounge: "Lounge and bar",
  spa: "Spa",
  "day-rooms": "Day rooms",
  "luggage-storage": "Luggage storage",
};

/**
 * Story 3.1 — "Amenity icons with descriptions" (Main.dc.html): icono en
 * cuadro `--gold-100` de 36px, título y una frase. Reutiliza las amenities
 * de Story 2.2 en vez de una lista propia — ver COMPONENT-MAP.md.
 */
export function AmenitiesGrid({ amenities }: { amenities: AmenityId[] }) {
  return (
    <div>
      <p className="m-0 mb-3 mt-6 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
        Amenities
      </p>
      <div className="grid grid-cols-2 gap-x-5.5 gap-y-3">
        {amenities.map((amenity) => (
          <div key={amenity} className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
              <AmenityIcon amenity={amenity} size={17} className="text-gold-600" />
            </span>
            <div>
              <p className="m-0 text-[13.5px] font-bold text-fg">
                {AMENITY_NAMES[amenity] ?? amenityLabel(amenity)}
              </p>
              <p className="m-0 mt-0.5 text-xs text-fg-subtle">
                {amenityDescription(amenity)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
