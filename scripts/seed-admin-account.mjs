// Epic 8 — alta operativa de la cuenta de muestra de admin (Priya
// Raghunathan) en el Supabase LOCAL. Como con partners (ver
// "Alta de un partner" en supabase/schemas/partners.sql), dar de alta un
// admin es un proceso operativo, nunca self-service — no hay historia de
// "admin signup".
//
// Uso: `supabase start` primero, luego `node scripts/seed-admin-account.mjs`.
// Idempotente: si la cuenta ya existe, no falla — informa y sale.
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";

const env = loadEnv("development", process.cwd(), "");
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local — corre `supabase status` y confirma que apuntas al proyecto local.",
  );
  process.exit(1);
}
if (!supabaseUrl.includes("127.0.0.1") && !supabaseUrl.includes("localhost")) {
  console.error(`NEXT_PUBLIC_SUPABASE_URL no es local (${supabaseUrl}) — parando por seguridad.`);
  process.exit(1);
}

const ADMIN_EMAIL = "alvaro+admin@kreante.co";
const ADMIN_PASSWORD = "Pa$$w0rd!";

async function main() {
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { users },
  } = await admin.auth.admin.listUsers();
  const existing = users.find((u) => u.email === ADMIN_EMAIL);
  if (existing) {
    console.log(`Ya existe una cuenta de admin para ${ADMIN_EMAIL} — nada que hacer.`);
    return;
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (createError) throw createError;

  const { error: roleError } = await admin
    .from("user_roles")
    .insert({ user_id: created.user.id, role: "admin" });
  if (roleError) throw roleError;

  console.log(`Cuenta de admin creada: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
