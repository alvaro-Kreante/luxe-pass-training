import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { REFERRAL_CODE, SAMPLE_PROFILE } from "@/lib/profile";

import ProfilePage from "./page";

/**
 * Story 6.3 — "Edit profile all fields input before", membership status y
 * código de referido. `Profile.dc.html`.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
}));

describe("detalles del perfil", () => {
  it("precarga los campos con los datos capturados en el onboarding", () => {
    render(<ProfilePage />);

    expect(screen.getByLabelText(/full name/i)).toHaveValue(SAMPLE_PROFILE.fullName);
    expect(screen.getByLabelText(/email address/i)).toHaveValue(SAMPLE_PROFILE.email);
  });

  it("permite editar cualquier campo", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ProfilePage />);

    const jobTitle = screen.getByLabelText(/job title/i);
    await user.clear(jobTitle);
    await user.type(jobTitle, "VP of Operations");

    expect(jobTitle).toHaveValue("VP of Operations");
  });

  it("muestra el estado de la membresía", () => {
    render(<ProfilePage />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Annual")).toBeInTheDocument();
  });

  it("enseña el código de referido", () => {
    render(<ProfilePage />);

    expect(screen.getByText(REFERRAL_CODE)).toBeInTheDocument();
  });

  it("muestra el badge Verified junto al email y al teléfono", () => {
    render(<ProfilePage />);

    expect(screen.getAllByText("Verified")).toHaveLength(2);
  });
});

describe("Upload photo", () => {
  it("al subir una imagen, se muestra en el círculo del avatar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ProfilePage />);

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Upload photo", { selector: "input" }), file);

    expect(await screen.findByAltText(SAMPLE_PROFILE.fullName)).toBeInTheDocument();
  });
});
