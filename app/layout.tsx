import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://koreatennisranking.com"),
  title: "전국 대학 테니스 동아리 랭킹",
  description: "전국 대학 테니스 동아리 대회 성적을 바탕으로 산정한 랭킹",
  openGraph: {
    title: "전국 대학 테니스 동아리 랭킹",
    description: "전국 대학 테니스 동아리 대회 성적을 바탕으로 산정한 랭킹",
    url: "/",
    siteName: "Korea Tennis Club Ranking",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1546,
        height: 952,
        alt: "Korea Tennis Club Ranking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "전국 대학 테니스 동아리 랭킹",
    description: "전국 대학 테니스 동아리 대회 성적을 바탕으로 산정한 랭킹",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
