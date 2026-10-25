import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset your password",
  description:
    "Request a secure link to reset your LuxePass password.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
