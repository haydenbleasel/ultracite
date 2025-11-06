import process from "node:process";
import {
  cancel,
  intro,
  isCancel,
  log,
  multiselect,
  spinner,
} from "@clack/prompts";
import {
  addDevDependency,
  detectPackageManager,
  type PackageManagerName,
} from "nypm";
import packageJson from "../package.json" with { type: "json" };
import { createAgents } from "./agents";
import { biome } from "./biome";
import { createHooks } from "./hooks";
import type { options } from "./consts/options";
import { vscode } from "./editor-config/vscode";
import { zed } from "./editor-config/zed";
import { husky } from "./integrations/husky";
import { lefthook } from "./integrations/lefthook";
import { lintStaged } from "./integrations/lint-staged";
import { eslintCleanup } from "./migrations/eslint";
import { prettierCleanup } from "./migrations/prettier";
import { tsconfig } from "./tsconfig";
import { isMonorepo, title, updatePackageJson } from "./utils";

const schemaVersion = packageJson.devDependencies["@biomejs/biome"];
const ultraciteVersion = packageJson.version;

type InitializeFlags = {
  pm?: PackageManagerName;
  editors?: (typeof options.editorConfigs)[number][];
  agents?: (typeof options.agents)[number][];
  hooks?: (typeof options.hooks)[number][];
  integrations?: (typeof options.integrations)[number][];
  frameworks?: (typeof options.frameworks)[number][];
  migrate?: (typeof options.migrations)[number][];
  skipInstall?: boolean;
  quiet?: boolean;
};

