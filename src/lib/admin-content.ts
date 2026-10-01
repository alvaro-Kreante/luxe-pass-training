import type { SupabaseClient } from "@supabase/supabase-js";

import {
  closedWeekdaysFromHours,
  hoursSummary,
  loungeIdFromName,
  type LoungeDraftInput,
} from "@/lib/lounge-draft";

/**
 * Epic 8 — Admin & Support. Story 8.3 (Fase 2, `epic-8-admin-support/`):
 * gestión de contenido de lounges y su flujo de aprobación.
 *
 * Backend real (22 sept 2026, ver CLAUDE.md §Alcance y
 * docs/design/COMPONENT-MAP.md): CRUD real sobre `lounges`/`lounge_images`
 * (Epic 2/3) vía las RPC de `supabase/schemas/admin_content.sql`. El estado
 * de publicación (`lounges.content_status`) es ortogonal a si hay un
 * cambio pendiente de aprobar (`lounge_content_submissions`, nace aquí) —
 * un lounge "live" con una edición en revisión sigue mostrando su
 * contenido publicado a los miembros hasta que se apruebe.
 *
 * "Add lounge" (25 sept 2026, artboards 14 y 15): un lounge nuevo nace
 * borrador y se publica directo, sin cola de aprobación — ver
 * `createLoungeDraft`/`publishLounge`. "Image optimization and resizing" no
 * es real: la subida a Storage sí lo es, pero no hay redimensionado de
 * verdad detrás — desviación anotada en `docs/design/COMPONENT-MAP.md`.
 */

export type LoungeContentStatus = "live" | "draft" | "archived" | "suspended";

/** Fila cruda de `admin_lounge_list`. */
export interface AdminLoungeListRow {
  id: string;
  name: string;
  area: string;
  capacity: number;
  content_status: LoungeContentStatus;
  pending_count: number;
  photos_count: number;
  amenities_count: number;
  updated_at: string;
  city: string;
  created_at: string;
}

export interface AdminLoungeRow {
  id: string;
  name: string;
  area: string;
  capacity: number;
  contentStatus: LoungeContentStatus;
  pendingCount: number;
  photosCount: number;
  amenitiesCount: number;
  updatedLabel: string;
  city: string;
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

export function mapLoungeListRow(row: AdminLoungeListRow): AdminLoungeRow {
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    capacity: row.capacity,
    contentStatus: row.content_status,
    pendingCount: row.pending_count,
    photosCount: row.photos_count,
    amenitiesCount: row.amenities_count ?? 0,
    updatedLabel: formatShortDate(row.updated_at),
    city: row.city,
  };
}

export async function listAdminLounges(supabase: SupabaseClient): Promise<AdminLoungeRow[]> {
  const { data, error } = await supabase.rpc("admin_lounge_list");
  if (error) throw error;
  return (data as AdminLoungeListRow[]).map(mapLoungeListRow);
}

export async function archiveLounges(supabase: SupabaseClient, loungeIds: string[]): Promise<void> {
  const { error } = await supabase.rpc("admin_archive_lounges", { p_lounge_ids: loungeIds });
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Ficha de contenido de un lounge (LoungeEdit.dc.html)                 */
/* ------------------------------------------------------------------ */

export interface LoungeImage {
  id: string;
  url: string;
  caption: string;
  detail: string | null;
  position: number;
}

export interface LoungeClosure {
  id: string;
  startsOn: string;
  endsOn: string;
  reason: string;
  reopensLabel: string;
}

/** Lo que puede llevar una propuesta de cambio — todas las claves opcionales, solo se aplican las presentes. */
export interface ProposedLoungeContent {
  amenities?: string[];
  bands?: string[];
  closed_weekdays?: number[];
  weekly_hours?: string[];
  booking_restrictions?: string[];
  capacity?: number;
  photos?: { url: string; caption: string }[];
  publish?: boolean;
}

export interface LoungeContentDetail {
  id: string;
  name: string;
  area: string;
  capacity: number;
  contentStatus: LoungeContentStatus;
  amenities: string[];
  bands: string[];
  closedWeekdays: number[];
  weeklyHours: string[];
  bookingRestrictions: string[];
  images: LoungeImage[];
  closures: LoungeClosure[];
  phone: string;
  email: string;
  website: string;
  address: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
  pendingSubmissionId: string | null;
  pendingProposed: ProposedLoungeContent | null;
  pendingSubmittedBy: string | null;
  pendingSubmittedAt: string | null;
}

interface AdminLoungeDetailRow {
  id: string;
  name: string;
  area: string;
  capacity: number;
  content_status: LoungeContentStatus;
  amenities: string[];
  bands: string[];
  closed_weekdays: number[];
  weekly_hours: string[];
  booking_restrictions: string[];
  images: { id: string; url: string; caption: string; detail: string | null; position: number }[];
  closures: { id: string; starts_on: string; ends_on: string; reason: string; reopens_label: string }[];
  phone: string;
  email: string;
  website: string;
  address: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
  pending_submission_id: string | null;
  pending_proposed: ProposedLoungeContent | null;
  pending_submitted_by: string | null;
  pending_submitted_at: string | null;
}

function mapLoungeDetailRow(row: AdminLoungeDetailRow): LoungeContentDetail {
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    capacity: row.capacity,
    contentStatus: row.content_status,
    amenities: row.amenities,
    bands: row.bands,
    closedWeekdays: row.closed_weekdays,
    weeklyHours: row.weekly_hours,
    bookingRestrictions: row.booking_restrictions,
    images: row.images.map((i) => ({ id: i.id, url: i.url, caption: i.caption, detail: i.detail ?? null, position: i.position })),
    closures: row.closures.map((c) => ({
      id: c.id,
      startsOn: c.starts_on,
      endsOn: c.ends_on,
      reason: c.reason,
      reopensLabel: c.reopens_label,
    })),
    phone: row.phone,
    email: row.email,
    website: row.website,
    address: row.address,
    neighborhood: row.neighborhood,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    pendingSubmissionId: row.pending_submission_id,
    pendingProposed: row.pending_proposed,
    pendingSubmittedBy: row.pending_submitted_by,
    pendingSubmittedAt: row.pending_submitted_at,
  };
}

