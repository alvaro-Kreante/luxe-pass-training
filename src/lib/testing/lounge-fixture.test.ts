import { createClient as createAdminClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { addDays, today } from "@/lib/availability";
import { OPEN_EVERY_DAY_LOUNGE } from "@/lib/testing/lounge-fixture";

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

describe("OPEN_EVERY_DAY_LOUNGE", () => {
  it("tiene plazas en las 4 franjas cualquier día de la semana", async () => {
    const { data, error } = await admin.rpc("lounge_availability_range", {
      p_lounge_id: OPEN_EVERY_DAY_LOUNGE,
      p_from: today(),
      p_to: addDays(today(), 6),
    });
    expect(error).toBeNull();

    const cells = data as { date: string; band: string; seats_left: number }[];
    for (let offset = 0; offset < 7; offset++) {
      const day = cells.filter((cell) => cell.date === addDays(today(), offset));
      expect(day.map((cell) => cell.band).sort()).toEqual(["afternoon", "evening", "late", "morning"]);
      expect(day.every((cell) => cell.seats_left > 0)).toBe(true);
    }
  });
});
