import { defineConfig } from "blume";
import { openai } from "blume/ai";
import { cloudflare } from "blume/deploy";
import { filesystem, githubReleases } from "blume/sources";

export default defineConfig({
  agents: {
    // Representative queries for the ultracite skill's entry in the AI
    // Catalog (/.well-known/ai-catalog.json), so agent registries match it to
    // the tasks it covers.
    catalog: {
      queries: {
        "skill:ultracite": [
          "set up linting and formatting for a TypeScript project",
          "configure Oxlint, Biome, or ESLint with zero config",
          "fix the lint errors in this codebase",
          "make my coding agent follow the project's lint rules",
        ],
      },
    },
    // Guidance at the top of llms.txt: when an agent should reach for
    // Ultracite, and how to set it up and run it.
    llmsTxt: {
      details: [
        "Reach for Ultracite when a JavaScript or TypeScript project needs strict, consistent linting and formatting without writing config, especially when coding agents write much of the code. It's a zero-config preset for Oxlint and Oxfmt (recommended), Biome, or ESLint with Prettier and Stylelint, with framework presets for React, Next.js, Vue, Svelte, Astro, and more.",
        "",
        "Set it up with `npx ultracite@latest init` (package: https://www.npmjs.com/package/ultracite), which installs the toolchain and writes the linter config, editor settings, agent rules files (AGENTS.md, CLAUDE.md, and others), and optional post-edit hooks. Then `npx ultracite check` reports problems and `npx ultracite fix` applies safe fixes; `ultracite fix --claude` or `--codex` hands what autofix can't settle to that agent CLI. The `ultracite` agent skill below covers setup, commands, and troubleshooting.",
      ].join("\n"),
    },
    // Publish the repo's agent skills under /.well-known/agent-skills/ with a
    // discovery index. Skills with supporting files (like ultracite's
    // references/) ship as .tar.gz archives so their relative links resolve.
    skills: "../../skills",
  },

  // The docs assistant. Reads OPENAI_API_KEY at runtime; set it in the
  // Worker's environment.
  ai: {
    assistant: {
      enabled: true,
      provider: openai({ model: "gpt-6-luna" }),
      suggestions: [
        {
          icon: "terminal",
          label: "How do I set up Ultracite in an existing project?",
        },
        { icon: "scale", label: "Should I use Oxlint, Biome, or ESLint?" },
        {
          icon: "bot",
          label: "How do I get my coding agent to fix lint errors?",
        },
      ],
      support: "https://github.com/haydenbleasel/ultracite/issues",
    },
  },

  changelog: {
    description:
      "Every Ultracite release, newest first: new presets, rule changes, and fixes, straight from the release notes on GitHub.",
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

  // Also the homepage's meta description (pages/index.astro) and llms.txt.
  description:
    "Ultracite is the linter and formatter for agentic development. A zero-config preset for Oxlint, Biome, and ESLint that keeps agent-written code consistent and type-safe.",

  // The site footer on docs pages (the homepage renders its own). The GitHub
  // icon comes from `github` below; X sits beside it.
  footer: {
    copyright: `© ${new Date().getFullYear()} Ultracite. MIT licensed.`,
    links: [
      { href: "https://www.npmjs.com/package/ultracite", label: "npm" },
      { href: "https://github.com/sponsors/haydenbleasel", label: "Sponsor" },
      {
        href: "https://github.com/haydenbleasel/ultracite/issues",
        label: "Report an issue",
      },
    ],
    socials: { x: "https://x.com/haydenbleasel" },
  },

  github: {
    dir: "apps/docs",
    owner: "haydenbleasel",
    repo: "ultracite",
  },

  // "Last updated" on each docs page, from the file's last commit.
  lastModified: "git",

  logo: {
    image: "/logo.svg",
    text: "Ultracite",
  },

  // Syntax highlighting: Shiki's Vitesse pair.
  markdown: {
    code: { theme: { dark: "vitesse-dark", light: "vitesse-light" } },
  },

  navigation: {
    tabs: [
      {
        label: "Docs",
        path: "/docs",
      },
      {
        label: "Providers",
        path: "/providers",
      },
      {
        label: "Agents",
        path: "/agents",
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
    // JSON-LD: the organization behind the site, and Ultracite as a
    // SoftwareApplication on the homepage.
    organization: {
      logo: "/logo.svg",
      name: "Ultracite",
      sameAs: [
        "https://github.com/haydenbleasel/ultracite",
        "https://www.npmjs.com/package/ultracite",
        "https://x.com/haydenbleasel",
      ],
    },
    software: {
      license: "https://opensource.org/license/mit",
      operatingSystem: "Node.js 20.19+",
      price: 0,
      sameAs: [
        "https://www.npmjs.com/package/ultracite",
        "https://github.com/haydenbleasel/ultracite",
      ],
    },
    // twitter:site and twitter:creator on every page.
    x: { creator: "haydenbleasel", handle: "haydenbleasel" },
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
