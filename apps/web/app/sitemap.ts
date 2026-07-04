import type { MetadataRoute } from "next";

import { createAbsoluteUrl } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: "weekly",
      priority: 1,
      url: createAbsoluteUrl("/"),
    },
    {
      changeFrequency: "monthly",
      priority: 0.4,
      url: createAbsoluteUrl("/acceptable-use"),
    },
    {
      changeFrequency: "monthly",
      priority: 0.4,
      url: createAbsoluteUrl("/privacy"),
    },
    {
      changeFrequency: "monthly",
      priority: 0.4,
      url: createAbsoluteUrl("/terms"),
    },
  ];
}
