import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join",
  description:
    "Become a LuxePass member and unlock access to curated luxury lounges, priority bookings and a digital pass for every visit.",
  alternates: { canonical: "/signup" },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
