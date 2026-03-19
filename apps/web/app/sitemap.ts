import { agents } from "@repo/data/agents";
import { webUrl } from "@repo/data/consts";
import { editors } from "@repo/data/editors";
import { providers } from "@repo/data/providers";
import type { MetadataRoute } from "next";

const sitemap = (): MetadataRoute.Sitemap => [
  { url: webUrl, changeFrequency: "weekly", priority: 1 },
  { url: `${webUrl}/social`, changeFrequency: "weekly", priority: 0.5 },
  { url: `${webUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${webUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
  {
    url: `${webUrl}/acceptable-use`,
    changeFrequency: "yearly",
    priority: 0.3,
  },
  ...providers.map((provider) => ({
    url: `${webUrl}/providers/${provider.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  ...editors.map((editor) => ({
    url: `${webUrl}/editors/${editor.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  ...agents.map((agent) => ({
    url: `${webUrl}/agents/${agent.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  })),
];

export default sitemap;
