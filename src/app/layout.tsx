import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "NBA 3PM Model Dashboard",
  description: "Track bets and PnL for NBA 3-point predictions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
