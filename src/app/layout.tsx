import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/*
 * DESIGN-SYSTEM.md §3 — Display: Bodoni Moda · Texto: Manrope. Archivos
 * variables (subset latin, licencia SIL OFL) servidos desde el repo: con
 * `next/font/google` el build los descargaba de Google y fallaba cuando
 * Google no respondía. Para el navegador no cambia nada (ya se servían
 * desde este dominio).
 */
const bodoni = localFont({
  variable: "--font-bodoni",
  src: [
    { path: "./fonts/bodoni-moda-latin.woff2", weight: "400 600", style: "normal" },
    { path: "./fonts/bodoni-moda-italic-latin.woff2", weight: "400 600", style: "italic" },
  ],
  display: "swap",
});

const manrope = localFont({
  variable: "--font-manrope",
  src: [{ path: "./fonts/manrope-latin.woff2", weight: "400 800", style: "normal" }],
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
