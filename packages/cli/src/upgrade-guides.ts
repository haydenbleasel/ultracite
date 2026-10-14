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
  /** The text of the project's Zed settings, `.zed/settings.json`. */
  zedSettings?: string | null;
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

// The rules v8 moved from the ESLint core and framework presets to
// `ultracite/eslint/type-aware` and the `<framework>/type-aware` add-ons,
// by plugin prefix. v7 ran them with type information in every project, so a
// config could tune any of them; without type information they fail with
// "requires type information" or do nothing. A test keeps the list in step
// with the type-aware presets.
const TYPE_CHECKED_RULES = {
  "@angular-eslint": [
    "no-developer-preview",
    "no-experimental",
    "no-uncalled-signals",
    "prefer-signal-model",
    "prefer-signals",
    "reactive-context-must-read-signal",
  ],
  "@darraghor/nestjs-typed": [
    "all-properties-have-explicit-defined",
    "api-enum-property-best-practices",
    "validated-non-primitive-property-needs-type-decorator",
  ],
  "@tanstack/start": [
    "no-async-client-component",
    "no-client-code-in-server-component",
  ],
  "@typescript-eslint": [
    "await-thenable",
    "consistent-return",
    "consistent-type-exports",
    "dot-notation",
    "naming-convention",
    "no-array-delete",
    "no-base-to-string",
    "no-confusing-void-expression",
    "no-deprecated",
    "no-duplicate-type-constituents",
    "no-floating-promises",
    "no-for-in-array",
    "no-generated-empty-object-type",
    "no-implied-eval",
    "no-meaningless-void-operator",
    "no-misused-promises",
    "no-misused-spread",
    "no-mixed-enums",
    "no-redundant-type-constituents",
    "no-unnecessary-boolean-literal-compare",
    "no-unnecessary-condition",
    "no-unnecessary-qualifier",
    "no-unnecessary-template-expression",
    "no-unnecessary-type-arguments",
    "no-unnecessary-type-assertion",
    "no-unnecessary-type-conversion",
    "no-unnecessary-type-parameters",
    "no-unsafe-argument",
    "no-unsafe-assignment",
    "no-unsafe-call",
    "no-unsafe-enum-assignment",
    "no-unsafe-enum-comparison",
    "no-unsafe-member-access",
    "no-unsafe-return",
    "no-unsafe-type-assertion",
    "no-unsafe-unary-minus",
    "no-useless-default-assignment",
    "non-nullable-type-assertion-style",
    "only-throw-error",
    "prefer-destructuring",
    "prefer-find",
    "prefer-includes",
    "prefer-nullish-coalescing",
    "prefer-optional-chain",
    "prefer-promise-reject-errors",
    "prefer-readonly",
    "prefer-readonly-parameter-types",
    "prefer-reduce-type-parameter",
    "prefer-regexp-exec",
    "prefer-return-this-type",
    "prefer-string-starts-ends-with",
    "promise-function-async",
    "related-getter-setter-pairs",
    "require-array-sort-compare",
    "require-await",
    "restrict-plus-operands",
    "restrict-template-expressions",
    "return-await",
    "strict-boolean-expressions",
    "strict-void-return",
    "switch-exhaustiveness-check",
    "unbound-method",
    "use-unknown-in-catch-callback-variable",
  ],
  jest: [
    "no-error-equal",
    "no-unnecessary-assertion",
    "unbound-method",
    "valid-expect-with-promise",
  ],
  qwik: ["valid-lexical-scope"],
  sonarjs: [
    "argument-type",
    "array-callback-without-return",
    "assertions-in-tests",
    "deprecation",
    "different-types-comparison",
    "disabled-resource-integrity",
    "existing-groups",
    "function-return-type",
    "in-operator-type-error",
    "index-of-compare-to-positive-number",
    "jsx-no-leaked-render",
    "new-operator-misuse",
    "no-alphabetical-sort",
    "no-array-delete",
    "no-associative-arrays",
    "no-async-constructor",
    "no-for-in-iterable",
    "no-ignored-return",
    "no-in-misuse",
    "no-incompatible-assertion-types",
    "no-incorrect-string-concat",
    "no-misleading-array-reverse",
    "no-return-type-any",
    "no-selector-parameter",
    "no-try-promise",
    "no-undefined-argument",
    "no-useless-intersection",
    "non-number-in-arithmetic-expression",
    "null-dereference",
    "operation-returning-nan",
    "post-message",
    "prefer-read-only-props",
    "prefer-regexp-exec",
    "strings-comparison",
    "synchronous-exception-assertions",
    "unused-named-groups",
    "values-not-convertible-to-numbers",
  ],
  unicorn: ["no-non-function-verb-prefix"],
  vitest: ["unbound-method"],
} as const;

