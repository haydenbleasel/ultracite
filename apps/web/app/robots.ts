import type { MetadataRoute } from "next";

import { createAbsoluteUrl, siteUrl } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    host: siteUrl,
    rules: [
      {
        allow: "/",
        userAgent: "*",
      },
    ],
    sitemap: createAbsoluteUrl("/sitemap.xml"),
  };
}
