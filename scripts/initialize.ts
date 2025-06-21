import { execSync } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { intro, log, multiselect, select, spinner } from '@clack/prompts';
import deepmerge from 'deepmerge';
import { rulesFile } from '../docs/lib/rules';
import { title } from './title';
import { vscodeSettings } from './vscode-settings';

const biomeConfig = {
  $schema: 'https://www.ultracite.ai/v/2.0.0',
  extends: ['ultracite'],
};

let tsConfig = {
  compilerOptions: {
    strictNullChecks: true,
  },
};

const exists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};
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

  const tsConfigExists = await exists('tsconfig.json');

  if (tsConfigExists) {
    s.message('tsconfig.json found, updating...');

    const existingTsConfig = JSON.parse(
      await readFile('tsconfig.json', { encoding: 'utf-8' })
    );

    tsConfig = {
      ...existingTsConfig,
      compilerOptions: {
        ...existingTsConfig.compilerOptions,
        ...tsConfig.compilerOptions,
      },
    };

    execSync(`echo '${JSON.stringify(tsConfig, null, 2)}' > tsconfig.json`);

    s.stop('tsconfig.json updated.');

    return;
  }

  s.message('tsconfig.json not found, creating...');

  execSync(`echo '${JSON.stringify(tsConfig, null, 2)}' > tsconfig.json`);

  s.stop('tsconfig.json created.');
};

const upsertVSCodeSettings = async () => {
  const s = spinner();

  s.start('Checking for .vscode/settings.json...');

  const vsCodeSettingsExists = await exists('.vscode/settings.json');

  if (vsCodeSettingsExists) {
    s.message('settings.json found, updating...');

    const existingVsCodeSettings = JSON.parse(
      await readFile('.vscode/settings.json', 'utf-8')
    );

    const newVsCodeSettings = deepmerge(existingVsCodeSettings, vscodeSettings);

    execSync(
      `echo '${JSON.stringify(newVsCodeSettings, null, 2)}' > .vscode/settings.json`
    );

    s.stop('settings.json updated.');

    return;
  }

  s.message('settings.json not found, creating...');

  execSync(
    `echo '${JSON.stringify(vscodeSettings, null, 2)}' > .vscode/settings.json`
  );

  s.stop('settings.json created.');
};

const upsertBiomeConfig = async () => {
  const s = spinner();

  s.start('Checking for biome.jsonc...');

  const biomeConfigExists = await exists('biome.jsonc');

  if (biomeConfigExists) {
    s.message('biome.jsonc found, updating...');

    // TODO: update biome.jsonc

    s.stop('biome.jsonc updated.');

    return;
  }

  s.message('biome.jsonc not found, creating...');

  execSync(`echo '${JSON.stringify(biomeConfig, null, 2)}' > biome.jsonc`);

  s.stop('biome.jsonc created.');
};

const initializePrecommitHook = async (packageManagerAdd: string) => {
  const s = spinner();
  const huskyCommand = 'npx ultracite format';

  s.start('Initializing pre-commit hooks...');

  s.message('Installing Husky...');
  execSync(`${packageManagerAdd} -D husky`);

  const preCommitHookExists = await exists('.husky/pre-commit');

  if (!preCommitHookExists) {
    s.message('Pre-commit hook not found, creating...');

    execSync('touch .husky/pre-commit');
  }

  s.message('Updating pre-commit hook...');

  execSync(`echo '\n${huskyCommand}' >> .husky/pre-commit`);

  s.stop('Pre-commit hooks initialized.');
};

const initializeLintStaged = async (packageManagerAdd: string) => {
  const s = spinner();

  s.start('Initializing lint-staged...');

  s.message('Installing lint-staged...');
  execSync(`${packageManagerAdd} -D lint-staged`);

  const lintStagedConfig = {
    '*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}': ['npx ultracite format'],
  };

  // Check for existing configuration files in order of preference
  const configFiles = [
    'package.json',
    '.lintstagedrc.json',
    '.lintstagedrc.js',
    '.lintstagedrc.cjs',
    '.lintstagedrc.mjs',
    'lint-staged.config.js',
    'lint-staged.config.cjs',
    'lint-staged.config.mjs',
    '.lintstagedrc.yaml',
    '.lintstagedrc.yml',
    '.lintstagedrc',
  ];

  let existingConfigFile: string | null = null;
  for (const file of configFiles) {
    // biome-ignore lint/nursery/noAwaitInLoop: "don't do what donny don't does"
    if (await exists(file)) {
      existingConfigFile = file;
      break;
    }
  }

  if (existingConfigFile === 'package.json') {
    s.message('package.json found, updating lint-staged configuration...');

    try {
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));

      if (packageJson['lint-staged']) {
        s.message('Existing lint-staged configuration found, merging...');
        packageJson['lint-staged'] = {
          ...packageJson['lint-staged'],
          ...lintStagedConfig,
        };
      } else {
        packageJson['lint-staged'] = lintStagedConfig;
      }

      await writeFile('package.json', JSON.stringify(packageJson, null, 2));
      s.message('lint-staged configuration added to package.json');
    } catch {
      s.message(
        'Failed to update package.json, creating .lintstagedrc.json...'
      );
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify(lintStagedConfig, null, 2)
      );
      s.message('lint-staged configuration created as .lintstagedrc.json');
    }
  } else if (existingConfigFile) {
    s.message(
      `Existing lint-staged configuration found at ${existingConfigFile}`
    );
    s.message('Skipping lint-staged configuration (already exists)');
  } else {
    s.message(
      'No existing configuration found, creating .lintstagedrc.json...'
    );
    await writeFile(
      '.lintstagedrc.json',
      JSON.stringify(lintStagedConfig, null, 2)
    );
    s.message('lint-staged configuration created as .lintstagedrc.json');
  }

  s.stop('lint-staged initialized.');
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
