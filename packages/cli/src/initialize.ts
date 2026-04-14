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
import { addDevDependency, detectPackageManager } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";

import packageJson from "../package.json" with { type: "json" };
import { createAgents, getAgentFileTargets } from "./agents";
import type { AgentFileTarget } from "./agents";
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
import {
  getUltraciteSkillInstallCommand,
  maybeInstallUltraciteSkill,
} from "./skill";
import { tsconfig } from "./tsconfig";
import { isMonorepo, updatePackageJson } from "./utils";

const schemaVersion = packageJson.devDependencies["@biomejs/biome"];
const ultraciteVersion = packageJson.version;

type Linter = (typeof options.linters)[number];
type Frameworks = (typeof options.frameworks)[number];
type AgentSelection = (typeof options.agents)[number] | "universal";

interface InitializeFlags {
  agents?: AgentSelection[];
  editors?: (typeof options.editorConfigs)[number][];
  frameworks?: (typeof options.frameworks)[number][];
  hooks?: (typeof options.hooks)[number][];
  integrations?: (typeof options.integrations)[number][];
  installSkill?: boolean;
  linter?: Linter;
  pm?: PackageManagerName;
  quiet?: boolean;
  skipInstall?: boolean;
  "type-aware"?: boolean;
}

const supportedEslintVersion = "^9.0.0";
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
  stylelint: "latest",
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
  },
  qwik: {
    "eslint-plugin-qwik": packageJson.devDependencies["eslint-plugin-qwik"],
  },
  react: {
    "@tanstack/eslint-plugin-query":
      packageJson.devDependencies["@tanstack/eslint-plugin-query"],
    "eslint-plugin-jsx-a11y":
      packageJson.devDependencies["eslint-plugin-jsx-a11y"],
    "eslint-plugin-react": packageJson.devDependencies["eslint-plugin-react"],
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
  }

  return devDependencies;
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
        corepack: false,
        packageManager,
        silent: true,
        workspace: await isMonorepo(),
      });
    }
  } else {
    const devDependencies = buildNoInstallDevDependencies(
      linter,
      typeAware,
      frameworks
    );
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
    let { pm } = opts;
    let pmInfo: PackageManager;

    if (pm) {
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
      pm = detected.name;
      pmInfo = detected;
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
          cancel("Operation cancelled.");
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
            { label: "Jest", value: "jest" },
            { label: "Vitest / Bun", value: "vitest" },
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
          cancel("Operation cancelled.");
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
          cancel("Operation cancelled.");
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
      pmInfo,
      linter,
      !opts.skipInstall,
      quiet,
      opts["type-aware"],
      frameworks
    );

    await upsertTsConfig(quiet);

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

    for (const editorId of editorConfig ?? []) {
      await upsertEditorConfig(editorId, linter, quiet);
    }

    for (const target of selectedAgentFiles) {
      await upsertAgentFile(target, pm, linter, quiet);
    }

    for (const ruleName of agents ?? []) {
      await upsertAgents(ruleName, agentsOptions[ruleName], pm, linter, quiet);
    }

    for (const hookName of hooks ?? []) {
      await upsertHooks(hookName, pm, linter, quiet);
    }

    if (integrations?.includes("husky")) {
      const useLintStaged = integrations?.includes("lint-staged") ?? false;
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
    if (integrations?.includes("lint-staged")) {
      await initializeLintStaged(pmInfo, !opts.skipInstall, quiet);
    }
    if (integrations?.includes("pre-commit")) {
      await initializePreCommit(pm, quiet);
    }

    if (!quiet) {
      log.success("Successfully initialized Ultracite!");
    }

    const didInstallSkill = await maybeInstallUltraciteSkill({
      packageManager: pm,
      quiet,
      shouldInstall: opts.installSkill,
    });

    if (!quiet && !didInstallSkill) {
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
