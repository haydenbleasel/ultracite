import process from "node:process";

import {
  cancel,
  intro,
  isCancel,
  log,
  multiselect,
  select,
  spinner,
} from "@clack/prompts";
import { addDevDependency, detectPackageManager } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";

import packageJson from "../package.json" with { type: "json" };
import { createAgents, getAgentFileTargets } from "./agents";
import type { AgentFileTarget } from "./agents";
import { agents as agentsData } from "./data/agents";
import { editors } from "./data/editors";
import { hooks as hookIntegrations } from "./data/hooks";
import type { options } from "./data/options";
import { providers } from "./data/providers";
import { createEditorConfig } from "./editor-config";
import { getEditorFileTargets } from "./editors";
import type { EditorFileTarget } from "./editors";
import { createHooks } from "./hooks";
import { husky } from "./integrations/husky";
import { lefthook } from "./integrations/lefthook";
import { lintStaged } from "./integrations/lint-staged";
import { preCommit } from "./integrations/pre-commit";
import { biome } from "./linters/biome";
import { eslint } from "./linters/eslint";
import { oxfmt } from "./linters/oxfmt";
import { oxlint } from "./linters/oxlint";
import { prettier } from "./linters/prettier";
import { stylelint } from "./linters/stylelint";
import {
  assertSupportedPackageManagerName,
  normalizePackageManager,
} from "./package-manager";
import { readPackageJson } from "./schemas";
import {
  getUltraciteSkillInstallCommand,
  maybeInstallUltraciteSkill,
} from "./skill";
import { tsconfig } from "./tsconfig";
import {
  biomeConfigNames,
  detectFrameworks,
  eslintConfigNames,
  exists,
  isMonorepo,
  legacyEslintConfigNames,
  oxfmtConfigNames,
  oxlintConfigNames,
  prettierConfigNames,
  stylelintConfigNames,
  updatePackageJson,
  writeProjectFile,
} from "./utils";

const schemaVersion = packageJson.devDependencies["@biomejs/biome"];
const ultraciteVersion = packageJson.version;

const OPERATION_CANCELLED = "Operation cancelled.";
const LINT_STAGED = "lint-staged";

type Linter = (typeof options.linters)[number];
type Frameworks = (typeof options.frameworks)[number];
type AgentSelection = (typeof options.agents)[number] | "universal";
type EditorSelection = (typeof options.editorConfigs)[number] | "universal";

interface InitializeFlags {
  agents?: AgentSelection[];
  editors?: EditorSelection[];
  frameworks?: (typeof options.frameworks)[number][];
  hooks?: (typeof options.hooks)[number][];
  integrations?: (typeof options.integrations)[number][];
  installSkill?: boolean;
  linter?: Linter;
  pm?: string;
  quiet?: boolean;
  skipInstall?: boolean;
  "type-aware"?: boolean;
}

// eslint-plugin-unicorn@70 and eslint-plugin-astro@2 require ESLint >= 10;
// the whole preset is verified against ESLint 10.
const supportedEslintVersion = "^10.0.0";
const eslintCoreDevDependencies: Record<string, string> = {
  "@eslint/js": supportedEslintVersion,
  "@typescript-eslint/eslint-plugin":
    packageJson.devDependencies["@typescript-eslint/eslint-plugin"],
  "@typescript-eslint/parser":
    packageJson.devDependencies["@typescript-eslint/parser"],
  eslint: supportedEslintVersion,
  "eslint-config-prettier":
    packageJson.devDependencies["eslint-config-prettier"],
  "eslint-import-resolver-typescript":
    packageJson.devDependencies["eslint-import-resolver-typescript"],
  "eslint-plugin-compat": packageJson.devDependencies["eslint-plugin-compat"],
  "eslint-plugin-cypress": packageJson.devDependencies["eslint-plugin-cypress"],
  "eslint-plugin-github": packageJson.devDependencies["eslint-plugin-github"],
  "eslint-plugin-html": packageJson.devDependencies["eslint-plugin-html"],
  "eslint-plugin-import-x":
    packageJson.devDependencies["eslint-plugin-import-x"],
  "eslint-plugin-jsdoc": packageJson.devDependencies["eslint-plugin-jsdoc"],
  "eslint-plugin-n": packageJson.devDependencies["eslint-plugin-n"],
  "eslint-plugin-prettier":
    packageJson.devDependencies["eslint-plugin-prettier"],
  "eslint-plugin-promise": packageJson.devDependencies["eslint-plugin-promise"],
  "eslint-plugin-sonarjs": packageJson.devDependencies["eslint-plugin-sonarjs"],
  "eslint-plugin-storybook":
    packageJson.devDependencies["eslint-plugin-storybook"],
  "eslint-plugin-unicorn": packageJson.devDependencies["eslint-plugin-unicorn"],
  "eslint-plugin-unused-imports":
    packageJson.devDependencies["eslint-plugin-unused-imports"],
  globals: packageJson.devDependencies.globals,
  prettier: "latest",
  "prettier-plugin-tailwindcss":
    packageJson.devDependencies["prettier-plugin-tailwindcss"],
  // Required peer of eslint-plugin-storybook, which the flat config imports
  // unconditionally — without it the config fails to load.
  storybook: packageJson.devDependencies.storybook,
  stylelint: "latest",
  // The generated stylelint config extends/uses these; `stylelint` alone
  // cannot resolve them.
  "stylelint-config-idiomatic-order":
    packageJson.devDependencies["stylelint-config-idiomatic-order"],
  "stylelint-config-standard":
    packageJson.devDependencies["stylelint-config-standard"],
  "stylelint-prettier": packageJson.devDependencies["stylelint-prettier"],
};
const eslintFrameworkDevDependencies: Partial<
  Record<Frameworks, Record<string, string>>
