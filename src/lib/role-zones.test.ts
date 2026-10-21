import { describe, expect, it } from "vitest";

import { primaryRole, zoneRedirect } from "@/lib/role-zones";

describe("primaryRole", () => {
  it("sin filas en user_roles es miembro", () => {
    expect(primaryRole([])).toBe("member");
  });

  it("admin manda sobre partner", () => {
    expect(primaryRole(["partner", "admin"])).toBe("admin");
    expect(primaryRole(["partner"])).toBe("partner");
  });
});

describe("zoneRedirect", () => {
  it("un miembro no entra al dashboard de admin ni de partner", () => {
    expect(zoneRedirect("/admin", "member")).toBe("/");
    expect(zoneRedirect("/admin/members/abc", "member")).toBe("/");
    expect(zoneRedirect("/partner/guests", "member")).toBe("/");
    expect(zoneRedirect("/reception", "member")).toBe("/");
  });

  it("un partner no entra a la vista de miembro ni de admin", () => {
    expect(zoneRedirect("/", "partner")).toBe("/partner");
    expect(zoneRedirect("/explore", "partner")).toBe("/partner");
    expect(zoneRedirect("/lounges/abc/book", "partner")).toBe("/partner");
    expect(zoneRedirect("/admin/bookings", "partner")).toBe("/partner");
  });

  it("un admin no entra a la vista de miembro ni de partner", () => {
    expect(zoneRedirect("/profile", "admin")).toBe("/admin/support");
    expect(zoneRedirect("/my-pass/LP123", "admin")).toBe("/admin/support");
    expect(zoneRedirect("/partner", "admin")).toBe("/admin/support");
    expect(zoneRedirect("/reception", "admin")).toBe("/admin/support");
  });

  it("cada rol entra a su propio espacio", () => {
    expect(zoneRedirect("/explore", "member")).toBeNull();
    expect(zoneRedirect("/partner/analytics", "partner")).toBeNull();
    expect(zoneRedirect("/reception", "partner")).toBeNull();
    expect(zoneRedirect("/admin/support", "admin")).toBeNull();
  });

  it("las rutas públicas y de auth quedan abiertas a cualquier rol", () => {
    for (const path of [
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/auth/confirm",
      "/join/ABC123",
      "/welcome",
      "/admin/login",
      "/partner/login",
      "/partner/welcome",
      "/manifest.json",
      "/sw.js",
    ]) {
      expect(zoneRedirect(path, "member")).toBeNull();
      expect(zoneRedirect(path, "partner")).toBeNull();
      expect(zoneRedirect(path, "admin")).toBeNull();
    }
  });

  it("no confunde un prefijo parecido con la zona", () => {
    expect(zoneRedirect("/administrator", "partner")).toBe("/partner");
    expect(zoneRedirect("/partners-info", "member")).toBeNull();
  });
});
