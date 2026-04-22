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
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <Providers>
          <Header />
          <main className="max-w-5xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t border-gray-100 mt-16 py-8 text-center text-sm text-gray-400">
            ArcNS — Arc Name Service on Arc Testnet (Chain ID: 5042002) · Powered by USDC
          </footer>
        </Providers>
      </body>
    </html>
  );
}
