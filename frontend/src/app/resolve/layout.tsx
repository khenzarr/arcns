import type { Metadata } from "next";
import { NETWORK_DISPLAY } from "../../lib/networkDisplay";

export const metadata: Metadata = {
  title: "Resolve ArcNS Names",
  description:
    `Resolve ArcNS .arc and .circle records and inspect name ownership data on ${NETWORK_DISPLAY.networkDisplayName}.`,
  alternates: { canonical: "/resolve" },
  openGraph: {
    type: "website",
    url: "https://arcname.services/resolve",
    title: "Resolve ArcNS Names | ArcNS",
    description:
      `Resolve .arc and .circle records with ArcNS on ${NETWORK_DISPLAY.networkDisplayName}.`,
  },
  twitter: {
    card: "summary",
    title: "Resolve ArcNS Names | ArcNS",
    description: `Resolve .arc and .circle records with ArcNS on ${NETWORK_DISPLAY.networkDisplayName}.`,
  },
};

export default function ResolveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
