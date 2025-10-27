import type { options } from "./options";

export type EditorRuleConfig = {
  path: string;
  header?: string;
  appendMode?: boolean;
};

export const AGENTS: Record<(typeof options.agents)[number], EditorRuleConfig> =
  {
    "vscode-copilot": {
      path: "./.github/copilot-instructions.md",
      header: `---
applyTo: "**/*.{ts,tsx,js,jsx}"
---`,
      appendMode: true,
    },
    cursor: {
      path: "./.cursor/rules/ultracite.mdc",
      header: `---
description: Ultracite Rules - AI-Ready Formatter and Linter
globs: "**/*.{ts,tsx,js,jsx,json,jsonc,html,vue,svelte,astro,css,yaml,yml,graphql,gql,md,mdx,grit}"
alwaysApply: false
---`,
    },
    windsurf: {
      path: "./.windsurf/rules/ultracite.md",
    },
    zed: {
      path: "./.rules",
      appendMode: true,
    },
    claude: {
      path: "./.claude/CLAUDE.md",
      appendMode: true,
    },
    codex: {
      path: "./AGENTS.md",
      appendMode: true,
    },
    kiro: {
      path: "./.kiro/steering/ultracite.md",
    },
    cline: {
      path: "./.clinerules",
      appendMode: true,
    },
    amp: {
      path: "./AGENT.md",
      appendMode: true,
    },
    aider: {
      path: "./ultracite.md",
    },
    "firebase-studio": {
      path: "./.idx/airules.md",
      appendMode: true,
    },
    "open-hands": {
      path: "./.openhands/microagents/repo.md",
      appendMode: true,
    },
    "gemini-cli": {
      path: "./GEMINI.md",
      appendMode: true,
    },
    junie: {
      path: "./.junie/guidelines.md",
      appendMode: true,
    },
    augmentcode: {
      path: "./.augment/rules/ultracite.md",
    },
    "kilo-code": {
      path: "./.kilocode/rules/ultracite.md",
    },
    goose: {
      path: "./.goosehints",
      appendMode: true,
    },
    "roo-code": {
      path: "./.roo/rules/ultracite.md",
      appendMode: true,
    },
  } as const;
