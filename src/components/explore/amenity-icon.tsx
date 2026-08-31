import {
  BedDouble,
  Flower2,
  Laptop,
  Luggage,
  Martini,
  Wifi,
  type LucideIcon,
} from "lucide-react";

import type { AmenityId } from "@/lib/amenities";

/**
 * Iconos de amenity de la card de resultado y de la lista.
 * §1 del design system fija la regla (stroke 1.6–1.8, grid 24, round), no un
 * set concreto: se usa `lucide-react`, como en el resto del proyecto.
 */
const ICONS: Record<AmenityId, LucideIcon> = {
  wifi: Wifi,
  lounge: Martini,
  spa: Flower2,
  "co-working": Laptop,
  "day-rooms": BedDouble,
  "luggage-storage": Luggage,
};

export function AmenityIcon({
  amenity,
  size = 15,
  className,
}: {
  amenity: AmenityId;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[amenity];

  return <Icon size={size} strokeWidth={1.7} aria-hidden className={className} />;
}
