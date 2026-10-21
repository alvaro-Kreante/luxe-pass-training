import { describe, expect, it } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import { fetchLounges, searchLounges } from "./lounge-directory";

/**
 * Story 3.1 / 10.10 — la foto principal (la de `position` más baja en
 * `lounge_images`) acompaña a cada lounge del catálogo de /explore.
 */
async function mainPhotoOf(loungeId: string): Promise<string> {
  const { data, error } = await createClient()
    .from("lounge_images")
    .select("url")
    .eq("lounge_id", loungeId)
    .order("position")
    .limit(1)
    .single();
  if (error) throw error;
  return data.url;
}

describe("foto principal en el catálogo", () => {
  it("fetchLounges trae la foto principal de cada lounge", async () => {
    const supabase = createClient();
    await signUpConfirmedAndSignIn(supabase, `fotos-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026");

    const lounges = await fetchLounges(supabase);

    const ainsworth = lounges.find((lounge) => lounge.id === "the-ainsworth");
    expect(ainsworth?.mainImageUrl).toBe(await mainPhotoOf("the-ainsworth"));
  });

  it("searchLounges también la trae", async () => {
    const supabase = createClient();
    await signUpConfirmedAndSignIn(supabase, `fotos-busca-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026");

    const [ainsworth] = await searchLounges(supabase, "Ainsworth");

    expect(ainsworth.mainImageUrl).toBe(await mainPhotoOf("the-ainsworth"));
  });
});
