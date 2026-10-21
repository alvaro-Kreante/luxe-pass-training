// Epic 10 · Story 10.1 — partners de muestra en el Supabase LOCAL: cada uno es
// una organización con sus lounges (de los sembrados por la migración de la
// Story 2.1) y sus usuarios. Dar de alta un partner es trabajo del admin,
// nunca self-service; esto lo replica con el service role para tener datos
// con los que probar.
//
// Uso: `supabase start` primero, luego `node scripts/seed-partners.mjs`.
// Idempotente: un partner que ya existe (mismo nombre) se salta.
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

// Los usuarios con `password` ya tienen cuenta (partner activo); los demás
// esperan a que el admin active su partner (Story 10.4).
const PARTNERS = [
  {
    name: "The Ainsworth Collection",
    contact_email: "contact@theainsworth.example",
    address_line1: "126 East 56th Street",
    city: "New York",
    region: "NY",
    postal_code: "10022",
    country: "United States",
    status: "active",
    lounges: ["the-ainsworth"],
    users: [{ first_name: "Dana", last_name: "Okafor", email: "dana.okafor@theainsworth.example", mobile: "+1 212 555 0101", password: "AinsworthFOH!24" }],
  },
  {
    name: "Halcyon Hotels",
    contact_email: "reservations@halcyonhotels.example",
    address_line1: "445 Park Avenue",
    city: "New York",
    region: "NY",
    postal_code: "10022",
    country: "United States",
    status: "active",
    lounges: ["halcyon-reading-room", "the-cordelia", "the-ellery-room"],
    users: [
      { first_name: "Camille", last_name: "Duarte", email: "camille.duarte@halcyonhotels.example", mobile: "+1 212 555 0148", password: "HalcyonFOH!24" },
      { first_name: "Julian", last_name: "Mercer", email: "julian.mercer@halcyonhotels.example", mobile: "+1 917 555 0133", password: "HalcyonFOH!24" },
    ],
  },
  {
    name: "Aurelia House Group",
    contact_email: "partners@aureliahouse.example",
    address_line1: "30 West 26th Street",
    city: "New York",
    region: "NY",
    postal_code: "10010",
    country: "United States",
    status: "active",
    lounges: ["aurelia-house", "celeste-rooftop"],
    users: [{ first_name: "Inés", last_name: "Varga", email: "ines.varga@aureliahouse.example", mobile: "", password: "AureliaFOH!24" }],
  },
  {
    name: "Solenne Spa & Baths",
    contact_email: "hello@solenne.example",
    address_line1: "1200 Collins Avenue",
    city: "Miami Beach",
    region: "FL",
    postal_code: "33139",
    country: "United States",
    status: "draft",
    lounges: [],
    users: [{ first_name: "Noor", last_name: "Haddad", email: "noor.haddad@solenne.example", mobile: "+1 305 555 0110" }],
  },
];

async function main() {
  const admin = createClient(supabaseUrl, serviceRoleKey);

  for (const { lounges, users, ...partner } of PARTNERS) {
    const { data: existing } = await admin.from("partners").select("id").eq("name", partner.name).maybeSingle();
    if (existing) {
      console.log(`${partner.name} ya existe — se salta.`);
      continue;
    }

    const { data: created, error } = await admin
      .from("partners")
      .insert({ ...partner, activated_at: partner.status === "active" ? new Date().toISOString() : null })
      .select("id")
      .single();
    if (error) throw error;

    if (lounges.length) {
      const { error: loungeError } = await admin.from("lounges").update({ partner_id: created.id }).in("id", lounges);
      if (loungeError) throw loungeError;
    }

    for (const { password, ...user } of users) {
      const { error: memberError } = await admin.from("partner_members").insert({ partner_id: created.id, ...user });
      if (memberError) throw memberError;
      if (!password) continue;

      const { data: account, error: accountError } = await admin.auth.admin.createUser({
        email: user.email,
        password,
        email_confirm: true,
      });
      if (accountError) throw accountError;
      await admin.from("user_roles").insert({ user_id: account.user.id, role: "partner" });
      await admin.from("partner_members").update({ user_id: account.user.id }).eq("email", user.email);
    }

    console.log(`${partner.name} (${partner.status}) · ${lounges.length} lounges · ${users.length} usuarios`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
