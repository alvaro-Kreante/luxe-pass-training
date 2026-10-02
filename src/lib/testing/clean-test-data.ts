import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Solo para tests. La suite corre contra el Supabase local real y crea
 * cuentas, partners y lounges de verdad; esto los borra para no ensuciar la
 * base. Lo llama `vitest.global-setup.ts` antes de la suite (restos de
 * corridas anteriores o interrumpidas) y al terminar.
 *
 * Qué es "de test", sin tocar nada más:
 * - cuentas con email de los dominios de test (los mismos que
 *   `supabase/functions/_shared/test-recipient.ts`);
 * - lounges con id `test-…`;
 * - partners cuyos usuarios son todos de test, o que no tienen usuarios y
 *   llevan en el nombre el sello de 13 dígitos (`Date.now()`) de los tests.
 */
export const TEST_EMAIL = /@([a-z0-9-]+-test\.com|example\.(com|org|net)|email\.com)$/i;
const TEST_STAMP = /\d{13}/;

async function testUserIds(admin: SupabaseClient): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    ids.push(...data.users.filter((u) => u.email && TEST_EMAIL.test(u.email)).map((u) => u.id));
    if (data.users.length < 1000) break;
  }
  return ids;
}

async function testPartnerIds(admin: SupabaseClient): Promise<string[]> {
  const { data: partners, error } = await admin.from("partners").select("id, name, partner_members!partner_members_partner_id_fkey(email)");
  if (error) throw error;
  return (partners ?? [])
    .filter((partner) => {
      const emails = (partner.partner_members as { email: string }[]).map((m) => m.email);
      return emails.length > 0 ? emails.every((email) => TEST_EMAIL.test(email)) : TEST_STAMP.test(partner.name);
    })
    .map((partner) => partner.id as string);
}

function chunks<T>(items: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function cleanTestData(admin: SupabaseClient): Promise<{ users: number; partners: number; lounges: number }> {
  const userIds = await testUserIds(admin);
  const partnerIds = await testPartnerIds(admin);

  // Lounges de test (sus reservas, fotos, etc. caen en cascada).
  const { data: lounges, error: loungeError } = await admin.from("lounges").delete().like("id", "test-%").select("id");
  if (loungeError) throw loungeError;

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

  // Las tres FKs a `auth.users` sin cascada; el resto (perfil, reservas,
  // pagos, membresía, usuario partner…) cae solo al borrar la cuenta.
  for (const batch of chunks(userIds)) {
    await admin.from("support_tickets").update({ assigned_admin_id: null }).in("assigned_admin_id", batch);
    await admin.from("scheduled_reports").delete().in("created_by", batch);
    await admin.from("lounge_content_submissions").delete().in("submitted_by", batch);
    const { error } = await admin.from("bookings").delete().in("member_id", batch);
    if (error) throw error;
  }

  let deleted = 0;
  for (const batch of chunks(userIds, 20)) {
    const results = await Promise.all(batch.map((id) => admin.auth.admin.deleteUser(id)));
    deleted += results.filter((result) => !result.error).length;
  }

  return { users: deleted, partners: partnerIds.length, lounges: lounges?.length ?? 0 };
}
