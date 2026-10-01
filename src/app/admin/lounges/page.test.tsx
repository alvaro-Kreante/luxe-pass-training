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
let cityA: string;
let cityB: string;
let partnerName: string;
let partnerId: string;

beforeAll(async () => {
  const stamp = Date.now();
  loungeAId = `test-lounge-a-${stamp}`;
  loungeBId = `test-lounge-b-${stamp}`;
  loungeAName = `Alpha Test Lounge ${stamp}`;
  loungeBName = `Beta Test Lounge ${stamp}`;
  cityA = `Alpha City ${stamp}`;
  cityB = `Beta City ${stamp}`;

  await admin.from("lounges").insert([
    {
      id: loungeAId,
      name: loungeAName,
      neighborhood: "Test",
      city: cityA,
      city_id: "test-city",
      lat: 0,
      lng: 0,
      hours: "Open 24 hours",
      content_status: "draft",
      created_at: new Date(stamp - 60_000).toISOString(),
    },
    {
      id: loungeBId,
      name: loungeBName,
      neighborhood: "Test",
      city: cityB,
      city_id: "test-city",
      lat: 0,
      lng: 0,
      hours: "Open 24 hours",
      content_status: "live",
      created_at: new Date(stamp).toISOString(),
    },
  ]);


  partnerName = `Halcyon List ${stamp}`;
  const { data: partner } = await admin.from("partners").insert({ name: partnerName, status: "active" }).select("id").single();
  partnerId = partner!.id;
  await admin.from("lounges").update({ partner_id: partnerId }).eq("id", loungeBId);

  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `lounges-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await admin.from("lounges").delete().in("id", [loungeAId, loungeBId]);
  await admin.from("partners").delete().eq("id", partnerId);
});

describe("Lounges (/admin/lounges)", () => {
  it("Add lounge opens the new-lounge form", async () => {
    render(<LoungesPage />);

    expect(await screen.findByRole("link", { name: "Add lounge" })).toHaveAttribute("href", "/admin/lounges/new");
  });

  it("lists real lounges with their content status", async () => {
    render(<LoungesPage />);

    expect(await screen.findByRole("heading", { name: "Lounges" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(loungeAName)).toBeInTheDocument());
    const rowA = screen.getByText(loungeAName).closest("button")!.parentElement!;
    expect(within(rowA).getByText("Draft")).toBeInTheDocument();
    const rowB = screen.getByText(loungeBName).closest("button")!.parentElement!;
    expect(within(rowB).getByText("Live")).toBeInTheDocument();
  });

  it("shows each lounge's partner, and 'No partner yet' for a draft without one (Story 10.5)", async () => {
    render(<LoungesPage />);

    await waitFor(() => expect(screen.getByText(loungeBName)).toBeInTheDocument());
    const rowB = screen.getByText(loungeBName).closest("button")!.parentElement!;
    expect(within(rowB).getByText(partnerName)).toBeInTheDocument();
    const rowA = screen.getByText(loungeAName).closest("button")!.parentElement!;
    expect(within(rowA).getByText("No partner yet")).toBeInTheDocument();
  });

  it("searches by partner name too", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungesPage />);

    await user.type(await screen.findByRole("searchbox", { name: "Search lounges or partners" }), partnerName);

    await waitFor(() => expect(screen.queryByText(loungeAName)).toBeNull());
    expect(screen.getByText(loungeBName)).toBeInTheDocument();
  });

  it("filters lounges by name", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungesPage />);

    await waitFor(() => expect(screen.getByText(loungeAName)).toBeInTheDocument());
    await user.type(screen.getByRole("searchbox", { name: "Search lounges or partners" }), loungeBName);

    expect(screen.queryByText(loungeAName)).not.toBeInTheDocument();
    expect(screen.getByText(loungeBName)).toBeInTheDocument();
  });

  it("lists the newest lounge first", async () => {
    render(<LoungesPage />);

    await waitFor(() => expect(screen.getByText(loungeAName)).toBeInTheDocument());
    const names = screen.getAllByRole("button", { name: /^Open / }).map((b) => b.getAttribute("aria-label"));
    expect(names.indexOf(`Open ${loungeBName}`)).toBeLessThan(names.indexOf(`Open ${loungeAName}`));
  });

  describe("quick status filters", () => {
    it("Live shows only live lounges, and pressing it again shows all", async () => {
      const user = userEvent.setup({ delay: null });
      render(<LoungesPage />);

      await waitFor(() => expect(screen.getByText(loungeAName)).toBeInTheDocument());
      const live = screen.getByRole("button", { name: /^Live/ });
      await user.click(live);

      expect(live).toHaveAttribute("aria-pressed", "true");
      expect(screen.queryByText(loungeAName)).not.toBeInTheDocument();
      expect(screen.getByText(loungeBName)).toBeInTheDocument();

      await user.click(live);
      expect(screen.getByText(loungeAName)).toBeInTheDocument();
    });

    it("Draft shows only drafts", async () => {
      const user = userEvent.setup({ delay: null });
      render(<LoungesPage />);

      await waitFor(() => expect(screen.getByText(loungeAName)).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: /^Draft/ }));

      expect(screen.getByText(loungeAName)).toBeInTheDocument();
      expect(screen.queryByText(loungeBName)).not.toBeInTheDocument();
    });
  });

  describe("city filter", () => {
    it("searches the cities that have a lounge and filters the list by the one picked", async () => {
      const user = userEvent.setup({ delay: null });
      render(<LoungesPage />);

      await waitFor(() => expect(screen.getByText(loungeAName)).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "All cities" }));
      await user.type(screen.getByRole("searchbox", { name: "Search cities" }), cityB);

      expect(screen.queryByRole("option", { name: new RegExp(cityA) })).not.toBeInTheDocument();
      await user.click(screen.getByRole("option", { name: new RegExp(cityB) }));

      expect(screen.getByRole("button", { name: cityB })).toBeInTheDocument();
      expect(screen.queryByText(loungeAName)).not.toBeInTheDocument();
      expect(screen.getByText(loungeBName)).toBeInTheDocument();
    });

    it("Clear filters drops both the status and the city", async () => {
      const user = userEvent.setup({ delay: null });
      render(<LoungesPage />);

      await waitFor(() => expect(screen.getByText(loungeAName)).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: /^Live/ }));
      await user.click(screen.getByRole("button", { name: "All cities" }));
      await user.click(screen.getByRole("option", { name: new RegExp(cityB) }));
      await user.click(screen.getByRole("button", { name: "Clear filters" }));

      expect(screen.getByRole("button", { name: "All cities" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Live/ })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByText(loungeAName)).toBeInTheDocument();
    });
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
