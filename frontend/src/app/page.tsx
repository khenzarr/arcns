import type { Metadata } from "next";
import CinematicLanding from "../components/landing/CinematicLanding";
import { JsonLd } from "../components/JsonLd";

const title = "ArcNS - Human-readable names on Arc Testnet";
const description = "Explore ArcNS, an independent pre-mainnet name service experience for .arc and .circle names on Arc Testnet.";

export const metadata: Metadata = {
  title, description, alternates: { canonical: "/" }, robots: { index: true, follow: true },
  openGraph: { type: "website", url: "https://arcname.services/", siteName: "ArcNS", title, description, locale: "en_US", images: [{ url: "/arcns/arcns-logo.svg", width: 1600, height: 520, alt: "ArcNS - Arc Name Service" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/arcns/arcns-logo.svg"] },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://arcname.services/#website",
  name: "ArcNS",
  alternateName: "Arc Name Services",
  url: "https://arcname.services/",
  description,
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={websiteJsonLd} />
      <CinematicLanding />
    </>
  );
}