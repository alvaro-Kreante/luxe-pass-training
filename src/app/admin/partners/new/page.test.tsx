import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import NewPartnerPage from "./page";

/**
 * Story 10.3 — alta de un partner (PartnerNew.dc.html, Fase 10 · 2). Nace en
 * draft con sus datos y, si se quiere, su primer usuario.
 */

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/partners/new",
  useRouter: () => router,
}));

const service = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = `${Date.now()}`;
const adminEmail = `new-partner-admin-${stamp}@ensoleil-test.com`;

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(createClient(), adminEmail, "SupportDesk!24");
});

beforeEach(() => {
  router.replace.mockClear();
});

afterAll(async () => {
  await service.from("partners").delete().like("name", `% ${stamp}`);
});

async function fillDetails(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.type(await screen.findByLabelText("Partner name"), name);
  await user.type(screen.getByLabelText("Contact email"), "hello@solenne.com");
  await user.type(screen.getByLabelText("Street address"), "1200 Collins Avenue");
  await user.type(screen.getByLabelText("City"), "Miami Beach");
  await user.type(screen.getByLabelText("Country"), "United States");
}

async function fillUser(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(screen.getByLabelText("First name"), "Noor");
  await user.type(screen.getByLabelText("Last name"), "Haddad");
  await user.type(screen.getByLabelText("Work email"), email);
}

describe("los datos del partner", () => {
  it("el edificio central se escribe en campos de texto, sin mapa", async () => {
    render(<NewPartnerPage />);

    expect(await screen.findByLabelText("Street address")).toBeInTheDocument();
    for (const label of ["Address line 2", "City", "State / region", "Postal code", "Country"]) {
      expect(screen.getByLabelText(new RegExp(label))).toBeInTheDocument();
    }
    expect(screen.queryByRole("region", { name: /map/i })).toBeNull();
  });

  it("sin nombre no se guarda", async () => {
    render(<NewPartnerPage />);

    expect(await screen.findByRole("button", { name: "Save draft" })).toBeDisabled();
  });
});

describe("el primer usuario", () => {
  it("se escribe en la misma alta y avisa de que será el representante", async () => {
    render(<NewPartnerPage />);

    expect(await screen.findByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByText(/first user becomes the representative/i)).toBeInTheDocument();
  });
});

describe("guardar el borrador", () => {
  it("crea el partner en draft con su primer usuario como representante y abre su detalle", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NewPartnerPage />);
    const name = `Solenne ${stamp}`;
    await fillDetails(user, name);
    await fillUser(user, `noor-${stamp}@solenne-test.com`);

    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const { data } = await service
      .from("partners")
      .select("id, status, city, representative:partner_members!partners_representative_fkey(email)")
      .eq("name", name)
      .single();
    expect(data).toMatchObject({ status: "draft", city: "Miami Beach", representative: { email: `noor-${stamp}@solenne-test.com` } });
    expect(router.replace).toHaveBeenCalledWith(`/admin/partners/${data!.id}`);
  });

  it("se puede guardar sin usuarios todavía", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NewPartnerPage />);
    await fillDetails(user, `Meridian ${stamp}`);

    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
  });

  it("un email que ya tiene cuenta no se guarda y lo dice", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NewPartnerPage />);
    await fillDetails(user, `Taken ${stamp}`);
    await fillUser(user, adminEmail);

    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already in use/i);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
