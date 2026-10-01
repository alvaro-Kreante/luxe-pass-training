import { afterAll, describe, expect, it } from "vitest";

import { invitePartnerForTest, isolatedClient, type InvitedPartner } from "@/lib/testing/partner-invite-fixture";

import { acceptPartnerInvite, completePartnerInvite, passwordRules } from "./partner-invite";

/**
 * Epic 7 · SetPassword.dc.html / InviteExpired.dc.html — el partner abre el
 * enlace del email (/partner/welcome?token_hash=…&type=invite), revisa lo que
 * escribió el admin y crea su contraseña.
 */

const invitations: InvitedPartner[] = [];

async function invite() {
  const invited = await invitePartnerForTest("welcome-lib");
  invitations.push(invited);
  return invited;
}

afterAll(async () => {
  for (const invited of invitations) await invited.cleanup();
});

describe("abrir el enlace de invitación", () => {
  it("con un token válido devuelve lo que escribió el admin, el partner al que se une y sus lounges", async () => {
    const invited = await invite();

    const welcome = await acceptPartnerInvite(isolatedClient(), invited.token);

    expect(welcome).toEqual({
      firstName: "Camille",
      lastName: "Duarte",
      email: invited.email,
      mobile: "+1 917 555 0163",
      photoUrl: null,
      // Story 10.1 — se une a un partner (la organización), con sus lounges.
      partnerName: invited.partnerName,
      lounges: [{ name: invited.loungeName, address: "27 Bond Street, NoHo" }],
    });
  });

  it("un token usado o inventado es un enlace caducado", async () => {
    const invited = await invite();
    await acceptPartnerInvite(isolatedClient(), invited.token);

    expect(await acceptPartnerInvite(isolatedClient(), invited.token)).toBeNull();
    expect(await acceptPartnerInvite(isolatedClient(), "not-a-real-token")).toBeNull();
  });
});

describe("crear la contraseña", () => {
  it("guarda los datos corregidos, la foto y deja entrar con la contraseña nueva", async () => {
    const invited = await invite();
    const client = isolatedClient();
    await acceptPartnerInvite(client, invited.token);
    const photo = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "camille-portrait.jpg", { type: "image/jpeg" });

    await completePartnerInvite(client, {
      firstName: "Camila",
      lastName: "Duarte Ruiz",
      mobile: "+1 917 555 0199",
      password: "Larkspur2026",
      photo,
    });

    const signIn = isolatedClient();
    const { error } = await signIn.auth.signInWithPassword({ email: invited.email, password: "Larkspur2026" });
    expect(error).toBeNull();
    const { data } = await signIn.from("partner_members").select("first_name, last_name, mobile, photo_path").single();
    expect(data).toEqual({
      first_name: "Camila",
      last_name: "Duarte Ruiz",
      mobile: "+1 917 555 0199",
      photo_path: `${invited.userId}/avatar.jpg`,
    });
  });

  it("el partner no puede cambiar el email que le dio En Soleil", async () => {
    const invited = await invite();
    const client = isolatedClient();
    await acceptPartnerInvite(client, invited.token);

    const { error } = await client.from("partner_members").update({ email: "other@elsewhere-test.com" }).eq("user_id", invited.userId);

    expect(error?.message).toMatch(/cannot be changed/i);
  });
});

describe("reglas de la contraseña", () => {
  it("pide 8 caracteres, un número y que las dos coincidan", () => {
    expect(passwordRules("Larkspur2026", "Larkspur2026")).toEqual({ length: true, number: true, match: true });
    expect(passwordRules("short", "")).toEqual({ length: false, number: false, match: false });
    expect(passwordRules("Larkspurs", "Larkspurs")).toEqual({ length: true, number: false, match: true });
  });
});
