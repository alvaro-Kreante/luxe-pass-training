/**
 * Origen público de la app por ambiente (local/staging/prod), para canonical,
 * sitemap, robots y llms.txt. El dominio de producción no se asume: se fija
 * con NEXT_PUBLIC_SITE_URL en cada proyecto de Vercel.
 */
export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/** Únicas rutas visibles sin sesión que tiene sentido indexar. */
export const INDEXABLE_PATHS = ["/signup", "/login"] as const;

/** Áreas con sesión o de un solo uso (tokens, invitaciones): fuera del índice. */
export const PRIVATE_PATHS = [
  "/admin",
  "/partner",
  "/reception",
  "/profile",
  "/my-pass",
  "/notifications",
  "/onboarding",
  "/explore",
  "/lounges",
  "/welcome",
  "/verify-email",
  "/reset-password",
  "/forgot-password",
  "/join",
  "/auth",
];
