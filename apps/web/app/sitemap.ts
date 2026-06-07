import { agents } from "@repo/data/agents";
import { editors } from "@repo/data/editors";
import { providers } from "@repo/data/providers";
import type { MetadataRoute } from "next";

import { createAbsoluteUrl } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
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

  const agentRoutes: MetadataRoute.Sitemap = agents.map((agent) => ({
    changeFrequency: "weekly",
    priority: 0.8,
    url: createAbsoluteUrl(`/agents/${agent.id}`),
  }));

  const editorRoutes: MetadataRoute.Sitemap = editors.map((editor) => ({
    changeFrequency: "weekly",
    priority: 0.8,
    url: createAbsoluteUrl(`/editors/${editor.id}`),
  }));

  const providerRoutes: MetadataRoute.Sitemap = providers.map((provider) => ({
    changeFrequency: "weekly",
    priority: 0.8,
    url: createAbsoluteUrl(`/providers/${provider.id}`),
  }));

  return [...staticRoutes, ...agentRoutes, ...editorRoutes, ...providerRoutes];
}