> = {
  angular: {
    "@angular-eslint/eslint-plugin": "latest",
  },
  astro: {
    "eslint-plugin-astro": packageJson.devDependencies["eslint-plugin-astro"],
    "prettier-plugin-astro":
      packageJson.devDependencies["prettier-plugin-astro"],
  },
  jest: {
    "eslint-plugin-jest": packageJson.devDependencies["eslint-plugin-jest"],
  },
  next: {
    "@next/eslint-plugin-next":
      packageJson.devDependencies["@next/eslint-plugin-next"],
    "eslint-plugin-react-doctor":
      packageJson.devDependencies["eslint-plugin-react-doctor"],
  },
  qwik: {
    "eslint-plugin-qwik": packageJson.devDependencies["eslint-plugin-qwik"],
  },
  react: {
    "eslint-plugin-jsx-a11y":
      packageJson.devDependencies["eslint-plugin-jsx-a11y"],
    "eslint-plugin-react": packageJson.devDependencies["eslint-plugin-react"],
    "eslint-plugin-react-doctor":
      packageJson.devDependencies["eslint-plugin-react-doctor"],
    "eslint-plugin-react-hooks":
      packageJson.devDependencies["eslint-plugin-react-hooks"],
  },
  remix: {
    "eslint-plugin-remix": packageJson.devDependencies["eslint-plugin-remix"],
  },
  solid: {
    "eslint-plugin-solid": packageJson.devDependencies["eslint-plugin-solid"],
  },
  svelte: {
    "eslint-plugin-svelte": packageJson.devDependencies["eslint-plugin-svelte"],
    "prettier-plugin-svelte":
      packageJson.devDependencies["prettier-plugin-svelte"],
  },
  tanstack: {
    "@tanstack/eslint-plugin-query":
      packageJson.devDependencies["@tanstack/eslint-plugin-query"],
    "@tanstack/eslint-plugin-router":
      packageJson.devDependencies["@tanstack/eslint-plugin-router"],
    "@tanstack/eslint-plugin-start":
      packageJson.devDependencies["@tanstack/eslint-plugin-start"],
    "eslint-plugin-react-doctor":
      packageJson.devDependencies["eslint-plugin-react-doctor"],
  },
  vitest: {
    "@vitest/eslint-plugin":
      packageJson.devDependencies["@vitest/eslint-plugin"],
  },
  vue: {
    "eslint-plugin-vue": packageJson.devDependencies["eslint-plugin-vue"],
  },
};
const buildEslintDevDependencies = (
  frameworks: Frameworks[]
): Record<string, string> => {
  const devDependencies = { ...eslintCoreDevDependencies };

  for (const framework of frameworks) {
    Object.assign(devDependencies, eslintFrameworkDevDependencies[framework]);
  }

  return devDependencies;
};

// The react/next/tanstack oxlint presets load the React Doctor rules via a JS
// plugin, which oxlint resolves from the project root — so it must be
// installed in the target project.
const oxlintFrameworkDevDependencies: Partial<
  Record<Frameworks, Record<string, string>>
> = {
  next: {
    "oxlint-plugin-react-doctor":
      packageJson.devDependencies["oxlint-plugin-react-doctor"],
  },
  react: {
    "oxlint-plugin-react-doctor":
      packageJson.devDependencies["oxlint-plugin-react-doctor"],
  },
  tanstack: {
    "oxlint-plugin-react-doctor":
      packageJson.devDependencies["oxlint-plugin-react-doctor"],
  },
};
const buildOxlintFrameworkDevDependencies = (
  frameworks: Frameworks[]
): Record<string, string> => {
  const devDependencies: Record<string, string> = {};

  for (const framework of frameworks) {
    Object.assign(devDependencies, oxlintFrameworkDevDependencies[framework]);
  }

  return devDependencies;
};

