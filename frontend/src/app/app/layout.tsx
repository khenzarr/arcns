import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search and Register Names",
  description: "Search, register, and manage .arc and .circle names in the independent ArcNS application on Arc Testnet.",
  alternates: { canonical: "/app" },
  robots: { index: false, follow: true },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}