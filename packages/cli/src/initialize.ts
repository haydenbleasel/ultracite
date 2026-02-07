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
import { agents as agentsData } from "@repo/data/agents";
import { editors } from "@repo/data/editors";
import { hooks as hookIntegrations } from "@repo/data/hooks";
import type { options } from "@repo/data/options";
import { providers } from "@repo/data/providers";
import {
  addDevDependency,
  detectPackageManager,
  type PackageManagerName,
} from "nypm";
import packageJson from "../package.json" with { type: "json" };
import { createAgents } from "./agents";
import { createEditorConfig } from "./editor-config";
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
import { tsconfig } from "./tsconfig";
import { isMonorepo, updatePackageJson } from "./utils";

const schemaVersion = packageJson.devDependencies["@biomejs/biome"];
const ultraciteVersion = packageJson.version;

type Linter = (typeof options.linters)[number];
type Frameworks = (typeof options.frameworks)[number];

interface InitializeFlags {
  pm?: PackageManagerName;
  linter?: Linter;
  editors?: (typeof options.editorConfigs)[number][];
  agents?: (typeof options.agents)[number][];
  hooks?: (typeof options.hooks)[number][];
  integrations?: (typeof options.integrations)[number][];
  frameworks?: (typeof options.frameworks)[number][];
  skipInstall?: boolean;
  quiet?: boolean;
  "type-aware"?: boolean;
}

const eslintFrameworkPackages: Partial<Record<Frameworks, string[]>> = {
  angular: ["@angular-eslint/eslint-plugin@latest"],
  astro: ["eslint-plugin-astro@latest"],
  next: ["@next/eslint-plugin-next@latest"],
  qwik: ["eslint-plugin-qwik@latest"],
  react: [
    "eslint-plugin-react@latest",
    "eslint-plugin-react-hooks@latest",
    "eslint-plugin-jsx-a11y@latest",
    "@tanstack/eslint-plugin-query@latest",
  ],
  remix: ["eslint-plugin-remix@latest"],
  solid: ["eslint-plugin-solid@latest"],
  svelte: ["eslint-plugin-svelte@latest"],
  vue: ["eslint-plugin-vue@latest"],
};
const addEslintFrameworkPackages = (
  packages: string[],
  frameworks: Frameworks[]
) => {
  for (const framework of frameworks) {
    const deps = eslintFrameworkPackages[framework];
    if (deps) {
      packages.push(...deps);
    }
  }
};

