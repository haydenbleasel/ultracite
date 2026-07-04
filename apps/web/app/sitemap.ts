import type { MetadataRoute } from "next";

import { createAbsoluteUrl } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: "weekly",
      priority: 1,
      url: createAbsoluteUrl("/"),
    },
  ];
}
