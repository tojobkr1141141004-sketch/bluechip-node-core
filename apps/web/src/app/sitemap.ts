import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  return ["ko", "ja", "en"].map((locale) => ({
    url: `${baseUrl}/${locale}/dashboard`,
    changeFrequency: "weekly" as const,
    priority: locale === "ko" ? 1 : 0.9
  }));
}
