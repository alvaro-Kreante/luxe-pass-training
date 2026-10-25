import type { MetadataRoute } from "next";

import { INDEXABLE_PATHS, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.map((path) => ({
    url: `${siteUrl()}${path}`,
    changeFrequency: "monthly",
    priority: path === "/signup" ? 1 : 0.8,
  }));
}
