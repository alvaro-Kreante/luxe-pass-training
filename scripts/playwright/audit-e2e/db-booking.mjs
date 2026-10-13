import { admin } from "./lib.mjs";
const id = process.argv[2];
console.log((await admin.from("bookings").select("id,status,date,cancellation_fee_cents,confirmation_code").eq("id", id).single()).data);
console.log((await admin.from("payments").select("*").eq("booking_id", id)).data);
