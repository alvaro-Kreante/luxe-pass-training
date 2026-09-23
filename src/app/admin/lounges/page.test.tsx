import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import LoungesPage from "./page";

/**
 * Story 8.3 — "Add/edit/remove lounge profiles" (la lista) y "Bulk update
 * capabilities" (Archive real). Backend real (22 sept 2026):
 * `admin_lounge_list`/`admin_archive_lounges`
 * (`supabase/schemas/admin_content.sql`). Dos lounges efímeros propios de
 * este archivo.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let loungeAId: string;
let loungeBId: string;
let loungeAName: string;
let loungeBName: string;

beforeAll(async () => {
  const stamp = Date.now();
  loungeAId = `test-lounge-a-${stamp}`;
  loungeBId = `test-lounge-b-${stamp}`;
  loungeAName = `Alpha Test Lounge ${stamp}`;
  loungeBName = `Beta Test Lounge ${stamp}`;

  await admin.from("lounges").insert([
    {
      id: loungeAId,
      name: loungeAName,
      neighborhood: "Test",
      city: "Test City",
      city_id: "test-city",
      lat: 0,
      lng: 0,
      hours: "Open 24 hours",
    },
    {
      id: loungeBId,
      name: loungeBName,
      neighborhood: "Test",
      city: "Test City",
      city_id: "test-city",
      lat: 0,
      lng: 0,
      hours: "Open 24 hours",
    },
  ]);

  await admin.from("lounge_content_submissions").insert({
    lounge_id: loungeAId,
    proposed: { capacity: 50 },
  });

  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `lounges-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await admin.from("lounges").delete().in("id", [loungeAId, loungeBId]);
});

describe("Lounges (/admin/lounges)", () => {
  it("lists real lounges with their content status", async () => {
    render(<LoungesPage />);

    expect(await screen.findByRole("heading", { name: "Lounges" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(loungeAName)).toBeInTheDocument());
    const rowA = screen.getByText(loungeAName).closest("button")!.parentElement!;
    expect(within(rowA).getByText("1 to approve")).toBeInTheDocument();
    const rowB = screen.getByText(loungeBName).closest("button")!.parentElement!;
    expect(within(rowB).getByText("Live")).toBeInTheDocument();
  });

  it("filters lounges by name", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungesPage />);

    await waitFor(() => expect(screen.getByText(loungeAName)).toBeInTheDocument());
    await user.type(screen.getByRole("searchbox", { name: "Search lounges" }), loungeBName);

    expect(screen.queryByText(loungeAName)).not.toBeInTheDocument();
    expect(screen.getByText(loungeBName)).toBeInTheDocument();
  });

  it("archives selected lounges for real and drops them from the list", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungesPage />);

    await waitFor(() => expect(screen.getByText(loungeBName)).toBeInTheDocument());
    await user.click(screen.getByRole("checkbox", { name: `Select ${loungeBName}` }));
    await user.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(screen.queryByText(loungeBName)).not.toBeInTheDocument());

    const { data } = await admin.from("lounges").select("content_status").eq("id", loungeBId).single();
    expect(data?.content_status).toBe("archived");
  });
});
