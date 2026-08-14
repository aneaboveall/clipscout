import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "ClipScout — Search stock footage everywhere",
  description: "Search Pexels and Pixabay at once. Preview, compare, and shortlist stock video for every B-roll need.",
  openGraph: {
    title: "ClipScout — All your B-roll. One search.",
    description: "Search multiple stock video sources and organize footage by keyword.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ClipScout — All your B-roll. One search." }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
