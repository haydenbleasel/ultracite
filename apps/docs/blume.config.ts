import { defineConfig } from "blume";
import { cloudflare } from "blume/deploy";
import { filesystem, githubReleases } from "blume/sources";

export default defineConfig({
  agents: {
    // Publish the repo's agent skills under /.well-known/agent-skills/ with a
    // discovery index. Skills with supporting files (like ultracite's
    // references/) ship as .tar.gz archives so their relative links resolve.
    skills: "../../skills",
  },

  content: {
    sources: [
      // Local docs under docs/ → /docs/* (the marketing homepage owns "/").
      filesystem({ prefix: "docs", root: "docs" }),
      // Ultracite's GitHub releases become the changelog timeline at /changelog
      // (each release is a type:changelog entry). Set GITHUB_TOKEN in CI to
      // avoid rate limits; a failed fetch degrades to an empty changelog.
      githubReleases({
        owner: "haydenbleasel",
        prefix: "changelog",
        repo: "ultracite",
      }),
    ],
  },

  // Server build on Cloudflare Workers (a named host adapter builds for the
  // server). Every page is still prerendered and served from static assets,
  // but the server output lets Blume generate a small Worker in front of the
  // content routes that honors `Accept: text/markdown` (see
  // dist/server/wrangler.json after a build). Workers Builds doesn't expose a
  // site URL the way Pages does, so the canonical origin is pinned here for
  // the sitemap and OG images.
  deployment: cloudflare({ site: "https://www.ultracite.ai" }),

  // Also the homepage's meta description and hero subtitle (pages/index.astro).
  description:
    "Ultracite is a zero-config preset for Oxlint, Biome, and ESLint that helps humans and agents write consistent, type-safe code.",

  // The site footer on docs pages (the homepage renders its own). The GitHub
  // icon comes from `github` below; X sits beside it.
  footer: {
    socials: { x: "https://x.com/haydenbleasel" },
  },

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

  // Every redirect lives here, not in public/_redirects: the generated Worker
  // runs first for every page path and never consults _redirects (a rule
  // there comes back as a 200 with the target's content), so it answers these
  // from its own table. Blume takes exact paths only, so the old /provider/*,
  // /migrate/* and /upgrade/* wildcards are spelled out per page.
  redirects: [
    { from: "/sponsors", to: "/" },
    // Old root URLs → /docs/*
    { from: "/setup", to: "/docs/setup" },
    { from: "/usage", to: "/docs/usage" },
    { from: "/configuration", to: "/docs/configuration" },
    { from: "/languages", to: "/docs/languages" },
    { from: "/troubleshooting", to: "/docs/troubleshooting" },
    { from: "/git-hooks", to: "/docs/git-hooks" },
    { from: "/monorepos", to: "/docs/monorepos" },
    { from: "/faq", to: "/docs/faq" },
    { from: "/provider/biome", to: "/docs/provider/biome" },
    { from: "/provider/eslint", to: "/docs/provider/eslint" },
    { from: "/provider/oxlint", to: "/docs/provider/oxlint" },
    { from: "/migrate/biome", to: "/docs/migrate/biome" },
    { from: "/migrate/eslint", to: "/docs/migrate/eslint" },
    { from: "/migrate/oxlint", to: "/docs/migrate/oxlint" },
    { from: "/migrate/prettier", to: "/docs/migrate/prettier" },
    { from: "/migrate/stylelint", to: "/docs/migrate/stylelint" },
    { from: "/upgrade/v5", to: "/docs/upgrade/v5" },
    { from: "/upgrade/v6", to: "/docs/upgrade/v6" },
    { from: "/upgrade/v7", to: "/docs/upgrade/v7" },
    // AI integrations moved under /docs/ai
    { from: "/rules", to: "/docs/ai/rules" },
    { from: "/skills", to: "/docs/ai/skills" },
    { from: "/hooks", to: "/docs/ai/hooks" },
    { from: "/docs/rules", to: "/docs/ai/rules" },
    { from: "/docs/skills", to: "/docs/ai/skills" },
    { from: "/docs/hooks", to: "/docs/ai/hooks" },
    // Retired MCP server pages
    { from: "/mcp", to: "/" },
    { from: "/mcp-server", to: "/" },
    { from: "/docs/mcp-server", to: "/" },
    // Legacy pages
    { from: "/introduction", to: "/docs" },
    { from: "/examples", to: "/docs/usage" },
    { from: "/support", to: "/docs/troubleshooting" },
    { from: "/preset/core", to: "/docs/configuration" },
    { from: "/integration/husky", to: "/docs/git-hooks" },
    { from: "/integration/lefthook", to: "/docs/git-hooks" },
  ],

  seo: {
    // twitter:site on every page; the footer's "Follow on X" account.
    x: { handle: "haydenbleasel" },
  },

  // Paper and ink with signal orange. The accent is the text-safe orange (it
  // colors links and active states); the full-strength signal orange for
  // large fills, and the warm neutrals, are tokens in theme.css.
  theme: {
    accent: { dark: "#ff7a4d", light: "#c43a0b" },
    action: "#ff4f1a",
    background: { dark: "#131311", light: "#f4f3ef" },
    fonts: { mono: "geist-mono" },
  },

  title: "Ultracite",
});
