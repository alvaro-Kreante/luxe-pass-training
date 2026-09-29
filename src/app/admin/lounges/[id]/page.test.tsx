import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import LoungeEditPage from "./page";

/**
 * Story 8.3 — "Update amenities...", "Set booking availability and
 * restrictions", "Upload and manage lounge images" y "Content approval
 * workflow". Backend real (22 sept 2026): `admin_lounge_detail`/
 * `admin_submit_lounge_content_change`/`admin_approve_lounge_submission`/
 * `admin_reject_lounge_submission` (`supabase/schemas/admin_content.sql`).
 */

let currentId = "";
const params = { get id() { return currentId; } };

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges/x",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: params.id }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function createLounge(name: string, extra: Record<string, unknown> = {}) {
  const id = `test-lounge-edit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { error } = await admin.from("lounges").insert({
    id,
    name,
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    amenities: ["wifi"],
    weekly_hours: ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 10 PM"],
    capacity: 20,
    ...extra,
  });
  if (error) throw error;
  return id;
}

const loungeIds: string[] = [];

beforeAll(async () => {
  const stamp = Date.now();
  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `lounge-edit-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await admin.from("lounges").delete().in("id", loungeIds);
});

describe("Lounge editor (/admin/lounges/[id])", () => {
  it("shows the lounge's real amenities, hours and photo count", async () => {
    const id = await createLounge(`Editor Test Lounge ${Date.now()}`);
    loungeIds.push(id);
    currentId = id;

    render(<LoungeEditPage />);

    expect(await screen.findByRole("heading", { name: /Editor Test Lounge/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WiFi" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Spa" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByDisplayValue("9 AM – 10 PM")).toBeInTheDocument();
  });

  it("submits a real change for review when an amenity is toggled", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await createLounge(`Submit Test Lounge ${Date.now()}`);
    loungeIds.push(id);
    currentId = id;

    render(<LoungeEditPage />);

    await screen.findByRole("heading", { name: /Submit Test Lounge/ });
    await user.click(screen.getByRole("button", { name: "Spa" }));
    await user.click(screen.getByRole("button", { name: "Submit for review" }));

    await waitFor(() => expect(screen.getByText(/waiting for approval/)).toBeInTheDocument());

    const { data } = await admin
      .from("lounge_content_submissions")
      .select("proposed, status")
      .eq("lounge_id", id)
      .single();
    expect(data?.status).toBe("pending");
    expect(data?.proposed.amenities).toEqual(expect.arrayContaining(["wifi", "spa"]));

    // El contenido real todavía no cambió — solo se aplica al aprobar.
    const { data: loungeRow } = await admin.from("lounges").select("amenities").eq("id", id).single();
    expect(loungeRow?.amenities).toEqual(["wifi"]);
  });

  it("approves a pending change and applies it to the real lounge row", async () => {
    const id = await createLounge(`Approve Test Lounge ${Date.now()}`);
    loungeIds.push(id);
    await admin.from("lounge_content_submissions").insert({ lounge_id: id, proposed: { capacity: 55 } });
    currentId = id;

    const user = userEvent.setup({ delay: null });
    render(<LoungeEditPage />);

    await screen.findByRole("heading", { name: /Approve Test Lounge/ });
    expect(await screen.findByText("Capacity updated")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve and publish" }));

    await waitFor(() => expect(screen.getByText(/Published/)).toBeInTheDocument());

    const { data } = await admin.from("lounges").select("capacity").eq("id", id).single();
    expect(data?.capacity).toBe(55);
  });

  it("rejects a pending change without applying it", async () => {
    const id = await createLounge(`Reject Test Lounge ${Date.now()}`);
    loungeIds.push(id);
    await admin.from("lounge_content_submissions").insert({ lounge_id: id, proposed: { capacity: 99 } });
    currentId = id;

    const user = userEvent.setup({ delay: null });
    render(<LoungeEditPage />);

    await screen.findByRole("heading", { name: /Reject Test Lounge/ });
    await screen.findByText("Capacity updated");
    await user.type(screen.getByRole("textbox", { name: /note for sending back/i }), "Not this quarter");
    await user.click(screen.getByRole("button", { name: "Send back with a note" }));

    await waitFor(() => expect(screen.getByText(/Sent back/)).toBeInTheDocument());

    const { data: submission } = await admin
      .from("lounge_content_submissions")
      .select("status, resolution_note")
      .eq("lounge_id", id)
      .single();
    expect(submission?.status).toBe("rejected");
    expect(submission?.resolution_note).toBe("Not this quarter");

    const { data: loungeRow } = await admin.from("lounges").select("capacity").eq("id", id).single();
    expect(loungeRow?.capacity).toBe(20);
  });

  it("uploads a real photo to the lounge-images bucket", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await createLounge(`Photo Test Lounge ${Date.now()}`);
    loungeIds.push(id);
    currentId = id;

    render(<LoungeEditPage />);

    await screen.findByRole("heading", { name: /Photo Test Lounge/ });
    const file = new File(["fake-image-bytes"], "day-room.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Add lounge photo"), file);

    await waitFor(() => expect(screen.getByText("day-room.jpg")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Submit for review" }));

    await waitFor(async () => {
      const { data } = await admin.from("lounge_content_submissions").select("proposed").eq("lounge_id", id).single();
      expect(data?.proposed.photos?.[0]?.caption).toBe("day-room.jpg");
    });
  });

  it("a draft opens in the add-lounge form, address included, and publishes for real", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await createLounge(`Draft Test Lounge ${Date.now()}`, {
      content_status: "draft",
      address: "27 Bond Street",
      neighborhood: "NoHo",
      city: "New York",
      phone: "+1 212 555 0148",
      email: "hello@thelarkspur.com",
      bands: ["morning", "afternoon", "evening"],
    });
    loungeIds.push(id);
    currentId = id;
    const partnerEmail = `draft-edit-${Date.now()}@thelarkspur-test.com`;
    await admin
      .from("lounge_partner_invites")
      .insert({ lounge_id: id, first_name: "Camille", last_name: "Duarte", email: partnerEmail, mobile: "+1 917 555 0163" });

    render(<LoungeEditPage />);

    expect(await screen.findByText(/Draft · not visible to members/)).toBeInTheDocument();
    expect(screen.getByLabelText("Address")).toHaveValue("27 Bond Street");
    expect(screen.getByLabelText("Work email")).toHaveValue(partnerEmail);

    await user.click(screen.getByRole("button", { name: "Publish lounge" }));

    await waitFor(async () => {
      const { data } = await admin.from("lounges").select("content_status").eq("id", id).single();
      expect(data?.content_status).toBe("live");
    });
    const { data: partner } = await admin.from("partners").select("user_id").eq("contact_email", partnerEmail).single();
    await admin.auth.admin.deleteUser(partner!.user_id);
  });

  it("a published lounge keeps its address fixed — no location field", async () => {
    const id = await createLounge(`Live Test Lounge ${Date.now()}`);
    loungeIds.push(id);
    currentId = id;

    render(<LoungeEditPage />);

    await screen.findByRole("heading", { name: /Live Test Lounge/ });
    expect(screen.queryByLabelText("Address")).toBeNull();
  });
});
