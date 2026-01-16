import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARBISENSE - Multi-Agent Arbitrage Oracle",
  description: "Real-time arbitrage opportunity analysis with institutional-grade quant engines",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
