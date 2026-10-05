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
import { UltraciteSetupError } from "./config-resolution";
import { agents as agentsData } from "./data/agents";
import { editors } from "./data/editors";
import { hooks as hookIntegrations } from "./data/hooks";
import { options } from "./data/options";
import { providers } from "./data/providers";
import {
  assertOxlintJsPlugin,
  asDependencyVersionMap,
  biomeVersion,
  buildEslintDevDependencies,
  dependencyNamesByLinter,
  isOxlintNpmJsPlugin,
  OXLINT_JS_PLUGIN_DEV_DEPENDENCIES,
  oxlintJsPlugins,
} from "./dependencies";
import type { OxlintJsPlugin } from "./dependencies";
import { createEditorConfig } from "./editor-config";
import { getEditorFileTargets } from "./editors";
import type { EditorFileTarget } from "./editors";
import { createHooks } from "./hooks";
import { husky } from "./integrations/husky";
import { lefthook } from "./integrations/lefthook";
import { lintStaged } from "./integrations/lint-staged";
import { preCommit } from "./integrations/pre-commit";
import { chainScript } from "./integrations/project-command";
import { biome } from "./linters/biome";
import { eslint } from "./linters/eslint";
import { oxfmt } from "./linters/oxfmt";
import { oxlint } from "./linters/oxlint";
import { prettier } from "./linters/prettier";
import { stylelint } from "./linters/stylelint";
import {
  getRootInstallOptions,
  normalizePackageManager,
  resolveRequestedPackageManager,
  supportedPackageManagers,
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
  detectLinter,
  eslintConfigNames,
  editPackageJson,
  exists,
  isJsonObject,
  legacyEslintConfigNames,
  oxfmtConfigNames,
  oxlintConfigNames,
  prettierConfigNames,
  stylelintConfigNames,
  updatePackageJson,
} from "./utils";
import { parseWorkspaceFrameworks } from "./workspace-frameworks";
import type { WorkspaceFrameworks } from "./workspace-frameworks";

const ultraciteVersion = packageJson.version;

const OPERATION_CANCELLED = "Operation cancelled.";
const HUSKY_PREPARE_RE = /\bhusky\b/u;
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
  "js-plugins"?: OxlintJsPlugin[];
  linter?: Linter;
  pm?: string;
  quiet?: boolean;
  skipInstall?: boolean;
  "type-aware"?: boolean;
  "workspace-framework"?: string[];
}

// @clack/core 1.5 narrowed isCancel's predicate from `symbol` to
// `typeof CANCEL_SYMBOL`, which no longer strips the `symbol` half off a
// prompt's `T | symbol` result. Prompts only ever resolve to that one symbol,
// so a `symbol` predicate stays truthful and restores the narrowing.
const isCancelled = (value: unknown): value is symbol => isCancel(value);

const UNIVERSAL = "universal";

const quoteValues = (values: readonly string[]): string =>
  values.map((value) => `"${value}"`).join(", ");

// Commander hands flag values through as raw strings, so each one is checked
// against its allowed list before init touches the project: an unknown
// --linter used to fall through to the migration step, which deletes every
// linter config that doesn't belong to the chosen linter.
const assertAllowedValues = (
  flag: string,
  values: readonly string[] | string | undefined,
  allowed: readonly string[]
): void => {
  if (values === undefined) {
    return;
  }

  const invalid = [values].flat().filter((value) => !allowed.includes(value));

  if (invalid.length === 0) {
    return;
  }

  throw new UltraciteSetupError(
    `Unknown ${flag} ${invalid.length === 1 ? "value" : "values"} ${quoteValues(invalid)}. Valid values: ${allowed.join(", ")}.`
  );
};

// The list-valued and linter flags as Commander hands them over: raw strings
// that haven't been checked against the option tables yet.
interface RawInitializeFlags {
  agents?: readonly string[];
  editors?: readonly string[];
  frameworks?: readonly string[];
  hooks?: readonly string[];
  integrations?: readonly string[];
  "js-plugins"?: readonly string[];
  linter?: string;
  pm?: string;
}

