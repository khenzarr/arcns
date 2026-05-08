import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Header from "../components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  // Only load weights used in the design system
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ArcNS — Arc Name Service",
  description: "Decentralized naming service for Arc Testnet. Register .arc and .circle domains.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans min-h-screen`} style={{ background: 'var(--arcns-bg-primary)' }}>
        <Providers>
          <Header />
          <main className="max-w-5xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t mt-16 py-8 text-center text-sm" style={{ borderColor: 'var(--arcns-border-default)', color: 'var(--arcns-text-muted)' }}>
            ArcNS — Arc Name Service on Arc Testnet (Chain ID: 5042002) · Powered by USDC
          </footer>
        </Providers>
      </body>
    </html>
  );
}
