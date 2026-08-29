import type { Metadata } from "next";
import CinematicLanding from "../components/landing/CinematicLanding";
import { JsonLd } from "../components/JsonLd";

const title = "FlashNames - Human-readable names built on Arc";
const description = "Explore FlashNames, an independent naming protocol for .arc and .circle names, built on Arc.";

export const metadata: Metadata = {
  title, description, alternates: { canonical: "/" }, robots: { index: true, follow: true },
  openGraph: { type: "website", url: "https://flashnames.space/", siteName: "FlashNames", title, description, locale: "en_US", images: [{ url: "/flashnames/flashnames-logo.svg", width: 1600, height: 520, alt: "FlashNames - Built on Arc" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/flashnames/flashnames-logo.svg"] },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://flashnames.space/#website",
  name: "FlashNames",
  alternateName: "FlashNames naming protocol",
  url: "https://flashnames.space/",
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
