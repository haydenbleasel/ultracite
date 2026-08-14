// Logos live in public/logos and are referenced by absolute URL — Astro serves
// them as-is (SVGs are not run through the asset pipeline), so a plain string
// path is all a component needs for an <img src>.

import type { ProviderId } from "./providers";

const logo = (name: string): string => `/logos/${name}.svg`;

// Partial lookup from a tool id to its logo URL. Agent/editor ids are open
// strings and only some have logos, so consumers index with arbitrary ids and
// handle a miss themselves.
const logoMap = (ids: readonly string[]): Readonly<Record<string, string>> =>
  Object.fromEntries(ids.map((id): [string, string] => [id, logo(id)]));

export const agentLogos = logoMap([
  "claude",
  "codex",
  "copilot",
  "gemini",
  "opencode",
  "qwen",
  "warp",
]);

export const editorLogos = logoMap([
  "antigravity",
  "bob",
  "codebuddy",
  "cursor",
  "kiro",
  "trae",
  "void",
  "vscode",
  "windsurf",
  "zed",
]);

export const providerLogos = {
  biome: logo("biome"),
  eslint: logo("eslint"),
  oxlint: logo("oxlint"),
} satisfies Record<ProviderId, string>;

export const prettierLogo = logo("prettier");
export const stylelintLogo = logo("stylelint");
