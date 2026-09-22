import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DELETE_ACCOUNT_CONFIRMATION_WORD, fetchPrivacySettings } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import PrivacyPage from "./page";

/**
 * Story 6.3 — "Privacy settings for data usage", "Export personal data
 * option (GDPR compliance)" y "Account deletion option with confirmation".
 * `Privacy.dc.html` / `DeleteAccount.dc.html`, backend real.
 */
const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/privacy",
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function signUpFreshMember(label: string) {
  const supabase = createClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `privacy-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  return { supabase, user };
}

describe("ajustes de privacidad", () => {
  it("AC 'Privacy settings for data usage' — apaga el uso de datos para investigación de producto y lo persiste", async () => {
    const { supabase } = await signUpFreshMember("toggle");
    const user = userEvent.setup({ delay: null });
    render(<PrivacyPage />);

    const productResearch = await screen.findByRole("switch", { name: /product research/i });
    expect(productResearch).toHaveAttribute("aria-checked", "false");

    await user.click(productResearch);
    expect(productResearch).toHaveAttribute("aria-checked", "true");

    await waitFor(async () => {
      expect((await fetchPrivacySettings(supabase)).productResearch).toBe(true);
    });
  });

  it("muestra el contacto de emergencia cuando el perfil lo tiene", async () => {
    const { user: authUser } = await signUpFreshMember("emergency-set");
    const { error } = await adminClient()
      .from("profiles")
      .update({
        emergency_contact_name: "Daniel Rivas",
        emergency_contact_relation: "brother",
        emergency_contact_phone: "+1 (555) 662-0184",
      })
      .eq("id", authUser.id);
    if (error) throw error;

    render(<PrivacyPage />);

    await waitFor(() => expect(screen.getByText(/Daniel Rivas/)).toBeInTheDocument());
  });

  it("dice que no hay contacto de emergencia cuando el perfil no lo tiene (Story 1.1 no lo pide en el alta)", async () => {
    await signUpFreshMember("emergency-empty");
    render(<PrivacyPage />);

    await waitFor(() => expect(screen.getByText("No emergency contact on file")).toBeInTheDocument());
  });
});

describe("exportar y descargar datos", () => {
  it("AC 'Export personal data option (GDPR compliance)' — descarga un JSON real al instante", async () => {
    await signUpFreshMember("export");
    const user = userEvent.setup({ delay: null });
    render(<PrivacyPage />);

    await screen.findByRole("switch", { name: /product research/i });
    await user.click(screen.getByRole("button", { name: "Request export" }));

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1));
    const [filename, content, mimeType] = vi.mocked(downloadTextFile).mock.calls[0]!;
    expect(filename).toBe("luxepass-data-export.json");
    expect(mimeType).toContain("json");
    expect(JSON.parse(content as string).profile).toBeTruthy();
  });

  it("descarga el historial de reservas como CSV", async () => {
    await signUpFreshMember("history-csv");
    const user = userEvent.setup({ delay: null });
    render(<PrivacyPage />);

    await screen.findByRole("switch", { name: /product research/i });
    await user.click(screen.getByRole("button", { name: "Download" }));

    expect(downloadTextFile).toHaveBeenCalledWith("luxepass-booking-history.csv", expect.stringContaining("Reference,Lounge,When,Outcome"));
  });
});

describe("borrar la cuenta", () => {
  it("el botón de borrar sigue deshabilitado hasta marcar la casilla y escribir DELETE", async () => {
    await signUpFreshMember("delete-disabled");
    const user = userEvent.setup({ delay: null });
    render(<PrivacyPage />);

    await screen.findByRole("switch", { name: /product research/i });
    await user.click(screen.getByRole("button", { name: "Delete account" }));

    const confirmButton = screen.getByRole("button", { name: "Delete my account" });
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText(/type delete to confirm/i), DELETE_ACCOUNT_CONFIRMATION_WORD);
    expect(confirmButton).toBeEnabled();
  });

  it("'Keep my account' cierra el diálogo sin borrar nada", async () => {
    await signUpFreshMember("delete-keep");
    const user = userEvent.setup({ delay: null });
    render(<PrivacyPage />);

    await screen.findByRole("switch", { name: /product research/i });
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.click(screen.getByRole("button", { name: "Keep my account" }));

    expect(screen.queryByRole("heading", { name: "Delete your account?" })).not.toBeInTheDocument();
  });

  it("confirmar el borrado marca deleted_at de verdad y manda a /login", async () => {
    const { user: authUser } = await signUpFreshMember("delete-confirm");
    const user = userEvent.setup({ delay: null });
    render(<PrivacyPage />);

    await screen.findByRole("switch", { name: /product research/i });
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText(/type delete to confirm/i), DELETE_ACCOUNT_CONFIRMATION_WORD);
    await user.click(screen.getByRole("button", { name: "Delete my account" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));

    const { data } = await adminClient().from("profiles").select("deleted_at").eq("id", authUser.id).single();
    expect(data?.deleted_at).not.toBeNull();
  });
});
