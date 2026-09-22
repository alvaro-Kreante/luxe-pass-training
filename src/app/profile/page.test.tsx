import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fetchProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

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

  it("AC 'Membership status Active/Inactive' — nace activa", async () => {
    await signUpFreshMember("membership-status");
    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
    expect(screen.getByText("Annual")).toBeInTheDocument();
  });

  it("AC 'Referral code sharing functionality' — enseña un código real por miembro", async () => {
    await signUpFreshMember("referral-code");
    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText(/^TM-SOLEIL-\d{2}$/)).toBeInTheDocument());
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
