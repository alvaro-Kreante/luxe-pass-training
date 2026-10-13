import { admin } from "./lib.mjs";
const since = new Date(Date.now() - 3 * 3600e3).toISOString();
const { data, error } = await admin.from("payments").select("id,status,amount_cents,created_at,booking_id,membership_plan,stripe_payment_intent_id").gte("created_at", since).order("created_at");
console.log(error ?? data);
