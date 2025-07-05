import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Paste to Summary - AI Text Summarizer",
  description:
    "Instantly summarize any text using AI. Just paste and get your summary in seconds.",
  keywords: [
    "text summarizer",
    "AI summary",
    "paste to summary",
    "text analysis",
  ],
  authors: [{ name: "nekeldev", url: "https://patrick-nekel.vercel.app/" }],
  openGraph: {
    title: "Paste to Summary - AI Text Summarizer",
    description:
      "Instantly summarize any text using AI. Just paste and get your summary in seconds.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Paste to Summary - AI Text Summarizer",
    description:
      "Instantly summarize any text using AI. Just paste and get your summary in seconds.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>{children}</body>
    </html>
  );
}