export const validateInitializeFlags = (flags: RawInitializeFlags): void => {
  assertAllowedValues("--linter", flags.linter, options.linters);
  assertAllowedValues("--pm", flags.pm, supportedPackageManagers);
  assertAllowedValues("--frameworks", flags.frameworks, options.frameworks);
  assertAllowedValues("--editors", flags.editors, [
    UNIVERSAL,
    ...options.editorConfigs,
  ]);
  assertAllowedValues("--agents", flags.agents, [UNIVERSAL, ...options.agents]);
  assertAllowedValues("--hooks", flags.hooks, options.hooks);
  assertAllowedValues(
    "--integrations",
    flags.integrations,
    options.integrations
  );
  assertAllowedValues("--js-plugins", flags["js-plugins"], oxlintJsPlugins);
};

// Prompt hints for the JS plugins that need a word of explanation.
const oxlintJsPluginHints: Partial<Record<OxlintJsPlugin, string>> = {
  "@shadcn/lint": "design-system rules for Tailwind v4 components",
  "anti-slop": "vendored opinionated preset, nothing to install",
  "eslint-plugin-jsdoc": "require docs for public TypeScript APIs",
  "eslint-plugin-tsdoc": "validate TSDoc syntax in TypeScript comments",
};

const buildNoInstallDevDependencies = (
  linter: Linter,
  typeAware: boolean,
  frameworks: Frameworks[],
  jsPlugins: OxlintJsPlugin[] = []
) => {
  const devDependencies = asDependencyVersionMap({
    ultracite: ultraciteVersion,
  });

  if (linter === "biome") {
    devDependencies["@biomejs/biome"] = biomeVersion;
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
    for (const jsPlugin of jsPlugins) {
      if (isOxlintNpmJsPlugin(jsPlugin)) {
        devDependencies[jsPlugin] = OXLINT_JS_PLUGIN_DEV_DEPENDENCIES[jsPlugin];
      }
    }
  }

  return devDependencies;
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
  // storybook is only in the eslint set as a required peer of
  // eslint-plugin-storybook, but it's a user-facing tool the project may use
  // independently of linting — never prune it.
  dependencyNamesToRemove.delete("storybook");

  return await editPackageJson((manifest) => {
    let changed = false;

    // Only devDependencies are pruned: a package in dependencies or
    // peerDependencies (prettier used at runtime, eslint as the peer of a
    // published plugin) is there for a reason other than linting.
    const { devDependencies } = manifest;
    if (isJsonObject(devDependencies)) {
      const kept = Object.entries(devDependencies).filter(
        ([dependencyName]) => !dependencyNamesToRemove.has(dependencyName)
      );
      if (kept.length !== Object.keys(devDependencies).length) {
        manifest.devDependencies = Object.fromEntries(kept);
        changed = true;
      }
    }

    // Moving off ESLint + Prettier + Stylelint drops their package.json
    // configs too; staying on it, their writers update them instead.
    if (linter !== "eslint" && "prettier" in manifest) {
      delete manifest.prettier;
      changed = true;
    }
    if (linter !== "eslint" && "stylelint" in manifest) {
      delete manifest.stylelint;
      changed = true;
    }

    return changed;
  });
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

const ultraciteScripts = {
  check: "ultracite check",
  fix: "ultracite fix",
};

/**
 * The `check`/`fix` scripts to add. A project's own script with the same
 * name (e.g. `"check": "tsc --noEmit"`) is left alone, and so is one that
 * already runs Ultracite with extra flags.
 */
const getScriptsToAdd = async (
  quiet: boolean
): Promise<Record<string, string> | undefined> => {
  const existingPackageJson = await readPackageJson();
  const existingScripts = existingPackageJson?.scripts ?? {};
  const scripts: Record<string, string> = {};

  for (const [name, command] of Object.entries(ultraciteScripts)) {
    const existing = existingScripts[name];

    if (existing === undefined) {
      scripts[name] = command;
    } else if (!existing.includes("ultracite") && !quiet) {
      log.warn(
        `package.json already has a "${name}" script (\`${existing}\`), so it was left unchanged. Run \`${command}\` directly or add it to that script.`
      );
    }
  }

  return Object.keys(scripts).length > 0 ? scripts : undefined;
};

export const installDependencies = async (
  packageManager: PackageManager,
  linter: Linter = "biome",
  install = true,
  quiet = false,
  typeAware = false,
  frameworks: Frameworks[] = ["react"],
  jsPlugins: OxlintJsPlugin[] = []
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Installing dependencies...");
  }

  const packages: string[] = [`ultracite@${ultraciteVersion}`];

  // Add linter-specific dependencies
  if (linter === "biome") {
    packages.push(`@biomejs/biome@${biomeVersion}`);
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
      "oxfmt@latest"
    );
    // Type-aware linting requires oxlint-tsgolint
    if (typeAware) {
      packages.push("oxlint-tsgolint@latest");
    }
    packages.push(
      ...jsPlugins
        .filter(isOxlintNpmJsPlugin)
        .map(
          (jsPlugin) =>
            `${jsPlugin}@${OXLINT_JS_PLUGIN_DEV_DEPENDENCIES[jsPlugin]}`
        )
    );
  }

  const scripts = await getScriptsToAdd(quiet);

  if (install) {
    await addDevDependency(packages, {
      corepack: false,
      silent: true,
      ...getRootInstallOptions(packageManager),
    });
    // Add ultracite scripts to package.json
    if (scripts) {
      await updatePackageJson({ scripts });
    }
  } else {
    const devDependencies = buildNoInstallDevDependencies(
      linter,
      typeAware,
      frameworks,
      jsPlugins
    );
    // Batch devDependencies and scripts into a single read/write
    await updatePackageJson({ devDependencies, scripts });
  }

  if (!quiet) {
    s.stop(
      install
        ? "Dependencies installed."
        : "Dependencies added to package.json."
    );
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

// The ESLint toolchain formats with Prettier, and its VS Code settings make
// the Prettier extension the default formatter, so it's installed too.
const additionalVscodeExtensions: Partial<Record<Linter, string[]>> = {
  eslint: ["esbenp.prettier-vscode"],
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
  // create() is a required side effect that must complete before the extension-install branches below
  await editorConfig.create();

  // Install extension for VS Code-based editors
  if (editorConfig.extension) {
    const { extension } = editorConfig;
    const linterExtension = providers.find(
      (provider) => provider.id === linter
    )?.vscodeExtensionId;

    if (!linterExtension) {
      throw new Error(`Linter extension not found for ${linter}`);
    }

    const extensionIds = [
      linterExtension,
      ...(additionalVscodeExtensions[linter] ?? []),
    ];
    const extensionList = extensionIds.join(" and ");

    if (!quiet) {
      s.message(`Installing ${extensionList}...`);
    }

    const installed = extensionIds.every((extensionId) => {
      try {
        return extension(extensionId).status === 0;
      } catch {
        return false;
      }
    });

    if (!quiet) {
      s.stop(
        installed
          ? `${editor.config.path} created and ${extensionList} installed.`
          : `${editor.config.path} created. Install ${extensionList} manually.`
      );
    }
    return;
  }

  // Non-VS Code editors (like Zed)
  if (!quiet) {
    if (editorId === "zed" && linter === "biome") {
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
  quiet = false,
  jsPlugins: OxlintJsPlugin[] = []
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for Oxlint configuration...");
  }

  if (await oxlint.exists()) {
    if (!quiet) {
      s.message("Oxlint configuration found, updating...");
    }
    await oxlint.update({ frameworks, jsPlugins });
    if (!quiet) {
      s.stop("Oxlint configuration updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("Oxlint configuration not found, creating...");
  }
  await oxlint.create({ frameworks, jsPlugins });
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

const workspaceConfigWriters = { biome, eslint, oxlint } satisfies Record<
  Linter,
  {
    createWorkspace: (workspace: WorkspaceFrameworks) => Promise<string>;
    findWorkspaceConfig: (dir: string) => string | null;
  }
>;

// Nested configs for workspaces with frameworks of their own. Each extends
// the root config and adds the workspace's presets, so the editor extensions
// and the linters run directly see the same rules as `ultracite check`.
export const upsertWorkspaceConfigs = async (
  linter: Linter,
  workspaces: WorkspaceFrameworks[],
  quiet = false
) => {
  const writer = workspaceConfigWriters[linter];

  await Promise.all(
    workspaces.map(async (workspace) => {
      const existing = writer.findWorkspaceConfig(workspace.dir);

      if (existing) {
        const presets = workspace.frameworks.map(
          (framework) => `ultracite/${linter}/${framework}`
        );
        log.warn(
          `${existing} already exists, so it was left unchanged. Add ${presets.join(", ")} to it yourself.`
        );
        return;
      }

      const s = spinner();
      if (!quiet) {
        s.start(`Creating the ${workspace.dir} configuration...`);
      }
      const configPath = await writer.createWorkspace(workspace);
      if (!quiet) {
        s.stop(`${configPath} created.`);
      }
    })
  );
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

  if (install) {
    await husky.install(packageManager);
  } else {
    // Keep a prepare script the project already has (e.g. `svelte-kit
    // sync`), as husky.install does.
    const existingPackageJson = await readPackageJson();
    await updatePackageJson({
      devDependencies: { husky: "latest" },
      scripts: {
        prepare: chainScript(
          existingPackageJson?.scripts?.prepare,
          "husky",
          HUSKY_PREPARE_RE
        ),
      },
    });
  }

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

  // installing the tool is a required side effect that must run before the config exists()/update guard below
  await (install
    ? lefthook.install(packageManager)
    : updatePackageJson({
        devDependencies: { lefthook: "latest" },
      }));

  // Whichever lefthook config file name the project uses (lefthook.yml,
  // .lefthook.yaml, ...), or lefthook.yml when there is none yet.
  const configFile = lefthook.configPath();

  if (await lefthook.exists()) {
    if (!quiet) {
      s.message(`${configFile} found, updating...`);
    }
    await lefthook.update(packageManager.name);
    if (!quiet) {
      s.stop(`${configFile} updated.`);
    }
    return;
  }

  if (!quiet) {
    s.message(`${configFile} not found, creating...`);
  }
  await lefthook.create(packageManager.name);
  if (!quiet) {
    s.stop(`${configFile} created.`);
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

  // installing the tool is a required side effect that must run before the config exists()/update guard below
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

interface EditorSelections {
  editorConfig: EditorSelection[];
  selectedEditorFiles: EditorFileTarget[];
}

interface AgentSelections {
  agents: AgentSelection[] | undefined;
  agentsOptions: Record<string, string>;
  hooks: (typeof options.hooks)[number][] | undefined;
  selectedAgentFiles: AgentFileTarget[];
}

interface InitializeSelections extends EditorSelections, AgentSelections {
  frameworks: Frameworks[];
  integrations: (typeof options.integrations)[number][];
  jsPlugins: OxlintJsPlugin[];
  linter: Linter;
}

const resolvePackageManager = async (
  opts: InitializeFlags,
  quiet: boolean
): Promise<PackageManager> => {
  if (opts.pm) {
    return await resolveRequestedPackageManager(opts.pm);
  }

  const detected = await detectPackageManager(process.cwd());
  if (!detected) {
    throw new UltraciteSetupError(
      "No package manager detected. Pass one with `--pm` (e.g. `ultracite init --pm npm`)."
    );
  }

  if (!quiet && detected.warnings) {
    for (const warning of detected.warnings) {
      log.warn(warning);
    }
  }

  if (!quiet) {
    log.info(`Using ${detected.name} (detected from the project)`);
  }
  return normalizePackageManager(detected);
};

const selectLinter = async (
  opts: InitializeFlags,
  quiet: boolean
): Promise<Linter | undefined> => {
  if (opts.linter !== undefined) {
    return opts.linter;
  }

  // A project that already has a linter keeps it, so re-running init to add
  // agents or editors doesn't migrate the project to another linter.
  const defaultLinter = detectLinter() ?? "oxlint";
  // If quiet mode or other CLI options are provided, don't prompt
  const hasOtherCliOptions =
    quiet ||
    opts.pm ||
    opts.editors ||
    opts.agents ||
    opts.hooks ||
    opts.integrations !== undefined ||
    opts.frameworks !== undefined ||
    opts["workspace-framework"] !== undefined;

  if (hasOtherCliOptions) {
    return defaultLinter;
  }

  const linterResult = await select<Linter>({
    initialValue: defaultLinter,
    message: "Which linter do you want to use?",
    options: [
      { label: "Oxlint + Oxfmt (Recommended)", value: "oxlint" },
      { label: "Biome", value: "biome" },
      { label: "ESLint + Prettier + Stylelint", value: "eslint" },
    ],
  });

  if (isCancelled(linterResult)) {
    cancel(OPERATION_CANCELLED);
    return;
  }
  return linterResult;
};

const selectFrameworks = async (
  opts: InitializeFlags,
  quiet: boolean
): Promise<Frameworks[] | undefined> => {
  if (opts.frameworks !== undefined) {
    return opts.frameworks;
  }

  // If quiet mode or other CLI options are provided, default to empty array to avoid prompting
  // This allows programmatic usage without interactive prompts
  const hasOtherCliOptions =
    quiet ||
    opts.pm ||
    opts.editors ||
    opts.agents ||
    opts.hooks ||
    opts.integrations !== undefined ||
    opts["workspace-framework"] !== undefined;

  if (hasOtherCliOptions) {
    return [];
  }

  const detected = await detectFrameworks();
  const frameworksResult = await multiselect<Frameworks>({
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
      { label: "TanStack (Query, Router, Start)", value: "tanstack" },
      { label: "Astro", value: "astro" },
      { label: "NestJS", value: "nestjs" },
      { label: "Jest", value: "jest" },
      { label: "Vitest / Bun", value: "vitest" },
    ],
    required: false,
  });

  if (isCancelled(frameworksResult)) {
    cancel(OPERATION_CANCELLED);
    return;
  }
  return frameworksResult;
};

const selectJsPlugins = async (
  opts: InitializeFlags,
  linter: Linter,
  quiet: boolean
): Promise<OxlintJsPlugin[] | undefined> => {
  let jsPlugins = (opts["js-plugins"] ?? []).map(assertOxlintJsPlugin);
  if (linter !== "oxlint" || opts["js-plugins"] !== undefined) {
    return jsPlugins;
  }

  const hasOtherCliOptions =
    quiet ||
    opts.pm ||
    opts.editors ||
    opts.agents ||
    opts.hooks ||
    opts.integrations !== undefined ||
    opts.frameworks !== undefined ||
    opts["workspace-framework"] !== undefined;
  if (hasOtherCliOptions) {
    return jsPlugins;
  }

  const jsPluginsResult = await multiselect<OxlintJsPlugin>({
    message: "Which JS plugins would you like to add (optional)?",
    options: oxlintJsPlugins.map((jsPlugin) => ({
      hint: oxlintJsPluginHints[jsPlugin],
      label: jsPlugin,
      value: jsPlugin,
    })),
    required: false,
  });
  if (isCancelled(jsPluginsResult)) {
    cancel(OPERATION_CANCELLED);
    return;
  }

  jsPlugins = jsPluginsResult;
  return jsPlugins;
};

const selectEditorFiles = async (
  opts: InitializeFlags,
  quiet: boolean
): Promise<EditorSelections | undefined> => {
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

      if (isCancelled(editorConfigResult)) {
        cancel(OPERATION_CANCELLED);
        return;
      }

      selectedEditorFiles = editorFileTargets.filter((target) =>
        editorConfigResult.includes(target.id)
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

  return { editorConfig, selectedEditorFiles };
};

const selectAgentFilesAndHooks = async (
  opts: InitializeFlags,
  quiet: boolean
): Promise<AgentSelections | undefined> => {
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
  );

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

      if (isCancelled(agentsResult)) {
        cancel(OPERATION_CANCELLED);
        return;
      }

      selectedAgentFiles = agentFileTargets.filter((target) =>
        agentsResult.includes(target.id)
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
  );

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

      if (isCancelled(hooksResult)) {
        cancel(OPERATION_CANCELLED);
        return;
      }

      hooks = hooksResult;
    }
  }

  return { agents, agentsOptions, hooks, selectedAgentFiles };
};

const selectIntegrations = async (
  opts: InitializeFlags,
  quiet: boolean
): Promise<(typeof options.integrations)[number][] | undefined> => {
  if (opts.integrations !== undefined) {
    return opts.integrations;
  }

  // If quiet mode or other CLI options are provided, default to empty array to avoid prompting
  // This allows programmatic usage without interactive prompts
  const hasOtherCliOptions =
    quiet || opts.pm || opts.editors || opts.agents || opts.hooks;
  if (hasOtherCliOptions) {
    return [];
  }

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

  if (isCancelled(integrationsResult)) {
    cancel(OPERATION_CANCELLED);
    return;
  }
  return integrationsResult;
};

const selectInitializeOptions = async (
  opts: InitializeFlags,
  quiet: boolean
): Promise<InitializeSelections | undefined> => {
  const linter = await selectLinter(opts, quiet);
  if (!linter) {
    return;
  }

  const frameworks = await selectFrameworks(opts, quiet);
  if (!frameworks) {
    return;
  }

  const jsPlugins = await selectJsPlugins(opts, linter, quiet);
  if (!jsPlugins) {
    return;
  }

  const editorSelections = await selectEditorFiles(opts, quiet);
  if (!editorSelections) {
    return;
  }

  const agentSelections = await selectAgentFilesAndHooks(opts, quiet);
  if (!agentSelections) {
    return;
  }

  const integrations = await selectIntegrations(opts, quiet);
  if (!integrations) {
    return;
  }

  return {
    ...editorSelections,
    ...agentSelections,
    frameworks,
    integrations,
    jsPlugins,
    linter,
  };
};

interface InitializeContext {
  opts: InitializeFlags;
  pmInfo: PackageManager;
  quiet: boolean;
  selections: InitializeSelections;
  workspaces: WorkspaceFrameworks[];
}

const setupLinting = async ({
  opts,
  pmInfo,
  quiet,
  selections,
  workspaces,
}: InitializeContext): Promise<void> => {
  const { frameworks, jsPlugins, linter } = selections;
  const allFrameworks = [
    ...new Set([
      ...frameworks,
      ...workspaces.flatMap((workspace) => workspace.frameworks),
    ]),
  ];

  // These steps read-modify-write the shared package.json and emit ordered
  // installer progress, so they must run sequentially; parallelizing would
  // race on package.json and scramble output.
  await installDependencies(
    pmInfo,
    linter,
    !opts.skipInstall,
    quiet,
    opts["type-aware"],
    allFrameworks,
    jsPlugins
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
    // The Oxlint and oxfmt configs use ES module syntax. Init never changes
    // package.json's "type" to make them load, since that changes how
    // every .js file is loaded; outside an ES module package the configs
    // are written as .mts instead (see resolveEsmConfigPath).
    await upsertOxlintConfig(frameworks, quiet, jsPlugins);
    // Oxlint is only a linter, so we need oxfmt for formatting
    await upsertOxfmtConfig(quiet);
  }

  await upsertWorkspaceConfigs(linter, workspaces, quiet);
};

const setupSelectedFiles = async ({
  pmInfo,
  quiet,
  selections,
}: InitializeContext): Promise<void> => {
  const {
    agents,
    agentsOptions,
    hooks,
    linter,
    selectedAgentFiles,
    selectedEditorFiles,
  } = selections;
  const pm: PackageManagerName = pmInfo.name;

  await Promise.all(
    selectedEditorFiles.map((target) => upsertEditorFile(target, linter, quiet))
  );

  await Promise.all(
    selections.editorConfig.map((editorId) =>
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
};

const setupIntegrations = async ({
  opts,
  pmInfo,
  quiet,
  selections,
}: InitializeContext): Promise<void> => {
  const { integrations } = selections;
  const pm: PackageManagerName = pmInfo.name;

  if (integrations.includes("husky")) {
    const useLintStaged = integrations.includes(LINT_STAGED);
    await initializePrecommitHook(
      pmInfo,
      !opts.skipInstall,
      quiet,
      useLintStaged
    );
  }
  if (integrations.includes("lefthook")) {
    await initializeLefthook(pmInfo, !opts.skipInstall, quiet);
  }
  if (integrations.includes(LINT_STAGED)) {
    await initializeLintStaged(pmInfo, !opts.skipInstall, quiet);
  }
  if (integrations.includes("pre-commit")) {
    await initializePreCommit(pm, quiet);
  }
};

const setupProject = async (context: InitializeContext): Promise<void> => {
  await setupLinting(context);
  await setupSelectedFiles(context);
  await setupIntegrations(context);
};

const completeInitialization = async (
  pm: PackageManagerName,
  opts: InitializeFlags,
  quiet: boolean
): Promise<void> => {
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
};

export const initialize = async (flags?: InitializeFlags) => {
  const opts = flags ?? {};
  const quiet = opts.quiet ?? false;

  if (!quiet) {
    intro(`Ultracite v${ultraciteVersion} Initialization`);
  }

  try {
    validateInitializeFlags(opts);
    const workspaces = parseWorkspaceFrameworks(opts["workspace-framework"]);
    const pmInfo = await resolvePackageManager(opts, quiet);
    const selections = await selectInitializeOptions(opts, quiet);
    if (!selections) {
      return;
    }

    const context = { opts, pmInfo, quiet, selections, workspaces };
    await setupProject(context);
    await completeInitialization(pmInfo.name, opts, quiet);
  } catch (error) {
    // Setup errors are reported by the CLI entry point as a plain message.
    if (!quiet && !(error instanceof UltraciteSetupError)) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log.error(`Failed to initialize Ultracite configuration: ${message}`);
    }
    throw error;
  }
};
