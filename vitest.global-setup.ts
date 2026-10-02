import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

import { cleanTestData } from "./src/lib/testing/clean-test-data";

/**
 * La suite corre contra el Supabase local real: cada test crea cuentas,
 * reservas, partners y lounges de verdad. Antes de empezar se borran los
 * restos de corridas anteriores (o interrumpidas) y, al terminar, todo lo
 * que creó esta — solo lo que es de test (ver `cleanTestData`). Así las
 * franjas de los lounges sembrados no se llenan y la base local no acumula
 * miles de cuentas de prueba.
 */
function adminClient() {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const env = loadEnv("development", root, "");
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url?.startsWith("http://127.0.0.1")) {
    throw new Error(`Los tests solo corren contra Supabase local, no contra ${url}`);
  }
  return createClient(url, env.SUPABASE_SERVICE_ROLE_KEY!);
}

export default async function setup() {
  const admin = adminClient();
  await cleanTestData(admin);

  return async function teardown() {
    const removed = await cleanTestData(admin);
    console.log(
      `\nDatos de test borrados: ${removed.users} cuentas, ${removed.partners} partners, ${removed.lounges} lounges.`,
    );
  };
}
