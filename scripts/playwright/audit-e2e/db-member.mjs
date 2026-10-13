import { admin } from "./lib.mjs";
const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
const u = users.users.filter(x => x.email.startsWith(process.argv[2])).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
console.log(u.email);
console.log((await admin.from("payments").select("id,status,booking_id,amount_cents,stripe_checkout_session_id,created_at").eq("member_id", u.id).order("created_at")).data);
console.log((await admin.from("bookings").select("id,status,date,slot_time,created_at").eq("member_id", u.id).order("created_at")).data);
