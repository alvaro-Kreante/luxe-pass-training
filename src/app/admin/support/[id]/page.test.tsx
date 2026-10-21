import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { chargeSavedPaymentMethod, listSavedPaymentMethods } from "@/lib/stripe-payments";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { attachTestCard } from "@/lib/testing/stripe-fixture";

import CaseDetailPage from "./page";

/**
 * Story 8.1 — "Issue tracking and resolution notes", "Communication log with
 * customer", "Escalation to manager functionality" y "Refund processing
 * interface" (dos caminos reales: una tarifa registrada se "waives" sin
 * Stripe, un cargo real `succeeded` se reembolsa de verdad vía la Edge
 * Function `stripe-refund-payment`). Backend real (22 sept 2026):
 * `support_tickets`/`support_ticket_messages`
 * (`supabase/schemas/support_tickets.sql`).
 */

let currentId = "";
const params = { get id() { return currentId; } };

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/support/x",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: params.id }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function stripeCustomerIdFor(supabase: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  if (error) throw error;
  return data.stripe_customer_id as string;
}

async function createTicket(fields: {
  subject: string;
  status?: string;
  bookingId?: string;
  memberId: string;
}) {
  const { data, error } = await admin
    .from("support_tickets")
    .insert({
      member_id: fields.memberId,
      subject: fields.subject,
      note: "seed note",
      status: fields.status ?? "new",
      booking_id: fields.bookingId ?? null,
    })
    .select("id, case_number")
    .single();
  if (error) throw error;
  return data;
}

let memberId: string;
let loungeId: string;
let adminEmail: string;
const ADMIN_PASSWORD = "SupportDesk!24";

/** Todos los `createClient()` comparten el mismo storage en jsdom — volver a entrar como admin tras usar otra sesión. */
async function signBackInAsAdmin() {
  const client = createClient();
  await client.auth.signInWithPassword({ email: adminEmail, password: ADMIN_PASSWORD });
}

