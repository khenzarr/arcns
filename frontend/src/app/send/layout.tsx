import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Send assets with ArcNS",
  description: "Send supported Arc assets to a 0x address, .arc name, or .circle name.",
  alternates: { canonical: "https://arcname.services/send" },
  robots: { index: true, follow: true },
};

export default function SendLayout({ children }: { children: React.ReactNode }) {
  return children;
}
