import type { options } from './options';

export type EditorRuleConfig = {
  path: string;
  header?: string;
  appendMode?: boolean;
};

export const EDITOR_RULES: Record<
  (typeof options.editorRules)[number],
  EditorRuleConfig
> = {
  'vscode-copilot': {
    path: './.github/copilot-instructions.md',
    header: `---
applyTo: "**/*.{ts,tsx,js,jsx}"
---`,
  },
  cursor: {
    path: './.cursor/rules/ultracite.mdc',
    header: `---
description: Ultracite Rules - AI-Ready Formatter and Linter
globs: "**/*.{ts,tsx,js,jsx}"
alwaysApply: true
---`,
  },
  windsurf: {
    path: './.windsurf/rules/ultracite.md',
  },
  zed: {
    path: './.rules',
    appendMode: true,
  },
  claude: {
    path: './.claude/CLAUDE.md',
  },
  codex: {
    path: './AGENTS.md',
  },
  kiro: {
    path: './.kiro/steering/linting-and-formatting.md',
  },
} as const;
