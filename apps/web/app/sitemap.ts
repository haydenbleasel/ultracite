import { agents } from "@repo/data/agents";
import { editors } from "@repo/data/editors";
import { providers } from "@repo/data/providers";
import type { MetadataRoute } from "next";

const siteUrl = "https://ultracite.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      changeFrequency: "weekly",
      priority: 1,
      url: siteUrl,
    },
    {
      changeFrequency: "monthly",
      priority: 0.4,
      url: `${siteUrl}/acceptable-use`,
    },
    {
      changeFrequency: "monthly",
      priority: 0.4,
      url: `${siteUrl}/privacy`,
    },
    {
      changeFrequency: "monthly",
      priority: 0.4,
      url: `${siteUrl}/terms`,
    },
  ];

  const agentRoutes: MetadataRoute.Sitemap = agents.map((agent) => ({
    changeFrequency: "weekly",
    priority: 0.8,
    url: `${siteUrl}/agents/${agent.id}`,
  }));

  const editorRoutes: MetadataRoute.Sitemap = editors.map((editor) => ({
    changeFrequency: "weekly",
    priority: 0.8,
    url: `${siteUrl}/editors/${editor.id}`,
  }));

  const providerRoutes: MetadataRoute.Sitemap = providers.map((provider) => ({
    changeFrequency: "weekly",
    priority: 0.8,
    url: `${siteUrl}/providers/${provider.id}`,
  }));

  return [...staticRoutes, ...agentRoutes, ...editorRoutes, ...providerRoutes];
}
