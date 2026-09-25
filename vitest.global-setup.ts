import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

/**
 * Las plazas de un lounge se calculan en vivo (`capacity` − reservas, ver
 * `supabase/schemas/lounge_availability.sql`). Cada test que confirma una
 * reserva real ocupa una plaza en el Supabase local y nadie la libera: tras
 * varias corridas de la suite las franjas de los lounges sembrados se
 * llenarían y fallarían los tests de reservas, pase, recepción y partner sin
 * que haya un bug. Antes de cada corrida se borran las reservas que dejaron
 * los usuarios de test de corridas anteriores — solo las suyas, identificadas
 * por los dominios de email que usan los tests.
 */
const TEST_EMAIL = /@([a-z-]+-test\.com|example\.com)$/;

export default async function clearTestBookings() {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const env = loadEnv("development", root, "");
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url?.startsWith("http://127.0.0.1")) {
    throw new Error(`Los tests solo corren contra Supabase local, no contra ${url}`);
  }

  const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY!);
  const testUserIds: string[] = [];

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    testUserIds.push(...data.users.filter((u) => u.email && TEST_EMAIL.test(u.email)).map((u) => u.id));
    if (data.users.length < 1000) break;
  }

  for (let i = 0; i < testUserIds.length; i += 200) {
    const { error } = await admin.from("bookings").delete().in("member_id", testUserIds.slice(i, i + 200));
    if (error) throw error;
  }
}
