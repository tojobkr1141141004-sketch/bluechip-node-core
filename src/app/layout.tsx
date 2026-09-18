import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://bluechip-node-core-putduk.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "BLUECHIP · Edge Asset Hub",
    template: "%s · BLUECHIP"
  },
  description:
    "전 세계 엣지 노드 상태와 보호 흐름을 확인하는 고성능 대시보드 데모.",
  applicationName: "BLUECHIP Edge Asset Hub",
  generator: "Next.js 16.3.3",
  authors: [{ name: "BLUECHIP" }],
  category: "technology",
  robots: { index: true, follow: true },
  openGraph: {
    title: "BLUECHIP · Edge Asset Hub",
    description:
      "실시간 노드 텔레메트리와 보호 흐름을 시각화하는 데모 대시보드.",
    type: "website",
    siteName: "BLUECHIP"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06101d"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={GeistSans.variable + " " + GeistMono.variable}
    >
      <body>{children}</body>
    </html>
  );
}
