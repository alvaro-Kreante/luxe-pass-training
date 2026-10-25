import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { INDEXABLE_PATHS, siteUrl } from "@/lib/site";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteUrl", () => {
  it("usa NEXT_PUBLIC_SITE_URL sin barra final", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.example.com/");
    expect(siteUrl()).toBe("https://staging.example.com");
  });

  it("cae a localhost sin la variable", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});

describe("sitemap", () => {
  it("lista solo las rutas públicas, con URL absoluta", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://luxe.example.com");
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(INDEXABLE_PATHS.map((path) => `https://luxe.example.com${path}`));
    expect(urls.some((url) => /\/(admin|partner|profile|my-pass)/.test(url))).toBe(false);
  });
});

describe("robots", () => {
  it("bloquea las áreas con sesión y apunta al sitemap", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://luxe.example.com");
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rule.disallow).toEqual(expect.arrayContaining(["/admin", "/partner", "/profile", "/my-pass"]));
    expect(result.sitemap).toBe("https://luxe.example.com/sitemap.xml");
  });
});
