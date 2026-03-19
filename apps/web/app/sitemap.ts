import { agents } from "@repo/data/agents";
import { editors } from "@repo/data/editors";
import { providers } from "@repo/data/providers";
import type { MetadataRoute } from "next";

const baseUrl = "https://www.ultracite.ai";

const sitemap = (): MetadataRoute.Sitemap => [
  { url: baseUrl, changeFrequency: "weekly", priority: 1 },
  { url: `${baseUrl}/social`, changeFrequency: "weekly", priority: 0.5 },
  { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
  {
    url: `${baseUrl}/acceptable-use`,
    changeFrequency: "yearly",
    priority: 0.3,
  },
  ...providers.map((provider) => ({
    url: `${baseUrl}/providers/${provider.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  ...editors.map((editor) => ({
    url: `${baseUrl}/editors/${editor.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  ...agents.map((agent) => ({
    url: `${baseUrl}/agents/${agent.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  })),
];

export default sitemap;
