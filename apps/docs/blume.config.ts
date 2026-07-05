import { defineConfig } from "blume";

export default defineConfig({
  content: {
    exclude: ["**/node_modules/**", "**/_*", "**/.*"],
    // Docs live under docs/ so the marketing homepage (pages/index.astro) can
    // own "/". A route is the file path relative to root, so docs/setup.mdx
    // serves at /docs/setup.
    include: ["docs/**/*.mdx"],
    root: ".",
  },

  description: "Documentation for Ultracite.",

  github: {
    dir: "apps/docs",
    owner: "haydenbleasel",
    repo: "ultracite",
  },

  logo: {
    // The SVG already includes the "Ultracite" wordmark, so render the mark
    // alone (no site title beside it).
    image: {
      alt: "Ultracite",
      dark: "/logo/dark.svg",
      light: "/logo/light.svg",
    },
    text: "",
  },

  navigation: {
    tabs: [
      {
        label: "Docs",
        path: "/docs",
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
    { from: "/rules", to: "/docs/rules" },
    { from: "/skills", to: "/docs/skills" },
    { from: "/hooks", to: "/docs/hooks" },
    { from: "/mcp-server", to: "/docs/mcp-server" },
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
    // Legacy slugs previously redirected by the standalone marketing site.
    { from: "/introduction", to: "/docs" },
    { from: "/examples", to: "/docs/usage" },
    { from: "/mcp", to: "/docs/mcp-server" },
    { from: "/support", to: "/docs/troubleshooting" },
    { from: "/preset/core", to: "/docs/configuration" },
    { from: "/integration/husky", to: "/docs/git-hooks" },
    { from: "/integration/lefthook", to: "/docs/git-hooks" },
  ],

  theme: {
    // colors.primary
    accent: "#4F46E5",
    // colors.light
    accentDark: "#6159E8",
    // colors.dark
    action: "#473FCE",
    fonts: {
      body: "geist",
      display: "geist",
    },
  },

  title: "Ultracite",
});
