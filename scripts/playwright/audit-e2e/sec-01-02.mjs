// SEC-01 / SEC-02 — reproducción LOCAL únicamente.
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.mjs";
const URL = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const member = createClient(URL, ANON, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });
const email = `e2e-sec-${Date.now()}@example.com`, pw = "Test-Passw0rd!";
await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
await member.auth.signInWithPassword({ email, password: pw });
const { data: { user } } = await member.auth.getUser();
await member.from("profiles").insert({ id: user.id, full_name: "E2E Sec", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
console.log("member", email);
// SEC-02: crear checkout (pago pending real en Stripe test) y confirmar sin pagar
const lounge = "the-ainsworth";
let booking, used;
for (let d = 3; d < 40 && !booking; d++) {
  const date = new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  for (const band of ["morning", "afternoon", "evening"]) {
    const { data: cs, error: ce } = await member.functions.invoke("stripe-create-checkout-session", { body: { loungeId: lounge, dateIso: date, band, slotTime: band === "morning" ? "8:00 AM" : band === "afternoon" ? "3:30 PM" : "6:00 PM" } });
    if (ce) { console.log("checkout error", ce.message, await ce.context?.text?.()); process.exit(1); }
    const { data: pay } = await admin.from("payments").select("status").eq("id", cs.paymentId).single();
    const { data, error } = await member.rpc("confirm_booking", { p_lounge_id: lounge, p_date: date, p_band: band, p_slot_time: "8:00 AM", p_payment_id: cs.paymentId });
    if (error) { console.log(date, band, "confirm error:", error.message); continue; }
    if (data?.length) { booking = data[0]; used = { date, band, paymentId: cs.paymentId, payStatus: pay.status }; break; }
  }
}
console.log("SEC-02 result:", booking ? { bookingStatus: booking.status, ...used } : "no booking");
if (!booking) process.exit(0);
const { data: b } = await admin.from("bookings").select("confirmation_code,date,lounge_id").eq("id", booking.id).single();
const { data: payAfter } = await admin.from("payments").select("status,booking_id").eq("id", used.paymentId).single();
console.log("payment after confirm:", payAfter);
// SEC-01: anónimo
const { data: lk, error: le } = await anon.rpc("reception_lookup_booking", { p_lounge_id: b.lounge_id, p_date: b.date, p_confirmation_code: b.confirmation_code });
console.log("SEC-01 anon lookup:", le ? le.message : lk.map(r => ({ ...r, member_email: r.member_email ? "<present>" : null, emergency_contact_phone: r.emergency_contact_phone ? "<present>" : null })));
console.log("confirmation_code format:", b.confirmation_code.replace(/[A-Z0-9]/g, "X"));
const { data: sm, error: se } = await anon.rpc("reception_today_summary", { p_lounge_id: b.lounge_id, p_date: b.date });
console.log("anon today_summary:", se?.message ?? sm);
console.log(JSON.stringify({ lounge: b.lounge_id, date: b.date, code: b.confirmation_code, email }));
