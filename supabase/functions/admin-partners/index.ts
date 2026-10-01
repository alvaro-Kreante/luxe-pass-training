// Epic 10 · Story 10.4 — lo que el admin hace con las cuentas de los
// usuarios partner, que necesita la API de administración de Auth (service
// role). El estado de partner y lounges vive en las RPC de
// `supabase/schemas/admin_partners.sql`; esta function las llama con la
// sesión del admin y completa lo que es de Auth. Acciones:
//   activate          draft → active; crea la cuenta de cada usuario y le envía la invitación
//   add_member        añade un usuario (RPC); si el partner ya está activo, lo invita al momento
//   resend            un enlace nuevo, solo a quien aún no creó su contraseña
//   suspend_member    `suspended_at` + ban en Auth
//   reactivate_member deshace lo anterior (si el partner no está suspendido)
//   delete_member     borra la fila (el trigger protege al representante) y su cuenta
//   suspend_partner   RPC + ban de todos sus usuarios
//   reactivate_partner RPC + desbloquea a los que no estaban suspendidos uno a uno
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import { sendBrevoEmail } from "../_shared/brevo.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { renderPartnerInvite } from "../_shared/partner-invite-email.ts";
import { getCallerClient, getServiceClient, requireCaller } from "../_shared/stripe-context.ts";

type Action =
  | "activate"
  | "add_member"
  | "resend"
  | "suspend_member"
  | "reactivate_member"
  | "delete_member"
  | "suspend_partner"
  | "reactivate_partner";

interface RequestBody {
  action?: Action;
  partnerId?: string;
  memberId?: string;
  member?: { firstName?: string; lastName?: string; email?: string; mobile?: string };
}

interface Member {
  id: string;
  partner_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  suspended_at: string | null;
}

interface Partner {
  id: string;
  name: string;
  status: string;
  address_line1: string;
  city: string;
  country: string;
}

// ~100 años: Supabase Auth no tiene un ban indefinido.
const SUSPENDED = "876000h";
const appUrl = Deno.env.get("APP_URL") as string;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function loadPartner(service: SupabaseClient, partnerId: string): Promise<Partner> {
  const { data } = await service
    .from("partners")
    .select("id, name, status, address_line1, city, country")
    .eq("id", partnerId)
    .maybeSingle();
  if (!data) throw new HttpError(404, "Partner not found");
  return data as Partner;
}

async function loadMember(service: SupabaseClient, memberId: string): Promise<Member> {
  const { data } = await service
    .from("partner_members")
    .select("id, partner_id, user_id, first_name, last_name, email, mobile, suspended_at")
    .eq("id", memberId)
    .maybeSingle();
  if (!data) throw new HttpError(404, "Partner user not found");
  return data as Member;
}

/** La cuenta nace invitada (`generateLink` no envía nada) con su rol de partner. */
async function createAccount(service: SupabaseClient, member: Member): Promise<string> {
  const { data: link, error } = await service.auth.admin.generateLink({
    type: "invite",
    email: member.email,
    options: { data: { first_name: member.first_name, last_name: member.last_name } },
  });
  if (error || !link.user) throw new HttpError(500, error?.message ?? `Could not invite ${member.email}`);
  const userId = link.user.id;
  const { error: roleError } = await service.from("user_roles").insert({ user_id: userId, role: "partner" });
  if (roleError) throw roleError;
  const { error: memberError } = await service.from("partner_members").update({ user_id: userId }).eq("id", member.id);
  if (memberError) throw memberError;
  return link.properties.hashed_token;
}

async function sendInvite(service: SupabaseClient, member: Member, partner: Partner, tokenHash: string, invitedById: string) {
  const { data: admin } = await service.from("profiles").select("full_name").eq("id", invitedById).maybeSingle();
  await sendBrevoEmail(
    member.email,
    `You're invited to ${partner.name} on LuxePass`,
    renderPartnerInvite({
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      mobile: member.mobile,
      partnerName: partner.name,
      partnerAddress: [partner.address_line1, partner.city, partner.country].filter(Boolean).join(" · "),
      invitedBy: admin?.full_name || "En Soleil",
      welcomeUrl: `${appUrl}/partner/welcome?token_hash=${tokenHash}&type=invite`,
    }),
  );
}

async function setBan(service: SupabaseClient, userId: string | null, banned: boolean) {
  if (!userId) return;
  const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: banned ? SUSPENDED : "none" });
  if (error) throw new HttpError(500, error.message);
}

