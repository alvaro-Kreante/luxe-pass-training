/**
 * Aislamiento por rol: cada cuenta vive en su espacio. Miembro en la app
 * (`/`, `/explore`, `/profile`…), partner en `/partner` y `/reception`, admin
 * en `/admin` (entra por `/admin/support`, como su login). El rol sale de
 * `user_roles` (sin fila = miembro); con los dos roles elevados queda admin. Lo aplica el middleware raíz;
 * los `Require*Session` y la RLS siguen siendo la defensa de cada pantalla.
 */
export type Role = "member" | "partner" | "admin";

const HOME: Record<Role, string> = {
  member: "/",
  partner: "/partner",
  admin: "/admin/support",
};

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth",
  "/join",
  "/welcome",
  "/admin/login",
  "/partner/login",
  "/partner/welcome",
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function zoneFor(pathname: string): Role | null {
  if (pathname.startsWith("/_next/") || /\.[^/]+$/.test(pathname)) return null;
  if (PUBLIC_PATHS.some((p) => matches(pathname, p))) return null;
  if (matches(pathname, "/admin")) return "admin";
  if (matches(pathname, "/partner") || matches(pathname, "/reception")) return "partner";
  return "member";
}

export function primaryRole(roles: string[]): Role {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("partner")) return "partner";
  return "member";
}

/** A dónde mandar a `role` si `pathname` no es de su espacio; `null` si puede entrar. */
export function zoneRedirect(pathname: string, role: Role): string | null {
  const zone = zoneFor(pathname);
  if (zone === null || zone === role) return null;
  return HOME[role];
}

/** Indica si la ruta pertenece a algún espacio (para no consultar roles en vano). */
export function isZoned(pathname: string) {
  return zoneFor(pathname) !== null;
}
