import process from 'node:process';
import { intro, log, multiselect, spinner } from '@clack/prompts';
import {
  addDevDependency,
  detectPackageManager,
  type PackageManagerName,
} from 'nypm';
import packageJson from '../package.json' with { type: 'json' };
import { biome } from './biome';
import type { options } from './consts/options';
import { vscode } from './editor-config/vscode';
import { zed } from './editor-config/zed';
import { createEditorRules } from './editor-rules';
import { husky } from './integrations/husky';
import { lefthook } from './integrations/lefthook';
import { lintStaged } from './integrations/lint-staged';
import { eslintCleanup } from './migrations/eslint';
import { prettierCleanup } from './migrations/prettier';
import { tsconfig } from './tsconfig';
import { isMonorepo, title, updatePackageJson } from './utils';

const schemaVersion = packageJson.devDependencies['@biomejs/biome'];
const ultraciteVersion = packageJson.version;

type InitializeFlags = {
  pm?: PackageManagerName;
  editors?: (typeof options.editorConfigs)[number][];
  rules?: (typeof options.editorRules)[number][];
  integrations?: (typeof options.integrations)[number][];
  removePrettier?: boolean;
  removeEslint?: boolean;
  skipInstall?: boolean;
};

const installDependencies = async (
  packageManager: PackageManagerName,
  install = true
) => {
  const s = spinner();
  s.start('Installing dependencies...');
  const packages = [
    `ultracite@${ultraciteVersion}`,
    `@biomejs/biome@${schemaVersion}`,
  ];

  if (install) {
    for (const pkg of packages) {
      await addDevDependency(pkg, {
        packageManager,
        workspace: await isMonorepo(),
      });
    }
  } else {
    await updatePackageJson({
      devDependencies: {
        '@biomejs/biome': schemaVersion,
        ultracite: ultraciteVersion,
      },
    });
  }

  s.stop('Dependencies installed.');
};

const upsertTsConfig = async () => {
  const s = spinner();
  s.start('Checking for tsconfig.json...');

  if (await tsconfig.exists()) {
    s.message('tsconfig.json found, updating...');
    await tsconfig.update();
    s.stop('tsconfig.json updated.');
    return;
  }

  s.message('tsconfig.json not found, creating...');
  await tsconfig.create();
  s.stop('tsconfig.json created.');
};

const upsertVSCodeSettings = async () => {
  const s = spinner();
  s.start('Checking for .vscode/settings.json...');

  if (await vscode.exists()) {
    s.message('settings.json found, updating...');
    await vscode.update();
    s.stop('settings.json updated.');
    return;
  }

  s.message('settings.json not found, creating...');
  await vscode.create();
  s.stop('settings.json created.');
};

const upsertZedSettings = async () => {
  const s = spinner();
  s.start('Checking for .zed/settings.json...');

  if (await zed.exists()) {
    s.message('settings.json found, updating...');
    await zed.update();
    s.stop('settings.json updated.');
    return;
  }

  s.message('settings.json not found, creating...');
  await zed.create();
  s.stop('settings.json created.');
};

const upsertBiomeConfig = async () => {
  const s = spinner();
  s.start('Checking for Biome configuration...');

  if (await biome.exists()) {
    s.message('Biome configuration found, updating...');
    await biome.update();
    s.stop('Biome configuration updated.');
    return;
  }

  s.message('Biome configuration not found, creating...');
  await biome.create();
  s.stop('Biome configuration created.');
};

const initializePrecommitHook = async (
  packageManager: PackageManagerName,
  install = true
) => {
  const s = spinner();
  s.start('Initializing pre-commit hooks...');

  s.message('Installing Husky...');

  if (install) {
    await husky.install(packageManager);
  } else {
    await updatePackageJson({
      devDependencies: { husky: 'latest' },
    });
  }

  if (await husky.exists()) {
    s.message('Pre-commit hook found, updating...');
    await husky.update(packageManager);
    s.stop('Pre-commit hook updated.');
    return;
  }

  s.message('Pre-commit hook not found, creating...');
  await husky.create(packageManager);
  s.stop('Pre-commit hook created.');
};

