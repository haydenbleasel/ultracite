import { agents } from "@repo/data/agents";
import { editors } from "@repo/data/editors";
import { providers } from "@repo/data/providers";
import type { MetadataRoute } from "next";

import { getReleases } from "@/lib/changelog";
import { createAbsoluteUrl } from "@/lib/site-metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      changeFrequency: "weekly",
      priority: 1,
      url: createAbsoluteUrl("/"),
    },
    {
      changeFrequency: "weekly",
      priority: 0.6,
      url: createAbsoluteUrl("/updates"),
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

  const releases = await getReleases();
  const releaseRoutes: MetadataRoute.Sitemap = releases.map((release) => ({
    changeFrequency: "yearly",
    priority: 0.3,
    url: createAbsoluteUrl(`/updates/${release.id}`),
  }));

  return [
    ...staticRoutes,
    ...agentRoutes,
    ...editorRoutes,
    ...providerRoutes,
    ...releaseRoutes,
  ];
}
