import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://bluechip-node-core-putduk.vercel.app";

  return [{ url: baseUrl, changeFrequency: "weekly", priority: 1 }];
}
