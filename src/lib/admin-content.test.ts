import { describe, expect, it } from "vitest";

import {
  diffLoungeChanges,
  loungeStatusLabel,
  mapLoungeListRow,
  type AdminLoungeListRow,
  type LoungeContentDetail,
} from "@/lib/admin-content";

const baseLounge: LoungeContentDetail = {
  id: "the-vestry",
  name: "The Vestry",
  area: "Tribeca, New York",
  capacity: 24,
  contentStatus: "live",
  amenities: ["wifi", "co-working"],
  bands: ["morning", "afternoon"],
  closedWeekdays: [0],
  weeklyHours: ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 10 PM"],
  bookingRestrictions: ["Two hours' notice to book"],
  images: [{ id: "img-1", url: "/a.jpg", caption: "Main room", detail: null, position: 0 }],
  closures: [],
  phone: "",
  email: "",
  website: "",
  address: "",
  neighborhood: "Tribeca",
  city: "New York",
  lat: 0,
  lng: 0,
  pendingSubmissionId: null,
  pendingProposed: null,
  pendingSubmittedBy: null,
  pendingSubmittedAt: null,
};

describe("diffLoungeChanges", () => {
  it("reporta un cambio de amenities con las etiquetas legibles", () => {
    const changes = diffLoungeChanges(baseLounge, { amenities: ["wifi", "co-working", "spa"] });
    expect(changes).toEqual([
      { id: "amenities", title: "Amenities updated", fromLabel: "WiFi, Co-working", toLabel: "WiFi, Co-working, Spa" },
    ]);
  });

  it("no reporta nada cuando las amenities propuestas son las mismas, solo en otro orden", () => {
    const changes = diffLoungeChanges(baseLounge, { amenities: ["co-working", "wifi"] });
    expect(changes).toEqual([]);
  });

  it("reporta un cambio de horario solo en el día que de verdad cambió", () => {
    const proposed = [...baseLounge.weeklyHours];
    proposed[5] = "8 AM – 11 PM";
    const changes = diffLoungeChanges(baseLounge, { weekly_hours: proposed });
    expect(changes).toEqual([{ id: "hours-5", title: "Fri hours changed", fromLabel: "8 AM – 9 PM", toLabel: "8 AM – 11 PM" }]);
  });

  it("reporta un cambio de capacidad", () => {
    const changes = diffLoungeChanges(baseLounge, { capacity: 30 });
    expect(changes).toEqual([{ id: "capacity", title: "Capacity updated", fromLabel: "24 seats", toLabel: "30 seats" }]);
  });

  it("reporta un cambio de restricciones de reserva", () => {
    const changes = diffLoungeChanges(baseLounge, { booking_restrictions: ["Admission for one"] });
    expect(changes).toEqual([
      { id: "restrictions", title: "Booking restrictions updated", fromLabel: "Two hours' notice to book", toLabel: "Admission for one" },
    ]);
  });

  it("reporta un cambio de fotos por su recuento", () => {
    const changes = diffLoungeChanges(baseLounge, { photos: [{ url: "/a.jpg", caption: "Main room" }, { url: "/b.jpg", caption: "Day room" }] });
    expect(changes).toEqual([{ id: "photos", title: "Photos updated", fromLabel: "1 photos", toLabel: "2 photos" }]);
  });

  it("reporta la publicación de un lounge en borrador", () => {
    const draftLounge = { ...baseLounge, contentStatus: "draft" as const };
    const changes = diffLoungeChanges(draftLounge, { publish: true });
    expect(changes).toContainEqual({ id: "publish", title: "Publish", fromLabel: "Draft", toLabel: "Live" });
  });

  it("no reporta publicación si el lounge ya está live", () => {
    const changes = diffLoungeChanges(baseLounge, { publish: true });
    expect(changes.find((c) => c.id === "publish")).toBeUndefined();
  });

  it("combina varios cambios a la vez", () => {
    const changes = diffLoungeChanges(baseLounge, { capacity: 30, amenities: ["wifi", "spa"] });
    expect(changes).toHaveLength(2);
  });
});

describe("loungeStatusLabel", () => {
  it('dice "Live" para un lounge publicado sin cambios pendientes', () => {
    expect(loungeStatusLabel({ contentStatus: "live", pendingCount: 0 })).toBe("Live");
  });

  it('dice "Draft" para uno nunca publicado', () => {
    expect(loungeStatusLabel({ contentStatus: "draft", pendingCount: 0 })).toBe("Draft");
  });

  it('dice "Archived" para uno retirado', () => {
    expect(loungeStatusLabel({ contentStatus: "archived", pendingCount: 0 })).toBe("Archived");
  });

  it("prioriza el recuento de cambios pendientes sobre el estado de publicación", () => {
    expect(loungeStatusLabel({ contentStatus: "live", pendingCount: 3 })).toBe("3 to approve");
    expect(loungeStatusLabel({ contentStatus: "draft", pendingCount: 1 })).toBe("1 to approve");
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
