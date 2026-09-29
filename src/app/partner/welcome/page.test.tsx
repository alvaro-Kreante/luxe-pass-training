import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { invitePartnerForTest, isolatedClient, type InvitedPartner } from "@/lib/testing/partner-invite-fixture";

import PartnerWelcomePage from "./page";

/**
 * Epic 7 · SetPassword.dc.html (14) / InviteExpired.dc.html (15) — el enlace
 * del email de invitación. El partner revisa lo que escribió el admin (el
 * email no se puede cambiar), añade su foto y crea la contraseña.
 */

const push = vi.fn();
let params = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push }),
  useSearchParams: () => params,
}));

const invitations: InvitedPartner[] = [];

async function openInvitation() {
  const invited = await invitePartnerForTest("welcome-page");
  invitations.push(invited);
  params = new URLSearchParams({ token_hash: invited.token, type: "invite" });
  render(<PartnerWelcomePage />);
  await screen.findByRole("heading", { name: "Create your password" });
  return invited;
}

beforeEach(() => {
  push.mockClear();
});

afterAll(async () => {
  for (const invited of invitations) await invited.cleanup();
});

describe("el enlace de invitación", () => {
  it("muestra el lounge al que se une y los datos que escribió el admin", async () => {
    const invited = await openInvitation();

    expect(screen.getByText(invited.loungeName)).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("Camille");
    expect(screen.getByLabelText("Last name")).toHaveValue("Duarte");
    expect(screen.getByLabelText("Mobile")).toHaveValue("+1 917 555 0163");
  });

  it("el email se ve pero no se puede editar", async () => {
    const invited = await openInvitation();

    const email = screen.getByLabelText("Work email");
    expect(email).toHaveValue(invited.email);
    expect(email).toHaveAttribute("readonly");
  });

  it("un enlace usado o caducado lleva a la pantalla de enlace caducado", async () => {
    params = new URLSearchParams({ token_hash: "not-a-real-token", type: "invite" });
    render(<PartnerWelcomePage />);

    expect(await screen.findByRole("heading", { name: "This link has expired" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute("href", "/partner/login");
  });

  it("sin token también es un enlace caducado", async () => {
    params = new URLSearchParams();
    render(<PartnerWelcomePage />);

    expect(await screen.findByRole("heading", { name: "This link has expired" })).toBeInTheDocument();
  });
});

describe("la foto", () => {
  it("al elegirla se previsualiza en el círculo", async () => {
    const user = userEvent.setup({ delay: null });
    await openInvitation();
    const photo = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "camille-portrait.jpg", { type: "image/jpeg" });

    await user.upload(screen.getByLabelText("Upload photo"), photo);

    expect(await screen.findByRole("img", { name: "Your photo" })).toHaveAttribute("src", expect.stringMatching(/^data:image\/jpeg/));
  });
});

describe("crear la cuenta", () => {
  it("no deja enviar hasta cumplir las reglas de la contraseña", async () => {
    const user = userEvent.setup({ delay: null });
    await openInvitation();

    await user.type(screen.getByLabelText("Password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "short");

    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
  });

  it("con datos corregidos y contraseña válida entra al dashboard y ya puede iniciar sesión", async () => {
    const user = userEvent.setup({ delay: null });
    const invited = await openInvitation();

    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "Camila");
    await user.type(screen.getByLabelText("Password"), "Larkspur2026");
    await user.type(screen.getByLabelText("Confirm password"), "Larkspur2026");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/partner"));
    const signIn = isolatedClient();
    const { error } = await signIn.auth.signInWithPassword({ email: invited.email, password: "Larkspur2026" });
    expect(error).toBeNull();
    const { data } = await signIn.from("partners").select("first_name").single();
    expect(data?.first_name).toBe("Camila");
  });
});
