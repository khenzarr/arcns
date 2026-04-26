import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Header from "../components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ArcNS — Arc Name Service",
  description: "Decentralized naming service for Arc Testnet. Register .arc and .circle domains.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`} style={{ background: 'var(--color-surface-base)' }}>
        <Providers>
          <Header />
          <main className="max-w-5xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t mt-16 py-8 text-center text-sm" style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-tertiary)' }}>
            ArcNS — Arc Name Service on Arc Testnet (Chain ID: 5042002) · Powered by USDC
          </footer>
        </Providers>
      </body>
    </html>
  );
}
