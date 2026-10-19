import { createClient as createAdminClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  cancelMembershipPlanChange,
  chargeMembershipWithSavedCard,
  createMembershipCheckoutSession,
  fetchMembership,
  fetchMembershipQuote,
  fetchVisitsThisMonth,
  formatLongDate,
  formatMonthYear,
  scheduleMembershipPlanChange,
  setMembershipAutoRenew,
} from "./membership";
import { fetchNotifications } from "./notifications";
import { fetchMembershipStatus } from "./profile";
import { createClient } from "./supabase/client";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import {
  giveTestMemberSavedCard,
  grantTestMembership,
  readTestMembership,
  runMembershipRenewalCharge,
  settleTestPayment,
} from "./testing/membership-fixture";
import { attachTestCard } from "./testing/stripe-fixture";

/**
 * Story 9.1 (Membership) — conectada a Supabase real (`memberships`, nace
 * en Epic 9) y a Stripe real en modo test para el cobro puntual de alta o
 * subida de plan. Precondiciones, igual que `stripe-payments.test.ts`:
 * `supabase start` + `supabase functions serve --env-file supabase/functions/.env`.
 */

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function freshMember(label: string) {
  const supabase = createClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `membership-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  return { supabase, user };
}

async function freshMemberWithEmail(label: string) {
  const supabase = createClient();
  const email = `membership-${Date.now()}-${label}@ensoleil-test.com`;
  const user = await signUpConfirmedMemberAndSignIn(supabase, email, "EnSoleil!2026");
  return { supabase, user, email };
}

async function stripeCustomerFor(memberId: string) {
  const { data } = await admin().from("profiles").select("stripe_customer_id").eq("id", memberId).single();
  return data?.stripe_customer_id as string | null;
}

describe("formato de fechas de membresía", () => {
  it("formatea mes y año en UTC", () => {
    expect(formatMonthYear("2025-11-03T00:00:00Z")).toBe("November 2025");
  });

  it("formatea fecha larga en UTC", () => {
    expect(formatLongDate("2026-11-03T00:00:00Z")).toBe("November 3, 2026");
  });
});

describe("AC 'Clear membership display in profile (active/inactive)'", () => {
  it("un miembro recién creado nace sin membresía — inactiva hasta elegir plan", async () => {
    const { supabase } = await freshMember("born-inactive");

    const membership = await fetchMembership(supabase);
    expect(membership.status).toBe("inactive");
    expect(membership.plan).toBeNull();
    expect(await fetchMembershipStatus(supabase)).toBe("inactive");
  });

  it("con un plan activo devuelve plan, alta y fecha de renovación reales", async () => {
    const { supabase, user } = await freshMember("active");
    await grantTestMembership(user.id, "annual", {
      startedAt: new Date("2025-11-03T00:00:00Z"),
      periodStart: new Date("2025-11-03T00:00:00Z"),
      periodEnd: new Date("2099-11-03T00:00:00Z"),
    });

    const membership = await fetchMembership(supabase);
    expect(membership.status).toBe("active");
    expect(membership.plan).toBe("annual");
    expect(membership.startedAt && formatMonthYear(membership.startedAt)).toBe("November 2025");
    expect(membership.currentPeriodEnd && formatLongDate(membership.currentPeriodEnd)).toBe("November 3, 2099");
    expect(await fetchMembershipStatus(supabase)).toBe("active");
  });
});

describe("AC 'Upgrade options to monthly subscribers and pricing (monthly → yearly price)'", () => {
  it("sin membresía, elegir el anual cobra el precio completo, sin crédito", async () => {
    const { supabase } = await freshMember("quote-join");

    const quote = await fetchMembershipQuote(supabase, "annual");
    expect(quote.kind).toBe("join");
    expect(quote.chargeCents).toBe(240000);
    expect(quote.creditCents).toBe(0);
    expect(quote.dueCents).toBe(240000);
  });

  it("desde el mensual, subir al anual acredita los días no usados del mes", async () => {
    const { supabase, user } = await freshMember("quote-upgrade");
    const periodStart = new Date(Date.now() - 8 * 86400000);
    const periodEnd = new Date(periodStart.getTime() + 30 * 86400000);
    await grantTestMembership(user.id, "monthly", { periodStart, periodEnd });

    const quote = await fetchMembershipQuote(supabase, "annual");
    expect(quote.kind).toBe("upgrade");
    expect(quote.creditDays).toBe(22);
    expect(quote.creditCents).toBe(18260);
    expect(quote.dueCents).toBe(240000 - 18260);
  });

  it("no ofrece volver a contratar el plan que ya tiene", async () => {
    const { supabase, user } = await freshMember("quote-same");
    await grantTestMembership(user.id, "annual");

    await expect(fetchMembershipQuote(supabase, "annual")).rejects.toThrow();
  });

  it("no ofrece bajar de anual a mensual — espera al final del término, sin pantalla de confirmación", async () => {
    const { supabase, user } = await freshMember("quote-downgrade");
    await grantTestMembership(user.id, "annual");

    await expect(fetchMembershipQuote(supabase, "monthly")).rejects.toThrow();
  });

  it("con tarjeta guardada, el cobro real de Stripe activa el plan elegido", async () => {
    const { supabase, user } = await freshMember("charge-join");
    await fetchMembershipQuote(supabase, "monthly");
    // El Customer de Stripe se crea en el primer intento de cobro; aquí lo
    // forzamos con una sesión para poder adjuntarle la tarjeta de prueba.
    await createMembershipCheckoutSession(supabase, { plan: "monthly", saveCard: false });
    const paymentMethodId = await attachTestCard((await stripeCustomerFor(user.id))!);

    const result = await chargeMembershipWithSavedCard(supabase, { plan: "monthly", paymentMethodId });
    expect(result.status).toBe("succeeded");

    const membership = await fetchMembership(supabase);
    expect(membership.status).toBe("active");
    expect(membership.plan).toBe("monthly");
    expect(membership.autoRenew).toBe(true);

    const { data: payment } = await supabase
      .from("payments")
      .select("amount_cents, membership_plan, status")
      .eq("id", result.paymentId)
      .single();
    expect(payment).toEqual({ amount_cents: 24900, membership_plan: "monthly", status: "succeeded" });
  });

  it("subir de mensual a anual conserva la fecha de alta y abre un término de un año", async () => {
    const { supabase, user } = await freshMember("charge-upgrade");
    const startedAt = new Date("2026-07-04T00:00:00Z");
    await grantTestMembership(user.id, "monthly", {
      startedAt,
      periodStart: new Date(Date.now() - 8 * 86400000),
      periodEnd: new Date(Date.now() + 22 * 86400000),
    });
    await createMembershipCheckoutSession(supabase, { plan: "annual", saveCard: false });
    const paymentMethodId = await attachTestCard((await stripeCustomerFor(user.id))!);

    const result = await chargeMembershipWithSavedCard(supabase, { plan: "annual", paymentMethodId });
    expect(result.status).toBe("succeeded");

    const membership = await fetchMembership(supabase);
    expect(membership.plan).toBe("annual");
    expect(membership.startedAt && formatMonthYear(membership.startedAt)).toBe("July 2026");
    const termDays = (Date.parse(membership.currentPeriodEnd!) - Date.parse(membership.currentPeriodStart!)) / 86400000;
    expect(termDays).toBeGreaterThanOrEqual(365);
    expect(termDays).toBeLessThanOrEqual(366);
  });

  it("con tarjeta nueva, el plan solo se activa cuando el pago se liquida", async () => {
    const { supabase } = await freshMember("session");

    const session = await createMembershipCheckoutSession(supabase, { plan: "annual", saveCard: true });
    expect(session.clientSecret).toMatch(/^cs_test_/);
    expect((await fetchMembership(supabase)).status).toBe("inactive");

    await settleTestPayment(session.paymentId);

    const membership = await fetchMembership(supabase);
    expect(membership.status).toBe("active");
    expect(membership.plan).toBe("annual");
  });
});

describe("AC 'Renewal date and auto-renewal settings'", () => {
  it("apagar la auto-renovación se guarda de verdad y deja el plan activo hasta el final del término", async () => {
    const { supabase, user } = await freshMember("auto-renew-off");
    await grantTestMembership(user.id, "annual");

    await setMembershipAutoRenew(supabase, false);

    const membership = await fetchMembership(supabase);
    expect(membership.autoRenew).toBe(false);
    expect(membership.status).toBe("active");
  });

  it("volver a encenderla también se guarda", async () => {
    const { supabase, user } = await freshMember("auto-renew-on");
    await grantTestMembership(user.id, "annual", { autoRenew: false });

    await setMembershipAutoRenew(supabase, true);

    expect((await fetchMembership(supabase)).autoRenew).toBe(true);
  });

  it("sin membresía no hay auto-renovación que cambiar", async () => {
    const { supabase } = await freshMember("auto-renew-none");

    await expect(setMembershipAutoRenew(supabase, false)).rejects.toThrow();
  });
});

describe("Visitas del mes", () => {
  it("cuenta las reservas cubiertas por la membresía del mes, sin contar las canceladas ni los day passes pagados", async () => {
    const { supabase, user } = await freshMember("visits");
    const service = admin();
    const { data: paid } = await service
      .from("payments")
      .insert({ member_id: user.id, amount_cents: 8166, status: "succeeded" })
      .select("id")
      .single();
    const base = { member_id: user.id, lounge_id: "the-ainsworth", band: "morning", slot_time: "8:00 AM" };
    const { data: bookings, error } = await service
      .from("bookings")
      .insert([
        { ...base, date: "2025-09-02", status: "completed" },
        { ...base, date: "2025-09-20", status: "confirmed" },
        { ...base, date: "2025-09-21", status: "cancelled" },
        { ...base, date: "2025-09-22", status: "confirmed" },
        { ...base, date: "2025-10-02", status: "confirmed" },
      ])
      .select("id, date");
    if (error) throw error;
    const paidBooking = bookings!.find((b) => b.date === "2025-09-22")!;
    await service.from("payments").update({ booking_id: paidBooking.id }).eq("id", paid!.id);

    const visits = await fetchVisitsThisMonth(supabase, "2025-09-09");
    expect(visits).toEqual({ used: 2, included: 8 });
  });
});

describe("Cron diario de renovación — 'notice a month in advance'", () => {
  it("avisa en la app a un anual con auto-renovación que entra en su último mes, una sola vez", async () => {
    const { supabase, user } = await freshMember("renewal-notice");
    await grantTestMembership(user.id, "annual", {
      periodStart: new Date(Date.now() - 340 * 86400000),
      periodEnd: new Date(Date.now() + 20 * 86400000),
    });

    await admin().rpc("dispatch_membership_renewals");
    await admin().rpc("dispatch_membership_renewals");

    const notifications = await fetchNotifications(supabase);
    expect(notifications.filter((n) => n.title.startsWith("Your membership renews on "))).toHaveLength(1);
  });

  it("no avisa a quien apagó la auto-renovación", async () => {
    const { supabase, user } = await freshMember("renewal-off");
    await grantTestMembership(user.id, "annual", {
      periodStart: new Date(Date.now() - 340 * 86400000),
      periodEnd: new Date(Date.now() + 20 * 86400000),
      autoRenew: false,
    });

    await admin().rpc("dispatch_membership_renewals");

    const notifications = await fetchNotifications(supabase);
    expect(notifications.some((n) => n.title.startsWith("Your membership renews on "))).toBe(false);
  });

  it("vence el plan al acabar un término sin auto-renovación", async () => {
    const { supabase, user } = await freshMember("expire");
    await grantTestMembership(user.id, "monthly", {
      periodStart: new Date(Date.now() - 31 * 86400000),
      periodEnd: new Date(Date.now() - 86400000),
      autoRenew: false,
    });

    await admin().rpc("dispatch_membership_renewals");

    expect((await fetchMembership(supabase)).status).toBe("inactive");
    expect(await fetchMembershipStatus(supabase)).toBe("inactive");
  });
});

describe("AC 'Renewal date and auto-renewal settings' — la renovación automática cobra de verdad", () => {
  const DAY = 86400000;

  it("al vencer un mensual con auto-renovación, cobra la tarjeta guardada y abre el mes siguiente desde el fin del anterior", async () => {
    const { user, email } = await freshMemberWithEmail("renew-monthly");
    const periodEnd = new Date(Date.now() - DAY);
    await grantTestMembership(user.id, "monthly", { periodStart: new Date(periodEnd.getTime() - 30 * DAY), periodEnd });
    await giveTestMemberSavedCard(user.id, email);

    const result = await runMembershipRenewalCharge(user.id);
    expect(result.status).toBe(200);
    expect(result.body.status).toBe("succeeded");

    const membership = await readTestMembership(user.id);
    expect(membership.status).toBe("active");
    expect(membership.plan).toBe("monthly");
    expect(Date.parse(membership.current_period_start)).toBe(periodEnd.getTime());
    expect(Date.parse(membership.current_period_end)).toBeGreaterThan(Date.now() + 25 * DAY);

    const { data: payments } = await admin()
      .from("payments")
      .select("amount_cents, membership_plan, status")
      .eq("member_id", user.id);
    expect(payments).toEqual([{ amount_cents: 24900, membership_plan: "monthly", status: "succeeded" }]);
  }, 30000);

  it("un anual renueva otro año por $2,400.00", async () => {
    const { user, email } = await freshMemberWithEmail("renew-annual");
    const periodEnd = new Date(Date.now() - DAY);
    await grantTestMembership(user.id, "annual", { periodStart: new Date(periodEnd.getTime() - 365 * DAY), periodEnd });
    await giveTestMemberSavedCard(user.id, email);

    const result = await runMembershipRenewalCharge(user.id);
    expect(result.body.status).toBe("succeeded");

    const membership = await readTestMembership(user.id);
    expect(membership.plan).toBe("annual");
    expect(Date.parse(membership.current_period_end)).toBeGreaterThan(Date.now() + 360 * DAY);
    const { data: payments } = await admin().from("payments").select("amount_cents").eq("member_id", user.id);
    expect(payments).toEqual([{ amount_cents: 240000 }]);
  }, 30000);

  it("sin tarjeta con la que cobrar, la membresía vence y se avisa al miembro", async () => {
    const { supabase, user } = await freshMemberWithEmail("renew-no-card");
    await grantTestMembership(user.id, "monthly", {
      periodStart: new Date(Date.now() - 31 * DAY),
      periodEnd: new Date(Date.now() - DAY),
    });

    const result = await runMembershipRenewalCharge(user.id);
    expect(result.body.status).toBe("failed");

    expect((await fetchMembership(supabase)).status).toBe("inactive");
    const notifications = await fetchNotifications(supabase);
    expect(notifications.some((n) => n.title === "We couldn't renew your membership")).toBe(true);
  }, 30000);

  it("no cobra un término que todavía no ha vencido (el cron podría llamar dos veces)", async () => {
    const { user, email } = await freshMemberWithEmail("renew-early");
    await grantTestMembership(user.id, "monthly");
    await giveTestMemberSavedCard(user.id, email);

    const result = await runMembershipRenewalCharge(user.id);
    expect(result.status).toBe(409);

    const { data: payments } = await admin().from("payments").select("id").eq("member_id", user.id);
    expect(payments).toEqual([]);
  }, 30000);

  it("no cobra si la auto-renovación está apagada", async () => {
    const { user, email } = await freshMemberWithEmail("renew-off");
    await grantTestMembership(user.id, "monthly", {
      periodStart: new Date(Date.now() - 31 * DAY),
      periodEnd: new Date(Date.now() - DAY),
      autoRenew: false,
    });
    await giveTestMemberSavedCard(user.id, email);

    expect((await runMembershipRenewalCharge(user.id)).status).toBe(409);
  }, 30000);

  it("rechaza una llamada sin el secreto compartido", async () => {
    const { user } = await freshMemberWithEmail("renew-secret");
    expect((await runMembershipRenewalCharge(user.id, "wrong-secret")).status).toBe(401);
  }, 30000);
});

describe("AC 'Upgrade options' — pasar de anual a mensual al final del término", () => {
  const DAY = 86400000;

  it("programar el cambio lo deja pendiente sin cobrar nada hoy", async () => {
    const { supabase, user } = await freshMemberWithEmail("downgrade-schedule");
    await grantTestMembership(user.id, "annual");

    await scheduleMembershipPlanChange(supabase, "monthly");

    const membership = await fetchMembership(supabase);
    expect(membership.plan).toBe("annual");
    expect(membership.pendingPlan).toBe("monthly");
    const { data: payments } = await admin().from("payments").select("id").eq("member_id", user.id);
    expect(payments).toEqual([]);
  });

  it("cancelar el cambio programado vuelve a dejar solo el anual", async () => {
    const { supabase, user } = await freshMemberWithEmail("downgrade-cancel");
    await grantTestMembership(user.id, "annual", { pendingPlan: "monthly" });

    await cancelMembershipPlanChange(supabase);

    expect((await fetchMembership(supabase)).pendingPlan).toBeNull();
  });

  it("solo un anual activo puede programar el paso a mensual", async () => {
    const { supabase, user } = await freshMemberWithEmail("downgrade-monthly");
    await grantTestMembership(user.id, "monthly");

    await expect(scheduleMembershipPlanChange(supabase, "monthly")).rejects.toThrow();
  });

  it("apagar la auto-renovación descarta el cambio programado — no habrá término siguiente", async () => {
    const { supabase, user } = await freshMemberWithEmail("downgrade-auto-off");
    await grantTestMembership(user.id, "annual", { pendingPlan: "monthly" });

    await setMembershipAutoRenew(supabase, false);

    expect((await fetchMembership(supabase)).pendingPlan).toBeNull();
  });

  it("al renovar, cobra el mensual y el plan pasa a mensual", async () => {
    const { supabase, user, email } = await freshMemberWithEmail("downgrade-renew");
    const periodEnd = new Date(Date.now() - DAY);
    await grantTestMembership(user.id, "annual", {
      periodStart: new Date(periodEnd.getTime() - 365 * DAY),
      periodEnd,
      pendingPlan: "monthly",
    });
    await giveTestMemberSavedCard(user.id, email);

    const result = await runMembershipRenewalCharge(user.id);
    expect(result.body.status).toBe("succeeded");

    const membership = await fetchMembership(supabase);
    expect(membership.plan).toBe("monthly");
    expect(membership.pendingPlan).toBeNull();
    const { data: payments } = await admin().from("payments").select("amount_cents").eq("member_id", user.id);
    expect(payments).toEqual([{ amount_cents: 24900 }]);
  }, 30000);
});
