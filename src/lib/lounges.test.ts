import { describe, expect, it } from "vitest";

import { LOUNGES, featuredLounges } from "./lounges";

describe("catálogo de lounges", () => {
  it("da a cada lounge un id único", () => {
    const ids = LOUNGES.map((lounge) => lounge.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("lounges destacados", () => {
  it("devuelve solo los marcados como destacados", () => {
    const featured = featuredLounges();

    expect(featured.every((lounge) => lounge.featured)).toBe(true);
    expect(featured).toHaveLength(
      LOUNGES.filter((lounge) => lounge.featured).length,
    );
  });
});
