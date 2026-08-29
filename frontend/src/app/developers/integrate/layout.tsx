import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrate FlashNames",
  description: "Production-minded integration guide for resolving .arc and .circle names with the FlashNames public adapter.",
  alternates: { canonical: "https://flashnames.space/developers/integrate" },
  robots: { index: true, follow: true },
};

export default function IntegrateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
