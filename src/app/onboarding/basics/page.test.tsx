import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProfileDraftProvider } from "@/components/onboarding/profile-context";

import ProfileBasicsPage from "./page";

/**
 * Story 1.1 — paso 1 de 3 del perfil (ProfileBasic). La foto es opcional;
 * al elegirla, el miembro debe verla antes de continuar.
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("foto de perfil", () => {
  it("al elegir una imagen, se ve en el círculo de vista previa", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ProfileDraftProvider>
        <ProfileBasicsPage />
      </ProfileDraftProvider>,
    );

    await user.upload(screen.getByLabelText("Upload profile photo", { selector: "input" }), new File(["avatar"], "me.png", { type: "image/png" }));

    expect(await screen.findByAltText("Profile photo preview")).toBeInTheDocument();
  });
});
