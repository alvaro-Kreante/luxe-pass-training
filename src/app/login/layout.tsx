import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in to your LuxePass membership to explore luxury lounges, manage your bookings and open your digital pass.",
  alternates: { canonical: "/login" },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
