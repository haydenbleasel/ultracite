import { defineConfig } from "blume";

export default defineConfig({
  analytics: {
    vercel: true,
  },

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
    adapter: "vercel",
  },

  description: "Documentation for Ultracite.",

  github: {
    dir: "apps/docs",
    owner: "haydenbleasel",
    repo: "ultracite",
  },

  logo: {
    image: "/logo/logo.svg",
    text: "",
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

  redirects: [
    { from: "/sponsors", to: "/" },
    // Docs moved from the root to /docs/* — preserve every previous URL.
    { from: "/setup", to: "/docs/setup" },
    { from: "/usage", to: "/docs/usage" },
    { from: "/configuration", to: "/docs/configuration" },
    { from: "/languages", to: "/docs/languages" },
    { from: "/troubleshooting", to: "/docs/troubleshooting" },
    { from: "/provider/biome", to: "/docs/provider/biome" },
    { from: "/provider/eslint", to: "/docs/provider/eslint" },
    { from: "/provider/oxlint", to: "/docs/provider/oxlint" },
    // Rules / Skills / Hooks moved under /docs/ai/*.
    { from: "/rules", to: "/docs/ai/rules" },
    { from: "/skills", to: "/docs/ai/skills" },
    { from: "/hooks", to: "/docs/ai/hooks" },
    { from: "/docs/rules", to: "/docs/ai/rules" },
    { from: "/docs/skills", to: "/docs/ai/skills" },
    { from: "/docs/hooks", to: "/docs/ai/hooks" },
    { from: "/migrate/biome", to: "/docs/migrate/biome" },
    { from: "/migrate/eslint", to: "/docs/migrate/eslint" },
    { from: "/migrate/oxlint", to: "/docs/migrate/oxlint" },
    { from: "/migrate/prettier", to: "/docs/migrate/prettier" },
    { from: "/migrate/stylelint", to: "/docs/migrate/stylelint" },
    { from: "/upgrade/v5", to: "/docs/upgrade/v5" },
    { from: "/upgrade/v6", to: "/docs/upgrade/v6" },
    { from: "/upgrade/v7", to: "/docs/upgrade/v7" },
    { from: "/git-hooks", to: "/docs/git-hooks" },
    { from: "/monorepos", to: "/docs/monorepos" },
    { from: "/faq", to: "/docs/faq" },
    // The MCP docs page was removed — send it (and its old aliases) home.
    { from: "/docs/mcp-server", to: "/" },
    { from: "/mcp-server", to: "/" },
    { from: "/mcp", to: "/" },
    // Legacy slugs previously redirected by the standalone marketing site.
    { from: "/introduction", to: "/docs" },
    { from: "/examples", to: "/docs/usage" },
    { from: "/support", to: "/docs/troubleshooting" },
    { from: "/preset/core", to: "/docs/configuration" },
    { from: "/integration/husky", to: "/docs/git-hooks" },
    { from: "/integration/lefthook", to: "/docs/git-hooks" },
  ],

  theme: {
    accent: "purple",
  },

  title: "Ultracite",
});
