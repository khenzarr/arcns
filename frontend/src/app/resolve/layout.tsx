import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resolve ArcNS Names",
  description:
    "Resolve ArcNS .arc and .circle records and inspect name ownership data on Arc Testnet.",
  alternates: { canonical: "/resolve" },
  openGraph: {
    type: "website",
    url: "https://arcname.services/resolve",
    title: "Resolve ArcNS Names | ArcNS",
    description:
      "Resolve .arc and .circle records with ArcNS on Arc Testnet.",
  },
  twitter: {
    card: "summary",
    title: "Resolve ArcNS Names | ArcNS",
    description: "Resolve .arc and .circle records with ArcNS on Arc Testnet.",
  },
};

export default function ResolveLayout({ children }: { children: React.ReactNode }) {
  return children;
}