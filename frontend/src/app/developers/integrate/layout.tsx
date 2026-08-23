import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrate ArcNS",
  description: "Production-minded integration guide for resolving .arc and .circle names with the ArcNS public adapter.",
  alternates: { canonical: "https://arcname.services/developers/integrate" },
  robots: { index: true, follow: true },
};

export default function IntegrateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
