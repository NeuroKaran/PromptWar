import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-body",
});

export const viewport: Viewport = {
  themeColor: "#4ade80",
};

export const metadata: Metadata = {
  title: "EcoPixel v2.0 — Narrative Day Simulator",
  description:
    "Live a day as your pixel avatar. Every choice shapes your world. An interactive carbon footprint simulator that turns daily decisions into a playable life.",
  keywords: ["carbon footprint", "pixel art", "game", "eco", "sustainability", "simulator"],
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pressStart2P.variable} ${vt323.variable} h-full`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="h-full overflow-hidden bg-[#080e0a]">
        {children}
        {/* Scanline overlay for retro feel */}
        <div className="scanlines" />
      </body>
    </html>
  );
}
