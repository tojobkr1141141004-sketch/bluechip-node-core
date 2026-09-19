import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { ConnectivityGuard } from "@/components/app/connectivity-guard";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://bluechip-node-core.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "APEX-MATRIX",
    template: "%s · APEX-MATRIX"
  },
  description:
    "APEX-MATRIX global mining asset platform for account assets, requests, mining, and permanent ledger records.",
  applicationName: "APEX-MATRIX",
  generator: "Next.js 16.3.5",
  authors: [{ name: "APEX-MATRIX" }],
  category: "finance",
  robots: { index: true, follow: true },
  openGraph: {
    title: "APEX-MATRIX",
    description:
      "Review assets, requests, mining activity, and permanent ledger records with APEX-MATRIX.",
    type: "website",
    siteName: "APEX-MATRIX"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#07111f" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={GeistSans.variable + " " + GeistMono.variable}
      data-theme="light"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){var m=location.pathname.match(/^\\/(ko|ja|en)(?:\\/|$)/);document.documentElement.lang=m?m[1]:'ko';})();"
          }}
        />
      </head>
      <body><ConnectivityGuard />{children}</body>
    </html>
  );
}
