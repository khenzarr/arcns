import type { Metadata } from "next";
import { NETWORK_DISPLAY } from "../../lib/networkDisplay";

export const metadata: Metadata = {
  title: "Search and Register Names",
  description: `Search, register, and manage .arc and .circle names in the independent ArcNS application on ${NETWORK_DISPLAY.networkDisplayName}.`,
  alternates: { canonical: "/app" },
  robots: { index: false, follow: true },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
