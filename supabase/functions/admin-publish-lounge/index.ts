// Epic 8 · LoungeNewPartner.dc.html — publicar un lounge crea, en el mismo
// paso, la cuenta de quien lo gestiona y le envía la invitación (Epic 7 ·
// EmailInvite.dc.html). Orden pensado para no dejar nada a medias:
//   1. crear el usuario invitado con `generateLink` (no envía nada)
//   2. su rol, su fila en `partners` y el vínculo con el lounge
//   3. publicar con `admin_publish_lounge` como el propio admin (la RPC
//      vuelve a comprobar el lounge y exige el partner del paso 2)
//   4. solo entonces, el email — si 2 o 3 fallan se borra el usuario y el
//      lounge sigue en borrador sin que haya salido ningún email.
import { sendBrevoEmail } from "../_shared/brevo.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getCallerClient, getServiceClient, requireCaller } from "../_shared/stripe-context.ts";

import { renderPartnerInvite } from "./email.ts";

const appUrl = Deno.env.get("APP_URL") as string;

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
    const caller = getCallerClient(req);
    const { data: isAdmin } = await caller.rpc("has_role", { p_role: "admin" });
    if (!isAdmin) return json({ error: "Not authorized" }, 403);

    const { loungeId } = (await req.json()) as { loungeId?: string };
    if (!loungeId) return json({ error: "Missing loungeId" }, 400);

    const service = getServiceClient();
    const { data: lounge } = await service
      .from("lounges")
      .select("id, name, address, neighborhood, city, content_status")
      .eq("id", loungeId)
      .maybeSingle();
    if (!lounge || lounge.content_status !== "draft") {
      return json({ error: "Only drafts can be published" }, 409);
    }

    const { data: invite } = await service
      .from("lounge_partner_invites")
      .select("first_name, last_name, email, mobile")
      .eq("lounge_id", loungeId)
      .maybeSingle();
    if (!invite || !invite.first_name || !invite.last_name || !invite.email) {
      return json({ error: "A lounge needs its partner account before it can be published" }, 400);
    }

    // `generateLink` reutiliza un usuario que ya exista con ese email — y el
    // rollback de abajo lo borraría. Un email con cuenta se rechaza antes.
    const { data: taken } = await service.rpc("email_exists", { p_email: invite.email });
    if (taken) return json({ error: `${invite.email} already has a LuxePass account` }, 409);

    const { data: link, error: linkError } = await service.auth.admin.generateLink({
      type: "invite",
      email: invite.email,
      options: { data: { first_name: invite.first_name, last_name: invite.last_name } },
    });
    if (linkError || !link.user) {
      return json({ error: linkError?.message ?? "Could not invite the partner" }, 500);
    }
    const userId = link.user.id;

    try {
      const { error: roleError } = await service.from("user_roles").insert({ user_id: userId, role: "partner" });
      if (roleError) throw roleError;

      const { data: partner, error: partnerError } = await service
        .from("partners")
        .insert({
          user_id: userId,
          business_name: lounge.name,
          contact_email: invite.email,
          contact_phone: invite.mobile,
          first_name: invite.first_name,
          last_name: invite.last_name,
        })
        .select("id")
        .single();
      if (partnerError) throw partnerError;

      const { error: linkLoungeError } = await service
        .from("partner_lounges")
        .insert({ partner_id: partner.id, lounge_id: loungeId });
      if (linkLoungeError) throw linkLoungeError;

      const { error: inviteError } = await service
        .from("lounge_partner_invites")
        .update({ partner_id: partner.id, updated_at: new Date().toISOString() })
        .eq("lounge_id", loungeId);
      if (inviteError) throw inviteError;

      const { error: publishError } = await caller.rpc("admin_publish_lounge", { p_lounge_id: loungeId });
      if (publishError) throw publishError;
    } catch (error) {
      await service.auth.admin.deleteUser(userId);
      const message = error instanceof Error ? error.message : (error as { message?: string }).message;
      return json({ error: message ?? "Could not publish the lounge" }, 400);
    }

    const { data: adminProfile } = await service.from("profiles").select("full_name").eq("id", admin.id).maybeSingle();
    const welcomeUrl = `${appUrl}/partner/welcome?token_hash=${link.properties.hashed_token}&type=invite`;
    // El lounge ya está publicado: si el email falla se dice tal cual, sin
    // deshacer nada (el partner ya existe; reenviar la invitación, ver PENDIENTES).
    try {
      await sendBrevoEmail(
        invite.email,
        `You're invited to run ${lounge.name} on LuxePass`,
        renderPartnerInvite({
          firstName: invite.first_name,
          lastName: invite.last_name,
          email: invite.email,
          mobile: invite.mobile,
          loungeName: lounge.name,
          loungeAddress: [lounge.address, lounge.neighborhood, lounge.city].filter(Boolean).join(" · "),
          invitedBy: adminProfile?.full_name || "En Soleil",
          welcomeUrl,
        }),
      );
    } catch (error) {
      console.error("admin-publish-lounge: invitation email failed", error);
      return json({ error: "The lounge is live, but the invitation email could not be sent" }, 502);
    }

    return json({ loungeId, partnerUserId: userId });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
