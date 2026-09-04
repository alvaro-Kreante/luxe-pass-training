/**
 * Story 6.2 (In-app Notifications). Sin backend: el centro de notificaciones,
 * el panel de la campana y los ajustes por canal son datos de muestra
 * deterministas, como el resto de "My Pass" en `lib/passes.ts`.
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

/**
 * Los seis tipos que pide la Story 6.2: confirmación de reserva, aviso de las
 * 6 AM el día de la visita, nuevo lounge partner, renovación de membresía,
 * ofertas y promoción del mes de cumpleaños. `Notifications.dc.html`.
 */
export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-morning-reminder",
    category: "bookings",
    icon: "morning",
    title: "Your visit today at The Vestry",
    body: "Arrive at 11:00 AM · 41 Grand St, SoHo · admission stays open until 1:00 PM. Your pass is LP-851402.",
    time: "6:00 AM",
    read: false,
    showBookingActions: true,
  },
  {
    id: "n-birthday-month",
    category: "membership",
    icon: "birthday",
    title: "September is your birthday month",
    body: "A complimentary day pass is on your account until September 30 — any lounge, any time, on top of your monthly visits.",
    time: "9:14 AM",
    read: false,
  },
  {
    id: "n-booking-confirmed",
    category: "bookings",
    icon: "booking",
    title: "Booking confirmed · LP-850118",
    body: "Bergdorf Lounge, Friday September 13 at 10:00 AM. The pass is waiting in My Pass and the confirmation is in your email.",
    time: "Wed, 4:32 PM",
    read: true,
  },
  {
    id: "n-new-lounge",
    category: "lounges",
    icon: "lounge",
    title: "New lounge: The Gramercy Reading Room",
    body: "Open to members from today in Gramercy Park, 0.9 mi from you. Quiet rooms, a library bar and a terrace.",
    time: "Tue, 10:05 AM",
    read: true,
    linkLabel: "View lounge",
  },
  {
    id: "n-membership-renewal",
    category: "membership",
    icon: "membership",
    title: "Your membership renews on November 3",
    body: "Annual membership, on the Visa ending 4242. Nothing to do unless you want to change the plan or the card.",
    time: "Mon, 8:00 AM",
    read: true,
    linkLabel: "Manage membership",
  },
  {
    id: "n-offer",
    category: "offers",
    icon: "offer",
    title: "Members' hours at The Ainsworth this Thursday",
    body: "A seasonal tasting for members only, 6:00–9:00 PM. Reserve a spot from the lounge profile.",
    time: "Fri, 2:00 PM",
    read: true,
  },
];

export function unreadNotificationCount(items: NotificationItem[] = NOTIFICATIONS): number {
  return items.filter((item) => !item.read).length;
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