const buildNoInstallDevDependencies = (
  linter: Linter,
  typeAware: boolean,
  frameworks: Frameworks[]
): Record<string, string> => {
  const devDependencies: Record<string, string> = {
    ultracite: ultraciteVersion,
  };

  if (linter === "biome") {
    devDependencies["@biomejs/biome"] = schemaVersion;
  }
  if (linter === "eslint") {
    Object.assign(devDependencies, buildEslintDevDependencies(frameworks));
  }
  if (linter === "oxlint") {
    devDependencies.oxlint = "latest";
    devDependencies.oxfmt = "latest";
    if (typeAware) {
      devDependencies["oxlint-tsgolint"] = "latest";
    }
    Object.assign(
      devDependencies,
      buildOxlintFrameworkDevDependencies(frameworks)
    );
  }

  return devDependencies;
};

const eslintDevDependencyNames = new Set([
  ...Object.keys(eslintCoreDevDependencies),
  ...Object.values(eslintFrameworkDevDependencies).flatMap((dependencies) =>
    Object.keys(dependencies ?? {})
  ),
]);

const dependencyNamesByLinter: Record<Linter, Set<string>> = {
  biome: new Set(["@biomejs/biome"]),
  eslint: eslintDevDependencyNames,
  oxlint: new Set([
    "oxfmt",
    "oxlint",
    "oxlint-plugin-react-doctor",
    "oxlint-tsgolint",
  ]),
};

const removeProjectFile = async (filePath: string): Promise<boolean> => {
  const normalizedPath = filePath.startsWith("./") ? filePath : `./${filePath}`;
  if (!exists(normalizedPath)) {
    return false;
  }

  const { rm } = await import("node:fs/promises");
  await rm(normalizedPath, { force: true });
  return true;
};

const prunePackageJsonForLinter = async (linter: Linter): Promise<boolean> => {
  const packageJsonObject = await readPackageJson();
  if (!packageJsonObject) {
    return false;
  }

  const dependencyNamesToRemove = new Set<string>();
  for (const [tool, dependencyNames] of Object.entries(
    dependencyNamesByLinter
  )) {
    if (tool !== linter) {
      for (const dependencyName of dependencyNames) {
        dependencyNamesToRemove.add(dependencyName);
      }
    }
  }
  // Dependencies shared between linters must survive the prune when the
  // selected linter needs them.
  for (const dependencyName of dependencyNamesByLinter[linter]) {
    dependencyNamesToRemove.delete(dependencyName);
  }

  let changed = false;
  const nextPackageJson = { ...packageJsonObject };

  for (const key of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ] as const) {
    const dependencies = nextPackageJson[key];
    if (!dependencies) {
      continue;
    }

    const dependencyEntries = Object.entries(dependencies);
    const nextDependencyEntries = dependencyEntries.filter(
      ([dependencyName]) => !dependencyNamesToRemove.has(dependencyName)
    );
    if (nextDependencyEntries.length !== dependencyEntries.length) {
      changed = true;
    }
    const nextDependencies = Object.fromEntries(nextDependencyEntries);

    nextPackageJson[key] = nextDependencies;
  }

  if ("prettier" in nextPackageJson) {
    delete nextPackageJson.prettier;
    changed = true;
  }
  if ("stylelint" in nextPackageJson) {
    delete nextPackageJson.stylelint;
    changed = true;
  }

  if (!changed) {
    return false;
  }

  await writeProjectFile(
    "package.json",
    `${JSON.stringify(nextPackageJson, null, 2)}\n`
  );
  return true;
};

export const migrateLinterConfig = async (
  linter: Linter,
  quiet = false
): Promise<void> => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for stale linter configuration...");
  }

  const filesToRemove = new Set<string>();

  if (linter !== "biome") {
    for (const file of biomeConfigNames) {
      filesToRemove.add(file);
    }
  }

  if (linter !== "eslint") {
    for (const file of eslintConfigNames) {
      filesToRemove.add(file);
    }
    for (const file of prettierConfigNames) {
      filesToRemove.add(file);
    }
    for (const file of stylelintConfigNames) {
      filesToRemove.add(file);
    }
  }

  // Legacy (pre-flat) ESLint configs are always removed: Ultracite's ESLint
  // setup writes a flat config, and a leftover .eslintrc would conflict with it
  // even when ESLint remains the selected linter.
  for (const file of legacyEslintConfigNames) {
    filesToRemove.add(file);
  }

  if (linter !== "oxlint") {
    for (const file of oxlintConfigNames) {
      filesToRemove.add(file);
    }
    for (const file of oxfmtConfigNames) {
      filesToRemove.add(file);
    }
  }

  // Removing stale config files and pruning package.json touch different
  // files, so run them together instead of one after the other.
  const [removedFiles, prunedPackageJson] = await Promise.all([
    Promise.all([...filesToRemove].map((file) => removeProjectFile(file))),
    prunePackageJsonForLinter(linter),
  ]);
  const changed = removedFiles.some(Boolean) || prunedPackageJson;

  if (!quiet) {
    s.stop(
      changed
        ? "Stale linter configuration migrated."
        : "No stale linter configuration found."
    );
  }
};

