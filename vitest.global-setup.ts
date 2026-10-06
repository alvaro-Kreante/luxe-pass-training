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

/**
 * Mientras corre la suite no sale ningún email por Brevo (ver
 * `public.email_pause` y `_shared/brevo.ts`): los tests reservan en lounges
 * sembrados y avisarían a sus partners reales, gastando la cuota diaria.
 * `until` acota la pausa si la suite se corta sin llegar al teardown.
 */
async function pauseEmails(admin: ReturnType<typeof adminClient>) {
  const until = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.from("email_pause").upsert({ id: "vitest", until });
  if (error) throw error;
}

async function resumeEmails(admin: ReturnType<typeof adminClient>) {
  await admin.from("email_pause").delete().eq("id", "vitest");
}

export default async function setup() {
  const admin = adminClient();
  await pauseEmails(admin);
  await cleanTestData(admin);

  return async function teardown() {
    await resumeEmails(admin);
    // `KEEP_TEST_DATA=1 npm test` conserva lo que dejó la corrida para
    // depurar un fallo; la siguiente corrida lo borra igual al empezar.
    if (process.env.KEEP_TEST_DATA === "1") {
      console.log("\nKEEP_TEST_DATA=1: los datos de test se conservan hasta la próxima corrida.");
      return;
    }
    const removed = await cleanTestData(admin);
    console.log(
      `\nDatos de test borrados: ${removed.users} cuentas, ${removed.partners} partners, ${removed.lounges} lounges, ${removed.files} archivos.`,
    );
  };
}
