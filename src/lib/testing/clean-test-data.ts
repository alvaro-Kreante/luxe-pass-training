import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Solo para tests. La suite corre contra el Supabase local real y crea
 * cuentas, partners, lounges, fotos… de verdad; esto los borra para no
 * ensuciar la base. Lo llama `vitest.global-setup.ts` antes de la suite
 * (restos de corridas anteriores o interrumpidas) y al terminar. Regla del
 * proyecto (CLAUDE.md §Metodología de test): ningún registro de test
 * sobrevive a la corrida.
 *
 * Qué es "de test", sin tocar nada más:
 * - cuentas con email de los dominios de test (los mismos que
 *   `supabase/functions/_shared/test-recipient.ts`), y todo lo que cuelga de
 *   ellas: perfil, reservas, pagos, membresía, notificaciones, usuario partner…
 * - partners y lounges que creó una de esas cuentas (`created_by`);
 * - lounges con id `test-…`;
 * - partners cuyos usuarios son todos de test, o que no tienen usuarios y
 *   llevan en el nombre el sello de 13 dígitos (`Date.now()`) de los tests;
 * - fotos de perfil de cuentas que ya no existen y fotos de lounge que no
 *   usa ningún lounge.
 */
export const TEST_EMAIL = /@([a-z0-9-]+-test\.com|example\.(com|org|net)|email\.com)$/i;
const TEST_STAMP = /\d{13}/;

function chunks<T>(items: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function allUsers(admin: SupabaseClient) {
  const users: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

async function testPartnerIds(admin: SupabaseClient, testUsers: string[]): Promise<string[]> {
  const { data: partners, error } = await admin
    .from("partners")
    .select("id, name, created_by, partner_members!partner_members_partner_id_fkey(email)");
  if (error) throw error;
  const creators = new Set(testUsers);
  return (partners ?? [])
    .filter((partner) => {
      if (partner.created_by && creators.has(partner.created_by)) return true;
      const emails = (partner.partner_members as { email: string }[]).map((m) => m.email);
      return emails.length > 0 ? emails.every((email) => TEST_EMAIL.test(email)) : TEST_STAMP.test(partner.name);
    })
    .map((partner) => partner.id as string);
}

/** Todas las rutas de un bucket, carpeta a carpeta (el API de Storage no lista recursivo). */
async function listObjects(admin: SupabaseClient, bucket: string, prefix = ""): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Una carpeta no trae `id`.
      if (entry.id) paths.push(path);
      else paths.push(...(await listObjects(admin, bucket, path)));
    }
    if ((data ?? []).length < 1000) break;
  }
  return paths;
}

async function removeObjects(admin: SupabaseClient, bucket: string, paths: string[]): Promise<number> {
  for (const batch of chunks(paths, 100)) {
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw error;
  }
  return paths.length;
}

async function cleanStorage(admin: SupabaseClient, liveUserIds: Set<string>): Promise<number> {
  // Fotos de perfil: `profile-photos/<user id>/avatar.*`.
  const photos = await listObjects(admin, "profile-photos");
  const orphanPhotos = photos.filter((path) => !liveUserIds.has(path.split("/")[0]));

  // Fotos de lounge: `lounge-images/<lounge id | new-uuid>/…`, se usan desde `lounge_images.url`.
  const images = await listObjects(admin, "lounge-images");
  const { data: used, error } = await admin.from("lounge_images").select("url");
  if (error) throw error;
  const usedUrls = (used ?? []).map((row) => row.url as string);
  const orphanImages = images.filter((path) => !usedUrls.some((url) => url.endsWith(`/lounge-images/${path}`)));

  return (await removeObjects(admin, "profile-photos", orphanPhotos)) + (await removeObjects(admin, "lounge-images", orphanImages));
}

export interface CleanResult {
  users: number;
  partners: number;
  lounges: number;
  files: number;
}

export async function cleanTestData(admin: SupabaseClient): Promise<CleanResult> {
  const users = await allUsers(admin);
  const testUsers = users.filter((u) => u.email && TEST_EMAIL.test(u.email)).map((u) => u.id);
  const partnerIds = await testPartnerIds(admin, testUsers);

  // Lounges de test y lounges que creó una cuenta de test (sus reservas,
  // fotos, etc. caen en cascada).
  const { data: byId, error: loungeError } = await admin.from("lounges").delete().like("id", "test-%").select("id");
  if (loungeError) throw loungeError;
  let lounges = byId?.length ?? 0;
  for (const batch of chunks(testUsers)) {
    const { data, error } = await admin.from("lounges").delete().in("created_by", batch).select("id");
    if (error) throw error;
    lounges += data?.length ?? 0;
  }

  // Un lounge real que un test dejó asignado a un partner de test vuelve a no tener partner.
  for (const batch of chunks(partnerIds)) {
    await admin.from("lounges").update({ partner_id: null }).in("partner_id", batch);
  }

  // Partners de test: borrarlos se lleva a sus usuarios (`partner_members`).
  for (const batch of chunks(partnerIds)) {
    const { error } = await admin.from("partners").delete().in("id", batch);
    if (error) throw error;
  }

  // Usuarios partner de test sin cuenta que quedaron en partners reales.
  const { data: leftoverMembers } = await admin.from("partner_members").select("id, email").is("user_id", null);
  const memberIds = (leftoverMembers ?? []).filter((m) => TEST_EMAIL.test(m.email)).map((m) => m.id as string);
  for (const batch of chunks(memberIds)) await admin.from("partner_members").delete().in("id", batch);

  // Las tres FKs a `auth.users` sin cascada; el resto cae solo al borrar la cuenta.
  for (const batch of chunks(testUsers)) {
    await admin.from("support_tickets").update({ assigned_admin_id: null }).in("assigned_admin_id", batch);
    await admin.from("scheduled_reports").delete().in("created_by", batch);
    await admin.from("lounge_content_submissions").delete().in("submitted_by", batch);
    const { error } = await admin.from("bookings").delete().in("member_id", batch);
    if (error) throw error;
  }

  const deleted = new Set<string>();
  for (const batch of chunks(testUsers, 20)) {
    const results = await Promise.all(batch.map(async (id) => ({ id, result: await admin.auth.admin.deleteUser(id) })));
    for (const { id, result } of results) if (!result.error) deleted.add(id);
  }

  const liveUserIds = new Set(users.map((u) => u.id).filter((id) => !deleted.has(id)));
  const files = await cleanStorage(admin, liveUserIds);

  return { users: deleted.size, partners: partnerIds.length, lounges, files };
}
