import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import MemberSearchPage from "./page";

/**
 * Story 8.1 — "Member search by email, phone, or name". Backend real
 * (22 sept 2026): `admin_search_members`
 * (`supabase/schemas/support_tickets.sql`).
 */

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/members",
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => searchParams,
}));

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let camilleId: string;
const stamp = Date.now();
/** Sufijo único de este run — pegado justo después de "Duforest" en los tres
 * nombres, para que "Duforest{suffix}" sea una subcadena real en los tres
 * (incluido "Duforest{suffix}-Marin"), inmune a datos de corridas previas. */
const suffix = String(stamp).slice(-8);
const camilleName = `Camille Duforest${suffix}`;
const theoName = `Theo Duforest${suffix}-Marin`;
const reneeName = `Renee Duforest${suffix}`;
/**
 * 4 dígitos propios de este run para el teléfono — deliberadamente
 * independientes de `suffix` (que va dentro del nombre de los tres
 * miembros): si compartieran dígitos, buscar por teléfono también
 * coincidiría por nombre y el test de "1 match" fallaría con 3. Se eligen en
 * `beforeAll` con la propia búsqueda: la base local acumula miembros de
 * corridas anteriores cuyos teléfonos, nombres y emails (con timestamps)
 * ya contienen muchas combinaciones de 4 dígitos.
 */
let phoneLast4: string;

async function unusedLast4(client: ReturnType<typeof createClient>) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000));
    if (suffix.includes(candidate) || String(stamp).includes(candidate)) continue;
    const { data, error } = await client.rpc("admin_search_members", { p_query: candidate });
    if (error) throw error;
    if ((data as unknown[]).length === 0) return candidate;
  }
  throw new Error("No quedan 4 dígitos libres para el teléfono de prueba");
}

async function createMember(name: string, phone: string) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@ensoleil-test.com`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (error) throw error;
  await admin.from("profiles").insert({
    id: created.user.id,
    full_name: name,
    phone,
    city: "New York",
    industry: "Testing",
    terms_accepted_at: new Date().toISOString(),
  });
  return created.user.id;
}

beforeAll(async () => {
  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `members-search-admin-${stamp}@ensoleil-test.com`, "SupportDesk!24");
  phoneLast4 = await unusedLast4(adminClient);

  camilleId = await createMember(camilleName, `+1555668${phoneLast4}`);
  await createMember(theoName, "+15556689930");
  await createMember(reneeName, "+15552041188");
});

describe("Member search (/admin/members)", () => {
  it("shows no results before a query is entered", async () => {
    render(<MemberSearchPage />);

    expect(await screen.findByRole("heading", { name: "Find a member" })).toBeInTheDocument();
    expect(screen.queryByText(camilleName)).not.toBeInTheDocument();
  });

  it("finds members by a partial name and shows the match count", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MemberSearchPage />);

    await screen.findByRole("heading", { name: "Find a member" });
    await user.type(screen.getByRole("searchbox", { name: /name, email, phone/i }), `Duforest${suffix}`);

    await waitFor(() => expect(screen.getByText(camilleName)).toBeInTheDocument());
    expect(screen.getByText(theoName)).toBeInTheDocument();
    expect(screen.getByText(reneeName)).toBeInTheDocument();
    expect(screen.getByText("3 matches")).toBeInTheDocument();
  });

  it("finds a member by the last four digits of their phone", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MemberSearchPage />);

    await screen.findByRole("heading", { name: "Find a member" });
    await user.type(screen.getByRole("searchbox", { name: /name, email, phone/i }), phoneLast4);

    await waitFor(() => expect(screen.getByText(camilleName)).toBeInTheDocument());
    expect(screen.getByText("1 match")).toBeInTheDocument();
  });

  it("prefills the query from the ?q= search param", async () => {
    searchParams = new URLSearchParams(`q=Duforest${suffix}`);
    render(<MemberSearchPage />);

    // `RequireAdminSession` no monta `MemberSearchScreen` (y su lectura de
    // `useSearchParams()`) hasta que la comprobación async de rol resuelve —
    // resetear `searchParams` antes de eso hacía que el mount real ya no
    // viera el "?q=" (bug real encontrado con TDD, no una condición de
    // carrera del test).
    await waitFor(() => expect(screen.getByText(camilleName)).toBeInTheDocument());
    searchParams = new URLSearchParams();
  });

  it("opens a member profile when a result is activated", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MemberSearchPage />);

    await screen.findByRole("heading", { name: "Find a member" });
    await user.type(screen.getByRole("searchbox", { name: /name, email, phone/i }), `Duforest${suffix}`);
    await waitFor(() => screen.getByText(camilleName));
    await user.click(screen.getByRole("button", { name: new RegExp(camilleName) }));

    expect(push).toHaveBeenCalledWith(`/admin/members/${camilleId}`);
  });
});
