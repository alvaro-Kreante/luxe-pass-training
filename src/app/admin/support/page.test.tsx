import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import SupportDeskPage from "./page";

/**
 * Story 8.1 — "Issue tracking and resolution notes" (la lista) y el atajo de
 * búsqueda hacia `/admin/members`. Backend real (22 sept 2026):
 * `support_tickets` (`supabase/schemas/support_tickets.sql`) vía
 * `admin_list_support_tickets`/`admin_ticket_counts`.
 */

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/support",
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let memberName: string;
let caseNumber: string;
let subject: string;
const stamp = Date.now();

beforeAll(async () => {

  const { data: created, error } = await admin.auth.admin.createUser({
    email: `support-desk-member-${stamp}@ensoleil-test.example`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (error) throw error;

  memberName = `Support Desk Member ${stamp}`;
  await admin.from("profiles").insert({
    id: created.user.id,
    full_name: memberName,
    phone: "+15555550111",
    city: "New York",
    industry: "Testing",
    terms_accepted_at: new Date().toISOString(),
  });

  subject = `Receipt not received ${stamp}`;
  const { data: ticket, error: ticketError } = await admin
    .from("support_tickets")
    .insert({
      member_id: created.user.id,
      subject,
      note: "Resent yesterday",
      status: "new",
    })
    .select("case_number")
    .single();
  if (ticketError) throw ticketError;
  caseNumber = ticket.case_number;

  const adminClient = createClient();
  await signUpConfirmedAdminAndSignIn(adminClient, `support-desk-admin-${stamp}@ensoleil-test.example`, "SupportDesk!24");
});

describe("Support desk (/admin/support)", () => {
  it("lists cases with member, subject and status", async () => {
    render(<SupportDeskPage />);

    expect(await screen.findByRole("heading", { name: "Support desk" })).toBeInTheDocument();
    const row = await screen.findByRole("button", { name: new RegExp(caseNumber) });
    expect(within(row).getByText(memberName)).toBeInTheDocument();
    expect(within(row).getByText(subject)).toBeInTheDocument();
    expect(within(row).getByText("New")).toBeInTheDocument();
  });

  it("opens a case when its row is activated", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SupportDeskPage />);

    const row = await screen.findByRole("button", { name: new RegExp(caseNumber) });
    await user.click(row);

    expect(push).toHaveBeenCalledWith(`/admin/support/${caseNumber}`);
  });

  it("sends a non-empty search to the member lookup", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SupportDeskPage />);

    await screen.findByRole("heading", { name: "Support desk" });
    await user.type(screen.getByRole("searchbox", { name: /search members/i }), "duforest{enter}");

    expect(push).toHaveBeenCalledWith("/admin/members?q=duforest");
  });
});
