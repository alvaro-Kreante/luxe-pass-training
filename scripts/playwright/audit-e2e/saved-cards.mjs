import { createClient } from "@supabase/supabase-js";
import { env, PW } from "./lib.mjs";
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
await c.auth.signInWithPassword({ email: process.argv[2], password: PW });
const { data, error } = await c.functions.invoke("stripe-payment-methods", { body: { action: "list" } });
console.log(error ? await error.context?.text?.() : JSON.stringify(data).replace(/pm_[A-Za-z0-9]+/g, "pm_…"));
