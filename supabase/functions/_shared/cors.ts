// Story 4.2 — las tres functions de Stripe (a diferencia de `send-email`,
// invocada por Auth) las llama el navegador vía `supabase.functions.invoke`,
// que necesita CORS explícito para el preflight `OPTIONS`.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