/** Una RPC de admin con la sesión del que llama: así `has_role('admin')` se comprueba en la base. */
async function callerRpc(req: Request, name: string, args: Record<string, unknown>) {
  const { data, error } = await getCallerClient(req).rpc(name, args);
  if (error) throw new HttpError(409, error.message);
  return data;
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
    const service = getServiceClient();

    switch (body.action) {
      case "activate": {
        const partner = await loadPartner(service, body.partnerId ?? "");
        if (partner.status !== "draft") throw new HttpError(409, "Only a draft partner can be activated");
        const { data: members } = await service
          .from("partner_members")
          .select("id, partner_id, user_id, first_name, last_name, email, mobile, suspended_at")
          .eq("partner_id", partner.id)
          .order("created_at");
        const list = (members ?? []) as Member[];
        if (list.length === 0) throw new HttpError(409, "A partner needs at least one user before it can be activated");

        // Todas las cuentas o ninguna: si una falla, se borran las ya creadas
        // y el partner sigue en draft.
        const invites: { member: Member; token: string }[] = [];
        try {
          for (const member of list) {
            if (member.user_id) continue;
            invites.push({ member, token: await createAccount(service, member) });
          }
          const { error } = await service
            .from("partners")
            .update({ status: "active", activated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", partner.id);
          if (error) throw error;
        } catch (error) {
          for (const { member } of invites) {
            const { data } = await service.from("partner_members").select("user_id").eq("id", member.id).single();
            if (data?.user_id) {
              await service.from("partner_members").update({ user_id: null }).eq("id", member.id);
              await service.auth.admin.deleteUser(data.user_id);
            }
          }
          throw error;
        }
        for (const { member, token } of invites) await sendInvite(service, member, partner, token, admin.id);
        return json({ invited: invites.length });
      }

      case "add_member": {
        const partner = await loadPartner(service, body.partnerId ?? "");
        const memberId = (await callerRpc(req, "admin_add_partner_member", {
          p_partner_id: partner.id,
          p_member: {
            first_name: body.member?.firstName ?? "",
            last_name: body.member?.lastName ?? "",
            email: body.member?.email ?? "",
            mobile: body.member?.mobile ?? "",
          },
        })) as string;
        if (partner.status === "draft") return json({ memberId });

        const member = await loadMember(service, memberId);
        try {
          const token = await createAccount(service, member);
          if (partner.status === "suspended") await setBan(service, (await loadMember(service, memberId)).user_id, true);
          else await sendInvite(service, member, partner, token, admin.id);
        } catch (error) {
          const { data } = await service.from("partner_members").select("user_id").eq("id", memberId).single();
          await service.from("partner_members").delete().eq("id", memberId);
          if (data?.user_id) await service.auth.admin.deleteUser(data.user_id);
          throw error;
        }
        return json({ memberId });
      }

      case "resend": {
        const member = await loadMember(service, body.memberId ?? "");
        if (!member.user_id) throw new HttpError(409, "This user is invited when the partner is activated");
        const { data: account } = await service.auth.admin.getUserById(member.user_id);
        if (account.user?.email_confirmed_at) throw new HttpError(409, `${member.first_name} has already set a password`);
        const { data: link, error } = await service.auth.admin.generateLink({ type: "invite", email: member.email });
        if (error) throw new HttpError(500, error.message);
        await sendInvite(service, member, await loadPartner(service, member.partner_id), link.properties.hashed_token, admin.id);
        return json({});
      }

      case "suspend_member": {
        const member = await loadMember(service, body.memberId ?? "");
        await service.from("partner_members").update({ suspended_at: new Date().toISOString() }).eq("id", member.id);
        await setBan(service, member.user_id, true);
        return json({});
      }

      case "reactivate_member": {
        const member = await loadMember(service, body.memberId ?? "");
        const partner = await loadPartner(service, member.partner_id);
        await service.from("partner_members").update({ suspended_at: null }).eq("id", member.id);
        // Con el partner suspendido sigue bloqueado: entra al reactivar el partner.
        if (partner.status !== "suspended") await setBan(service, member.user_id, false);
        return json({});
      }

      case "delete_member": {
        const member = await loadMember(service, body.memberId ?? "");
        // Primero la fila: el trigger impide borrar al representante si quedan otros.
        const { error } = await service.from("partner_members").delete().eq("id", member.id);
        if (error) throw new HttpError(409, error.message);
        if (member.user_id) await service.auth.admin.deleteUser(member.user_id);
        return json({});
      }

      case "suspend_partner": {
        const partner = await loadPartner(service, body.partnerId ?? "");
        await callerRpc(req, "admin_suspend_partner", { p_partner_id: partner.id });
        const { data: members } = await service.from("partner_members").select("user_id").eq("partner_id", partner.id);
        for (const row of members ?? []) await setBan(service, row.user_id, true);
        return json({});
      }

      case "reactivate_partner": {
        const partner = await loadPartner(service, body.partnerId ?? "");
        await callerRpc(req, "admin_reactivate_partner", { p_partner_id: partner.id });
        const { data: members } = await service
          .from("partner_members")
          .select("user_id")
          .eq("partner_id", partner.id)
          .is("suspended_at", null);
        for (const row of members ?? []) await setBan(service, row.user_id, false);
        return json({});
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    const message = error instanceof Error ? error.message : (error as { message?: string })?.message ?? "Unexpected error";
    return json({ error: message }, 500);
  }
});
