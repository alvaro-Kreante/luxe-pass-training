// Epic 7 · EmailInvite.dc.html — la invitación del partner (al publicar el
// lounge, al añadirlo a uno live o al reenviarla), con estilos
// inline (los clientes de email no leen <style> de forma fiable).

export interface PartnerInviteEmail {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  loungeName: string;
  loungeAddress: string;
  invitedBy: string;
  welcomeUrl: string;
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPartnerInvite(invite: PartnerInviteEmail): string {
  const e = Object.fromEntries(
    Object.entries(invite).map(([key, value]) => [key, escape(value)]),
  ) as unknown as PartnerInviteEmail;
  const contact = [e.email, e.mobile].filter(Boolean).join(" · ");

  return `
<div style="background:#FCF4EE; padding:24px 12px; font-family:Manrope,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px; margin:0 auto; background:#FFFFFF; border:1px solid #E7D9C9; border-radius:20px; overflow:hidden;">
    <div style="background:#15110D; padding:24px 32px; text-align:center;">
      <p style="font-size:11px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:#8A7C6C; margin:0;">Welcome to the partner network</p>
      <h2 style="font-family:'Bodoni Moda',Georgia,serif; font-weight:500; font-size:30px; color:#F1E3D0; margin:10px 0 0;">${e.loungeName}</h2>
      <p style="font-size:12.5px; color:#C9BDAF; margin:8px 0 0;">${e.loungeAddress}</p>
    </div>
    <div style="padding:22px 32px;">
      <p style="font-size:14px; color:#221A14; font-weight:700; margin:0;">Hello ${e.firstName},</p>
      <p style="font-size:14px; color:#55483D; line-height:1.6; margin:8px 0 0;">${e.invitedBy} at En Soleil has added you as the partner for ${e.loungeName}. Create a password to open the Partner Dashboard — the day's guest list, check-ins and the month's numbers for your venue.</p>
      <div style="margin-top:16px; padding:16px 18px; background:#FCF4EE; border:1px solid #E7D9C9; border-radius:16px;">
        <p style="font-size:11px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#9C8D80; margin:0;">Your account</p>
        <p style="font-size:13.5px; font-weight:700; color:#221A14; margin:4px 0 0;">${e.firstName} ${e.lastName}</p>
        <p style="font-size:12px; color:#55483D; margin:3px 0 0;">${contact}</p>
        <p style="font-size:12px; color:#55483D; margin:10px 0 0;">You can correct your name, mobile and photo on the next screen. This link works once and for 24 hours.</p>
      </div>
      <p style="margin:18px 0 0; text-align:center;"><a href="${e.welcomeUrl}" style="display:inline-block; padding:15px 32px; background:#C9A876; border-radius:12px; color:#FFFFFF; font-size:12.5px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; text-decoration:none;">Create your password</a></p>
      <p style="font-size:12px; color:#9C8D80; line-height:1.55; margin:14px 0 0;">Button not working? Paste this link into your browser:<br><a href="${e.welcomeUrl}" style="color:#AD8A5C; word-break:break-all;">${e.welcomeUrl}</a></p>
      <p style="font-size:12px; color:#55483D; line-height:1.55; margin:16px 0 0; padding:13px 16px; background:#F8EAE1; border:1px dashed #E7D9C9; border-radius:14px;">Not expecting this? Ignore it — no account opens until a password is set. If the link expires, your account manager can send a new one.</p>
    </div>
    <div style="padding:14px 32px 16px; border-top:1px solid #E7D9C9; background:#FCF4EE; text-align:center;">
      <p style="font-size:11.5px; color:#9C8D80; margin:0;">En Soleil LuxePass · 445 Park Avenue, New York, NY 10022</p>
    </div>
  </div>
</div>`;
}
