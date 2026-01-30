import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import GlobalGameNav from "@/components/GlobalGameNav";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Desi Arcade - Classic Indian Games",
  description: "Relive your childhood with nostalgic Indian games in pixel-art style. Play RMCS, Imposter, and more classic desi games!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${pixelFont.variable} antialiased`}
      >
        <GlobalGameNav />
        {children}
      </body>
    </html>
  );
}