export const installDependencies = async (
  packageManager: PackageManager,
  linter: Linter = "biome",
  install = true,
  quiet = false,
  typeAware = false,
  frameworks: Frameworks[] = ["react"]
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Installing dependencies...");
  }

  const packages: string[] = [`ultracite@${ultraciteVersion}`];

  // Add linter-specific dependencies
  if (linter === "biome") {
    packages.push(`@biomejs/biome@${schemaVersion}`);
  }
  if (linter === "eslint") {
    packages.push(
      ...Object.entries(buildEslintDevDependencies(frameworks)).map(
        ([name, version]) => `${name}@${version}`
      )
    );
  }
  if (linter === "oxlint") {
    packages.push(
      "oxlint@latest",
      // Oxlint is only a linter, so we need oxfmt for formatting
      "oxfmt@latest",
      // Framework configs pull in the React Doctor oxlint plugin
      ...Object.entries(buildOxlintFrameworkDevDependencies(frameworks)).map(
        ([name, version]) => `${name}@${version}`
      )
    );
    // Type-aware linting requires oxlint-tsgolint
    if (typeAware) {
      packages.push("oxlint-tsgolint@latest");
    }
  }

  const scripts = {
    check: "ultracite check",
    fix: "ultracite fix",
  };

  if (install) {
    await addDevDependency(packages, {
      corepack: false,
      packageManager,
      silent: true,
      // npm's `--workspaces` installs in every workspace package — for a root
      // dev dependency we want the default (no flag), so the npm root install
      // doesn't fail with "No workspaces found!" when patterns match nothing.
      workspace: isMonorepo() && packageManager.name !== "npm",
    });
    // Add ultracite scripts to package.json
    await updatePackageJson({ scripts });
  } else {
    const devDependencies = buildNoInstallDevDependencies(
      linter,
      typeAware,
      frameworks
    );
    // Batch devDependencies and scripts into a single read/write
    await updatePackageJson({ devDependencies, scripts });
  }

  if (!quiet) {
    s.stop("Dependencies installed.");
  }
};

export const upsertTsConfig = async (quiet = false) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for tsconfig.json files...");
  }

  if (await tsconfig.exists()) {
    if (!quiet) {
      s.message("Found tsconfig.json files, updating with strictNullChecks...");
    }
    await tsconfig.update();
    if (!quiet) {
      s.stop("tsconfig.json files updated.");
    }
    return;
  }

  if (!quiet) {
    s.stop("No tsconfig.json files found, skipping.");
  }
};

export const upsertEditorConfig = async (
  editorId: string,
  linter: Linter = "biome",
  quiet = false
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Editor configuration requires multiple conditional paths
) => {
  const editor = editors.find((e) => e.id === editorId);

  if (!editor) {
    throw new Error(`Editor "${editorId}" not found`);
  }

  const editorConfig = createEditorConfig(editorId, linter);
  const s = spinner();

  if (!quiet) {
    s.start(`Checking for ${editor.config.path}...`);
  }

  if (await editorConfig.exists()) {
    if (!quiet) {
      s.message(`${editor.config.path} found, updating...`);
    }
    await editorConfig.update();
    if (!quiet) {
      s.stop(`${editor.config.path} updated.`);
    }
    return;
  }

  if (!quiet) {
    s.message(`${editor.config.path} not found, creating...`);
  }
  // oxlint-disable-next-line react-doctor/async-defer-await -- create() is a required side effect that must complete before the extension-install branches below
  await editorConfig.create();

  // Install extension for VS Code-based editors
  if (editorConfig.extension) {
    const linterExtension = providers.find(
      (provider) => provider.id === linter
    )?.vscodeExtensionId;

    if (!linterExtension) {
      throw new Error(`Linter extension not found for ${linter}`);
    }

    if (!quiet) {
      s.message(`Installing ${linterExtension} extension...`);
    }

    try {
      const result = editorConfig.extension(linterExtension);
      if (result.status === 0) {
        if (!quiet) {
          s.stop(
            `${editor.config.path} created and ${linterExtension} extension installed.`
          );
        }
        return;
      }
    } catch {
      // Fall through to manual install message
    }

    if (!quiet) {
      s.stop(
        `${editor.config.path} created. Install ${linterExtension} extension manually.`
      );
    }
    return;
  }

  // Non-VS Code editors (like Zed)
  if (!quiet) {
    if (editorId === "zed") {
      s.stop(
        `${editor.config.path} created. Install the Biome extension: https://biomejs.dev/reference/zed/`
      );
    } else {
      s.stop(`${editor.config.path} created.`);
    }
  }
};

