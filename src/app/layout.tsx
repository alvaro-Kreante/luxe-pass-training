import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Manrope } from "next/font/google";
import "./globals.css";

/* DESIGN-SYSTEM.md §3 — Display: Bodoni Moda · Texto: Manrope */
const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LuxePass - Luxury Lounge Membership",
  description: "Premium membership platform for exclusive luxury lounges",
  manifest: "/manifest.json",
  keywords: ["luxury", "lounge", "membership", "travel"],
  authors: [{ name: "Kreante" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LuxePass",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#15110D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
