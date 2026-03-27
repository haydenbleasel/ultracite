import type { MetadataRoute } from "next";

const siteUrl = "https://ultracite.ai";

export default function robots(): MetadataRoute.Robots {
  return {
    host: siteUrl,
    rules: [
      {
        allow: "/",
        disallow: ["/api/", "/.well-known/"],
        userAgent: "*",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
