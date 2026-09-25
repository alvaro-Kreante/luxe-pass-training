import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

/**
 * Cada test que confirma una reserva real descuenta una plaza de
 * `lounge_availability` en el Supabase local, y nadie la devuelve: tras
 * varias corridas de la suite, las bandas de `TODAY` quedan a 0 y fallan
 * los tests de reservas, pase, recepción y partner sin que haya un bug.
 * Antes de cada corrida se restauran los `seats_left` sembrados — leídos
 * de la propia migración de seed, para no duplicar los valores.
 */
const SEED_MIGRATION = "supabase/migrations/20260917161600_seed_lounge_profiles_story_3.sql";

function seededAvailability(root: string) {
  const sql = readFileSync(path.join(root, SEED_MIGRATION), "utf8");
  const start = sql.indexOf("insert into public.lounge_availability");
  const block = sql.slice(start, sql.indexOf(";", start));
  return [...block.matchAll(/\('([^']+)', '([^']+)', '([^']+)', (\d+)\)/g)].map(([, lounge_id, date, band, seats]) => ({
    lounge_id,
    date,
    band,
    seats_left: Number(seats),
  }));
}

export default async function restoreSeededAvailability() {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const env = loadEnv("development", root, "");
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url?.startsWith("http://127.0.0.1")) {
    throw new Error(`Los tests solo corren contra Supabase local, no contra ${url}`);
  }

  const rows = seededAvailability(root);
  if (rows.length === 0) throw new Error(`No se encontró el seed de lounge_availability en ${SEED_MIGRATION}`);

  const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin
    .from("lounge_availability")
    .upsert(rows, { onConflict: "lounge_id,date,band" });
  if (error) throw error;
}
