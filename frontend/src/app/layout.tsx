import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Header from "../components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ArcNS — Arc Name Service",
  description:
    "Decentralized naming service for Arc Testnet. Register .arc and .circle domains.",
  icons: { icon: "/favicon.ico" },
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
          </div>
        </Providers>
      </body>
    </html>
  );
}