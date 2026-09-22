import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Solo para tests. Los tests de este proyecto no mockean Supabase (ver
 * CLAUDE.md §Metodología de test), así que las pantallas que necesitan una
 * sesión ya confirmada (todo lo que vive bajo /onboarding) usarían el flujo
 * real de correo (Auth Hook + Brevo) — esto evita tener que leerlo en cada
 * test: crea el usuario ya confirmado con la API de administración (service
 * role, nunca disponible en el navegador) y lo deja con sesión iniciada en el
 * cliente normal que se le pasa.
 */
export async function signUpConfirmedAndSignIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
}

/**
 * Como `signUpConfirmedAndSignIn`, más una fila de `profiles` mínima (los
 * campos requeridos por la Story 1.1). Para tests que dependen de que el
 * miembro ya haya completado /onboarding — p. ej. Story 4.2, cuyo
 * `ensureStripeCustomer` lee/escribe `profiles.stripe_customer_id`.
 */
export async function signUpConfirmedMemberAndSignIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  await signUpConfirmedAndSignIn(supabase, email, password);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("signUpConfirmedAndSignIn did not leave a session");

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: "Test Member",
    phone: "+15555550100",
    city: "New York",
    industry: "Testing",
    terms_accepted_at: new Date().toISOString(),
  });
  if (error) throw error;

  return user;
}

/**
 * Epic 7 — como `signUpConfirmedAndSignIn`, más el alta operativa de un
 * partner (`user_roles` + `partners` + `partner_lounges`, ver
 * `supabase/schemas/partners.sql` "Alta de un partner") — nunca un
 * self-service, así que los tests la replican aquí con el service role en
 * vez de una RPC pública.
 */
export async function signUpConfirmedPartnerAndSignIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
  options: { businessName: string; loungeIds: string[] },
) {
  await signUpConfirmedAndSignIn(supabase, email, password);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("signUpConfirmedAndSignIn did not leave a session");

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: roleError } = await admin
    .from("user_roles")
    .insert({ user_id: user.id, role: "partner" });
  if (roleError) throw roleError;

  const { data: partner, error: partnerError } = await admin
    .from("partners")
    .insert({ user_id: user.id, business_name: options.businessName, contact_email: email })
    .select("id")
    .single();
  if (partnerError) throw partnerError;

  const { error: linkError } = await admin
    .from("partner_lounges")
    .insert(options.loungeIds.map((lounge_id) => ({ partner_id: partner.id, lounge_id })));
  if (linkError) throw linkError;

  return user;
}
