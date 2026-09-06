import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Solo para tests. Los tests de este proyecto no mockean Supabase (ver
 * CLAUDE.md §Metodología de test), así que las pantallas que necesitan una
 * sesión ya confirmada (todo lo que vive bajo /onboarding) usarían el flujo
 * real de correo + Mailpit — esto evita tener que leerlo en cada test:
 * crea el usuario ya confirmado con la API de administración (service role,
 * nunca disponible en el navegador) y lo deja con sesión iniciada en el
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
