import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DELETE_ACCOUNT_CONFIRMATION_WORD, EMERGENCY_CONTACT } from "@/lib/profile";

import PrivacyPage from "./page";

/**
 * Story 6.3 — "Privacy settings for data usage", "Export personal data
 * option (GDPR compliance)" y "Account deletion option with confirmation".
 * `Privacy.dc.html` / `DeleteAccount.dc.html`.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/privacy",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ajustes de privacidad", () => {
  it("permite apagar el uso de datos para investigación de producto", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PrivacyPage />);

    const productResearch = screen.getByRole("switch", { name: /product research/i });
    expect(productResearch).toHaveAttribute("aria-checked", "false");

    await user.click(productResearch);

    expect(productResearch).toHaveAttribute("aria-checked", "true");
  });

  it("muestra el contacto de emergencia", () => {
    render(<PrivacyPage />);

    expect(screen.getByText(new RegExp(EMERGENCY_CONTACT.name))).toBeInTheDocument();
  });
});

describe("borrar la cuenta", () => {
  it("el botón de borrar sigue deshabilitado hasta marcar la casilla y escribir DELETE", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PrivacyPage />);

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    const confirmButton = screen.getByRole("button", { name: "Delete my account" });
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText(/type delete to confirm/i), DELETE_ACCOUNT_CONFIRMATION_WORD);
    expect(confirmButton).toBeEnabled();
  });

  it("'Keep my account' cierra el diálogo sin borrar nada", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PrivacyPage />);

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.click(screen.getByRole("button", { name: "Keep my account" }));

    expect(screen.queryByRole("heading", { name: "Delete your account?" })).not.toBeInTheDocument();
  });
});
