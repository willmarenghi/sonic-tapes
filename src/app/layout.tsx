import type { Metadata, Viewport } from "next";
import { Geist_Mono, Roboto_Slab } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const robotoSlab = Roboto_Slab({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Sonic Tapes",
  description: "Song ideas, versions, and feedback for the band.",
  appleWebApp: {
    capable: true,
    title: "Sonic Tapes",
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${robotoSlab.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-mono">{children}</body>
    </html>
  );
}
