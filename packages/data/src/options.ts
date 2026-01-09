import { agents } from "./agents";
import { editors } from "./editors";
import { hooks } from "./hooks";
import { providers } from "./providers";

/** Supported frameworks for framework-specific linting rules */
export const frameworks = [
  "react",
  "next",
  "solid",
  "vue",
  "svelte",
  "qwik",
  "remix",
  "angular",
  "astro",
] as const;

export type Framework = (typeof frameworks)[number];

/** Supported integrations for pre-commit hooks */
export const integrations = [
  "husky",
  "lefthook",
  "lint-staged",
  "pre-commit",
] as const;

export type Integration = (typeof integrations)[number];

/** Supported migrations */
export const migrations = ["eslint", "prettier"] as const;

export type Migration = (typeof migrations)[number];

/** All CLI options consolidated */
export const options = {
  agents: agents.map((agent) => agent.id),
  editorConfigs: editors.map((editor) => editor.id),
  frameworks,
  hooks: hooks.map((hook) => hook.id),
  integrations,
  linters: providers.map((provider) => provider.id),
  migrations,
} as const;