export const installDependencies = async (
  packageManager: PackageManagerName,
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
    packages.push("eslint@latest");

    // Add Plugin eslint for core dependencies
    packages.push(
      ...[
        "@typescript-eslint/eslint-plugin@latest",
        "@typescript-eslint/parser@latest",
        "eslint-config-prettier@latest",
        "eslint-import-resolver-typescript@latest",
        "eslint-plugin-compat@latest",
        "eslint-plugin-cypress@latest",
        "eslint-plugin-github@latest",
        "eslint-plugin-html@latest",
        "eslint-plugin-import@latest",
        "eslint-plugin-jest@latest",
        "eslint-plugin-n@latest",
        "eslint-plugin-prettier@latest",
        "eslint-plugin-promise@latest",
        "eslint-plugin-sonarjs@latest",
        "eslint-plugin-storybook@latest",
        "eslint-plugin-unicorn@latest",
        "eslint-plugin-unused-imports@latest",
        "globals@latest",
      ]
    );
    addEslintFrameworkPackages(packages, frameworks);
    // ESLint is only a linter, so we need Prettier for formatting and Stylelint for CSS
    packages.push("prettier@latest");
    packages.push("stylelint@latest");
  }
  if (linter === "oxlint") {
    packages.push("oxlint@latest");
    // Oxlint is only a linter, so we need oxfmt for formatting
    packages.push("oxfmt@latest");
    // Type-aware linting requires oxlint-tsgolint
    if (typeAware) {
      packages.push("oxlint-tsgolint@latest");
    }
  }

  if (install) {
    for (const pkg of packages) {
      await addDevDependency(pkg, {
        packageManager,
        workspace: await isMonorepo(),
        silent: true,
        corepack: false,
      });
    }
  } else {
    const devDependencies: Record<string, string> = {
      ultracite: ultraciteVersion,
    };

    if (linter === "biome") {
      devDependencies["@biomejs/biome"] = schemaVersion;
    }
    if (linter === "eslint") {
      devDependencies.eslint = "latest";
      // ESLint is only a linter, so we need Prettier for formatting and Stylelint for CSS
      devDependencies.prettier = "latest";
      devDependencies.stylelint = "latest";
    }
    if (linter === "oxlint") {
      devDependencies.oxlint = "latest";
      // Oxlint is only a linter, so we need oxfmt for formatting
      devDependencies.oxfmt = "latest";
      // Type-aware linting requires oxlint-tsgolint
      if (typeAware) {
        devDependencies["oxlint-tsgolint"] = "latest";
      }
    }

    await updatePackageJson({ devDependencies });
  }

  // Add ultracite scripts to package.json
  await updatePackageJson({
    scripts: {
      check: "ultracite check",
      fix: "ultracite fix",
    },
  });

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
  const editor = editors.find((editor) => editor.id === editorId);

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
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for Biome configuration...");
  }

  if (await biome.exists()) {
    if (!quiet) {
      s.message("Biome configuration found, updating...");
    }
    await biome.update({ frameworks });
    if (!quiet) {
      s.stop("Biome configuration updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("Biome configuration not found, creating...");
  }
  await biome.create({ frameworks });
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

export const upsertPrettierConfig = async (quiet = false) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for Prettier configuration...");
  }

  if (await prettier.exists()) {
    if (!quiet) {
      s.message("Prettier configuration found, updating...");
    }
    await prettier.update();
    if (!quiet) {
      s.stop("Prettier configuration updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("Prettier configuration not found, creating...");
  }
  await prettier.create();
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
  packageManager: PackageManagerName,
  install = true,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Initializing pre-commit hooks...");
    s.message("Installing Husky...");
  }

  if (install) {
    await husky.install(packageManager);
  } else {
    await updatePackageJson({
      devDependencies: { husky: "latest" },
      scripts: { prepare: "husky" },
    });
  }

  if (!quiet) {
    s.message("Initializing Husky...");
  }
  husky.init(packageManager);

  if (await husky.exists()) {
    if (!quiet) {
      s.message("Pre-commit hook found, updating...");
    }
    await husky.update(packageManager);
    if (!quiet) {
      s.stop("Pre-commit hook updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("Pre-commit hook not found, creating...");
  }
  await husky.create(packageManager);
  if (!quiet) {
    s.stop("Pre-commit hook created.");
  }
};

export const initializeLefthook = async (
  packageManager: PackageManagerName,
  install = true,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Initializing lefthook...");
    s.message("Installing lefthook...");
  }

  if (install) {
    await lefthook.install(packageManager);
  } else {
    await updatePackageJson({
      devDependencies: { lefthook: "latest" },
    });
  }

  if (await lefthook.exists()) {
    if (!quiet) {
      s.message("lefthook.yml found, updating...");
    }
    await lefthook.update(packageManager);
    if (!quiet) {
      s.stop("lefthook.yml updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("lefthook.yml not found, creating...");
  }
  await lefthook.create(packageManager);
  if (!quiet) {
    s.stop("lefthook.yml created.");
  }
};

export const initializeLintStaged = async (
  packageManager: PackageManagerName,
  install = true,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Initializing lint-staged...");
    s.message("Installing lint-staged...");
  }

  if (install) {
    await lintStaged.install(packageManager);
  } else {
    await updatePackageJson({
      devDependencies: { "lint-staged": "latest" },
    });
  }

  if (await lintStaged.exists()) {
    if (!quiet) {
      s.message("lint-staged found, updating...");
    }
    await lintStaged.update(packageManager);
    if (!quiet) {
      s.stop("lint-staged updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("lint-staged not found, creating...");
  }
  await lintStaged.create(packageManager);
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

export const upsertHooks = async (
  name: (typeof options.hooks)[number],
  packageManager: PackageManagerName,
  quiet = false
) => {
  const s = spinner();

  const displayName =
    hookIntegrations.find((hook) => hook.id === name)?.name ?? name;

  if (!quiet) {
    s.start(`Checking for ${displayName} hooks...`);
  }

  const hooks = createHooks(name, packageManager);

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
    let { pm } = opts;

    if (!pm) {
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
      pm = detected.name;
    }

    let linter = opts.linter;
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
          cancel("Operation cancelled.");
          return;
        }

        linter = linterResult as Linter;
      }
    }

    let frameworks = opts.frameworks;
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
        const frameworksResult = await multiselect({
          message: "Which frameworks are you using (optional)?",
          options: [
            { label: "React", value: "react" },
            { label: "Next.js", value: "next" },
            { label: "Solid", value: "solid" },
            { label: "Vue", value: "vue" },
            { label: "Svelte", value: "svelte" },
            { label: "Qwik", value: "qwik" },
            { label: "Angular", value: "angular" },
            { label: "Remix / TanStack Router / React Router", value: "remix" },
            { label: "Astro", value: "astro" },
            { label: "NestJS", value: "nestjs" },
          ],
          required: false,
        });

        if (isCancel(frameworksResult)) {
          cancel("Operation cancelled.");
          return;
        }

        frameworks = frameworksResult as (typeof options.frameworks)[number][];
      }
    }

    let editorConfig = opts.editors;
    if (!editorConfig) {
      if (quiet) {
        // In quiet mode, default to no editor config
        editorConfig = [];
      } else {
        const editorConfigResult = await multiselect({
          message: "Which editors do you want to configure (recommended)?",
          options: [
            { label: "VSCode / Cursor / Windsurf", value: "vscode" },
            { label: "Zed", value: "zed" },
          ],
          required: false,
        });

        if (isCancel(editorConfigResult)) {
          cancel("Operation cancelled.");
          return;
        }

        editorConfig = editorConfigResult;
      }
    }

    let agents = opts.agents;
    let hooks = opts.hooks;

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
          message: "Which agents do you want to enable (optional)?",
          options: Object.entries(agentsOptions).map(([value, label]) => ({
            value,
            label,
          })),
          required: false,
        });

        if (isCancel(agentsResult)) {
          cancel("Operation cancelled.");
          return;
        }

        agents = agentsResult as (typeof options.agents)[number][];
      }
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
            value,
            label,
          })),
          required: false,
        });

        if (isCancel(hooksResult)) {
          cancel("Operation cancelled.");
          return;
        }

        hooks = hooksResult as (typeof options.hooks)[number][];
      }
    }

    let integrations = opts.integrations;
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
            { label: "Lint-staged", value: "lint-staged" },
            { label: "pre-commit (Python framework)", value: "pre-commit" },
          ],
          required: false,
        });

        if (isCancel(integrationsResult)) {
          cancel("Operation cancelled.");
          return;
        }

        integrations = integrationsResult;
      }
    }

    await installDependencies(
      pm,
      linter,
      !opts.skipInstall,
      quiet,
      linter === "oxlint" && opts["type-aware"],
      frameworks
    );

    await upsertTsConfig(quiet);

    // Create config for selected linter
    if (linter === "biome") {
      await upsertBiomeConfig(frameworks, quiet);
    }
    if (linter === "eslint") {
      await upsertEslintConfig(frameworks, quiet);
      // ESLint is only a linter, so we need Prettier for formatting and Stylelint for CSS
      await upsertPrettierConfig(quiet);
      await upsertStylelintConfig(quiet);
    }
    if (linter === "oxlint") {
      await upsertOxlintConfig(frameworks, quiet);
      // Oxlint is only a linter, so we need oxfmt for formatting
      await upsertOxfmtConfig(quiet);
    }

    for (const editorId of editorConfig ?? []) {
      await upsertEditorConfig(editorId, linter, quiet);
    }

    for (const ruleName of agents ?? []) {
      await upsertAgents(ruleName, agentsOptions[ruleName], pm, linter, quiet);
    }

    for (const hookName of hooks ?? []) {
      await upsertHooks(hookName, pm, quiet);
    }

    if (integrations?.includes("husky")) {
      await initializePrecommitHook(pm, !opts.skipInstall, quiet);
    }
    if (integrations?.includes("lefthook")) {
      await initializeLefthook(pm, !opts.skipInstall, quiet);
    }
    if (integrations?.includes("lint-staged")) {
      await initializeLintStaged(pm, !opts.skipInstall, quiet);
    }
    if (integrations?.includes("pre-commit")) {
      await initializePreCommit(pm, quiet);
    }

    if (!quiet) {
      log.success(
        "Successfully initialized Ultracite! Make sure to check out ultracite.ai/cloud for our pro version."
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
