import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Story 6.2 (In-app Notifications) — conectada a Supabase real (tabla
 * `notifications`, ver `supabase/schemas/notifications.sql`). De los seis
 * tipos que pide el AC, dos tienen un evento real detrás (confirmación de
 * reserva, trigger AFTER INSERT; aviso de las 6 AM, pg_cron) y los otros
 * cuatro (nuevo lounge partner, renovación de membresía, ofertas, mes de
 * cumpleaños) se siembran como filas de muestra reales al crear el perfil —
 * desviación consciente, ver `docs/design/COMPONENT-MAP.md`. Los ajustes por
 * canal (`NOTIFICATION_CHANNEL_SETTINGS`/horas de silencio) no son un AC de
 * esta historia y siguen siendo datos de muestra.
 */

export type NotificationCategory = "bookings" | "lounges" | "offers" | "membership";

export type NotificationIcon = "morning" | "birthday" | "booking" | "lounge" | "membership" | "offer";

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  icon: NotificationIcon;
  title: string;
  body: string;
  time: string;
  read: boolean;
  /** Solo el aviso matinal trae "View pass" + "Directions" (`Notifications.dc.html`). */
  showBookingActions?: boolean;
  /** "View lounge" / "Manage membership" — el enlace secundario de algunas notificaciones. */
  linkLabel?: string;
}

export function unreadNotificationCount(items: NotificationItem[]): number {
  return items.filter((item) => !item.read).length;
}

/* ------------------------------------------------------------------ */
/* Backend real — tabla `notifications`                                 */
/* ------------------------------------------------------------------ */

interface NotificationRow {
  id: string;
  category: NotificationCategory;
  icon: NotificationIcon;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

function linkLabelFor(icon: NotificationIcon): string | undefined {
  if (icon === "lounge") return "View lounge";
  if (icon === "membership") return "Manage membership";
  return undefined;
}

/** "6:00 AM" el mismo día (UTC, igual que el resto de la app); "Wed, 4:32 PM" en cualquier otro. */
function formatNotificationTime(createdAtIso: string): string {
  const date = new Date(createdAtIso);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);

  const sameUtcDay = date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
  if (sameUtcDay) return time;

  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date);
  return `${weekday}, ${time}`;
}

function fromRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    category: row.category,
    icon: row.icon,
    title: row.title,
    body: row.body,
    time: formatNotificationTime(row.created_at),
    read: row.read_at !== null,
    showBookingActions: row.icon === "morning",
    linkLabel: linkLabelFor(row.icon),
  };
}

/** RLS ya limita a las notificaciones del miembro con sesión. */
export async function fetchNotifications(supabase: SupabaseClient): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, category, icon, title, body, read_at, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as NotificationRow[]).map(fromRow);
}

export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (error) throw error;
}

export async function markAllNotificationsRead(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Ajustes de notificación por canal — `NotificationSettings.dc.html`  */
/* ------------------------------------------------------------------ */

export type ChannelState = boolean | "always";

export interface NotificationChannelSetting {
  id: string;
  title: string;
  subtitle: string;
  push: ChannelState;
  email: ChannelState;
  sms: ChannelState;
  /** Solo el aviso matinal trae un control horario propio. */
  time?: string;
}

export const NOTIFICATION_CHANNEL_SETTINGS: NotificationChannelSetting[] = [
  {
    id: "booking-changes",
    title: "Booking confirmations and changes",
    subtitle: "Confirmation numbers, cancellations, waitlist offers",
    push: true,
    email: "always",
    sms: false,
  },
  {
    id: "morning-reminder",
    title: "Day-of reminder",
    subtitle: "The morning of your visit, with the arrival time and the address",
    push: true,
    email: true,
    sms: false,
    time: "6:00 AM",
  },
  {
    id: "reminder-24h",
    title: "24-hour reminder",
    subtitle: "The day before, with the free cancellation deadline",
    push: true,
    email: true,
    sms: false,
  },
  {
    id: "new-lounges",
    title: "New lounges near you",
    subtitle: "When a partner opens in a city you travel to",
    push: true,
    email: false,
    sms: false,
  },
  {
    id: "offers",
    title: "Offers and members' hours",
    subtitle: "Tastings, previews and seasonal invitations",
    push: false,
    email: true,
    sms: false,
  },
  {
    id: "birthday",
    title: "Birthday month",
    subtitle: "One message in September, with what we have for you",
    push: true,
    email: true,
    sms: false,
  },
  {
    id: "membership",
    title: "Membership and billing",
    subtitle: "Renewal reminders, receipts and card expiry",
    push: true,
    email: "always",
    sms: false,
  },
];

export const QUIET_HOURS = { start: "10:00 PM", end: "7:00 AM" };

/**
 * Las horas de silencio son un tramo nocturno: empiezan por la tarde y
 * terminan por la mañana. En vez de validar la pareja elegida, cada
 * desplegable solo ofrece las horas de su mitad — así "10 PM to 3 PM" (el
 * error que se quiere evitar) no es una combinación que se pueda escoger.
 */
export const QUIET_HOURS_START_OPTIONS = ["6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"];

export const QUIET_HOURS_END_OPTIONS = [
  "12:00 AM",
  "1:00 AM",
  "2:00 AM",
  "3:00 AM",
  "4:00 AM",
  "5:00 AM",
  "6:00 AM",
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
];