const initializeLefthook = async (
  packageManager: PackageManagerName,
  install = true
) => {
  const s = spinner();
  s.start('Initializing lefthook...');

  s.message('Installing lefthook...');

  if (install) {
    await lefthook.install(packageManager);
  } else {
    await updatePackageJson({
      devDependencies: { lefthook: 'latest' },
    });
  }

  if (await lefthook.exists()) {
    s.message('lefthook.yml found, updating...');
    await lefthook.update(packageManager);
    s.stop('lefthook.yml updated.');
    return;
  }

  s.message('lefthook.yml not found, creating...');
  await lefthook.create(packageManager);
  s.stop('lefthook.yml created.');
};

const initializeLintStaged = async (
  packageManager: PackageManagerName,
  install = true
) => {
  const s = spinner();
  s.start('Initializing lint-staged...');

  s.message('Installing lint-staged...');

  if (install) {
    await lintStaged.install(packageManager);
  } else {
    await updatePackageJson({
      devDependencies: { 'lint-staged': 'latest' },
    });
  }

  if (await lintStaged.exists()) {
    s.message('lint-staged found, updating...');
    await lintStaged.update(packageManager);
    s.stop('lint-staged updated.');
    return;
  }

  s.message('lint-staged not found, creating...');
  await lintStaged.create(packageManager);
  s.stop('lint-staged created.');
};

const upsertEditorRules = async (name: string, displayName: string) => {
  const s = spinner();
  s.start(`Checking for ${displayName}...`);

  const rules = createEditorRules(name as any);

  if (await rules.exists()) {
    s.message(`${displayName} found, updating...`);
    await rules.update();
    s.stop(`${displayName} updated.`);
    return;
  }

  s.message(`${displayName} not found, creating...`);
  await rules.create();
  s.stop(`${displayName} created.`);
};

const removePrettier = async (pm: PackageManagerName) => {
  const s = spinner();
  s.start('Removing Prettier dependencies and configuration...');

  try {
    const result = await prettierCleanup.remove(pm);

    if (result.packagesRemoved.length > 0) {
      s.message(
        `Removed Prettier packages: ${result.packagesRemoved.join(', ')}`
      );
    }

    if (result.filesRemoved.length > 0) {
      s.message(`Removed config files: ${result.filesRemoved.join(', ')}`);
    }

    if (result.vsCodeCleaned) {
      s.message('Cleaned VS Code settings');
    }

    s.stop('Prettier removed successfully.');
  } catch (_error) {
    s.stop('Failed to remove Prettier completely, but continuing...');
  }
};

const removeESLint = async (pm: PackageManagerName) => {
  const s = spinner();
  s.start('Removing ESLint dependencies and configuration...');

  try {
    const result = await eslintCleanup.remove(pm);

    if (result.packagesRemoved.length > 0) {
      s.message(
        `Removed ESLint packages: ${result.packagesRemoved.join(', ')}`
      );
    }

    if (result.filesRemoved.length > 0) {
      s.message(`Removed config files: ${result.filesRemoved.join(', ')}`);
    }

    if (result.vsCodeCleaned) {
      s.message('Cleaned VS Code settings');
    }

    s.stop('ESLint removed successfully.');
  } catch (_error) {
    s.stop('Failed to remove ESLint completely, but continuing...');
  }
};

