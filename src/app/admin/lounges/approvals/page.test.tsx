import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import ApprovalsPage from "./page";

/**
 * Story 8.3 — "Content approval workflow". Backend real (22 sept 2026):
 * recorre `admin_lounge_list`/`admin_lounge_detail`
 * (`supabase/schemas/admin_content.sql`) por cada lounge con un cambio
 * pendiente. Un lounge efímero propio de este archivo con una propuesta
 * real.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges/approvals",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let loungeId: string;
let loungeName: string;

beforeAll(async () => {
  const stamp = Date.now();
  loungeId = `test-lounge-approvals-${stamp}`;
  loungeName = `Approvals Test Lounge ${stamp}`;

  await admin.from("lounges").insert({
    id: loungeId,
    name: loungeName,
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    capacity: 20,
  });

  await admin.from("lounge_content_submissions").insert({
    lounge_id: loungeId,
    proposed: { capacity: 40 },
  });

  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `approvals-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await admin.from("lounges").delete().eq("id", loungeId);
});

describe("Approvals queue (/admin/lounges/approvals)", () => {
  it("lists the real lounge with a pending change and its diff", async () => {
    render(<ApprovalsPage />);

    expect(await screen.findByRole("heading", { name: "Approve before members see it" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(loungeName).length).toBeGreaterThan(0));
    expect(screen.getByText("Capacity updated")).toBeInTheDocument();
  });

  it("approves the change for real and clears it from the queue", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ApprovalsPage />);

    await screen.findByRole("heading", { name: "Approve before members see it" });
    // La cola puede traer entradas de otros archivos de test corriendo en
    // paralelo — selecciona explícitamente la fila de este lounge antes de
    // aprobar, en vez de asumir que es la primera.
    await waitFor(() => expect(screen.getAllByText(loungeName).length).toBeGreaterThan(0));
    await user.click(screen.getAllByText(loungeName)[0]);
    await waitFor(() => expect(screen.getByText("Capacity updated")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Approve and publish" }));

    await waitFor(() => expect(screen.queryByText(loungeName)).not.toBeInTheDocument());

    const { data } = await admin.from("lounges").select("capacity").eq("id", loungeId).single();
    expect(data?.capacity).toBe(40);
  });
});
