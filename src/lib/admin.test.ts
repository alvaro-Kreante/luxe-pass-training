import { describe, expect, it } from "vitest";

import { getCaseDetail, getMemberProfile, searchMembers } from "@/lib/admin";

describe("searchMembers", () => {
  it("matches partial names from any word", () => {
    const results = searchMembers("duforest");
    expect(results.map((m) => m.id)).toEqual([
      "camille-duforest",
      "theo-duforest-marin",
      "renee-duforest",
    ]);
  });

  it("matches a partial email", () => {
    const results = searchMembers("camille.duforest");
    expect(results.map((m) => m.id)).toEqual(["camille-duforest"]);
  });

  it("matches the last four digits of a phone number regardless of formatting", () => {
    const results = searchMembers("4172");
    expect(results.map((m) => m.id)).toEqual(["camille-duforest"]);
  });

  it("does not match phone fragments shorter than four digits", () => {
    const results = searchMembers("417");
    expect(results).toEqual([]);
  });

  it("resolves a booking reference straight to its member", () => {
    const results = searchMembers("LP-840388");
    expect(results.map((m) => m.id)).toEqual(["camille-duforest"]);
  });

  it("is case-insensitive for a booking reference", () => {
    const results = searchMembers("lp-840388");
    expect(results.map((m) => m.id)).toEqual(["camille-duforest"]);
  });

  it("returns no results for an empty query", () => {
    expect(searchMembers("   ")).toEqual([]);
  });

  it("returns no results when nothing matches", () => {
    expect(searchMembers("nonexistent-guest")).toEqual([]);
  });
});

describe("getMemberProfile", () => {
  it("returns the literal booking history and payments for Camille Duforest", () => {
    const profile = getMemberProfile("camille-duforest");
    expect(profile?.bookingHistory).toHaveLength(6);
    expect(profile?.payments).toHaveLength(3);
    expect(profile?.upcomingBooking?.reference).toBe("LP-844021");
  });

  it("derives a minimal profile for a member without a literal fixture", () => {
    const profile = getMemberProfile("theo-duforest-marin");
    expect(profile?.name).toBe("Théo Duforest-Marin");
    expect(profile?.bookingHistory).toHaveLength(1);
    expect(profile?.upcomingBooking).toBeNull();
  });

  it("returns undefined for an unknown member id", () => {
    expect(getMemberProfile("no-such-member")).toBeUndefined();
  });
});

describe("getCaseDetail", () => {
  it("returns the full communication log and refund data for CS-4417", () => {
    const detail = getCaseDetail("CS-4417");
    expect(detail?.commLog).toHaveLength(5);
    expect(detail?.refundableAmount).toBe(35);
    expect(detail?.chargeDetail?.chargeId).toBe("ch_3PkR2f8Q");
  });

  it("derives a single system entry for a case without a literal fixture", () => {
    const detail = getCaseDetail("CS-4416");
    expect(detail?.commLog).toHaveLength(1);
    expect(detail?.refundableAmount).toBeUndefined();
  });

  it("returns undefined for an unknown case id", () => {
    expect(getCaseDetail("CS-0000")).toBeUndefined();
  });
});