export const initialize = async (flags?: InitializeFlags) => {
  intro(title);

  try {
    const opts = flags ?? {};
    let { pm } = opts;

    if (!pm) {
      const detected = await detectPackageManager(process.cwd());

      if (!detected) {
        throw new Error('No package manager specified or detected');
      }

      if (detected.warnings) {
        for (const warning of detected.warnings) {
          log.warn(warning);
        }
      }

      log.info(`Detected lockfile, using ${detected.name}`);
      pm = detected.name;
    }

    let shouldRemovePrettier = opts.removePrettier;
    let shouldRemoveEslint = opts.removeEslint;

    if (
      shouldRemovePrettier === undefined ||
      shouldRemoveEslint === undefined
    ) {
      const migrationOptions: Array<{ label: string; value: string }> = [];

      if (
        shouldRemovePrettier === undefined &&
        (await prettierCleanup.hasPrettier())
      ) {
        migrationOptions.push({
          label:
            'Remove Prettier (dependencies, config files, VS Code settings)',
          value: 'prettier',
        });
      }

      if (
        shouldRemoveEslint === undefined &&
        (await eslintCleanup.hasESLint())
      ) {
        migrationOptions.push({
          label: 'Remove ESLint (dependencies, config files, VS Code settings)',
          value: 'eslint',
        });
      }

      if (migrationOptions.length > 0) {
        const migrationChoices = (await multiselect({
          message:
            'Remove existing formatters/linters (recommended for clean migration)?',
          options: migrationOptions,
          required: false,
        })) as string[];

        if (shouldRemovePrettier === undefined) {
          shouldRemovePrettier = migrationChoices.includes('prettier');
        }
        if (shouldRemoveEslint === undefined) {
          shouldRemoveEslint = migrationChoices.includes('eslint');
        }
      }
    }

    let editorConfig = opts.editors;
    if (!editorConfig) {
      editorConfig = (await multiselect({
        message: 'Which editors do you want to configure (recommended)?',
        options: [
          { label: 'VSCode / Cursor / Windsurf', value: 'vscode' },
          { label: 'Zed', value: 'zed' },
        ],
        required: false,
      })) as ('vscode' | 'zed')[];
    }

    let editorRules = opts.rules;
    if (!editorRules) {
      editorRules = (await multiselect({
        message: 'Which editor rules do you want to enable (optional)?',
        options: [
          { label: 'GitHub Copilot (VSCode)', value: 'vscode-copilot' },
          { label: 'Cursor', value: 'cursor' },
          { label: 'Windsurf', value: 'windsurf' },
          { label: 'Zed', value: 'zed' },
          { label: 'Claude Code', value: 'claude' },
          { label: 'OpenAI Codex', value: 'codex' },
          { label: 'Kiro IDE', value: 'kiro' },
        ],
        required: false,
      })) as InitializeFlags['rules'];
    }

    let integrations = opts.integrations;
    if (integrations === undefined) {
      // If other CLI options are provided, default to empty array to avoid prompting
      // This allows programmatic usage without interactive prompts
      const hasOtherCliOptions =
        opts.pm ||
        opts.editors ||
        opts.rules ||
        opts.removePrettier !== undefined ||
        opts.removeEslint !== undefined;

      if (hasOtherCliOptions) {
        integrations = [];
      } else {
        integrations = (await multiselect({
          message: 'Would you like any of the following (optional)?',
          options: [
            { label: 'Husky pre-commit hook', value: 'husky' },
            { label: 'Lefthook pre-commit hook', value: 'lefthook' },
            { label: 'Lint-staged', value: 'lint-staged' },
          ],
          required: false,
        })) as ('husky' | 'lefthook' | 'lint-staged')[];
      }
    }

    if (shouldRemovePrettier) {
      await removePrettier(pm);
    }
    if (shouldRemoveEslint) {
      await removeESLint(pm);
    }

    await installDependencies(pm, !opts.skipInstall);

    await upsertTsConfig();
    await upsertBiomeConfig();

    if (editorConfig?.includes('vscode')) {
      await upsertVSCodeSettings();
    }
    if (editorConfig?.includes('zed')) {
      await upsertZedSettings();
    }

    const ruleNameMap: Record<(typeof options.editorRules)[number], string> = {
      'vscode-copilot': 'GitHub Copilot rules',
      cursor: 'Cursor rules',
      windsurf: 'Windsurf rules',
      zed: 'Zed rules',
      claude: 'Claude Code rules',
      codex: 'OpenAI Codex rules',
      kiro: 'Kiro IDE steering files',
    };

    for (const ruleName of editorRules ?? []) {
      await upsertEditorRules(
        ruleName,
        ruleNameMap[ruleName as keyof typeof ruleNameMap]
      );
    }

    if (integrations?.includes('husky')) {
      await initializePrecommitHook(pm, !opts.skipInstall);
    }
    if (integrations?.includes('lefthook')) {
      await initializeLefthook(pm, !opts.skipInstall);
    }
    if (integrations?.includes('lint-staged')) {
      await initializeLintStaged(pm, !opts.skipInstall);
    }

    log.success('Successfully initialized Ultracite configuration!');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Failed to initialize Ultracite configuration: ${message}`);
    process.exit(1);
  }
};
