import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fetchProfile } from "@/lib/profile";
import { ensureReferralCode } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { grantTestMembership } from "@/lib/testing/membership-fixture";

import ProfilePage from "./page";

/**
 * Story 6.3 — "Edit profile all fields input before", membership status y
 * código de referido. `Profile.dc.html`, backend real: cada test parte de
 * un miembro recién creado (perfil mínimo del onboarding).
 */
const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ push }),
}));

async function signUpFreshMember(label: string) {
  const supabase = createClient();
  await signUpConfirmedMemberAndSignIn(
    supabase,
    `profile-page-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  return supabase;
}

describe("detalles del perfil", () => {
  it("precarga los campos con los datos reales del miembro", async () => {
    await signUpFreshMember("load");
    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByLabelText(/full name/i)).toHaveValue("Test Member"));
  });

  it("AC 'Edit profile all fields input before' — permite editar cualquier campo y guardarlo de verdad", async () => {
    const supabase = await signUpFreshMember("edit");
    const user = userEvent.setup({ delay: null });
    render(<ProfilePage />);

    const jobTitle = await screen.findByLabelText(/job title/i);
    await user.clear(jobTitle);
    await user.type(jobTitle, "VP of Operations");
    expect(jobTitle).toHaveValue("VP of Operations");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(async () => {
      const saved = await fetchProfile(supabase);
      expect(saved.jobTitle).toBe("VP of Operations");
    });
  });

  it("AC 'Membership status Active/Inactive' — nace inactiva hasta elegir plan (Epic 9)", async () => {
    await signUpFreshMember("membership-status");
    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText("Inactive")).toBeInTheDocument());
    expect(screen.getByText("No active plan")).toBeInTheDocument();
  });

  it("AC 'Membership status Active/Inactive' — con un plan real, lo muestra activo", async () => {
    const supabase = await signUpFreshMember("membership-active");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await grantTestMembership(user!.id, "annual", {
      startedAt: new Date("2025-11-03T00:00:00Z"),
      periodStart: new Date("2025-11-03T00:00:00Z"),
      periodEnd: new Date("2099-11-03T00:00:00Z"),
    });
    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
    expect(screen.getByText("Annual")).toBeInTheDocument();
    expect(screen.getByText("November 3, 2099")).toBeInTheDocument();
  });

  it("AC 'Referral code sharing functionality' — enseña el código persistido del miembro", async () => {
    const supabase = await signUpFreshMember("referral-code");
    const code = await ensureReferralCode(supabase);
    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText(code)).toBeInTheDocument());
    expect(code).toMatch(/^TM-SOLEIL-\d{2,4}$/);
  });

  it('"Share your code" lleva al programa de referidos', async () => {
    await signUpFreshMember("referral-share");
    const user = userEvent.setup({ delay: null });
    render(<ProfilePage />);

    await user.click(await screen.findByRole("button", { name: "Share your code" }));

    expect(push).toHaveBeenCalledWith("/profile/membership/referrals");
  });

  it("muestra el badge Verified junto al email y al teléfono (el de teléfono es visual — Story 1.1 nunca construyó esa verificación)", async () => {
    await signUpFreshMember("verified-badge");
    render(<ProfilePage />);

    await waitFor(() => expect(screen.getAllByText("Verified")).toHaveLength(2));
  });

  it("navega a /profile/membership al pulsar Manage membership", async () => {
    await signUpFreshMember("nav-membership");
    const user = userEvent.setup({ delay: null });
    render(<ProfilePage />);

    await screen.findByLabelText(/full name/i);
    await user.click(screen.getByRole("button", { name: "Manage membership" }));

    expect(push).toHaveBeenCalledWith("/profile/membership");
  });
});

describe("Upload photo", () => {
  it("al subir una imagen, se muestra en el círculo del avatar", async () => {
    await signUpFreshMember("upload-photo");
    const user = userEvent.setup({ delay: null });
    render(<ProfilePage />);

    await screen.findByLabelText(/full name/i);
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Upload photo", { selector: "input" }), file);

    expect(await screen.findByAltText("Test Member")).toBeInTheDocument();
  });
});
