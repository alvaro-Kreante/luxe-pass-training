import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlanId } from "../membership";
import { grantTestMembership } from "./membership-fixture";

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
  options: { userMetadata?: Record<string, unknown> } = {},
) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: options.userMetadata,
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
  /**
   * `membership`: desde Epic 9 un miembro nace sin plan, y `confirm_booking`
   * solo acepta una reserva sin pago si la cubre la membresía real. Los tests
   * que crean reservas "gratis" como escenario (pase digital, recepción,
   * partner…) piden aquí un plan activo, sembrado con el service role.
   */
  options: { userMetadata?: Record<string, unknown>; fullName?: string; membership?: PlanId } = {},
) {
  await signUpConfirmedAndSignIn(supabase, email, password, options);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("signUpConfirmedAndSignIn did not leave a session");

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: options.fullName ?? "Test Member",
    phone: "+15555550100",
    city: "New York",
    industry: "Testing",
    terms_accepted_at: new Date().toISOString(),
  });
  if (error) throw error;

  if (options.membership) await grantTestMembership(user.id, options.membership);

  return user;
}

/**
 * Epic 7 / Story 10.1 — un usuario partner con sesión: rol `partner` y fila
 * en `partner_members` del partner que opera esos lounges. Un lounge tiene
 * un solo partner, así que si ya lo opera uno (el de muestra de
 * `scripts/seed-partners.mjs`, o el de otro test en paralelo) el usuario se
 * une a ese; si no, se crea uno activo con `businessName`. Nunca es
 * self-service: el service role replica aquí el alta del admin.
 */
export async function signUpConfirmedPartnerAndSignIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
  options: { businessName: string; loungeIds: string[] },
) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const partnerOf = async () => {
    const { data, error } = await admin.from("lounges").select("partner_id").eq("id", options.loungeIds[0]).single();
    if (error) throw error;
    return data.partner_id as string | null;
  };

  let partnerId = await partnerOf();
  if (!partnerId) {
    const { data: partner, error: partnerError } = await admin
      .from("partners")
      .insert({ name: options.businessName, contact_email: email, status: "active" })
      .select("id")
      .single();
    if (partnerError) throw partnerError;
    await admin.from("lounges").update({ partner_id: partner.id }).in("id", options.loungeIds).is("partner_id", null);
    partnerId = await partnerOf();
  }

  // Antes de la cuenta: un usuario partner es siempre una cuenta nueva.
  const { error: memberError } = await admin
    .from("partner_members")
    .insert({ partner_id: partnerId, first_name: "Test", last_name: "Partner", email });
  if (memberError) throw memberError;

  await signUpConfirmedAndSignIn(supabase, email, password);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("signUpConfirmedAndSignIn did not leave a session");

  const { error: roleError } = await admin
    .from("user_roles")
    .insert({ user_id: user.id, role: "partner" });
  if (roleError) throw roleError;

  const { error: linkError } = await admin.from("partner_members").update({ user_id: user.id }).eq("email", email.toLowerCase());
  if (linkError) throw linkError;

  return user;
}

/**
 * Epic 8 — como `signUpConfirmedAndSignIn`, más el alta operativa del rol
 * admin (`user_roles`, ver "Alta de un admin" en
 * `scripts/seed-admin-account.mjs`) — tampoco es self-service.
 */
export async function signUpConfirmedAdminAndSignIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
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
    .insert({ user_id: user.id, role: "admin" });
  if (roleError) throw roleError;

  return user;
}
