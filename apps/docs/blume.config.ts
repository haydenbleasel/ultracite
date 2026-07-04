import { defineConfig } from "blume";

export default defineConfig({
  content: {
    exclude: ["**/node_modules/**", "**/_*", "**/.*"],
    include: [
      "*.mdx",
      "migrate/**/*.mdx",
      "provider/**/*.mdx",
      "upgrade/**/*.mdx",
    ],
    // Content lives directly under apps/docs/ — there is no docs/ subfolder.
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
    // Explicit sidebar: the source groups are config-only (loose top-level
    // files, not folders), so declaring them here preserves both the grouping
    // and every existing URL without moving a single page.
    sidebar: [
      { href: "https://www.ultracite.ai", label: "Home" },
      {
        items: [
          "/",
          "/setup",
          "/usage",
          "/configuration",
          "/languages",
          "/troubleshooting",
        ],
        label: "Getting Started",
      },
      {
        items: ["/provider/biome", "/provider/eslint", "/provider/oxlint"],
        label: "Providers",
      },
      {
        items: ["/rules", "/skills", "/hooks", "/mcp-server"],
        label: "AI Integration",
      },
      {
        items: [
          "/migrate/biome",
          "/migrate/eslint",
          "/migrate/oxlint",
          "/migrate/prettier",
          "/migrate/stylelint",
        ],
        label: "Migrations",
      },
      {
        items: ["/upgrade/v7", "/upgrade/v6", "/upgrade/v5"],
        label: "Upgrade Guides",
      },
      {
        items: ["/git-hooks", "/monorepos", "/faq"],
        label: "Other",
      },
    ],
  },

  redirects: [{ from: "/sponsors", to: "https://www.ultracite.ai" }],

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
