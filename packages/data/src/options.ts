import { agentIds } from "./agents";
import { editorCliValues } from "./editors";
import { providerIds } from "./providers";

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

/** Supported agent hooks */
export const hooks = ["cursor", "claude"] as const;

export type Hook = (typeof hooks)[number];

/** Supported migrations */
export const migrations = ["eslint", "prettier"] as const;

export type Migration = (typeof migrations)[number];

/** All CLI options consolidated */
export const options = {
  linters: providerIds,
  editorConfigs: editorCliValues,
  agents: agentIds,
  integrations,
  hooks,
  frameworks,
  migrations,
} as const;
