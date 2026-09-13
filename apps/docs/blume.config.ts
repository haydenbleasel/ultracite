import { defineConfig } from "blume";

export default defineConfig({
  content: {
    sources: [
      // Local docs under docs/ → /docs/* (the marketing homepage owns "/").
      { prefix: "docs", root: "docs", type: "filesystem" },
      // Ultracite's GitHub releases become the changelog timeline at /changelog
      // (each release is a type:changelog entry). Set GITHUB_TOKEN in CI to
      // avoid rate limits; a failed fetch degrades to an empty changelog.
      {
        owner: "haydenbleasel",
        prefix: "changelog",
        repo: "ultracite",
        type: "github-releases",
      },
    ],
  },

  deployment: {
    // Static build served by Cloudflare Workers static assets (see
    // wrangler.jsonc). Workers Builds doesn't expose a site URL the way Pages
    // does, so the canonical origin is pinned here for the sitemap and OG
    // images.
    site: "https://www.ultracite.ai",
  },

  description: "Documentation for Ultracite.",

  github: {
    dir: "apps/docs",
    owner: "haydenbleasel",
    repo: "ultracite",
  },

  logo: {
    image: "/logo.svg",
    text: "Ultracite",
  },

  navigation: {
    tabs: [
      {
        label: "Docs",
        path: "/docs",
      },
      {
        label: "Changelog",
        path: "/changelog",
      },
    ],
  },

  // Redirects live in public/_redirects so we can use Cloudflare's wildcard
  // rules (e.g. /migrate/*). Blume copies public/ into the build output and
  // leaves an existing _redirects untouched.

  theme: {
    accent: "purple",
  },

  title: "Ultracite",
});
