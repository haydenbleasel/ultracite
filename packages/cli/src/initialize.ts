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
import type { options } from "./consts/options";
import { vscode } from "./editor-config/vscode";
import { zed } from "./editor-config/zed";
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
import { eslintCleanup } from "./migrations/eslint";
import { prettierCleanup } from "./migrations/prettier";
import { tsconfig } from "./tsconfig";
import { isMonorepo, title, updatePackageJson } from "./utils";

const schemaVersion = packageJson.devDependencies["@biomejs/biome"];
const ultraciteVersion = packageJson.version;

type Linter = (typeof options.linters)[number];

interface InitializeFlags {
  pm?: PackageManagerName;
  linters?: Linter[];
  editors?: (typeof options.editorConfigs)[number][];
  agents?: (typeof options.agents)[number][];
  hooks?: (typeof options.hooks)[number][];
  integrations?: (typeof options.integrations)[number][];
  frameworks?: (typeof options.frameworks)[number][];
  migrate?: (typeof options.migrations)[number][];
  skipInstall?: boolean;
  quiet?: boolean;
}

export const installDependencies = async (
  packageManager: PackageManagerName,
  linters: Linter[] = ["biome"],
  install = true,
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Installing dependencies...");
  }

  const packages: string[] = [`ultracite@${ultraciteVersion}`];

  // Add linter-specific dependencies
  if (linters.includes("biome")) {
    packages.push(`@biomejs/biome@${schemaVersion}`);
  }
  if (linters.includes("eslint")) {
    packages.push("eslint@latest");
    // ESLint is only a linter, so we need Prettier for formatting and Stylelint for CSS
    packages.push("prettier@latest");
    packages.push("stylelint@latest");
  }
  if (linters.includes("oxlint")) {
    packages.push("oxlint@latest");
    // Oxlint is only a linter, so we need oxfmt for formatting
    packages.push("oxfmt@latest");
  }

  if (install) {
    for (const pkg of packages) {
      await addDevDependency(pkg, {
        packageManager,
        workspace: await isMonorepo(),
        silent: true,
      });
    }
  } else {
    const devDependencies: Record<string, string> = {
      ultracite: ultraciteVersion,
    };

    if (linters.includes("biome")) {
      devDependencies["@biomejs/biome"] = schemaVersion;
    }
    if (linters.includes("eslint")) {
      devDependencies.eslint = "latest";
      // ESLint is only a linter, so we need Prettier for formatting and Stylelint for CSS
      devDependencies.prettier = "latest";
      devDependencies.stylelint = "latest";
    }
    if (linters.includes("oxlint")) {
      devDependencies.oxlint = "latest";
      // Oxlint is only a linter, so we need oxfmt for formatting
      devDependencies.oxfmt = "latest";
    }

    await updatePackageJson({ devDependencies });
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

const LINTER_EXTENSIONS: Record<Linter, { id: string; name: string }> = {
  biome: { id: "biomejs.biome", name: "Biome" },
  eslint: { id: "dbaeumer.vscode-eslint", name: "ESLint" },
  oxlint: { id: "oxc.oxc-vscode", name: "Oxlint" },
};

export const upsertVsCodeSettings = async (
  linters: Linter[] = ["biome"],
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start("Checking for .vscode/settings.json...");
  }

  if (await vscode.exists()) {
    if (!quiet) {
      s.message("settings.json found, updating...");
    }
    await vscode.update(linters);
    if (!quiet) {
      s.stop("settings.json updated.");
    }
    return;
  }

  if (!quiet) {
    s.message("settings.json not found, creating...");
  }
  await vscode.create(linters);

  // Install extensions for selected linters
  const extensionsToInstall = linters.map(
    (linter) => LINTER_EXTENSIONS[linter]
  );
  const installedExtensions: string[] = [];
  const failedExtensions: string[] = [];

  for (const ext of extensionsToInstall) {
    if (!quiet) {
      s.message(`Installing ${ext.name} extension...`);
    }

    try {
      const result = vscode.extension(ext.id);
      if (result.status === 0) {
        installedExtensions.push(ext.name);
      } else {
        failedExtensions.push(ext.name);
      }
    } catch {
      failedExtensions.push(ext.name);
    }
  }

  if (!quiet) {
    if (failedExtensions.length === 0 && installedExtensions.length > 0) {
      s.stop(
        `settings.json created and ${installedExtensions.join(", ")} extension(s) installed.`
      );
    } else if (failedExtensions.length > 0) {
      s.stop(
        `settings.json created. Install ${failedExtensions.join(", ")} extension(s) manually.`
      );
    } else {
      s.stop("settings.json created.");
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
  quiet = false
) => {
  const s = spinner();

  if (!quiet) {
    s.start(`Checking for ${displayName}...`);
  }

  const agents = createAgents(name, packageManager);

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
  packageManager: PackageManagerName,
  quiet = false
) => {
  const s = spinner();

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

export const removePrettier = async (pm: PackageManagerName, quiet = false) => {
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

export const removeEsLint = async (pm: PackageManagerName, quiet = false) => {
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
          return;
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

    let linters = opts.linters;
    if (linters === undefined) {
      // If quiet mode or other CLI options are provided, default to biome only
      const hasOtherCliOptions =
        quiet ||
        opts.pm ||
        opts.editors ||
        opts.agents ||
        opts.hooks ||
        opts.integrations !== undefined ||
        opts.migrate !== undefined ||
        opts.frameworks !== undefined;

      if (hasOtherCliOptions) {
        linters = ["biome"];
      } else {
        const lintersResult = await multiselect({
          message: "Which linters do you want to use?",
          options: [
            {
              label: "Biome",
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
          required: false,
        });

        if (isCancel(lintersResult)) {
          cancel("Operation cancelled.");
          return;
        }

        linters =
          lintersResult.length > 0
            ? (lintersResult as Linter[])
            : (["biome"] as Linter[]);
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
      droid: "Droid",
      antigravity: "Antigravity",
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
          return;
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

    // Only remove Prettier if not using ESLint (ESLint needs Prettier for formatting)
    if (shouldRemovePrettier && !linters.includes("eslint")) {
      await removePrettier(pm, quiet);
    }
    // Only remove ESLint if not selected as a linter
    if (shouldRemoveEslint && !linters.includes("eslint")) {
      await removeEsLint(pm, quiet);
    }

    await installDependencies(pm, linters, !opts.skipInstall, quiet);

    await upsertTsConfig(quiet);

    // Create configs for selected linters
    if (linters.includes("biome")) {
      await upsertBiomeConfig(frameworks, quiet);
    }
    if (linters.includes("eslint")) {
      await upsertEslintConfig(frameworks, quiet);
      // ESLint is only a linter, so we need Prettier for formatting and Stylelint for CSS
      await upsertPrettierConfig(quiet);
      await upsertStylelintConfig(quiet);
    }
    if (linters.includes("oxlint")) {
      await upsertOxlintConfig(frameworks, quiet);
      // Oxlint is only a linter, so we need oxfmt for formatting
      await upsertOxfmtConfig(quiet);
    }

    if (editorConfig?.includes("vscode")) {
      await upsertVsCodeSettings(linters, quiet);
    }
    if (editorConfig?.includes("zed")) {
      await upsertZedSettings(quiet);
    }

    for (const ruleName of agents ?? []) {
      await upsertAgents(ruleName, agentsOptions[ruleName], pm, quiet);
    }

    for (const hookName of hooks ?? []) {
      await upsertHooks(hookName, hooksOptions[hookName], pm, quiet);
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
      log.success("Successfully initialized Ultracite configuration!");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!quiet) {
      log.error(`Failed to initialize Ultracite configuration: ${message}`);
    }
    throw error;
  }
};
