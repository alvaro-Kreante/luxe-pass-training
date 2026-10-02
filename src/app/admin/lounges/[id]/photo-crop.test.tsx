import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import LoungeEditPage from "./page";

/**
 * Story 10.10 · PhotoCropOpen (23), PhotoCropSize (24), PhotoUploading (25),
 * PhotoRecrop (26) y PhotoInvalidFile (27): cada foto pasa por el editor
 * (encuadre 3 : 2 y tamaño) antes de subirse; se guardan la versión
 * recortada y el original, para reencuadrarla después.
 */

let currentId = "";
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges/x",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: currentId }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const service = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
let count = 0;

async function draftLounge() {
  count += 1;
  const id = `test-lounge-photo-crop-${stamp}-${count}`;
  const { error } = await service.from("lounges").insert({
    id,
    name: `Photo Lounge ${stamp} ${count}`,
    neighborhood: "Midtown East",
    city: "New York",
    city_id: "new-york",
    address: "122 E 45th St",
    lat: 40.75,
    lng: -73.97,
    hours: "Open until 10 PM",
    bands: ["morning"],
    weekly_hours: Array(7).fill("8 AM – 10 PM"),
    capacity: 20,
    content_status: "draft",
  });
  if (error) throw error;
  currentId = id;
  return id;
}

function photo(name: string, type = "image/jpeg") {
  return new File(["fake-bytes"], name, { type });
}

async function renderDraft() {
  render(<LoungeEditPage />);
  return screen.findByLabelText("Add lounge photos");
}

