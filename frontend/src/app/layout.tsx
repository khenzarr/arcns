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
    default: "FlashNames - Human-readable names built on Arc",
    template: "%s | FlashNames",
  },
  description:
    "FlashNames is an independent naming protocol for registering and resolving human-readable .arc and .circle names, built on Arc.",
  metadataBase: new URL("https://flashnames.space"),
  openGraph: {
    type: "website",
    url: "https://flashnames.space/",
    siteName: "FlashNames",
    title: "FlashNames - Human-readable names built on Arc",
    description:
      "Register and resolve .arc and .circle names with FlashNames, an independent naming protocol built on Arc.",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "FlashNames - Human-readable names built on Arc",
    description:
      "Register and resolve .arc and .circle names with FlashNames, built on Arc.",
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
