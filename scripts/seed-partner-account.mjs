// Epic 7 — alta operativa de la cuenta de partner de muestra (The Ainsworth)
// en el Supabase LOCAL. No hay historia de "partner signup" en Epic 7 (solo
// `Login.dc.html`) — dar de alta un partner es un proceso operativo, nunca
// self-service (ver "Alta de un partner" en `supabase/schemas/partners.sql`).
//
// Uso: `supabase start` primero, luego `node scripts/seed-partner-account.mjs`.
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

const PARTNER_EMAIL = "dana.okafor@theainsworth.com";
const PARTNER_PASSWORD = "AinsworthFOH!24";
const PARTNER_BUSINESS_NAME = "The Ainsworth";
const PARTNER_LOUNGE_ID = "the-ainsworth";

async function main() {
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: existing } = await admin
    .from("partners")
    .select("id, user_id")
    .eq("contact_email", PARTNER_EMAIL)
    .maybeSingle();

  if (existing) {
    console.log(`Ya existe una cuenta de partner para ${PARTNER_EMAIL} — nada que hacer.`);
    return;
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: PARTNER_EMAIL,
    password: PARTNER_PASSWORD,
    email_confirm: true,
  });
  if (createError) throw createError;

  const userId = created.user.id;

  const { error: roleError } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role: "partner" });
  if (roleError) throw roleError;

  const { data: partner, error: partnerError } = await admin
    .from("partners")
    .insert({ user_id: userId, business_name: PARTNER_BUSINESS_NAME, contact_email: PARTNER_EMAIL })
    .select("id")
    .single();
  if (partnerError) throw partnerError;

  const { error: linkError } = await admin
    .from("partner_lounges")
    .insert({ partner_id: partner.id, lounge_id: PARTNER_LOUNGE_ID });
  if (linkError) throw linkError;

  console.log(`Cuenta de partner creada: ${PARTNER_EMAIL} / ${PARTNER_PASSWORD} → ${PARTNER_LOUNGE_ID}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
