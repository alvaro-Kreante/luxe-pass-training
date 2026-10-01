// Epic 8 · LoungeNewPartner.dc.html / LoungeDraftPartners.dc.html —
// publicar un lounge crea, en el mismo paso, las cuentas de sus partners y
// les envía la invitación (Epic 7 · EmailInvite.dc.html). Orden pensado para
// no dejar nada a medias:
//   1. por cada partner pendiente: cuenta invitada nueva (`generateLink`, no
//      envía nada) o, si ya es partner de otro lounge, solo el vínculo
//   2. publicar con `admin_publish_lounge` como el propio admin (la RPC
//      vuelve a comprobar el lounge y exige un partner vinculado)
//   3. solo entonces, los emails — si 1 o 2 fallan se deshace lo creado y el
//      lounge sigue en borrador sin que haya salido ningún email.
import { corsHeaders } from "../_shared/cors.ts";
import {
  HttpError,
  isCompletePartner,
  linkOrInvitePartner,
  sendPartnerInvite,
  type LinkedPartner,
  type PartnerDetails,
} from "../_shared/partner-accounts.ts";
import { getCallerClient, getServiceClient, requireCaller } from "../_shared/stripe-context.ts";

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

    const { data: pending } = await service
      .from("lounge_partner_invites")
      .select("id, first_name, last_name, email, mobile")
      .eq("lounge_id", loungeId)
      .is("partner_id", null)
      .order("position");
    const { count: linked } = await service
      .from("partner_lounges")
      .select("partner_id", { count: "exact", head: true })
      .eq("lounge_id", loungeId);
    if ((pending ?? []).length === 0 && !linked) {
      return json({ error: "A lounge needs a partner account before it can be published" }, 400);
    }
    if (!(pending ?? []).every((partner) => isCompletePartner(partner))) {
      return json({ error: "Every partner needs a first name, a last name and a valid email" }, 400);
    }

    const done: { invite: PartnerDetails & { id: string }; account: LinkedPartner }[] = [];
    const undo = async () => {
      for (const { invite, account } of done) {
        await service.from("lounge_partner_invites").update({ partner_id: null }).eq("id", invite.id);
        await service.auth.admin.deleteUser(account.userId);
      }
    };

    try {
      for (const invite of pending ?? []) {
        const account = await linkOrInvitePartner(service, invite, lounge);
        done.push({ invite, account });
        const { error } = await service
          .from("lounge_partner_invites")
          .update({ partner_id: account.partnerId, updated_at: new Date().toISOString() })
          .eq("id", invite.id);
        if (error) throw error;
      }

      const { error: publishError } = await caller.rpc("admin_publish_lounge", { p_lounge_id: loungeId });
      if (publishError) throw publishError;
    } catch (error) {
      await undo();
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      const message = error instanceof Error ? error.message : (error as { message?: string }).message;
      return json({ error: message ?? "Could not publish the lounge" }, 400);
    }

    // El lounge ya está publicado: si un email falla se dice tal cual, sin
    // deshacer nada — la invitación se puede reenviar desde la lista.
    const failed: string[] = [];
    for (const { invite, account } of done) {
      try {
        await sendPartnerInvite(service, invite, lounge, account.tokenHash, admin.id);
      } catch (error) {
        console.error("admin-publish-lounge: invitation email failed", invite.email, error);
        failed.push(invite.email);
      }
    }
    if (failed.length > 0) {
      return json({ error: `The lounge is live, but the invitation could not be sent to ${failed.join(", ")}` }, 502);
    }

    return json({ loungeId });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
