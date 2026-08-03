import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Domains",
  description: "Manage your ArcNS wallet portfolio and testnet name records.",
  alternates: { canonical: "/my-domains" },
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    url: "https://arcname.services/my-domains",
    title: "My Domains | ArcNS",
    description: "Manage your ArcNS wallet portfolio and testnet name records.",
  },
  twitter: {
    card: "summary",
    title: "My Domains | ArcNS",
    description: "Manage your ArcNS wallet portfolio and testnet name records.",
  },
};

export default function MyDomainsLayout({ children }: { children: React.ReactNode }) {
  return children;
}