import type { Metadata } from "next";
import { NETWORK_DISPLAY } from "../../lib/networkDisplay";

export const metadata: Metadata = {
  title: "My Domains",
  description: `Manage your ArcNS wallet portfolio and ${NETWORK_DISPLAY.networkDisplayName} name records.`,
  alternates: { canonical: "/my-domains" },
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    url: "https://arcname.services/my-domains",
    title: "My Domains | ArcNS",
    description: `Manage your ArcNS wallet portfolio and ${NETWORK_DISPLAY.networkDisplayName} name records.`,
  },
  twitter: {
    card: "summary",
    title: "My Domains | ArcNS",
    description: `Manage your ArcNS wallet portfolio and ${NETWORK_DISPLAY.networkDisplayName} name records.`,
  },
};

export default function MyDomainsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
