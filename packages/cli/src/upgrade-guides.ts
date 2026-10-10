import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { parse } from "jsonc-parser";
import { z } from "zod";

// The guides live in the agent skill, so an agent with the skill installed
// can follow them by hand; the CLI bundles the same files as text.
import v5Guide from "../../../skills/ultracite/references/upgrades/v5.md" with { type: "text" };
import v6Guide from "../../../skills/ultracite/references/upgrades/v6.md" with { type: "text" };
import v7Guide from "../../../skills/ultracite/references/upgrades/v7.md" with { type: "text" };
import v8Guide from "../../../skills/ultracite/references/upgrades/v8.md" with { type: "text" };
import {
  biomeConfigNames,
  eslintConfigNames,
  findNearestFile,
  oxlintConfigNames,
  stylelintConfigNames,
} from "./utils";

export interface UpgradeGuide {
  content: string;
  /** The guide's path in the skill, from the package or repository root. */
  path: string;
  /** The major version the guide upgrades to. */
  version: number;
}

const guidePath = (version: number): string =>
  `skills/ultracite/references/upgrades/v${version}.md`;

const biomeConfigSchema = z.looseObject({
  $schema: z.string().optional(),
  // A single preset may be written as a string; normalize it to a list.
  extends: z
    .union([z.string().transform((preset) => [preset]), z.array(z.string())])
    .optional(),
  files: z
    .looseObject({
      ignore: z.unknown().optional(),
      include: z.unknown().optional(),
    })
    .optional(),
  organizeImports: z.unknown().optional(),
});

type BiomeConfig = z.infer<typeof biomeConfigSchema>;

/** What the guides' checks look at. */
export interface ProjectState {
  /** The Biome config nearest the project, when there is one. */
  biomeConfig: BiomeConfig | null;
  /** Everything that might run Ultracite: scripts, hooks, CI workflows. */
  commandSources: string[];
  /** The package names in package.json's dependencies and devDependencies. */
  dependencies?: string[];
  /** The text of the ESLint config nearest the project. */
  eslintConfig?: string | null;
  /** The text of the Oxlint config nearest the project. */
  oxlintConfig?: string | null;
  /** The text of the Stylelint config nearest the project. */
  stylelintConfig?: string | null;
}

const BIOME_ONE_SCHEMA_RE = /\/schemas\/1\./u;
// An Ultracite preset without a linter segment, as v6 named them.
const UNSCOPED_PRESET_RE =
  /^ultracite\/(?!(?:biome|eslint|oxlint|oxfmt|prettier|stylelint)(?:\/|$))[a-z-]+$/u;
