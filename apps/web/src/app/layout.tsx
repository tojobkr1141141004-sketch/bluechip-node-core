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
    default: "APEX-MATRIX",
    template: "%s · APEX-MATRIX"
  },
  description:
    "APEX-MATRIX 사용자 운영센터. 인증된 사용자의 자산, 입출금, 채굴 및 영구 거래 기록을 확인하는 플랫폼입니다.",
  applicationName: "APEX-MATRIX",
  generator: "Next.js 16.3.5",
  authors: [{ name: "APEX-MATRIX" }],
  category: "finance",
  robots: { index: true, follow: true },
  openGraph: {
    title: "APEX-MATRIX",
    description:
      "사용자 자산, 금융 요청, 채굴 및 원장 기반 활동 기록을 확인하는 사용자 운영센터.",
    type: "website",
    siteName: "APEX-MATRIX"
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
