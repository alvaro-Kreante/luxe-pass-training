import { describe, expect, it } from "vitest";

import {
  loungeStatusLabel,
  mapLoungeListRow,
  type AdminLoungeListRow,
} from "@/lib/admin-content";

describe("loungeStatusLabel", () => {
  it('dice "Live" para un lounge publicado', () => {
    expect(loungeStatusLabel({ contentStatus: "live" })).toBe("Live");
  });

  it('dice "Draft" para uno nunca publicado', () => {
    expect(loungeStatusLabel({ contentStatus: "draft" })).toBe("Draft");
  });

  it('dice "Archived" para uno retirado', () => {
    expect(loungeStatusLabel({ contentStatus: "archived" })).toBe("Archived");
  });
});

describe("mapLoungeListRow", () => {
  it("convierte una fila cruda de admin_lounge_list", () => {
    const row: AdminLoungeListRow = {
      id: "the-vestry",
      name: "The Vestry",
      area: "Tribeca, New York",
      capacity: 24,
      content_status: "live",
      pending_count: 1,
      photos_count: 3,
      amenities_count: 6,
      updated_at: "2026-09-16T09:52:00Z",
    };
    const mapped = mapLoungeListRow(row);
    expect(mapped.id).toBe("the-vestry");
    expect(mapped.pendingCount).toBe(1);
    expect(mapped.updatedLabel).toBe("Sep 16");
  });

  it("no revienta cuando amenities_count viene null (array vacío en SQL)", () => {
    const row: AdminLoungeListRow = {
      id: "the-calloway",
      name: "The Calloway",
      area: "Williamsburg, Brooklyn",
      capacity: 0,
      content_status: "draft",
      pending_count: 0,
      photos_count: 0,
      amenities_count: null as unknown as number,
      updated_at: "2026-09-15T00:00:00Z",
    };
    expect(mapLoungeListRow(row).amenitiesCount).toBe(0);
  });
});