export const upsertBiomeConfig = async (
  frameworks?: (typeof options.frameworks)[number][],
  quiet = false,
  typeAware = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for Biome configuration...");
  }

  if (await biome.exists()) {
    if (!quiet) {
      s.message("Biome configuration found, updating...");
    }
    await biome.update({ frameworks, typeAware });
    if (!quiet) {
      s.stop("Biome configuration updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("Biome configuration not found, creating...");
  }
  await biome.create({ frameworks, typeAware });
  if (!quiet) {
    s.stop("Biome configuration created.");
  }
};

export const upsertEslintConfig = async (
  frameworks?: (typeof options.frameworks)[number][],
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for ESLint configuration...");
  }

  if (await eslint.exists()) {
    if (!quiet) {
      s.message("ESLint configuration found, updating...");
    }
    await eslint.update({ frameworks });
    if (!quiet) {
      s.stop("ESLint configuration updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("ESLint configuration not found, creating...");
  }
  await eslint.create({ frameworks });
  if (!quiet) {
    s.stop("ESLint configuration created.");
  }
};

export const upsertOxlintConfig = async (
  frameworks?: (typeof options.frameworks)[number][],
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for Oxlint configuration...");
  }

  if (await oxlint.exists()) {
    if (!quiet) {
      s.message("Oxlint configuration found, updating...");
    }
    await oxlint.update({ frameworks });
    if (!quiet) {
      s.stop("Oxlint configuration updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("Oxlint configuration not found, creating...");
  }
  await oxlint.create({ frameworks });
  if (!quiet) {
    s.stop("Oxlint configuration created.");
  }
};

export const upsertPrettierConfig = async (
  frameworks?: (typeof options.frameworks)[number][],
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for Prettier configuration...");
  }

  if (await prettier.exists()) {
    if (!quiet) {
      s.message("Prettier configuration found, updating...");
    }
    await prettier.update({ frameworks });
    if (!quiet) {
      s.stop("Prettier configuration updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("Prettier configuration not found, creating...");
  }
  await prettier.create({ frameworks });
  if (!quiet) {
    s.stop("Prettier configuration created.");
  }
};

export const upsertStylelintConfig = async (quiet = false) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for Stylelint configuration...");
  }

  if (await stylelint.exists()) {
    if (!quiet) {
      s.message("Stylelint configuration found, updating...");
    }
    await stylelint.update();
    if (!quiet) {
      s.stop("Stylelint configuration updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("Stylelint configuration not found, creating...");
  }
  await stylelint.create();
  if (!quiet) {
    s.stop("Stylelint configuration created.");
  }
};

export const upsertOxfmtConfig = async (quiet = false) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for oxfmt configuration...");
  }

  if (await oxfmt.exists()) {
    if (!quiet) {
      s.message("oxfmt configuration found, updating...");
    }
    await oxfmt.update();
    if (!quiet) {
      s.stop("oxfmt configuration updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("oxfmt configuration not found, creating...");
  }
  await oxfmt.create();
  if (!quiet) {
    s.stop("oxfmt configuration created.");
  }
};

export const initializePrecommitHook = async (
  packageManager: PackageManager,
  install = true,
  quiet = false,
  useLintStaged = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Initializing pre-commit hooks...");
    s.message("Installing Husky...");
  }

  await (install
    ? husky.install(packageManager)
    : updatePackageJson({
        devDependencies: { husky: "latest" },
        scripts: { prepare: "husky" },
      }));

  if (!quiet) {
    s.message("Initializing Husky...");
  }
  husky.init(packageManager.name);

  if (await husky.exists()) {
    if (!quiet) {
      s.message("Pre-commit hook found, updating...");
    }
    await husky.update(packageManager.name, useLintStaged);
    if (!quiet) {
      s.stop("Pre-commit hook updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("Pre-commit hook not found, creating...");
  }
  await husky.create(packageManager.name, useLintStaged);
  if (!quiet) {
    s.stop("Pre-commit hook created.");
  }
};

export const initializeLefthook = async (
  packageManager: PackageManager,
  install = true,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Initializing lefthook...");
    s.message("Installing lefthook...");
  }

  // oxlint-disable-next-line react-doctor/async-defer-await -- installing the tool is a required side effect that must run before the config exists()/update guard below
  await (install
    ? lefthook.install(packageManager)
    : updatePackageJson({
        devDependencies: { lefthook: "latest" },
      }));

  if (await lefthook.exists()) {
    if (!quiet) {
      s.message("lefthook.yml found, updating...");
    }
    await lefthook.update(packageManager.name);
    if (!quiet) {
      s.stop("lefthook.yml updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("lefthook.yml not found, creating...");
  }
  await lefthook.create(packageManager.name);
  if (!quiet) {
    s.stop("lefthook.yml created.");
  }
};

export const initializeLintStaged = async (
  packageManager: PackageManager,
  install = true,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Initializing lint-staged...");
    s.message("Installing lint-staged...");
  }

  // oxlint-disable-next-line react-doctor/async-defer-await -- installing the tool is a required side effect that must run before the config exists()/update guard below
  await (install
    ? lintStaged.install(packageManager)
    : updatePackageJson({
        devDependencies: { "lint-staged": "latest" },
      }));

  if (await lintStaged.exists()) {
    if (!quiet) {
      s.message("lint-staged found, updating...");
    }
    await lintStaged.update(packageManager.name);
    if (!quiet) {
      s.stop("lint-staged updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("lint-staged not found, creating...");
  }
  await lintStaged.create(packageManager.name);
  if (!quiet) {
    s.stop("lint-staged created.");
  }
};

export const initializePreCommit = async (
  packageManager: PackageManagerName,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Initializing pre-commit...");
  }

  if (await preCommit.exists()) {
    if (!quiet) {
      s.message(".pre-commit-config.yaml found, updating...");
    }
    await preCommit.update(packageManager);
    if (!quiet) {
      s.stop(".pre-commit-config.yaml updated.");
    }
    return;
  }

  if (!quiet) {
    s.message(".pre-commit-config.yaml not found, creating...");
  }
  await preCommit.create(packageManager);
  if (!quiet) {
    s.stop(".pre-commit-config.yaml created.");
  }
};

export const upsertAgents = async (
  name: (typeof options.agents)[number],
  displayName: string,
  packageManager: PackageManagerName,
  linter: (typeof options.linters)[number],
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start(`Checking for ${displayName}...`);
  }

  const agents = createAgents(name, packageManager, linter);

  if (await agents.exists()) {
    if (!quiet) {
      s.message(`${displayName} found, updating...`);
    }
    await agents.update();
    if (!quiet) {
      s.stop(`${displayName} updated.`);
    }
    return;
  }

  if (!quiet) {
    s.message(`${displayName} not found, creating...`);
  }
  await agents.create();
  if (!quiet) {
    s.stop(`${displayName} created.`);
  }
};

export const upsertAgentFile = async (
  target: AgentFileTarget,
  packageManager: PackageManagerName,
  linter: (typeof options.linters)[number],
  quiet = false
) => {
  const agentLabel = `${target.displayName} (${target.path})`;

  await upsertAgents(
    target.representativeAgentId,
    agentLabel,
    packageManager,
    linter,
    quiet
  );
};

export const upsertEditorFile = async (
  target: EditorFileTarget,
  linter: Linter = "biome",
  quiet = false
) => {
  await upsertEditorConfig(target.representativeEditorId, linter, quiet);
};

export const upsertHooks = async (
  name: (typeof options.hooks)[number],
  packageManager: PackageManagerName,
  linter: Linter = "biome",
  quiet = false
) => {
  const s = spinner();

  const displayName =
    hookIntegrations.find((hook) => hook.id === name)?.name ?? name;

  if (!quiet) {
    s.start(`Checking for ${displayName} hooks...`);
  }

  const hooks = createHooks(name, packageManager, linter);

  if (await hooks.exists()) {
    if (!quiet) {
      s.message(`${displayName} hooks found, updating...`);
    }
    await hooks.update();
    if (!quiet) {
      s.stop(`${displayName} hooks updated.`);
    }
    return;
  }

  if (!quiet) {
    s.message(`${displayName} hooks not found, creating...`);
  }
  await hooks.create();
  if (!quiet) {
    s.stop(`${displayName} hooks created.`);
  }
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: "will fix later"
export const initialize = async (flags?: InitializeFlags) => {
  const opts = flags ?? {};
  const quiet = opts.quiet ?? false;

  if (!quiet) {
    intro(`Ultracite v${ultraciteVersion} Initialization`);
  }

  try {
    let pm: PackageManagerName;
    let pmInfo: PackageManager;

    if (opts.pm) {
      pm = assertSupportedPackageManagerName(opts.pm);
      pmInfo = { command: pm, name: pm };
    } else {
      const detected = await detectPackageManager(process.cwd());

      if (!detected) {
        throw new Error("No package manager specified or detected");
      }

      if (!quiet && detected.warnings) {
        for (const warning of detected.warnings) {
          log.warn(warning);
        }
      }

      if (!quiet) {
        log.info(`Detected lockfile, using ${detected.name}`);
      }
      pmInfo = normalizePackageManager(detected);
      pm = pmInfo.name;
    }

    let { linter } = opts;
    if (linter === undefined) {
      // If quiet mode or other CLI options are provided, default to biome only
      const hasOtherCliOptions =
        quiet ||
        opts.pm ||
        opts.editors ||
        opts.agents ||
        opts.hooks ||
        opts.integrations !== undefined ||
        opts.frameworks !== undefined;

      if (hasOtherCliOptions) {
        linter = "biome";
      } else {
        const linterResult = await select({
          message: "Which linter do you want to use?",
          options: [
            {
              label: "Biome (Recommended)",
              value: "biome",
            },
            {
              label: "ESLint + Prettier + Stylelint",
              value: "eslint",
            },
            {
              label: "Oxlint + Oxfmt",
              value: "oxlint",
            },
          ],
        });

        if (isCancel(linterResult)) {
          cancel(OPERATION_CANCELLED);
          return;
        }

        linter = linterResult as Linter;
      }
    }

    let { frameworks } = opts;
    if (frameworks === undefined) {
      // If quiet mode or other CLI options are provided, default to empty array to avoid prompting
      // This allows programmatic usage without interactive prompts
      const hasOtherCliOptions =
        quiet ||
        opts.pm ||
        opts.editors ||
        opts.agents ||
        opts.hooks ||
        opts.integrations !== undefined;

      if (hasOtherCliOptions) {
        frameworks = [];
      } else {
        const detected = await detectFrameworks();
        const frameworksResult = await multiselect({
          initialValues: detected,
          message: "Which frameworks are you using (optional)?",
          options: [
            { label: "React", value: "react" },
            { label: "Next.js", value: "next" },
            { label: "Solid", value: "solid" },
            { label: "Vue", value: "vue" },
            { label: "Svelte", value: "svelte" },
            { label: "Qwik", value: "qwik" },
            { label: "Angular", value: "angular" },
            {
              label: "Remix / React Router (file-route conventions)",
              value: "remix",
            },
            {
              label: "TanStack (Query, Router, Start)",
              value: "tanstack",
            },
            { label: "Astro", value: "astro" },
            { label: "NestJS", value: "nestjs" },
            { label: "Jest", value: "jest" },
            { label: "Vitest / Bun", value: "vitest" },
          ],
          required: false,
        });

        if (isCancel(frameworksResult)) {
          cancel(OPERATION_CANCELLED);
          return;
        }

        frameworks = frameworksResult as (typeof options.frameworks)[number][];
      }
    }

    let editorConfig = opts.editors;
    let selectedEditorFiles: EditorFileTarget[] = [];
    const editorFileTargets = getEditorFileTargets();
    const universalEditorTarget = editorFileTargets.find(
      (target) => target.id === "universal"
    );

    if (!editorConfig) {
      // Quiet mode defaults to no editor config
      if (!quiet) {
        const editorConfigResult = await multiselect({
          message: "Which editors do you want to configure (recommended)?",
          options: editorFileTargets.map((target) => ({
            label: target.promptLabel,
            value: target.id,
          })),
          required: false,
        });

        if (isCancel(editorConfigResult)) {
          cancel(OPERATION_CANCELLED);
          return;
        }

        selectedEditorFiles = editorFileTargets.filter((target) =>
          (editorConfigResult as EditorFileTarget["id"][]).includes(target.id)
        );
      }
      editorConfig = [];
    } else if (editorConfig.includes("universal") && universalEditorTarget) {
      selectedEditorFiles = [universalEditorTarget];
      const coveredEditorIds = new Set(universalEditorTarget.editorIds);

      editorConfig = editorConfig.filter(
        (
          editor
        ): editor is Exclude<EditorSelection, "universal"> &
          (typeof options.editorConfigs)[number] =>
          editor !== "universal" && !coveredEditorIds.has(editor)
      );
    }

    let { agents } = opts;
    let selectedAgentFiles: AgentFileTarget[] = [];
    let { hooks } = opts;
    const agentFileTargets = getAgentFileTargets();
    const universalAgentTarget = agentFileTargets.find(
      (target) => target.id === "universal"
    );

    // Build agent options from shared data
    const agentsOptions = Object.fromEntries(
      agentsData.map((agent) => [agent.id, agent.name])
    ) as Record<(typeof options.agents)[number], string>;

    if (!agents) {
      if (quiet) {
        // In quiet mode, default to no agents
        agents = [];
      } else {
        const agentsResult = await multiselect({
          message: "Which agent files do you want to add (optional)?",
          options: agentFileTargets.map((target) => ({
            label: target.promptLabel,
            value: target.id,
          })),
          required: false,
        });

        if (isCancel(agentsResult)) {
          cancel(OPERATION_CANCELLED);
          return;
        }

        selectedAgentFiles = agentFileTargets.filter((target) =>
          (agentsResult as AgentFileTarget["id"][]).includes(target.id)
        );
      }
    } else if (agents.includes("universal") && universalAgentTarget) {
      selectedAgentFiles = [universalAgentTarget];
      const coveredAgentIds = new Set(universalAgentTarget.agentIds);

      agents = agents.filter(
        (
          agent
        ): agent is Exclude<AgentSelection, "universal"> &
          (typeof options.agents)[number] =>
          agent !== "universal" && !coveredAgentIds.has(agent)
      );
    }

    // Build hooks options from supported hook integrations
    const hooksOptions = Object.fromEntries(
      hookIntegrations.map((hook) => [hook.id, hook.name])
    ) as Record<(typeof options.hooks)[number], string>;

    if (!hooks) {
      if (quiet) {
        // In quiet mode, default to no hooks
        hooks = [];
      } else {
        const hooksResult = await multiselect({
          message: "Which agent hooks do you want to enable (optional)?",
          options: Object.entries(hooksOptions).map(([value, label]) => ({
            label,
            value,
          })),
          required: false,
        });

        if (isCancel(hooksResult)) {
          cancel(OPERATION_CANCELLED);
          return;
        }

        hooks = hooksResult as (typeof options.hooks)[number][];
      }
    }

    let { integrations } = opts;
    if (integrations === undefined) {
      // If quiet mode or other CLI options are provided, default to empty array to avoid prompting
      // This allows programmatic usage without interactive prompts
      const hasOtherCliOptions =
        quiet || opts.pm || opts.editors || opts.agents || opts.hooks;

      if (hasOtherCliOptions) {
        integrations = [];
      } else {
        const integrationsResult = await multiselect({
          message: "Would you like any of the following (optional)?",
          options: [
            { label: "Husky pre-commit hook", value: "husky" },
            { label: "Lefthook pre-commit hook", value: "lefthook" },
            { label: "Lint-staged", value: LINT_STAGED },
            { label: "pre-commit (Python framework)", value: "pre-commit" },
          ],
          required: false,
        });

        if (isCancel(integrationsResult)) {
          cancel(OPERATION_CANCELLED);
          return;
        }

        integrations = integrationsResult;
      }
    }

    /* oxlint-disable react-doctor/async-parallel -- these steps read-modify-write
       the shared package.json and emit ordered installer progress, so they must
       run sequentially; parallelizing would race on package.json and scramble output */
    await installDependencies(
      pmInfo,
      linter,
      !opts.skipInstall,
      quiet,
      opts["type-aware"],
      frameworks
    );

    await upsertTsConfig(quiet);
    await migrateLinterConfig(linter, quiet);

    // Create config for selected linter
    if (linter === "biome") {
      await upsertBiomeConfig(frameworks, quiet, opts["type-aware"]);
    }
    if (linter === "eslint") {
      await upsertEslintConfig(frameworks, quiet);
      // ESLint is only a linter, so we need Prettier for formatting and Stylelint for CSS
      await upsertPrettierConfig(frameworks, quiet);
      await upsertStylelintConfig(quiet);
    }
    if (linter === "oxlint") {
      // Oxlint + Oxfmt config files use ESM imports, so ensure "type": "module" is set
      await updatePackageJson({ type: "module" });
      await upsertOxlintConfig(frameworks, quiet);
      // Oxlint is only a linter, so we need oxfmt for formatting
      await upsertOxfmtConfig(quiet);
    }

    await Promise.all(
      selectedEditorFiles.map((target) =>
        upsertEditorFile(target, linter, quiet)
      )
    );

    await Promise.all(
      (editorConfig ?? []).map((editorId) =>
        upsertEditorConfig(editorId, linter, quiet)
      )
    );

    await Promise.all(
      selectedAgentFiles.map((target) =>
        upsertAgentFile(target, pm, linter, quiet)
      )
    );

    await Promise.all(
      (agents ?? []).map((ruleName) =>
        upsertAgents(ruleName, agentsOptions[ruleName], pm, linter, quiet)
      )
    );

    await Promise.all(
      (hooks ?? []).map((hookName) => upsertHooks(hookName, pm, linter, quiet))
    );
    /* oxlint-enable react-doctor/async-parallel */

    if (integrations?.includes("husky")) {
      const useLintStaged = integrations?.includes(LINT_STAGED) ?? false;
      await initializePrecommitHook(
        pmInfo,
        !opts.skipInstall,
        quiet,
        useLintStaged
      );
    }
    if (integrations?.includes("lefthook")) {
      await initializeLefthook(pmInfo, !opts.skipInstall, quiet);
    }
    if (integrations?.includes(LINT_STAGED)) {
      await initializeLintStaged(pmInfo, !opts.skipInstall, quiet);
    }
    if (integrations?.includes("pre-commit")) {
      await initializePreCommit(pm, quiet);
    }

    if (!quiet) {
      log.success("Successfully initialized Ultracite!");
    }

    const hasUltraciteSkill = await maybeInstallUltraciteSkill({
      packageManager: pm,
      quiet,
      shouldInstall: opts.installSkill,
    });

    if (!quiet && !hasUltraciteSkill) {
      log.info(
        `You can install the Ultracite skill later with \`${getUltraciteSkillInstallCommand(pm)}\`.`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!quiet) {
      log.error(`Failed to initialize Ultracite configuration: ${message}`);
    }
    throw error;
  }
};
