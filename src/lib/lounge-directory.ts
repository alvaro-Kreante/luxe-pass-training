import type { SupabaseClient } from "@supabase/supabase-js";

import { AMENITIES, type AmenityId } from "./amenities";
import { today, type TimeBand } from "./availability";
import { haversineMiles, type Coordinates } from "./distance";

/**
 * Story 2.1 — catálogo real de lounges (tabla `public.lounges`). Sustituye a
 * `LOUNGES`/`loungesIn` de `lib/lounges.ts` (que sigue siendo el mock de
 * Epic 3-9) solo para /explore. Ver `supabase/schemas/lounges.sql`.
 */
export interface LoungeRow {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  cityId: string;
  lat: number;
  lng: number;
  amenities: AmenityId[];
  rating: number;
  /** Instantánea sembrada por migración, no en vivo — ver COMPONENT-MAP.md. */
  openNow: boolean;
  /** Plazas libres hoy (today()), sumando sus franjas abiertas — `lounge_seats_on`. */
  slotsToday: number;
  hours: string;
  bands: TimeBand[];
  closedWeekdays: number[];
  featured: boolean;
  /**
   * Story 10.8 — el partner que lo opera (hotel, spa…), como contexto bajo el
   * nombre. null si no tiene; opcional para los datos de muestra del mock.
   */
  partnerName?: string | null;
  /**
   * Story 3.1 / 10.10 — la foto principal (`lounge_images` de menor
   * `position`). Opcional para los datos de muestra del mock.
   */
  mainImageUrl?: string | null;
}

export interface LoungeWithDistance extends LoungeRow {
  distanceMiles: number;
}

interface LoungeTableRow {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  city_id: string;
  lat: number;
  lng: number;
  amenities: string[];
  rating: number;
  open_now: boolean;
  slots_today: number;
  hours: string;
  bands: string[];
  closed_weekdays: number[];
  featured: boolean;
  partners: { name: string } | null;
  lounge_images: { url: string; position: number }[] | null;
}

const LOUNGE_COLUMNS = "*, partners(name), lounge_images(url, position)";

function mainImageOf(images: LoungeTableRow["lounge_images"]): string | null {
  if (!images || images.length === 0) return null;
  return images.reduce((first, image) => (image.position < first.position ? image : first)).url;
}

function fromRow(row: LoungeTableRow): LoungeRow {
  return {
    id: row.id,
    name: row.name,
    neighborhood: row.neighborhood,
    city: row.city,
    cityId: row.city_id,
    lat: row.lat,
    lng: row.lng,
    amenities: row.amenities as AmenityId[],
    rating: row.rating,
    openNow: row.open_now,
    slotsToday: row.slots_today,
    hours: row.hours,
    bands: row.bands as TimeBand[],
    closedWeekdays: row.closed_weekdays,
    featured: row.featured,
    partnerName: row.partners?.name ?? null,
    mainImageUrl: mainImageOf(row.lounge_images),
  };
}

/**
 * El catálogo completo (17 lounges hoy): con este tamaño, filtrar por ciudad
 * o amenities en TS en vez de en la query no cuesta nada, y evita repetir la
 * petición cada vez que cambian los filtros.
 */
export async function fetchLounges(
  supabase: SupabaseClient,
): Promise<LoungeRow[]> {
  // La policy de `lounges` deja ver un borrador a sus partners y a quien
  // tiene reserva allí (Epic 8, editar un lounge live) — el catálogo solo
  // muestra los publicados.
  // Story 10.8 — solo `name` del partner: el miembro no puede leer nada más (privilegio por columna).
  const [{ data, error }, seats] = await Promise.all([
    supabase.from("lounges").select(LOUNGE_COLUMNS).eq("content_status", "live"),
    seatsToday(supabase),
  ]);

  if (error) throw error;

  return withSeats((data as LoungeTableRow[]).map(fromRow), seats);
}

/**
 * La disponibilidad real de hoy, no la columna `slots_today` (instantánea del
 * mock con la que un lounge nuevo nacía "Full").
 */
async function seatsToday(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("lounge_seats_on", { p_date: today() });

  if (error) throw error;

  return new Map(
    ((data ?? []) as { lounge_id: string; seats_left: number }[]).map((row) => [
      row.lounge_id,
      row.seats_left,
    ]),
  );
}

function withSeats(lounges: LoungeRow[], seats: Map<string, number>): LoungeRow[] {
  return lounges.map((lounge) => ({ ...lounge, slotsToday: seats.get(lounge.id) ?? 0 }));
}

/**
 * Story 2.2 — "Search by lounge name, location, or amenities", contra la
 * tabla y no sobre lo ya cargado: nombre, barrio y ciudad por `ilike`, y
 * amenities por su nombre visible (`AMENITIES`), que en la tabla se guardan
 * como id. Los caracteres con significado en el filtro de PostgREST
 * (`,()*%\`) se quitan: forman parte de la sintaxis, no de lo que se busca.
 */
export async function searchLounges(
  supabase: SupabaseClient,
  query: string,
): Promise<LoungeRow[]> {
  const term = query.replace(/[,()*%\\]/g, " ").trim();
  if (term === "") return [];

  const pattern = `*${term}*`;
  const amenityIds = AMENITIES.filter((amenity) =>
    amenity.label.toLowerCase().includes(term.toLowerCase()),
  ).map((amenity) => amenity.id);

  const conditions = [
    `name.ilike.${pattern}`,
    `neighborhood.ilike.${pattern}`,
    `city.ilike.${pattern}`,
    ...(amenityIds.length > 0 ? [`amenities.ov.{${amenityIds.join(",")}}`] : []),
  ];

  const [{ data, error }, seats] = await Promise.all([
    supabase
      .from("lounges")
      .select(LOUNGE_COLUMNS)
      .eq("content_status", "live")
      .or(conditions.join(",")),
    seatsToday(supabase),
  ]);

  if (error) throw error;

  return withSeats((data as LoungeTableRow[]).map(fromRow), seats);
}

/** Añade la distancia real desde `origin` y ordena de más cerca a más lejos. */
export function withDistance(
  lounges: LoungeRow[],
  origin: Coordinates,
): LoungeWithDistance[] {
  return lounges
    .map((lounge) => ({
      ...lounge,
      distanceMiles: haversineMiles(origin, { lat: lounge.lat, lng: lounge.lng }),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}