beforeAll(async () => {
  const stamp = Date.now();
  loungeId = `test-lounge-case-${stamp}`;

  await admin.from("lounges").insert({
    id: loungeId,
    name: "Case Detail Test Lounge",
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
  });

  const memberClient = createClient();
  const member = await signUpConfirmedMemberAndSignIn(
    memberClient,
    `case-detail-member-${stamp}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  memberId = member.id;
  await memberClient.auth.signOut();

  adminEmail = `case-detail-admin-${stamp}@ensoleil-test.example`;
  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, adminEmail, ADMIN_PASSWORD);
});

afterAll(async () => {
  // Sin esto, `lounge-directory.test.ts` cuenta una fila de más en el
  // catálogo compartido de Epic 2 — mismo motivo que en
  // `booking-override-drawer.test.tsx`.
  await admin.from("lounges").delete().eq("id", loungeId);
});

describe("Case detail (/admin/support/[id])", () => {
  it("shows the subject, status and the seeded communication log", async () => {
    const ticket = await createTicket({ subject: "Card declined on renewal", memberId });
    await admin.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      kind: "internal-note",
      author: "Priya Raghunathan",
      body: "Reaching out to the member about the card.",
    });
    currentId = ticket.case_number;

    render(<CaseDetailPage />);

    expect(await screen.findByRole("heading", { name: "Card declined on renewal" })).toBeInTheDocument();
    expect(screen.getByText("New · unassigned")).toBeInTheDocument();
    // El perfil del caso y su log de comunicación llegan en dos pasos async
    // seguidos (`load()`): el heading ya puede estar montado mientras el
    // log todavía se está cargando — `findByText` espera a ese segundo
    // paso en vez de asumirlo ya resuelto (bug de test real, expuesto bajo
    // carga al correr la suite completa en paralelo).
    expect(await screen.findByText("Reaching out to the member about the card.")).toBeInTheDocument();
  });

  it("assigns the case to the signed-in admin", async () => {
    const ticket = await createTicket({ subject: "Assign me test", memberId });
    currentId = ticket.case_number;

    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await screen.findByRole("heading", { name: "Assign me test" });
    await user.click(screen.getByRole("button", { name: "Assign to me" }));

    await waitFor(() => expect(screen.getByText(/^Assigned to /)).toBeInTheDocument());

    const { data } = await admin.from("support_tickets").select("assigned_admin_id").eq("id", ticket.id).single();
    expect(data?.assigned_admin_id).not.toBeNull();
  });

  it("escalates the case for real", async () => {
    const ticket = await createTicket({ subject: "Escalate test", memberId });
    currentId = ticket.case_number;

    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await screen.findByRole("heading", { name: "Escalate test" });
    await user.click(screen.getByRole("button", { name: "Escalate" }));

    await waitFor(() => expect(screen.getByText(/Escalated to Dana Mbeki/)).toBeInTheDocument());

    const { data } = await admin.from("support_tickets").select("status").eq("id", ticket.id).single();
    expect(data?.status).toBe("escalated");
  });

  it("sends a reply and writes it to the real communication log", async () => {
    const ticket = await createTicket({ subject: "Reply test", memberId });
    currentId = ticket.case_number;

    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await screen.findByRole("heading", { name: "Reply test" });
    await user.type(screen.getByRole("textbox", { name: /message/i }), "We are waiving the fee.");
    await user.click(screen.getByRole("button", { name: "Send reply" }));

    // El composer solo se vacía tras el insert; el texto por sí solo ya lo
    // contiene el propio <textarea> (React escribe su defaultValue).
    await waitFor(() => expect(screen.getByRole("textbox", { name: /message/i })).toHaveValue(""));
    await waitFor(() => expect(screen.getByText("We are waiving the fee.", { ignore: "textarea" })).toBeInTheDocument());

    const { data } = await admin
      .from("support_ticket_messages")
      .select("kind, body")
      .eq("ticket_id", ticket.id)
      .eq("kind", "staff-reply");
    expect(data).toHaveLength(1);
  });

  it("saves an internal note instead of replying when that mode is selected", async () => {
    const ticket = await createTicket({ subject: "Note test", memberId });
    currentId = ticket.case_number;

    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await screen.findByRole("heading", { name: "Note test" });
    await user.click(screen.getByRole("button", { name: "Internal note" }));
    await user.type(screen.getByRole("textbox", { name: /message/i }), "Checking with the lounge.");
    await user.click(screen.getByRole("button", { name: "Save note" }));

    // El composer solo se vacía tras el insert; el texto por sí solo ya lo
    // contiene el propio <textarea> (React escribe su defaultValue).
    await waitFor(() => expect(screen.getByRole("textbox", { name: /message/i })).toHaveValue(""));
    await waitFor(() => expect(screen.getByText("Checking with the lounge.", { ignore: "textarea" })).toBeInTheDocument());

    const { data } = await admin
      .from("support_ticket_messages")
      .select("kind")
      .eq("ticket_id", ticket.id)
      .eq("kind", "internal-note");
    expect(data).toHaveLength(1);
  });

  it("waives a registered fee that was never charged, no Stripe call involved", async () => {
    const { data: booking, error } = await admin
      .from("bookings")
      .insert({
        member_id: memberId,
        lounge_id: loungeId,
        date: "2026-10-05",
        band: "morning",
        slot_time: "8:00 AM",
        status: "completed",
        no_show: true,
        cancellation_fee_cents: 3500,
      })
      .select("id")
      .single();
    if (error) throw error;

    const ticket = await createTicket({ subject: "No-show fee test", memberId, bookingId: booking.id });
    currentId = ticket.case_number;

    const user = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await screen.findByRole("heading", { name: "No-show fee test" });
    await user.click(screen.getByRole("button", { name: /Waive the fee · \$35\.00/ }));

    await waitFor(() => expect(screen.getByText("Resolved")).toBeInTheDocument());

    const { data: updatedBooking } = await admin
      .from("bookings")
      .select("cancellation_fee_cents, no_show")
      .eq("id", booking.id)
      .single();
    expect(updatedBooking?.cancellation_fee_cents).toBeNull();
    expect(updatedBooking?.no_show).toBe(false);
  });

  it("does not offer any refund action for a case without a fee or a real payment", async () => {
    const ticket = await createTicket({ subject: "Plain case" , memberId });
    currentId = ticket.case_number;

    render(<CaseDetailPage />);

    await screen.findByRole("heading", { name: "Plain case" });
    expect(screen.queryByText(/Waive the fee/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Refund/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resolve case" })).toBeInTheDocument();
  });

  it("refunds a real Stripe charge and marks the payment refunded", async () => {
    const memberClient = createClient();
    await signUpConfirmedMemberAndSignIn(memberClient, `case-detail-payer-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026");
    const {
      data: { user },
    } = await memberClient.auth.getUser();
    const payerId = user!.id;

    await listSavedPaymentMethods(memberClient);
    const customerId = await stripeCustomerIdFor(memberClient, payerId);
    const paymentMethodId = await attachTestCard(customerId);
    const charge = await chargeSavedPaymentMethod(memberClient, {
      loungeId,
      dateIso: "2026-10-06",
      band: "morning",
      slotTime: "8:00 AM",
      specialRequests: "",
      paymentMethodId,
      idempotencyKey: crypto.randomUUID(),
    });
    expect(charge.status).toBe("succeeded");
    await memberClient.auth.signOut();
    await signBackInAsAdmin();

    const ticket = await createTicket({ subject: "Duplicate charge", memberId: payerId });
    await admin.from("payments").update({ booking_id: null }).eq("id", charge.paymentId);
    await admin.from("support_tickets").update({ booking_id: null }).eq("id", ticket.id);
    // Liga el pago al ticket a través de la reserva: como este caso no
    // nace de un no-show, se crea una reserva mínima solo para el join.
    const { data: booking } = await admin
      .from("bookings")
      .insert({
        member_id: payerId,
        lounge_id: loungeId,
        date: "2026-10-06",
        band: "morning",
        slot_time: "8:00 AM",
        status: "completed",
      })
      .select("id")
      .single();
    await admin.from("payments").update({ booking_id: booking!.id }).eq("id", charge.paymentId);
    await admin.from("support_tickets").update({ booking_id: booking!.id }).eq("id", ticket.id);
    currentId = ticket.case_number;

    const user2 = userEvent.setup({ delay: null });
    render(<CaseDetailPage />);

    await screen.findByRole("heading", { name: "Duplicate charge" });
    await user2.click(screen.getByRole("button", { name: /^Refund \$81\.66/ }));

    const dialog = screen.getByRole("dialog");
    await user2.click(within(dialog).getByRole("button", { name: "Refund $81.66" }));

    await waitFor(() => expect(screen.getByText("Resolved")).toBeInTheDocument(), { timeout: 10000 });

    const { data: updatedPayment } = await admin
      .from("payments")
      .select("status, refunded_amount_cents")
      .eq("id", charge.paymentId)
      .single();
    expect(updatedPayment?.status).toBe("refunded");
    expect(updatedPayment?.refunded_amount_cents).toBe(8166);
  }, 20000);

});
