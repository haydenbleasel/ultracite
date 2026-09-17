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
    // Server build on Cloudflare Workers. Every page is still prerendered and
    // served from static assets, but the server output lets Blume generate a
    // small Worker in front of the content routes that honors
    // `Accept: text/markdown` (see dist/server/wrangler.json after a build).
    // Workers Builds doesn't expose a site URL the way Pages does, so the
    // canonical origin is pinned here for the sitemap and OG images.
    adapter: "cloudflare",
    output: "server",
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

  // Most redirects live in public/_redirects so we can use Cloudflare's
  // wildcard rules (e.g. /migrate/*). Blume copies public/ into the build
  // output and leaves an existing _redirects untouched. Redirects under the
  // content routes (/, /docs/*, /changelog/*) must be declared here instead:
  // those routes run through the generated Worker, which never consults
  // _redirects, so it answers these from its own table.
  redirects: [
    // AI integrations moved under /docs/ai
    { from: "/docs/rules", to: "/docs/ai/rules" },
    { from: "/docs/skills", to: "/docs/ai/skills" },
    { from: "/docs/hooks", to: "/docs/ai/hooks" },
    // Retired MCP server page
    { from: "/docs/mcp-server", to: "/" },
  ],

  theme: {
    accent: "purple",
  },

  title: "Ultracite",
});
