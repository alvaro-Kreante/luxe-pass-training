import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PartnerAnalyticsView } from "@/components/partner/partner-analytics-view";
import { today } from "@/lib/availability";
import { loadPartnerAnalytics } from "@/lib/partner";
import { selectPartnerLounge } from "@/lib/partner-lounges";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn, signUpConfirmedPartnerAndSignIn } from "@/lib/testing/confirmed-user";

/**
 * Story 7.3 — "Weekly/monthly booking volume reports" y "revenue attribution
 * from Luxe Pass bookings". Artboard: Analytics.dc.html.
 *
 * Backend real (22 sept 2026): `partner_analytics_summary`/
 * `partner_bookings_by_day` (`supabase/schemas/partner_analytics.sql`)
 * agregan sobre `bookings` real. Para poder afirmar cifras exactas sin que
 * las corridas anteriores de la suite (u otros lounges reales como
 * The Ainsworth) contaminen el recuento, este archivo crea su propio lounge
 * efímero (insert directo con el service role — el mismo patrón que
 * `signUpConfirmedAndSignIn`) y sus propias reservas directas en `bookings`,
 * sin pasar por `confirm_booking` (no hace falta `lounge_availability` para
 * lo que esta pantalla agrega).
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/partner/analytics",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

beforeEach(() => {
  vi.clearAllMocks();
});

let loungeId: string;
let emptyLoungeId: string;
const EMPTY_LOUNGE_NAME = "Analytics Empty Lounge";

/**
 * PERF-02 — la página es un Server Component (`requirePartner()` +
 * `loadPartnerAnalytics`); el test carga lo mismo con la sesión de partner de
 * test y renderiza la vista.
 */
async function renderPage() {
  return render(<PartnerAnalyticsView {...await loadPartnerAnalytics(createClient())} />);
}
const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

afterAll(async () => {
  // El lounge efímero es una fila real en el catálogo compartido de Epic 2
  // (`public.lounges`) — sin borrarlo, `lounge-directory.test.ts` (que
  // cuenta el catálogo completo) ve una fila de más y falla. `on delete
  // cascade` en `bookings` limpia el resto solo.
  if (emptyLoungeId) await admin.from("lounges").delete().eq("id", emptyLoungeId);
  if (!loungeId) return;
  // Story 10.1 — el lounge efímero trae su propio partner de test: se borra con él.
  const { data: lounge } = await admin.from("lounges").select("partner_id").eq("id", loungeId).maybeSingle();
  await admin.from("lounges").delete().eq("id", loungeId);
  if (lounge?.partner_id) await admin.from("partners").delete().eq("id", lounge.partner_id);
});

beforeAll(async () => {
  const stamp = Date.now();
  loungeId = `test-lounge-analytics-${stamp}`;

  const { error: loungeError } = await admin.from("lounges").insert({
    id: loungeId,
    name: "Analytics Test Lounge",
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
  });
  if (loungeError) throw loungeError;

  emptyLoungeId = `test-lounge-analytics-empty-${stamp}`;
  const { error: emptyError } = await admin.from("lounges").insert({
    id: emptyLoungeId,
    name: EMPTY_LOUNGE_NAME,
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
  });
  if (emptyError) throw emptyError;

  const memberEmail = `analytics-member-${stamp}@ensoleil-test.example`;
  const member = createClient();
  await signUpConfirmedMemberAndSignIn(member, memberEmail, "EnSoleil!2026", { membership: "annual" });
  const {
    data: { user: memberUser },
  } = await member.auth.getUser();
  await member.auth.signOut();

  const rows = [
    { band: "morning", slot_time: "8:00 AM", status: "confirmed", no_show: false }, // membership visit
    { band: "morning", slot_time: "10:30 AM", status: "confirmed", no_show: false }, // membership visit
    { band: "morning", slot_time: "1:00 PM", status: "confirmed", no_show: false }, // day pass (pago abajo)
    { band: "morning", slot_time: "3:30 PM", status: "completed", no_show: true, cancellation_fee_cents: 3500 }, // no-show
    { band: "morning", slot_time: "6:00 PM", status: "cancelled", no_show: false }, // cancelada
  ].map((row) => ({
    member_id: memberUser!.id,
    lounge_id: loungeId,
    date: today(),
    special_requests: "",
    ...row,
  }));

  const { data: inserted, error: bookingsError } = await admin.from("bookings").insert(rows).select("id, slot_time");
  if (bookingsError) throw bookingsError;

  const dayPassBooking = inserted!.find((b) => b.slot_time === "1:00 PM")!;
  const { error: paymentError } = await admin.from("payments").insert({
    member_id: memberUser!.id,
    booking_id: dayPassBooking.id,
    amount_cents: 8025,
    status: "succeeded",
  });
  if (paymentError) throw paymentError;

  const partner = createClient();
  await signUpConfirmedPartnerAndSignIn(partner, `analytics-partner-${stamp}@theainsworth-test.example`, "AinsworthFOH!24", {
    businessName: "Analytics Test Venue",
    loungeIds: [loungeId, emptyLoungeId],
  });
  await selectPartnerLounge(partner, loungeId);
});

describe("Analytics.dc.html", () => {
  it("muestra los cuatro tiles de métrica del lounge real (5 reservas: 2 membresía, 1 day pass, 1 no-show, 1 cancelada)", async () => {
    await renderPage();

    await waitFor(() =>
      expect(within(screen.getByText("Bookings").parentElement!).getByText("5")).toBeVisible(),
    );
    expect(
      within(screen.getByText("Guests who arrived").parentElement!).getByText("3"),
    ).toBeVisible(); // 2 membership + 1 day pass
    const noShowTile = screen.getByText("No-shows").parentElement!;
    expect(within(noShowTile).getByText("1")).toBeVisible();
    expect(screen.getAllByText("$115.25").length).toBeGreaterThan(0);
  });

  it("el desglose de ingresos cuadra con el total atribuido", async () => {
    await renderPage();

    await waitFor(() => expect(screen.getByText("$80.25")).toBeVisible());
    expect(screen.getByText("$0.00")).toBeVisible();
    expect(screen.getByText("$35.00")).toBeVisible();
  });

  it('cambiar a "Week" reduce el gráfico diario a 7 barras', async () => {
    const user = userEvent.setup({ delay: null });
    await renderPage();

    await waitFor(() => expect(screen.getAllByTestId("daily-bar").length).toBeGreaterThan(7));

    await user.click(screen.getByRole("button", { name: "Week" }));

    expect(screen.getAllByTestId("daily-bar")).toHaveLength(7);
  });

  it('"Download revenue CSV" descarga el desglose de ingresos real', async () => {
    const user = userEvent.setup({ delay: null });
    await renderPage();

    await waitFor(() => expect(screen.getAllByText("$115.25").length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: "Download revenue CSV" }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename, csv] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toMatch(/\.csv$/);
    expect(csv).toContain("$115.25");
  });

  it("al elegir otro lounge en la cabecera, las métricas pasan a ese lounge", async () => {
    const user = userEvent.setup({ delay: null });
    await renderPage();
    await waitFor(() =>
      expect(within(screen.getByText("Bookings").parentElement!).getByText("5")).toBeVisible(),
    );

    await user.click(screen.getByRole("button", { name: /^Lounge:/ }));
    await user.click(await screen.findByRole("menuitemradio", { name: new RegExp(EMPTY_LOUNGE_NAME) }));

    await waitFor(() =>
      expect(within(screen.getByText("Bookings").parentElement!).getByText("0")).toBeVisible(),
    );
  });
});
