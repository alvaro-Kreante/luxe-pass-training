// Epic 8 · LoungeLive.dc.html y PartnerAdd / PartnerSuspend / PartnerDelete
// — los partners de un lounge se gestionan sin despublicarlo (decisión 29
// sept 2026). Acciones:
//   add        invita al momento (o vincula a quien ya es partner de otro lounge)
//   resend     un enlace nuevo de 24 h, solo si aún no creó su contraseña
//   suspend    reversible: `suspended_at` + ban en Auth, en todos sus lounges
//   reactivate deshace la suspensión
//   delete     borra la cuenta (cascade a `partners`/`partner_lounges`)
// Un lounge live nunca se queda sin un partner activo (no suspendido).
import { corsHeaders } from "../_shared/cors.ts";
import {
  freshInviteToken,
  HttpError,
  isCompletePartner,
  linkOrInvitePartner,
  sendPartnerInvite,
  type PartnerDetails,
} from "../_shared/partner-accounts.ts";
import { getCallerClient, getServiceClient, requireCaller } from "../_shared/stripe-context.ts";

type Action = "add" | "resend" | "suspend" | "reactivate" | "delete";

interface RequestBody {
  action?: Action;
  loungeId?: string;
  userId?: string;
  partner?: { firstName?: string; lastName?: string; email?: string; mobile?: string };
}

// ~100 años: Supabase Auth no tiene un ban indefinido.
const SUSPENDED = "876000h";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = await requireCaller(req);
    const { data: isAdmin } = await getCallerClient(req).rpc("has_role", { p_role: "admin" });
    if (!isAdmin) return json({ error: "Not authorized" }, 403);

    const body = (await req.json()) as RequestBody;
    if (!body.action || !body.loungeId) return json({ error: "Missing action or loungeId" }, 400);

    const service = getServiceClient();
    const { data: lounge } = await service
      .from("lounges")
      .select("id, name, address, neighborhood, city")
      .eq("id", body.loungeId)
      .maybeSingle();
    if (!lounge) return json({ error: "Lounge not found" }, 404);

    if (body.action === "add") {
      const partner: Partial<PartnerDetails> = {
        first_name: body.partner?.firstName?.trim(),
        last_name: body.partner?.lastName?.trim(),
        email: body.partner?.email?.trim().toLowerCase(),
        mobile: body.partner?.mobile?.trim() ?? "",
      };
      if (!isCompletePartner(partner)) {
        return json({ error: "A partner needs a first name, a last name and a valid email" }, 400);
      }
      const { data: already } = await service
        .from("lounge_partner_invites")
        .select("id")
        .eq("lounge_id", lounge.id)
        .eq("email", partner.email)
        .maybeSingle();
      if (already) return json({ error: `${partner.email} is already a partner of ${lounge.name}` }, 409);

      const account = await linkOrInvitePartner(service, partner, lounge);
      const { count } = await service
        .from("lounge_partner_invites")
        .select("id", { count: "exact", head: true })
        .eq("lounge_id", lounge.id);
      const { error: inviteError } = await service.from("lounge_partner_invites").insert({
        lounge_id: lounge.id,
        first_name: partner.first_name,
        last_name: partner.last_name,
        email: partner.email,
        mobile: partner.mobile,
        partner_id: account.partnerId,
        position: count ?? 0,
      });
      if (inviteError) throw inviteError;
      if (account.tokenHash) await sendPartnerInvite(service, partner, lounge, account.tokenHash, admin.id);
      return json({ userId: account.userId });
    }

    if (!body.userId) return json({ error: "Missing userId" }, 400);
    const { data: target } = await service
      .from("partners")
      .select("id, user_id, first_name, last_name, contact_email, contact_phone, suspended_at, partner_lounges!inner(lounge_id)")
      .eq("user_id", body.userId)
      .eq("partner_lounges.lounge_id", lounge.id)
      .maybeSingle();
    if (!target) return json({ error: "That partner does not run this lounge" }, 404);

    /** Ningún lounge live de esta cuenta puede quedarse sin otro partner activo. */
    async function assertNotLastActive() {
      const { data: lounges } = await service.from("partner_lounges").select("lounge_id, lounges!inner(content_status, name)").eq("partner_id", target!.id);
      for (const row of lounges ?? []) {
        const info = row.lounges as unknown as { content_status: string; name: string };
        if (info.content_status !== "live") continue;
        const { data: others } = await service
          .from("partner_lounges")
          .select("partner_id, partners!inner(suspended_at)")
          .eq("lounge_id", row.lounge_id)
          .neq("partner_id", target!.id)
          .is("partners.suspended_at", null);
        if ((others ?? []).length === 0) {
          throw new HttpError(409, `${target!.first_name} is the last active partner of ${info.name} — add another partner first`);
        }
      }
    }

    switch (body.action) {
      case "resend": {
        const { data: user } = await service.auth.admin.getUserById(target.user_id);
        if (user.user?.email_confirmed_at) {
          return json({ error: `${target.first_name} has already set a password` }, 409);
        }
        const token = await freshInviteToken(service, target.contact_email);
        await sendPartnerInvite(
          service,
          { first_name: target.first_name, last_name: target.last_name, email: target.contact_email, mobile: target.contact_phone },
          lounge,
          token,
          admin.id,
        );
        return json({});
      }
      case "suspend": {
        if (target.suspended_at) return json({});
        await assertNotLastActive();
        const { error: banError } = await service.auth.admin.updateUserById(target.user_id, { ban_duration: SUSPENDED });
        if (banError) throw banError;
        const { error } = await service.from("partners").update({ suspended_at: new Date().toISOString() }).eq("id", target.id);
        if (error) throw error;
        return json({});
      }
      case "reactivate": {
        const { error: banError } = await service.auth.admin.updateUserById(target.user_id, { ban_duration: "none" });
        if (banError) throw banError;
        const { error } = await service.from("partners").update({ suspended_at: null }).eq("id", target.id);
        if (error) throw error;
        return json({});
      }
      case "delete": {
        if (!target.suspended_at) await assertNotLastActive();
        const { error } = await service.auth.admin.deleteUser(target.user_id);
        if (error) throw error;
        return json({});
      }
      default:
        return json({ error: `Unknown action ${body.action}` }, 400);
    }
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    const message = error instanceof Error ? error.message : (error as { message?: string }).message;
    return json({ error: message ?? "Unexpected error" }, 500);
  }
});
