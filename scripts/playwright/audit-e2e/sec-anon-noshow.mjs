import { createClient } from "@supabase/supabase-js";
import { env } from "./env.mjs";
const [lounge, date, code] = process.argv.slice(2);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data, error } = await anon.rpc("reception_report_no_show", { p_lounge_id: lounge, p_date: date, p_confirmation_code: code });
console.log("anon no_show:", error?.message ?? { status: data.status, no_show: data.no_show, fee: data.cancellation_fee_cents });
