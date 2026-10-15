import { readFileSync } from "node:fs";
import process from "node:process";

import {
  cancel,
  confirm,
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
import { AGENTS_FILE, getAgentChoices, writeAgentFiles } from "./agents";
import { UltraciteSetupError } from "./config-resolution";
import { agents as agentTable } from "./data/agents";
import { editors } from "./data/editors";
import { hooks as hookIntegrations } from "./data/hooks";
import { options } from "./data/options";
import { providers } from "./data/providers";
import {
  asDependencyVersionMap,
  biomeVersion,
  buildEslintDevDependencies,
  dependencyNamesByLinter,
  eslintPeerOverridesFor,
  isOxlintNpmJsPlugin,
  OXLINT_JS_PLUGIN_DEV_DEPENDENCIES,
  OXLINT_TOOLCHAIN_DEV_DEPENDENCIES,
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
  installFailedError,
  normalizePackageManager,
  resolveRequestedPackageManager,
  supportedPackageManagers,
} from "./package-manager";
import { readPackageJson } from "./schemas";
import {
  getUltraciteSkillInstallCommand,
  hasUltraciteSkillInstalled,
  installUltraciteSkill,
} from "./skill";
import { tsconfig } from "./tsconfig";
import type { TsConfigUpdate } from "./tsconfig";
import {
  addEslintPeerOverrides,
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
  /** Take the default for every question no flag answers, without asking. */
  yes?: boolean;
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

// Oxlint and Bun both run the Oxlint config, and so the JS plugins it loads.
const runsOxlintConfig = (linter: string): boolean =>
  linter === "oxlint" || linter === "bun";

// On any other linter --js-plugins would be left out without a word.
const assertJsPluginsMatchLinter = (
  linter: string | undefined,
  jsPlugins: readonly string[] | undefined
): void => {
  if (linter === undefined || runsOxlintConfig(linter) || !jsPlugins?.length) {
    return;
  }

  throw new UltraciteSetupError(
    `--js-plugins only works with Oxlint or Bun, but the linter is "${linter}". Pass --linter oxlint or --linter bun to use JS plugins.`
  );
};

interface RenamableTarget {
  aliases?: readonly string[];
  id: string;
}

// An ID from before a rename becomes the current one, with a note so the
// script that passed it can be updated.
const resolveRenamedIds = (
  flag: string,
  values: readonly string[] | undefined,
  targets: readonly RenamableTarget[]
): string[] | undefined =>
  values?.map((value) => {
    const renamed = targets.find((target) => target.aliases?.includes(value));

    if (!renamed) {
      return value;
    }

    log.warn(
      `${flag} "${value}" is now "${renamed.id}". Pass the new ID; the old one stops working in a future major.`
    );

    return renamed.id;
  });

const knownAgentIds = new Set<string>(options.agents);

// Every agent reads the rules from AGENTS.md, so an agent init doesn't know
// (retired, renamed or misspelled) gets that file instead of stopping init.
const resolveAgentIds = (
  values: readonly string[] | undefined
): string[] | undefined => {
  const resolved = resolveRenamedIds("--agents", values, agentTable);

  return resolved?.map((value) => {
    if (value === UNIVERSAL || knownAgentIds.has(value)) {
      return value;
    }

    log.warn(
      `Unknown --agents value "${value}", so the rules go in AGENTS.md, which most agents read. Valid values: ${[UNIVERSAL, ...options.agents].join(", ")}.`
    );

    return UNIVERSAL;
  });
};

export const normalizeInitializeFlags = (
  flags: InitializeFlags
): InitializeFlags => ({
  ...flags,
  agents: resolveAgentIds(flags.agents),
  editors: resolveRenamedIds("--editors", flags.editors, editors),
  hooks: resolveRenamedIds("--hooks", flags.hooks, hookIntegrations),
});

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
  assertJsPluginsMatchLinter(flags.linter, flags["js-plugins"]);
};

// Prompt hints for the JS plugins that need a word of explanation.
const oxlintJsPluginHints: Partial<Record<OxlintJsPlugin, string>> = {
  "@shadcn/lint": "design-system rules for Tailwind v4 components",
  "anti-slop": "vendored opinionated preset, nothing to install",
  "eslint-plugin-jsdoc": "require docs for public TypeScript APIs",
  "eslint-plugin-tsdoc": "validate TSDoc syntax in TypeScript comments",
};

interface OxlintToolchainOptions {
  jsPlugins: OxlintJsPlugin[];
  linter: Linter;
  typeAware: boolean;
  /** Editors are being set up, whose extensions run oxlint and oxfmt. */
  withEditors: boolean;
}

// The packages an Oxlint config needs. Bun runs the configs itself, so it
// only needs oxlint and oxfmt (and oxlint-tsgolint, for type-aware rules) for
// the editor extensions, but the JS plugins it loads from node_modules.
const oxlintToolchainDependencies = ({
  jsPlugins,
  linter,
  typeAware,
  withEditors,
}: OxlintToolchainOptions) => {
  if (!runsOxlintConfig(linter)) {
    return {};
  }

  const dependencies: Record<string, string> = {};

  if (linter === "oxlint" || withEditors) {
    dependencies.oxlint = OXLINT_TOOLCHAIN_DEV_DEPENDENCIES.oxlint;
    // Oxlint is only a linter, so we need oxfmt for formatting
    dependencies.oxfmt = OXLINT_TOOLCHAIN_DEV_DEPENDENCIES.oxfmt;

    // Type-aware linting requires oxlint-tsgolint
    if (typeAware) {
      dependencies["oxlint-tsgolint"] =
        OXLINT_TOOLCHAIN_DEV_DEPENDENCIES["oxlint-tsgolint"];
    }
  }

  for (const jsPlugin of jsPlugins) {
    if (isOxlintNpmJsPlugin(jsPlugin)) {
      dependencies[jsPlugin] = OXLINT_JS_PLUGIN_DEV_DEPENDENCIES[jsPlugin];
    }
  }

  return dependencies;
};

const buildNoInstallDevDependencies = (
  linter: Linter,
  typeAware: boolean,
  frameworks: Frameworks[],
  jsPlugins: OxlintJsPlugin[] = [],
  withEditors = false
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

  Object.assign(
    devDependencies,
    oxlintToolchainDependencies({ jsPlugins, linter, typeAware, withEditors })
  );

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

// The devDependencies of the linters other than `linter`, minus any the
// selected linter also needs.
const otherLinterDependencyNames = (linter: Linter): Set<string> => {
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

  return dependencyNamesToRemove;
};

// The package.json config keys moving off ESLint + Prettier + Stylelint
// removes.
const otherLinterPackageJsonKeys = (linter: Linter): string[] =>
  linter === "eslint" ? [] : ["prettier", "stylelint"];

const prunePackageJsonForLinter = async (linter: Linter): Promise<boolean> => {
  const packageJsonObject = await readPackageJson();

  if (!packageJsonObject) {
    return false;
  }

  const dependencyNamesToRemove = otherLinterDependencyNames(linter);

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
    // configs too (otherLinterPackageJsonKeys lists them); staying on it,
    // their writers update them instead.
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

/** The other linters' config files in the project root. */
const staleLinterConfigFiles = (linter: Linter): string[] => {
  const candidates: string[] = [];

  if (linter !== "biome") {
    candidates.push(...biomeConfigNames);
  }

  // ESLint 10 doesn't read legacy .eslintrc files, so they can't conflict
  // with an ESLint setup and are only removed when moving off ESLint.
  if (linter !== "eslint") {
    candidates.push(
      ...eslintConfigNames,
      ...legacyEslintConfigNames,
      ...prettierConfigNames,
      ...stylelintConfigNames
    );
  }

  // Bun reads the Oxlint and oxfmt configs, so switching between the two
  // keeps them; init rewrites their defineConfig import.
  if (!runsOxlintConfig(linter)) {
    candidates.push(...oxlintConfigNames, ...oxfmtConfigNames);
  }

  return candidates.filter((file) => exists(`./${file}`));
};

/**
 * Everything migrateLinterConfig would remove: the other linters' config
 * files, their devDependencies, and their package.json config keys.
 */
export const findStaleLinterSetup = async (
  linter: Linter
): Promise<string[]> => {
  const packageJsonObject = await readPackageJson();
  const devDependencies = Object.keys(packageJsonObject?.devDependencies ?? {});
  const dependencyNamesToRemove = otherLinterDependencyNames(linter);

  return [
    ...staleLinterConfigFiles(linter),
    ...devDependencies
      .filter((name) => dependencyNamesToRemove.has(name))
      .map((name) => `${name} (devDependencies)`),
    ...otherLinterPackageJsonKeys(linter)
      .filter(
        (key) => packageJsonObject !== undefined && key in packageJsonObject
      )
      .map((key) => `"${key}" in package.json`),
  ];
};

export const migrateLinterConfig = async (
  linter: Linter,
  quiet = false
): Promise<void> => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for stale linter configuration...");
  }

  // Removing stale config files and pruning package.json touch different
  // files, so run them together instead of one after the other.
  const [removedFiles, prunedPackageJson] = await Promise.all([
    Promise.all(
      staleLinterConfigFiles(linter).map((file) => removeProjectFile(file))
    ),
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
const getScriptsToAdd = async (): Promise<
  Record<string, string> | undefined
> => {
  const existingPackageJson = await readPackageJson();
  const existingScripts = existingPackageJson?.scripts ?? {};
  const scripts: Record<string, string> = {};

  for (const [name, command] of Object.entries(ultraciteScripts)) {
    const existing = existingScripts[name];

    if (existing === undefined) {
      scripts[name] = command;
    } else if (!existing.includes("ultracite")) {
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
  jsPlugins: OxlintJsPlugin[] = [],
  withEditors = false
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

  packages.push(
    ...Object.entries(
      oxlintToolchainDependencies({ jsPlugins, linter, typeAware, withEditors })
    ).map(([name, version]) => `${name}@${version}`)
  );

  const scripts = await getScriptsToAdd();

  // npm rejects plugins whose peer range hasn't caught up with ESLint 10,
  // now and on every later install, so the project overrides their peer.
  if (packageManager.name === "npm") {
    await addEslintPeerOverrides(eslintPeerOverridesFor(packages));
  }

  if (install) {
    try {
      await addDevDependency(packages, {
        corepack: false,
        silent: true,
        ...getRootInstallOptions(packageManager),
      });
    } catch (error) {
      if (!quiet) {
        s.error("Install failed.");
      }

      throw installFailedError(
        error instanceof Error ? error.message : String(error),
        packageManager,
        "ultracite init"
      );
    }

    // Add ultracite scripts to package.json
    if (scripts) {
      await updatePackageJson({ scripts });
    }
  } else {
    const devDependencies = buildNoInstallDevDependencies(
      linter,
      typeAware,
      frameworks,
      jsPlugins,
      withEditors
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

/**
 * Turn on strictNullChecks in the tsconfig files `tsconfig.plan()` found
 * without it. Only type-aware setups get here: the type-aware rules need it.
 */
export const upsertTsConfig = async (
  updates?: readonly TsConfigUpdate[],
  quiet = false
) => {
  const planned = updates ?? (await tsconfig.plan());

  if (planned.length === 0) {
    return;
  }

  const s = spinner();

  if (!quiet) {
    s.start("Turning on strictNullChecks for type-aware linting...");
  }

  await tsconfig.apply(planned);

  if (!quiet) {
    s.stop(
      `strictNullChecks turned on in ${planned.map((update) => update.filePath).join(", ")}.`
    );
  }
};

// The ESLint toolchain formats with Prettier, and its VS Code settings make
// the Prettier extension the default formatter, so it's installed too.
const additionalVscodeExtensions: Partial<Record<Linter, string[]>> = {
  eslint: ["esbenp.prettier-vscode"],
};

const zedExtensionHints: Partial<Record<Linter, string>> = {
  biome: "Biome extension: https://biomejs.dev/reference/zed/",
  bun: "Oxc extension: https://zed.dev/extensions/oxc",
  oxlint: "Oxc extension: https://zed.dev/extensions/oxc",
};

export const upsertEditorConfig = async (
  editorId: string,
  linter: Linter = "biome",
  quiet = false,
  // Whether the settings file was there before init started. Editors that
  // share one (VS Code and its forks) write it in turn, and each installs its
  // extension when init created the file, as the first one does.
  existedBefore?: boolean
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

  const fileExists = await editorConfig.exists();

  if (fileExists && (existedBefore ?? true)) {
    if (!quiet) {
      s.message(`${editor.config.path} found, updating...`);
    }

    await editorConfig.update();

    if (!quiet) {
      s.stop(`${editor.config.path} updated.`);
    }

    return;
  }

  if (fileExists) {
    // Another editor created it in this run; add this one's settings.
    await editorConfig.update();
  } else {
    if (!quiet) {
      s.message(`${editor.config.path} not found, creating...`);
    }

    // create() is a required side effect that must complete before the extension-install branches below
    await editorConfig.create();
  }

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
          : `${editor.config.path} created. Install ${extensionList} in ${editor.name} manually.`
      );
    }

    return;
  }

  // Zed: Oxlint, Oxfmt and Biome run through Zed extensions, which install
  // from Zed's own extensions view; ESLint and Prettier ship with Zed.
  if (!quiet) {
    const zedExtension = zedExtensionHints[linter];
    s.stop(
      editorId === "zed" && zedExtension
        ? `${editor.config.path} created. Install the ${zedExtension}`
        : `${editor.config.path} created.`
    );
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
  quiet = false,
  typeAware = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for ESLint configuration...");
  }

  if (await eslint.exists()) {
    if (!quiet) {
      s.message("ESLint configuration found, updating...");
    }

    await eslint.update({ frameworks, typeAware });

    if (!quiet) {
      s.stop("ESLint configuration updated.");
    }

    return;
  }

  if (!quiet) {
    s.message("ESLint configuration not found, creating...");
  }

  await eslint.create({ frameworks, typeAware });

  if (!quiet) {
    s.stop("ESLint configuration created.");
  }
};

export const upsertOxlintConfig = async (
  frameworks?: (typeof options.frameworks)[number][],
  quiet = false,
  jsPlugins: OxlintJsPlugin[] = [],
  typeAware = false,
  bun = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for Oxlint configuration...");
  }

  if (await oxlint.exists()) {
    if (!quiet) {
      s.message("Oxlint configuration found, updating...");
    }

    await oxlint.update({ bun, frameworks, jsPlugins, typeAware });

    if (!quiet) {
      s.stop("Oxlint configuration updated.");
    }

    return;
  }

  if (!quiet) {
    s.message("Oxlint configuration not found, creating...");
  }

  await oxlint.create({ bun, frameworks, jsPlugins, typeAware });

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

const workspaceConfigWriters = {
  biome,
  bun: {
    createWorkspace: (workspace: WorkspaceFrameworks) =>
      oxlint.createWorkspace(workspace, { bun: true }),
    findWorkspaceConfig: oxlint.findWorkspaceConfig,
  },
  eslint,
  oxlint,
} satisfies Record<
  Linter,
  {
    createWorkspace: (workspace: WorkspaceFrameworks) => Promise<string>;
    findWorkspaceConfig: (dir: string) => string | null;
  }
>;

// The presets a linter's configs extend: Bun uses Oxlint's.
const presetLinter = (linter: Linter): Exclude<Linter, "bun"> =>
  linter === "bun" ? "oxlint" : linter;

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
        // Oxlint and Bun share config files, so a workspace config kept on a
        // switch between them still gets the new provider's defineConfig.
        const retargeted =
          runsOxlintConfig(linter) &&
          (await oxlint.retargetWorkspaceConfig(existing, {
            bun: linter === "bun",
          }));

        const presets = workspace.frameworks.map(
          (framework) => `ultracite/${presetLinter(linter)}/${framework}`
        );

        log.warn(
          `${existing} already exists, so ${retargeted ? "only its defineConfig import was updated" : "it was left unchanged"}. Add ${presets.join(", ")} to it yourself.`
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

export const upsertOxfmtConfig = async (quiet = false, bun = false) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for oxfmt configuration...");
  }

  if (await oxfmt.exists()) {
    if (!quiet) {
      s.message("oxfmt configuration found, updating...");
    }

    await oxfmt.update({ bun });

    if (!quiet) {
      s.stop("oxfmt configuration updated.");
    }

    return;
  }

  if (!quiet) {
    s.message("oxfmt configuration not found, creating...");
  }

  await oxfmt.create({ bun });

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
  selection: readonly AgentSelection[],
  packageManager: PackageManagerName,
  linter: (typeof options.linters)[number],
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start(`Writing ${AGENTS_FILE}...`);
  }

  const { created, files, warnings } = await writeAgentFiles(
    selection,
    packageManager,
    linter
  );

  if (!quiet) {
    const also = files.length > 0 ? `, and updated ${files.join(", ")}` : "";
    s.stop(`${AGENTS_FILE} ${created ? "created" : "updated"}${also}.`);
  }

  // Printed in quiet runs too: each one names a file init skipped and what
  // to add to it by hand.
  for (const warning of warnings) {
    log.warn(warning);
  }
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
  editorConfig: (typeof options.editorConfigs)[number][];
  selectedEditorFiles: EditorFileTarget[];
}

interface AgentSelections {
  agents: AgentSelection[];
}

interface InitializeSelections extends EditorSelections, AgentSelections {
  frameworks: Frameworks[];
  hooks: (typeof options.hooks)[number][];
  integrations: (typeof options.integrations)[number][];
  jsPlugins: OxlintJsPlugin[];
  linter: Linter;
  typeAware: boolean;
}

// Changes to files init doesn't own, settled before anything is written.
interface ProjectChanges {
  /** Remove the other linters' configs and packages. */
  removeStaleSetup: boolean;
  /** The tsconfig files to turn strictNullChecks on in. */
  tsconfigUpdates: TsConfigUpdate[];
}

// Thrown when the user cancels a prompt, so initialize() stops before it
// changes anything without each prompt's caller checking for it.
class InitializeCancelledError extends Error {
  override readonly name = "InitializeCancelledError";
}

const cancelInitialize = (): InitializeCancelledError => {
  cancel(OPERATION_CANCELLED);

  return new InitializeCancelledError(OPERATION_CANCELLED);
};

// Passing any of these answers init's questions up front, so every question
// they leave out takes its default instead of prompting. That lets a
// scaffolding CLI run init without a TTY. --linter and --js-plugins don't
// count: they only settle the linter questions.
const nonInteractiveFlags = [
  "agents",
  "editors",
  "frameworks",
  "hooks",
  "integrations",
  "pm",
  "workspace-framework",
] as const satisfies readonly (keyof InitializeFlags)[];

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

  if (detected.warnings) {
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
  interactive: boolean
): Promise<Linter> => {
  if (opts.linter !== undefined) {
    return opts.linter;
  }

  // A project that already has a linter keeps it, so re-running init to add
  // agents or editors doesn't migrate the project to another linter.
  const defaultLinter = detectLinter() ?? "oxlint";

  // Only Oxlint and Bun run JS plugins, so --js-plugins settles the
  // question. On a project that uses another linter it's a mistake to
  // report, not a reason to migrate the project.
  if (opts["js-plugins"] !== undefined) {
    assertJsPluginsMatchLinter(defaultLinter, opts["js-plugins"]);

    return defaultLinter;
  }

  if (!interactive) {
    return defaultLinter;
  }

  const linter = await select<Linter>({
    initialValue: defaultLinter,
    message: "Which linter do you want to use?",
    options: [
      { label: "Oxlint + Oxfmt (Recommended)", value: "oxlint" },
      { label: "Biome", value: "biome" },
      { label: "ESLint + Prettier + Stylelint", value: "eslint" },
      {
        hint: "bun lint and bun fmt, on the Oxlint presets",
        label: "Bun",
        value: "bun",
      },
    ],
  });

  if (isCancelled(linter)) {
    throw cancelInitialize();
  }

  return linter;
};

const selectFrameworks = async (
  opts: InitializeFlags,
  interactive: boolean
): Promise<Frameworks[]> => {
  if (opts.frameworks !== undefined) {
    return opts.frameworks;
  }

  if (!interactive) {
    return [];
  }

  const detected = await detectFrameworks();

  const frameworks = await multiselect<Frameworks>({
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
      { label: "Cypress", value: "cypress" },
      { label: "Storybook", value: "storybook" },
    ],
    required: false,
  });

  if (isCancelled(frameworks)) {
    throw cancelInitialize();
  }

  return frameworks;
};

const selectJsPlugins = async (
  opts: InitializeFlags,
  linter: Linter,
  interactive: boolean
): Promise<OxlintJsPlugin[]> => {
  // A --js-plugins list on another linter was already rejected, by
  // validateInitializeFlags or selectLinter.
  if (!runsOxlintConfig(linter)) {
    return [];
  }

  if (opts["js-plugins"] !== undefined || !interactive) {
    return opts["js-plugins"] ?? [];
  }

  const jsPlugins = await multiselect<OxlintJsPlugin>({
    message: "Which JS plugins would you like to add (optional)?",
    options: oxlintJsPlugins.map((jsPlugin) => ({
      hint: oxlintJsPluginHints[jsPlugin],
      label: jsPlugin,
      value: jsPlugin,
    })),
    required: false,
  });

  if (isCancelled(jsPlugins)) {
    throw cancelInitialize();
  }

  return jsPlugins;
};

const TYPE_AWARE_OPTION_RE = /typeAware["']?\s*:\s*true/u;

const readFirstConfig = (names: readonly string[]): string => {
  const found = names.find((name) => exists(`./${name}`));

  if (!found) {
    return "";
  }

  try {
    return readFileSync(found, "utf-8");
  } catch {
    return "";
  }
};

// Whether the project already runs the type-aware rules, so re-running init
// keeps them without --type-aware.
const hasTypeAwareSetup = async (linter: Linter): Promise<boolean> => {
  if (linter === "biome") {
    return readFirstConfig(biomeConfigNames).includes(
      "ultracite/biome/type-aware"
    );
  }

  if (linter === "eslint") {
    return readFirstConfig(eslintConfigNames).includes(
      "ultracite/eslint/type-aware"
    );
  }

  const packageJsonObject = await readPackageJson();

  return (
    "oxlint-tsgolint" in (packageJsonObject?.devDependencies ?? {}) ||
    TYPE_AWARE_OPTION_RE.test(readFirstConfig(oxlintConfigNames))
  );
};

const selectTypeAware = async (
  opts: InitializeFlags,
  linter: Linter,
  interactive: boolean
): Promise<boolean> => {
  if (opts["type-aware"] !== undefined) {
    return opts["type-aware"];
  }

  // A project that already runs the type-aware rules keeps them, so there's
  // nothing to ask: init has no way to take them out again.
  if (await hasTypeAwareSetup(linter)) {
    return true;
  }

  // Only a TypeScript project has types to check.
  if (!interactive || !(await tsconfig.exists())) {
    return false;
  }

  const typeAware = await confirm({
    initialValue: false,
    message:
      "Turn on type-aware linting? It adds rules that need type information, such as no-floating-promises, and makes linting slower.",
  });

  if (isCancelled(typeAware)) {
    throw cancelInitialize();
  }

  return typeAware;
};

// The universal target writes one file that several editors or agents read,
// so choosing it also covers each of those on its own.
const resolveUniversalTarget = <
  Id extends string,
  Target extends { id: string },
>(
  selection: readonly (Id | typeof UNIVERSAL)[],
  targets: readonly Target[],
  getCoveredIds: (target: Target) => readonly string[]
) => {
  const universalTarget = selection.includes(UNIVERSAL)
    ? targets.find((target) => target.id === UNIVERSAL)
    : undefined;

  const coveredIds = new Set(
    universalTarget ? getCoveredIds(universalTarget) : []
  );

  return {
    ids: selection.filter(
      (id): id is Id => id !== UNIVERSAL && !coveredIds.has(id)
    ),
    targets: universalTarget ? [universalTarget] : [],
  };
};

const promptForTargets = async <
  Target extends { id: string; promptLabel: string },
>(
  message: string,
  targets: readonly Target[]
): Promise<Target[]> => {
  const selected = await multiselect({
    message,
    options: targets.map((target) => ({
      label: target.promptLabel,
      value: target.id,
    })),
    required: false,
  });

  if (isCancelled(selected)) {
    throw cancelInitialize();
  }

  return targets.filter((target) => selected.includes(target.id));
};

const selectEditors = async (
  opts: InitializeFlags,
  interactive: boolean
): Promise<EditorSelections> => {
  const targets = getEditorFileTargets();

  if (opts.editors !== undefined) {
    const universal = resolveUniversalTarget(
      opts.editors,
      targets,
      (target) => target.editorIds
    );

    return {
      editorConfig: universal.ids,
      selectedEditorFiles: universal.targets,
    };
  }

  return {
    editorConfig: [],
    selectedEditorFiles: interactive
      ? await promptForTargets(
          "Which editors do you want to configure (recommended)?",
          targets
        )
      : [],
  };
};

const selectAgents = async (
  opts: InitializeFlags,
  interactive: boolean
): Promise<AgentSelections> => {
  if (opts.agents !== undefined) {
    return { agents: opts.agents };
  }

  if (!interactive) {
    return { agents: [] };
  }

  const selected = await promptForTargets(
    "Which agents do you use (optional)?",
    getAgentChoices()
  );

  return { agents: selected.map((choice) => choice.id) };
};

const selectHooks = async (
  opts: InitializeFlags,
  interactive: boolean
): Promise<(typeof options.hooks)[number][]> => {
  if (opts.hooks !== undefined) {
    return opts.hooks;
  }

  if (!interactive) {
    return [];
  }

  const hooks = await multiselect({
    message: "Which agent hooks do you want to enable (optional)?",
    options: hookIntegrations.map((hook) => ({
      label: hook.name,
      value: hook.id,
    })),
    required: false,
  });

  if (isCancelled(hooks)) {
    throw cancelInitialize();
  }

  return hooks;
};

const selectIntegrations = async (
  opts: InitializeFlags,
  interactive: boolean
): Promise<(typeof options.integrations)[number][]> => {
  if (opts.integrations !== undefined) {
    return opts.integrations;
  }

  if (!interactive) {
    return [];
  }

  const integrations = await multiselect({
    message: "Would you like any of the following (optional)?",
    options: [
      { label: "Husky pre-commit hook", value: "husky" },
      { label: "Lefthook pre-commit hook", value: "lefthook" },
      { label: "Lint-staged", value: LINT_STAGED },
      { label: "pre-commit (Python framework)", value: "pre-commit" },
    ],
    required: false,
  });

  if (isCancelled(integrations)) {
    throw cancelInitialize();
  }

  return integrations;
};

const selectInitializeOptions = async (
  opts: InitializeFlags,
  interactive: boolean
): Promise<InitializeSelections> => {
  const linter = await selectLinter(opts, interactive);
  const frameworks = await selectFrameworks(opts, interactive);
  const jsPlugins = await selectJsPlugins(opts, linter, interactive);
  const typeAware = await selectTypeAware(opts, linter, interactive);
  const editorSelections = await selectEditors(opts, interactive);
  const agentSelections = await selectAgents(opts, interactive);
  const hooks = await selectHooks(opts, interactive);
  const integrations = await selectIntegrations(opts, interactive);

  return {
    ...editorSelections,
    ...agentSelections,
    frameworks,
    hooks,
    integrations,
    jsPlugins,
    linter,
    typeAware,
  };
};

// Moving to another linter removes the old one's configs and packages, which
// an interactive run lists and asks about first.
const confirmStaleSetupRemoval = async (
  linter: Linter,
  interactive: boolean
): Promise<boolean> => {
  if (!interactive) {
    return true;
  }

  const stale = await findStaleLinterSetup(linter);

  if (stale.length === 0) {
    return true;
  }

  const name =
    providers.find((provider) => provider.id === linter)?.name ?? linter;

  log.info(
    `Found the setup of other linters:\n${stale.map((item) => `  ${item}`).join("\n")}`
  );

  const confirmed = await confirm({
    initialValue: true,
    message: `Remove it, now that the project uses ${name}?`,
  });

  if (isCancelled(confirmed)) {
    throw cancelInitialize();
  }

  return confirmed;
};

// The type-aware rules need strictNullChecks, which an interactive run asks
// about before changing any tsconfig.
const confirmTsConfigUpdates = async (
  typeAware: boolean,
  interactive: boolean
): Promise<TsConfigUpdate[]> => {
  if (!typeAware) {
    return [];
  }

  const updates = await tsconfig.plan();

  if (!interactive || updates.length === 0) {
    return updates;
  }

  const confirmed = await confirm({
    initialValue: true,
    message: `Type-aware rules need strictNullChecks. Turn it on in ${updates.map((update) => update.filePath).join(", ")}?`,
  });

  if (isCancelled(confirmed)) {
    throw cancelInitialize();
  }

  if (!confirmed) {
    log.warn(
      "strictNullChecks was left off. Type-aware rules that need it, such as prefer-nullish-coalescing, won't work properly until it's on."
    );

    return [];
  }

  return updates;
};

const confirmProjectChanges = async (
  { linter, typeAware }: InitializeSelections,
  interactive: boolean
): Promise<ProjectChanges> => ({
  removeStaleSetup: await confirmStaleSetupRemoval(linter, interactive),
  tsconfigUpdates: await confirmTsConfigUpdates(typeAware, interactive),
});

type SkillChoice = "install" | "installed" | "skip";

// Asked with the other questions, so init writes nothing before the last
// answer. The install itself runs last, once init has written the agent
// directories it looks for.
const selectSkillInstall = async (
  opts: InitializeFlags,
  packageManager: PackageManagerName,
  interactive: boolean,
  quiet: boolean
): Promise<SkillChoice> => {
  if (opts.installSkill !== undefined) {
    return opts.installSkill ? "install" : "skip";
  }

  // The check runs `skills list`, so it's skipped when there's neither a
  // question to save nor a message to print.
  if (!interactive && quiet) {
    return "skip";
  }

  if (hasUltraciteSkillInstalled(packageManager)) {
    return "installed";
  }

  if (!interactive) {
    return "skip";
  }

  const choice = await select<"install" | "skip">({
    message: "Do you want to install the Ultracite skill?",
    options: [
      { label: "Yes, install it", value: "install" },
      { label: "No, I'll do it later", value: "skip" },
    ],
  });

  if (isCancelled(choice)) {
    throw cancelInitialize();
  }

  return choice;
};

interface InitializeContext {
  changes: ProjectChanges;
  install: boolean;
  installSkill: SkillChoice;
  pmInfo: PackageManager;
  quiet: boolean;
  selections: InitializeSelections;
  workspaces: WorkspaceFrameworks[];
}

const setupLinting = async ({
  changes,
  install,
  pmInfo,
  quiet,
  selections,
  workspaces,
}: InitializeContext): Promise<void> => {
  const { frameworks, jsPlugins, linter, typeAware } = selections;

  // Workspace frameworks need their plugins installed (and, for Prettier,
  // configured) at the root, though their rules only apply in the
  // workspace.
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
    install,
    quiet,
    typeAware,
    allFrameworks,
    jsPlugins,
    selections.editorConfig.length > 0 ||
      selections.selectedEditorFiles.length > 0
  );

  await upsertTsConfig(changes.tsconfigUpdates, quiet);

  if (changes.removeStaleSetup) {
    await migrateLinterConfig(linter, quiet);
  }

  // Create config for selected linter
  if (linter === "biome") {
    await upsertBiomeConfig(frameworks, quiet, typeAware);
  }

  if (linter === "eslint") {
    await upsertEslintConfig(frameworks, quiet, typeAware);
    // ESLint is only a linter, so we need Prettier for formatting and Stylelint for CSS
    await upsertPrettierConfig(allFrameworks, quiet);
    await upsertStylelintConfig(quiet);
  }

  if (linter === "oxlint") {
    // The Oxlint and oxfmt configs use ES module syntax. Init never changes
    // package.json's "type" to make them load, since that changes how
    // every .js file is loaded; outside an ES module package the configs
    // are written as .mts instead (see resolveEsmConfigPath).
    await upsertOxlintConfig(frameworks, quiet, jsPlugins, typeAware);
    // Oxlint is only a linter, so we need oxfmt for formatting
    await upsertOxfmtConfig(quiet);
  }

  if (linter === "bun") {
    // `bun lint` and `bun fmt` read the Oxlint and oxfmt configs, written
    // to import defineConfig from ultracite/bun instead.
    await upsertOxlintConfig(frameworks, quiet, jsPlugins, typeAware, true);
    await upsertOxfmtConfig(quiet, true);

    if (allFrameworks.includes("vue")) {
      log.warn(
        "Bun has no Vue rules, so the Vue preset's rules don't run under `bun lint`."
      );
    }
  }

  await upsertWorkspaceConfigs(linter, workspaces, quiet);

  // check and fix run the linter whose config is nearest, Biome before
  // ESLint before Oxlint in one folder, so a kept config can win.
  const active = changes.removeStaleSetup ? linter : detectLinter();

  if (active && active !== linter) {
    log.warn(
      `The other linters' setup was left in place, so \`ultracite check\` will run ${active} instead of ${linter}. Remove its config to switch.`
    );
  }
};

const setupSelectedFiles = async ({
  pmInfo,
  quiet,
  selections,
}: InitializeContext): Promise<void> => {
  const { agents, editorConfig, hooks, linter, selectedEditorFiles } =
    selections;

  // Editors that share a settings file (VS Code and its forks) write it one
  // after another, each adding its settings to the last one's. Written at
  // once, they each saw no file and the last write won, dropping settings
  // such as the older editors' `typescript.tsdk`.
  const editorIds = [
    ...selectedEditorFiles.map((target) => target.representativeEditorId),
    ...editorConfig,
  ];

  const existingSettingsFiles = new Set(
    editors
      .filter((editor) => editorIds.includes(editor.id))
      .map((editor) => editor.config.path)
      .filter((settingsPath) => exists(settingsPath))
  );

  for (const editorId of editorIds) {
    const settingsPath = editors.find((editor) => editor.id === editorId)
      ?.config.path;

    // oxlint-disable-next-line no-await-in-loop -- editors that share a settings file must write it in turn
    await upsertEditorConfig(
      editorId,
      linter,
      quiet,
      settingsPath !== undefined && existingSettingsFiles.has(settingsPath)
    );
  }

  if (agents.length > 0) {
    await upsertAgents(agents, pmInfo.name, linter, quiet);
  }

  await Promise.all(
    hooks.map((hookName) => upsertHooks(hookName, pmInfo.name, linter, quiet))
  );
};

const setupIntegrations = async ({
  install,
  pmInfo,
  quiet,
  selections,
}: InitializeContext): Promise<void> => {
  const { integrations } = selections;

  if (integrations.includes("husky")) {
    const useLintStaged = integrations.includes(LINT_STAGED);
    await initializePrecommitHook(pmInfo, install, quiet, useLintStaged);
  }

  if (integrations.includes("lefthook")) {
    await initializeLefthook(pmInfo, install, quiet);
  }

  if (integrations.includes(LINT_STAGED)) {
    await initializeLintStaged(pmInfo, install, quiet);
  }

  if (integrations.includes("pre-commit")) {
    await initializePreCommit(pmInfo.name, quiet);
  }
};

const setupProject = async (context: InitializeContext): Promise<void> => {
  await setupLinting(context);
  await setupSelectedFiles(context);
  await setupIntegrations(context);
};

const completeInitialization = ({
  installSkill,
  pmInfo,
  quiet,
  selections,
}: InitializeContext): void => {
  if (!quiet) {
    log.success("Successfully initialized Ultracite!");
  }

  const hasUltraciteSkill =
    installSkill === "installed" ||
    (installSkill === "install" &&
      installUltraciteSkill({
        agents: selections.agents,
        packageManager: pmInfo.name,
        quiet,
      }));

  if (!quiet && !hasUltraciteSkill) {
    log.info(
      `You can install the Ultracite skill later with \`${getUltraciteSkillInstallCommand(pmInfo.name)}\`.`
    );
  }
};

export const initialize = async (flags?: InitializeFlags) => {
  const quiet = flags?.quiet ?? false;

  if (!quiet) {
    intro(`Ultracite v${ultraciteVersion} Initialization`);
  }

  try {
    const opts = normalizeInitializeFlags(flags ?? {});
    validateInitializeFlags(opts);
    const workspaces = parseWorkspaceFrameworks(opts["workspace-framework"]);
    const pmInfo = await resolvePackageManager(opts, quiet);

    const interactive =
      !opts.yes &&
      nonInteractiveFlags.every((flag) => opts[flag] === undefined);

    const selections = await selectInitializeOptions(opts, interactive);

    const installSkill = await selectSkillInstall(
      opts,
      pmInfo.name,
      interactive,
      quiet
    );

    const changes = await confirmProjectChanges(selections, interactive);

    const context: InitializeContext = {
      changes,
      install: !opts.skipInstall,
      installSkill,
      pmInfo,
      quiet,
      selections,
      workspaces,
    };

    await setupProject(context);
    completeInitialization(context);
  } catch (error) {
    if (error instanceof InitializeCancelledError) {
      return;
    }

    // Setup errors are reported by the CLI entry point as a plain message.
    if (!quiet && !(error instanceof UltraciteSetupError)) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log.error(`Failed to initialize Ultracite configuration: ${message}`);
    }

    throw error;
  }
};