/** Every rule v8 runs only with type information, as `plugin/rule` IDs. */
export const typeCheckedRuleIds: readonly string[] = Object.entries(
  TYPE_CHECKED_RULES
).flatMap(([prefix, rules]) => rules.map((rule) => `${prefix}/${rule}`));

// A quoted rule ID used as an object key: `"plugin/rule":` or `'plugin/rule':`.
// Rule IDs hold only letters, digits, `@`, `/` and `-`, none of which needs
// escaping.
const TYPE_CHECKED_RULE_KEY_RE = new RegExp(
  `(?<quote>["'])(?:${typeCheckedRuleIds.join("|")})\\k<quote>\\s*:`,
  "gu"
);

// A setting that turns the rule off: "off", 0, or a list starting with one.
const OFF_SETTING_RE =
  /^\s*(?:\[\s*)?(?:(?<quote>["'])off\k<quote>|0(?![\d.]))/u;

// A config that already gives ESLint type information.
const TYPE_INFORMATION_RE =
  /ultracite\/eslint\/type-aware|\bprojectService\b|\bproject\s*:/u;

// v7's ESLint core preset gave every TypeScript file type information, so a
// config could turn on or tune a type-checked rule; v8 needs the type-aware
// preset for that.
const tunesTypeCheckedRule = ({ eslintConfig }: ProjectState): boolean => {
  if (
    !eslintConfig?.includes("ultracite/eslint/") ||
    TYPE_INFORMATION_RE.test(eslintConfig)
  ) {
    return false;
  }

  return [...eslintConfig.matchAll(TYPE_CHECKED_RULE_KEY_RE)].some(
    (match) =>
      !OFF_SETTING_RE.test(eslintConfig.slice(match.index + match[0].length))
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

const eslintFormatterSchema = z.object({
  language_server: z.object({ name: z.literal("eslint") }),
});

const zedSettingsSchema = z.looseObject({
  languages: z
    .record(z.string(), z.looseObject({ formatter: z.unknown().optional() }))
    .optional(),
});

// v7's Zed settings for ESLint formatted with ESLint's language server, which
// only applied Prettier through the prettier/prettier rule v8 removed.
const zedFormatsWithEslint = ({
  eslintConfig,
  zedSettings,
}: ProjectState): boolean => {
  if (!(eslintConfig?.includes("ultracite/eslint/") && zedSettings)) {
    return false;
  }

  const parsed = zedSettingsSchema.safeParse(parse(zedSettings));

  if (!parsed.success) {
    return false;
  }

  return Object.values(parsed.data.languages ?? {}).some(({ formatter }) =>
    [formatter]
      .flat()
      .some((entry) => eslintFormatterSchema.safeParse(entry).success)
  );
};

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
    // The Prettier rule, the Cypress and Storybook presets, a type-checked
    // ESLint rule without the type-aware preset, Oxlint's type-aware option,
    // Zed formatting with ESLint, or an init that relied on --quiet skipping
    // prompts.
    applies: (project) =>
      PRETTIER_RULE_RE.test(project.eslintConfig ?? "") ||
      PRETTIER_RULE_RE.test(project.stylelintConfig ?? "") ||
      missesEslintPreset(project) ||
      tunesTypeCheckedRule(project) ||
      missesOxlintTypeAware(project) ||
      zedFormatsWithEslint(project) ||
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
    zedSettings: readText(path.join(cwd, ".zed", "settings.json")),
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
  guideChecks.flatMap((check) =>
    check.applies(project)
      ? [
          {
            content: check.content,
            path: guidePath(check.version),
            version: check.version,
          },
        ]
      : []
  );
