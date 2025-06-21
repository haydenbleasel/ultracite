import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { intro, log, multiselect, select, spinner } from '@clack/prompts';
import { rulesFile } from '../docs/lib/rules';
import { biome } from './biome';
import { husky } from './husky';
import { lintStaged } from './lint-staged';
import { title } from './title';
import { tsconfig } from './tsconfig';
import { exists } from './utils';
import { vscode } from './vscode-settings';

const installDependencies = (packageManagerAdd: string) => {
  const s = spinner();

  s.start('Installing dependencies...');
  execSync(
    `${packageManagerAdd} -D --save-exact ultracite @biomejs/biome@2.0.0`
  );
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

const upsertBiomeConfig = async () => {
  const s = spinner();
  s.start('Checking for biome.jsonc...');

  if (await biome.exists()) {
    s.message('biome.jsonc found, updating...');
    await biome.update();
    s.stop('biome.jsonc updated.');
    return;
  }

  s.message('biome.jsonc not found, creating...');
  await biome.create();
  s.stop('biome.jsonc created.');
};

const initializePrecommitHook = async (packageManagerAdd: string) => {
  const s = spinner();
  s.start('Initializing pre-commit hooks...');

  s.message('Installing Husky...');
  husky.install(packageManagerAdd);

  if (await husky.exists()) {
    s.message('Pre-commit hook found, updating...');
    await husky.update();
    s.stop('Pre-commit hook updated.');
    return;
  }

  s.message('Updating pre-commit hook...');

  s.message('Pre-commit hook not found, creating...');
  await husky.create();
  s.stop('Pre-commit hook created.');
};

const initializeLintStaged = async (packageManagerAdd: string) => {
  const s = spinner();

  s.start('Initializing lint-staged...');

  s.message('Installing lint-staged...');
  lintStaged.install(packageManagerAdd);

  if (await lintStaged.exists()) {
    s.message('lint-staged found, updating...');
    await lintStaged.update();
    s.stop('lint-staged updated.');
    return;
  }

  s.message('lint-staged not found, creating...');
  await lintStaged.create();
  s.stop('lint-staged created.');
};

const initializeVSCodeCopilotRules = () => {
  const s = spinner();

  s.start('Initializing VSCode Copilot rules...');

  execSync(`echo '${rulesFile}' > .github/copilot-instructions.md`);
};

const initializeCursorRules = () => {
  const s = spinner();

  s.start('Initializing Cursor rules...');

  execSync(`echo '${rulesFile}' > .cursor/rules/ultracite.mdc`);

  s.stop('Cursor rules initialized.');
};

const initializeWindsurfRules = () => {
  const s = spinner();

  s.start('Initializing Windsurf rules...');

  execSync(`echo '${rulesFile}' > .windsurf/rules/ultracite.md`);

  s.stop('Windsurf rules initialized.');
};

const initializeZedRules = async () => {
  const s = spinner();

  s.start('Initializing Zed rules...');

  const zedConfigExists = await exists('.rules');

  if (!zedConfigExists) {
    s.message('rules not found, creating...');

    execSync('touch .rules');
  }

  s.message('Updating rules...');

  execSync(`echo '\n\n${rulesFile}' >> .rules `);

  s.stop('Zed rules initialized.');
};

const determinePackageManager = async () => {
  const options = [
    {
      hint: 'Recommended',
      label: 'pnpm',
      value: 'pnpm add',
      lockfile: 'pnpm-lock.yaml',
    },
    { label: 'bun', value: 'bun add', lockfile: 'bun.lockb' },
    { label: 'yarn', value: 'yarn add', lockfile: 'yarn.lock' },
    { label: 'npm', value: 'npm install', lockfile: 'package-lock.json' },
  ];

  for (const option of options) {
    // biome-ignore lint/nursery/noAwaitInLoop: "don't do what donny don't does"
    if (await exists(option.lockfile)) {
      log.info(`Detected ${option.label} lockfile, using ${option.value}`);

      return option.value;
    }
  }

  const packageManager = await select({
    initialValue: 'pnpm',
    message: 'Which package manager do you use?',
    options: options.map((option) => ({
      label: option.label,
      value: option.value,
    })),
  });

  if (typeof packageManager !== 'string') {
    throw new Error('No package manager selected');
  }

  return packageManager;
};

export const initialize = async () => {
  intro(title);

  try {
    const packageManager = await determinePackageManager();

    const editorRules = await multiselect({
      message: 'Which editor rules do you want to enable (optional)?',
      options: [
        { label: 'GitHub Copilot (VSCode)', value: 'vscode-copilot' },
        { label: 'Cursor', value: 'cursor' },
        { label: 'Windsurf', value: 'windsurf' },
        { label: 'Zed', value: 'zed' },
      ],
      required: false,
    });

    const extraFeatures = await multiselect({
      message: 'Would you like any of the following (optional)?',
      options: [
        { label: 'Pre-commit hook with Husky', value: 'precommit-hooks' },
        { label: 'Lint-staged', value: 'lint-staged' },
      ],
      required: false,
    });

    installDependencies(packageManager);
    await upsertTsConfig();
    await upsertVSCodeSettings();
    await upsertBiomeConfig();

    if (Array.isArray(editorRules)) {
      if (editorRules.includes('vscode-copilot')) {
        initializeVSCodeCopilotRules();
      }
      if (editorRules.includes('cursor')) {
        initializeCursorRules();
      }
      if (editorRules.includes('windsurf')) {
        initializeWindsurfRules();
      }
      if (editorRules.includes('zed')) {
        await initializeZedRules();
      }
    }

    if (Array.isArray(extraFeatures)) {
      if (extraFeatures.includes('precommit-hooks')) {
        await initializePrecommitHook(packageManager);
      }
      if (extraFeatures.includes('lint-staged')) {
        await initializeLintStaged(packageManager);
      }
    }

    log.success('Successfully initialized Ultracite configuration!');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    log.error(`Failed to initialize Ultracite configuration: ${message}`);
    process.exit(1);
  }
};