export const installDependencies = async (
  packageManager: PackageManagerName,
  install = true,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Installing dependencies...");
  }

  const packages = [
    `ultracite@${ultraciteVersion}`,
    `@biomejs/biome@${schemaVersion}`,
  ];

  if (install) {
    for (const pkg of packages) {
      await addDevDependency(pkg, {
        packageManager,
        workspace: await isMonorepo(),
        silent: quiet,
      });
    }
  } else {
    await updatePackageJson({
      devDependencies: {
        "@biomejs/biome": schemaVersion,
        ultracite: ultraciteVersion,
      },
    });
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

export const upsertVsCodeSettings = async (quiet = false) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for .vscode/settings.json...");
  }

  if (await vscode.exists()) {
    if (!quiet) {
      s.message("settings.json found, updating...");
    }
    await vscode.update();
    if (!quiet) {
      s.stop("settings.json updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("settings.json not found, creating...");
  }
  await vscode.create();
  if (!quiet) {
    s.message("settings.json created.");
    s.message("Installing Biome extension...");
  }

  try {
    vscode.extension();
    if (!quiet) {
      s.stop("settings.json created.");
    }
  } catch (error) {
    if (!quiet) {
      s.stop(`Failed to install Biome extension (${error}), but continuing...`);
    }
  }
};

export const upsertZedSettings = async (quiet = false) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for .zed/settings.json...");
  }

  if (await zed.exists()) {
    if (!quiet) {
      s.message("settings.json found, updating...");
    }
    await zed.update();
    if (!quiet) {
      s.stop("settings.json updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("settings.json not found, creating...");
  }
  await zed.create();
  if (!quiet) {
    s.message(
      "settings.json created. Install the Biome extension: https://biomejs.dev/reference/zed/"
    );
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

export const upsertAgents = async (
  name: (typeof options.agents)[number],
  displayName: string,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start(`Checking for ${displayName}...`);
  }

  const agents = createAgents(name);

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
  displayName: string,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start(`Checking for ${displayName} hooks...`);
  }

  const hooks = createHooks(name);

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

export const removePrettier = async (
  pm: PackageManagerName,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Removing Prettier dependencies and configuration...");
  }

  try {
    const result = await prettierCleanup.remove(pm);

    if (!quiet) {
      if (result.packagesRemoved.length > 0) {
        s.message(
          `Removed Prettier packages: ${result.packagesRemoved.join(", ")}`
        );
      }

      if (result.filesRemoved.length > 0) {
        s.message(`Removed config files: ${result.filesRemoved.join(", ")}`);
      }

      if (result.vsCodeCleaned) {
        s.message("Cleaned VS Code settings");
      }

      s.stop("Prettier removed successfully.");
    }
  } catch (_error) {
    if (!quiet) {
      s.stop("Failed to remove Prettier completely, but continuing...");
    }
  }
};

export const removeEsLint = async (
  pm: PackageManagerName,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Removing ESLint dependencies and configuration...");
  }

  try {
    const result = await eslintCleanup.remove(pm);

    if (!quiet) {
      if (result.packagesRemoved.length > 0) {
        s.message(
          `Removed ESLint packages: ${result.packagesRemoved.join(", ")}`
        );
      }

      if (result.filesRemoved.length > 0) {
        s.message(`Removed config files: ${result.filesRemoved.join(", ")}`);
      }

      if (result.vsCodeCleaned) {
        s.message("Cleaned VS Code settings");
      }

      s.stop("ESLint removed successfully.");
    }
  } catch (_error) {
    if (!quiet) {
      s.stop("Failed to remove ESLint completely, but continuing...");
    }
  }
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: "will fix later"
export const initialize = async (flags?: InitializeFlags) => {
  const opts = flags ?? {};
  const quiet = opts.quiet ?? false;

  if (!quiet) {
    intro(title);
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

    let shouldRemovePrettier = opts.migrate?.includes("prettier");
    let shouldRemoveEslint = opts.migrate?.includes("eslint");

    if (
      !quiet &&
      (shouldRemovePrettier === undefined || shouldRemoveEslint === undefined)
    ) {
      const migrationOptions: Array<{ label: string; value: string }> = [];

      if (
        shouldRemovePrettier === undefined &&
        (await prettierCleanup.hasPrettier())
      ) {
        migrationOptions.push({
          label:
            "Remove Prettier (dependencies, config files, VS Code settings)",
          value: "prettier",
        });
      }

      if (
        shouldRemoveEslint === undefined &&
        (await eslintCleanup.hasEsLint())
      ) {
        migrationOptions.push({
          label: "Remove ESLint (dependencies, config files, VS Code settings)",
          value: "eslint",
        });
      }

      if (migrationOptions.length > 0) {
        const migrationChoices = await multiselect({
          message:
            "Remove existing formatters/linters (recommended for clean migration)?",
          options: migrationOptions,
          required: false,
        });

        if (isCancel(migrationChoices)) {
          cancel("Operation cancelled.");
          process.exit(0);
        }

        if (shouldRemovePrettier === undefined) {
          shouldRemovePrettier = migrationChoices.includes("prettier");
        }
        if (shouldRemoveEslint === undefined) {
          shouldRemoveEslint = migrationChoices.includes("eslint");
        }
      }
    }

    // Set defaults for quiet mode if not explicitly provided
    if (quiet) {
      if (shouldRemovePrettier === undefined) {
        shouldRemovePrettier = false;
      }
      if (shouldRemoveEslint === undefined) {
        shouldRemoveEslint = false;
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
        opts.integrations !== undefined ||
        opts.migrate !== undefined;

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
          ],
          required: false,
        });

        if (isCancel(frameworksResult)) {
          cancel("Operation cancelled.");
          process.exit(0);
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
          process.exit(0);
        }

        editorConfig = editorConfigResult;
      }
    }

    let agents = opts.agents;
    let hooks = opts.hooks;

    const agentsOptions: Record<(typeof options.agents)[number], string> = {
      "vscode-copilot": "GitHub Copilot (VSCode)",
      cursor: "Cursor",
      windsurf: "Windsurf",
      zed: "Zed",
      claude: "Claude Code",
      codex: "OpenAI Codex / Jules / OpenCode",
      kiro: "Kiro IDE",
      cline: "Cline",
      amp: "AMP",
      aider: "Aider",
      "firebase-studio": "Firebase Studio",
      "open-hands": "Open Hands",
      "gemini-cli": "Gemini CLI",
      junie: "Junie",
      augmentcode: "Augment Code",
      "kilo-code": "Kilo Code",
      goose: "Codename Goose",
      "roo-code": "Roo Code",
      warp: "Warp",
    } as const;

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
          process.exit(0);
        }

        agents = agentsResult as (typeof options.agents)[number][];
      }
    }

    const hooksOptions: Record<(typeof options.hooks)[number], string> = {
      cursor: "Cursor",
      claude: "Claude Code",
    } as const;

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
          process.exit(0);
        }

        hooks = hooksResult as (typeof options.hooks)[number][];
      }
    }

    let integrations = opts.integrations;
    if (integrations === undefined) {
      // If quiet mode or other CLI options are provided, default to empty array to avoid prompting
      // This allows programmatic usage without interactive prompts
      const hasOtherCliOptions =
        quiet ||
        opts.pm ||
        opts.editors ||
        opts.agents ||
        opts.hooks ||
        opts.migrate !== undefined;

      if (hasOtherCliOptions) {
        integrations = [];
      } else {
        const integrationsResult = await multiselect({
          message: "Would you like any of the following (optional)?",
          options: [
            { label: "Husky pre-commit hook", value: "husky" },
            { label: "Lefthook pre-commit hook", value: "lefthook" },
            { label: "Lint-staged", value: "lint-staged" },
          ],
          required: false,
        });

        if (isCancel(integrationsResult)) {
          cancel("Operation cancelled.");
          process.exit(0);
        }

        integrations = integrationsResult;
      }
    }

    if (shouldRemovePrettier) {
      await removePrettier(pm, quiet);
    }
    if (shouldRemoveEslint) {
      await removeEsLint(pm, quiet);
    }

    await installDependencies(pm, !opts.skipInstall, quiet);

    await upsertTsConfig(quiet);
    await upsertBiomeConfig(frameworks, quiet);

    if (editorConfig?.includes("vscode")) {
      await upsertVsCodeSettings(quiet);
    }
    if (editorConfig?.includes("zed")) {
      await upsertZedSettings(quiet);
    }

    for (const ruleName of agents ?? []) {
      await upsertAgents(ruleName, agentsOptions[ruleName], quiet);
    }

    for (const hookName of hooks ?? []) {
      await upsertHooks(hookName, hooksOptions[hookName], quiet);
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

    if (!quiet) {
      log.success("Successfully initialized Ultracite configuration!");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!quiet) {
      log.error(`Failed to initialize Ultracite configuration: ${message}`);
    }
    process.exit(1);
  }
};
