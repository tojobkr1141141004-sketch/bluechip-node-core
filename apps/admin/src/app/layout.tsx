import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "APEX-MATRIX Admin", template: "%s · APEX-MATRIX Admin" },
  description: "APEX-MATRIX 운영자 전용 관리 애플리케이션.",
  applicationName: "APEX-MATRIX Admin",
  generator: "Next.js 16.3.5",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={GeistSans.variable + " " + GeistMono.variable}>
      <body>{children}</body>
    </html>
  );
}