export async function getLoungeContentDetail(
  supabase: SupabaseClient,
  loungeId: string,
): Promise<LoungeContentDetail | undefined> {
  const { data, error } = await supabase.rpc("admin_lounge_detail", { p_lounge_id: loungeId });
  if (error) throw error;
  const row = (data as AdminLoungeDetailRow[])[0];
  return row ? mapLoungeDetailRow(row) : undefined;
}

/* ------------------------------------------------------------------ */
/* Alta de un lounge (LoungeNew.dc.html / PhotoCaption.dc.html)         */
/* ------------------------------------------------------------------ */

function draftPayload(input: LoungeDraftInput) {
  return {
    id_base: loungeIdFromName(input.name),
    name: input.name,
    phone: input.phone,
    email: input.email,
    website: input.website,
    address: input.location?.address ?? "",
    neighborhood: input.location?.neighborhood ?? "",
    city: input.location?.city ?? "",
    lat: input.location?.lat ?? null,
    lng: input.location?.lng ?? null,
    weekly_hours: input.weeklyHours,
    closed_weekdays: closedWeekdaysFromHours(input.weeklyHours),
    hours: hoursSummary(input.weeklyHours),
    amenities: input.amenities,
    capacity: input.capacity,
    booking_restrictions: input.bookingRestrictions,
  };
}

/** Crea el lounge como borrador (invisible para los miembros) y devuelve su id. */
export async function createLoungeDraft(supabase: SupabaseClient, input: LoungeDraftInput): Promise<string> {
  const { data, error } = await supabase.rpc("admin_create_lounge", { p_lounge: draftPayload(input) });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Solo para borradores — la dirección incluida. Un lounge publicado se edita con la propuesta de cambios. */
export async function updateLoungeDraft(
  supabase: SupabaseClient,
  loungeId: string,
  input: LoungeDraftInput,
): Promise<void> {
  const { error } = await supabase.rpc("admin_update_draft_lounge", {
    p_lounge_id: loungeId,
    p_lounge: draftPayload(input),
  });
  if (error) throw new Error(error.message);
}

export interface DraftPhoto {
  url: string;
  caption: string;
  detail: string | null;
}

/** El orden es la posición: la primera es la foto principal. */
export async function setDraftLoungePhotos(
  supabase: SupabaseClient,
  loungeId: string,
  photos: DraftPhoto[],
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_draft_lounge_photos", {
    p_lounge_id: loungeId,
    p_photos: photos,
  });
  if (error) throw new Error(error.message);
}

/** Epic 8 · LoungeEditConfirm.dc.html — el lounge vuelve a borrador para editarlo. */
export async function unpublishLounge(supabase: SupabaseClient, loungeId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_unpublish_lounge", { p_lounge_id: loungeId });
  if (error) throw new Error(error.message);
}

/**
 * Story 10.1 — publicar ya no crea cuentas ni invita a nadie: exige un
 * partner activo, que invitó a sus usuarios al activarse (Story 10.4).
 */
export async function publishLounge(supabase: SupabaseClient, loungeId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_publish_lounge", { p_lounge_id: loungeId });
  if (error) throw new Error(error.message);
}

/** Story 8.3 — "Upload and manage lounge images". Sube el archivo al bucket público `lounge-images` y devuelve su URL pública. */
export async function uploadLoungeImage(
  supabase: SupabaseClient,
  loungeId: string,
  file: File,
): Promise<string> {
  const path = `${loungeId}/${Date.now()}-${file.name}`;
  // `file` directamente como body deja que el propio Blob decida su
  // Content-Type (en jsdom, con `userEvent.upload`, siempre resuelve a
  // "text/plain" sin importar `file.type`) — se manda como bytes crudos
  // para que el único Content-Type real sea el que se pasa aquí.
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from("lounge-images")
    .upload(path, bytes, { contentType: file.type || "image/jpeg" });
  if (error) throw error;
  const {
    data: { publicUrl },
  } = supabase.storage.from("lounge-images").getPublicUrl(path);
  return publicUrl;
}

export function loungeStatusLabel(lounge: Pick<AdminLoungeRow, "contentStatus">): string {
  if (lounge.contentStatus === "draft") return "Draft";
  if (lounge.contentStatus === "archived") return "Archived";
  return "Live";
}