const REMOVED_COMMAND_RE = /\bultracite\s+(?:lint|format)\b/u;
// The rule v7's ESLint and Stylelint presets loaded Prettier through.
const PRETTIER_RULE_RE = /["']prettier\/prettier["']/u;
const TYPE_AWARE_OPTION_RE = /typeAware["']?\s*:\s*true/u;
const INIT_COMMAND_RE = /\bultracite(?:@\S+)?\s+init\b[^\n"]*/gu;
const QUIET_FLAG_RE = /\s--quiet\b/u;
const YES_FLAG_RE = /\s(?:--yes|-y)\b/u;

// An `ultracite init --quiet` that relied on --quiet skipping the prompts.
const runsQuietInit = (source: string): boolean =>
  [...source.matchAll(INIT_COMMAND_RE)].some(
    ([command]) => QUIET_FLAG_RE.test(command) && !YES_FLAG_RE.test(command)
  );

const usesStorybook = (dependencies: string[]): boolean =>
  dependencies.some(
    (name) => name === "storybook" || name.startsWith("@storybook/")
  );

// The rule sets v7's ESLint core preset applied that now have presets of
// their own, which a project using them has to import.
const missesEslintPreset = ({
  dependencies = [],
  eslintConfig,
}: ProjectState): boolean => {
  if (!eslintConfig?.includes("ultracite/eslint/")) {
    return false;
  }

  const missing = (preset: string): boolean =>
    !eslintConfig.includes(`ultracite/eslint/${preset}`);

  return (
    (dependencies.includes("cypress") && missing("cypress")) ||
    (usesStorybook(dependencies) && missing("storybook"))
  );
};

// v7's `init --type-aware` installed oxlint-tsgolint without turning on
// Oxlint's type-aware mode.
const missesOxlintTypeAware = ({
  dependencies = [],
  oxlintConfig,
}: ProjectState): boolean =>
  Boolean(oxlintConfig) &&
  dependencies.includes("oxlint-tsgolint") &&
  !TYPE_AWARE_OPTION_RE.test(oxlintConfig ?? "");

const extendsList = (config: BiomeConfig | null): string[] =>
  config?.extends ?? [];

interface GuideCheck {
  applies: (project: ProjectState) => boolean;
  content: string;
  version: number;
}

const guideChecks: GuideCheck[] = [
  {
    // Biome 1's config format.
    applies: ({ biomeConfig }) =>
      biomeConfig !== null &&
      (BIOME_ONE_SCHEMA_RE.test(biomeConfig.$schema ?? "") ||
        biomeConfig.organizeImports !== undefined ||
        biomeConfig.files?.ignore !== undefined ||
        biomeConfig.files?.include !== undefined),
    content: v5Guide,
    version: 5,
  },
  {
    // The single preset v5 and earlier shipped.
    applies: ({ biomeConfig }) =>
      extendsList(biomeConfig).includes("ultracite"),
    content: v6Guide,
    version: 6,
  },
  {
    // v6's preset paths, or the commands v7 removed.
    applies: ({ biomeConfig, commandSources }) =>
      extendsList(biomeConfig).some((entry) =>
        UNSCOPED_PRESET_RE.test(entry)
      ) || commandSources.some((source) => REMOVED_COMMAND_RE.test(source)),
    content: v7Guide,
    version: 7,
  },
  {
    // The Prettier rule, the Cypress and Storybook presets, Oxlint's
    // type-aware option, or an init that relied on --quiet skipping prompts.
    applies: (project) =>
      PRETTIER_RULE_RE.test(project.eslintConfig ?? "") ||
      PRETTIER_RULE_RE.test(project.stylelintConfig ?? "") ||
      missesEslintPreset(project) ||
      missesOxlintTypeAware(project) ||
      project.commandSources.some(runsQuietInit),
    content: v8Guide,
    version: 8,
  },
];

const readText = (filePath: string): string | null => {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
};

const readFolder = (folder: string): string[] => {
  try {
    return readdirSync(folder).map((name) => path.join(folder, name));
  } catch {
    return [];
  }
};

// Files that run Ultracite's commands: package.json scripts and lint-staged
// config, Git hooks, and CI workflows.
const COMMAND_FILES = [
  "package.json",
  ".lintstagedrc",
  ".lintstagedrc.json",
  ".lintstagedrc.yaml",
  ".lintstagedrc.yml",
  ".lintstagedrc.js",
  ".lintstagedrc.mjs",
  ".lintstagedrc.cjs",
  "lint-staged.config.js",
  "lint-staged.config.mjs",
  "lint-staged.config.cjs",
  "lefthook.yml",
  "lefthook.yaml",
  ".lefthook.yml",
  ".pre-commit-config.yaml",
];
const COMMAND_FOLDERS = [".husky", ".github/workflows"];

const readNearest = (names: readonly string[], cwd: string): string | null => {
  const found = findNearestFile(names, cwd);
  return found ? readText(found.path) : null;
};

const packageJsonSchema = z.looseObject({
  dependencies: z.record(z.string(), z.unknown()).optional(),
  devDependencies: z.record(z.string(), z.unknown()).optional(),
});

const readDependencies = (cwd: string): string[] => {
  const parsed = packageJsonSchema.safeParse(
    parse(readText(path.join(cwd, "package.json")) ?? "")
  );

  return parsed.success
    ? [
        ...Object.keys(parsed.data.dependencies ?? {}),
        ...Object.keys(parsed.data.devDependencies ?? {}),
      ]
    : [];
};

/** Reads what the guides check from the project in `cwd`. */
export const readProjectState = (cwd = process.cwd()): ProjectState => {
  const found = findNearestFile(biomeConfigNames, cwd);
  const parsedConfig = biomeConfigSchema.safeParse(
    found ? parse(readText(found.path) ?? "") : undefined
  );

  const commandFiles = [
    ...COMMAND_FILES.map((name) => path.join(cwd, name)),
    ...COMMAND_FOLDERS.flatMap((folder) => readFolder(path.join(cwd, folder))),
  ];

  return {
    biomeConfig: parsedConfig.success ? parsedConfig.data : null,
    commandSources: commandFiles
      .filter((file) => existsSync(file))
      .flatMap((file) => readText(file) ?? []),
    dependencies: readDependencies(cwd),
    eslintConfig: readNearest(eslintConfigNames, cwd),
    oxlintConfig: readNearest(oxlintConfigNames, cwd),
    stylelintConfig: readNearest(stylelintConfigNames, cwd),
  };
};

/**
 * The guides whose changes the project hasn't made yet, oldest first. They
 * look at the project rather than the version it came from, so a project
 * that skipped a major, or upgraded `ultracite` by hand, still gets them.
 */
export const findPendingGuides = (
  project: ProjectState = readProjectState()
): UpgradeGuide[] =>
  guideChecks
    .filter((check) => check.applies(project))
    .map(({ content, version }) => ({
      content,
      path: guidePath(version),
      version,
    }));
