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
  cline: {
    path: './.clinerules',
  },
  amp: {
    path: './AGENT.md',
  },
  aider: {
    path: './ruler_aider_instructions.md',
  },
  'firebase-studio': {
    path: './.idx/airules.md',
  },
  'open-hands': {
    path: './.openhands/microagents/repo.md',
  },
  'gemini-cli': {
    path: './GEMINI.md',
  },
  junie: {
    path: './.junie/guidelines.md',
  },
  augmentcode: {
    path: './.augment/rules/ruler_augment_instructions.md',
  },
  'kilo-code': {
    path: './.kilocode/rules/ruler_kilocode_instructions.md',
  },
  goose: {
    path: './.goosehints',
  },
} as const;
