import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Header from "../components/Header";
import Footer from "../components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "ArcNS - Arc Name Services",
    template: "%s | ArcNS",
  },
  description:
    "ArcNS (Arc Name Services) is an independent public testnet app for registering and resolving human-readable .arc and .circle names on Arc Testnet.",
  metadataBase: new URL("https://arcname.services"),
  openGraph: {
    type: "website",
    url: "https://arcname.services/",
    siteName: "ArcNS",
    title: "ArcNS - Arc Name Services",
    description:
      "Register and resolve .arc and .circle names with ArcNS, an independent public app on Arc Testnet.",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "ArcNS - Arc Name Services",
    description:
      "Register and resolve .arc and .circle names with ArcNS on Arc Testnet.",
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans min-h-screen`}
        style={{ background: "var(--arcns-bg-primary)" }}
      >
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 w-full">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
