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

  // Redirects live in public/vercel.json so we can use Vercel wildcard
  // redirects (e.g. /migrate/:path*). Blume copies public/ into the build
  // output and leaves an existing vercel.json untouched.

  theme: {
    accent: "purple",
  },

  title: "Ultracite",
});
