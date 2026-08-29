import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resolve FlashNames",
  description:
    "Resolve FlashNames .arc and .circle records and inspect onchain name ownership data.",
  alternates: { canonical: "/resolve" },
  openGraph: {
    type: "website",
    url: "https://flashnames.space/resolve",
    title: "Resolve Names | FlashNames",
    description:
      "Resolve .arc and .circle records with FlashNames, built on Arc.",
  },
  twitter: {
    card: "summary",
    title: "Resolve Names | FlashNames",
    description: "Resolve .arc and .circle records with FlashNames, built on Arc.",
  },
};

export default function ResolveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
