import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "APEX-MATRIX",
    short_name: "APEX",
    description: "Global platform for stock, crypto, gold, and silver mining products and asset records.",
    start_url: "/ko/dashboard",
    display: "standalone",
    background_color: "#f5f7fb",
    theme_color: "#f5f7fb",
    lang: "en",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