async function storedImages(id: string) {
  const { data } = await service.from("lounge_images").select("url, caption, original_url, crop").eq("lounge_id", id).order("position");
  return data ?? [];
}

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(createClient(), `photo-crop-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
});

afterAll(async () => {
  await service.from("lounges").delete().like("id", `test-lounge-photo-crop-${stamp}-%`);
});

describe("elegir una foto abre el editor", () => {
  it("con el encuadre 3 : 2, el nombre del original y los tres tamaños, Standard por defecto", async () => {
    const user = userEvent.setup({ delay: null });
    await draftLounge();
    await user.upload(await renderDraft(), photo("ainsworth-terrace.jpg"));

    const editor = await screen.findByRole("dialog", { name: "Frame this photo" });
    expect(within(editor).getByText("ainsworth-terrace.jpg")).toBeInTheDocument();
    expect(within(editor).getByRole("slider", { name: "Zoom" })).toBeInTheDocument();
    expect(within(editor).getByRole("radio", { name: /Large · 2400 px/ })).not.toBeChecked();
    expect(within(editor).getByRole("radio", { name: /Standard · 1600 px/ })).toBeChecked();
    expect(within(editor).getByRole("radio", { name: /Light · 1200 px/ })).not.toBeChecked();
  });

  it("cancelar no sube nada", async () => {
    const user = userEvent.setup({ delay: null });
    await draftLounge();
    await user.upload(await renderDraft(), photo("terrace.jpg"));

    const editor = await screen.findByRole("dialog", { name: "Frame this photo" });
    await user.click(within(editor).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("button", { name: /^Edit photo/ })).toBeNull();
  });

  it("al confirmar se sube la versión recortada del tamaño elegido y se guarda su original", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await draftLounge();
    await user.upload(await renderDraft(), photo("terrace.jpg"));

    const editor = await screen.findByRole("dialog", { name: "Frame this photo" });
    await user.click(within(editor).getByRole("radio", { name: /Light · 1200 px/ }));
    await user.click(within(editor).getByRole("button", { name: "Use photo" }));
    await screen.findByRole("button", { name: "Edit photo terrace" }, { timeout: 8000 });

    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByRole("dialog", { name: "Draft saved" }, { timeout: 8000 });
    const [image] = await storedImages(id);
    expect(image.caption).toBe("terrace");
    expect(image.original_url).toMatch(/lounge-images\/.+terrace\.jpg$/);
    expect(image.url).not.toBe(image.original_url);
    expect(image.crop).toMatchObject({ size: "light" });
  });

  it("varias a la vez pasan por el editor una detrás de otra", async () => {
    const user = userEvent.setup({ delay: null });
    await draftLounge();
    await user.upload(await renderDraft(), [photo("bar.jpg"), photo("terrace.jpg")]);

    const first = await screen.findByRole("dialog", { name: "Frame this photo" });
    expect(within(first).getByText("bar.jpg")).toBeInTheDocument();
    await user.click(within(first).getByRole("button", { name: "Use photo" }));
    await waitFor(() => expect(within(screen.getByRole("dialog", { name: "Frame this photo" })).getByText("terrace.jpg")).toBeInTheDocument(), { timeout: 8000 });
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Use photo" }));

    await screen.findByRole("button", { name: "Edit photo terrace" }, { timeout: 8000 });
    expect(screen.getByRole("button", { name: "Edit photo bar" })).toBeInTheDocument();
  });
});

describe("un archivo que no es una imagen", () => {
  it("se rechaza con un mensaje claro, sin abrir el editor ni subir nada", async () => {
    const user = userEvent.setup({ delay: null, applyAccept: false });
    await draftLounge();
    await user.upload(await renderDraft(), photo("ainsworth-menu.pdf", "application/pdf"));

    expect(await screen.findByText("ainsworth-menu.pdf isn't an image")).toBeInTheDocument();
    expect(screen.getByText(/Choose a JPEG, PNG or WebP photo\. Nothing was uploaded\./)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit photo/ })).toBeNull();
  });
});

describe("reencuadrar una foto ya subida", () => {
  it("Adjust crop reabre el editor sobre el original y guardar sustituye la foto, con su nombre", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await draftLounge();
    const originalPath = `${id}/original-main-room.jpg`;
    await service.storage.from("lounge-images").upload(originalPath, new Uint8Array([1, 2, 3]), { contentType: "image/jpeg" });
    const originalUrl = service.storage.from("lounge-images").getPublicUrl(originalPath).data.publicUrl;
    const crop = { x: 0, y: 0, width: 3000, height: 2000, size: "standard" };
    await service.from("lounge_images").insert({ lounge_id: id, url: `${originalUrl}?v=cropped`, caption: "Main room", position: 0, original_url: originalUrl, crop });
    await renderDraft();

    await user.click(await screen.findByRole("button", { name: "Adjust crop Main room" }));
    const editor = await screen.findByRole("dialog", { name: "Adjust the crop" });
    expect(within(editor).getByText("Original · kept")).toBeInTheDocument();
    await user.click(within(editor).getByRole("radio", { name: /Large · 2400 px/ }));
    await user.click(within(editor).getByRole("button", { name: "Save crop" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 8000 });

    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByRole("dialog", { name: "Draft saved" }, { timeout: 8000 });
    const [image] = await storedImages(id);
    expect(image.caption).toBe("Main room");
    expect(image.original_url).toBe(originalUrl);
    expect(image.url).not.toBe(`${originalUrl}?v=cropped`);
    expect(image.crop).toMatchObject({ size: "large" });
  });

  it("una foto subida antes del editor también se reencuadra: la propia foto pasa a ser su original", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await draftLounge();
    const path = `${id}/seeded-terrace.jpg`;
    await service.storage.from("lounge-images").upload(path, new Uint8Array([1, 2, 3]), { contentType: "image/jpeg" });
    const seededUrl = service.storage.from("lounge-images").getPublicUrl(path).data.publicUrl;
    await service.from("lounge_images").insert({ lounge_id: id, url: seededUrl, caption: "Terrace", position: 0 });
    await renderDraft();

    await user.click(await screen.findByRole("button", { name: "Adjust crop Terrace" }));
    const editor = await screen.findByRole("dialog", { name: "Adjust the crop" });
    await user.click(within(editor).getByRole("button", { name: "Save crop" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 8000 });

    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByRole("dialog", { name: "Draft saved" }, { timeout: 8000 });
    const [image] = await storedImages(id);
    expect(image.original_url).toBe(seededUrl);
    expect(image.url).not.toBe(seededUrl);
    expect(image.crop).toMatchObject({ size: "standard" });
  });
});
