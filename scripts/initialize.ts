import { execSync } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { intro, log, multiselect, select, spinner } from '@clack/prompts';
import { rules } from './rules';
import { title } from './title';

const biomeConfig = {
  $schema: 'https://biomejs.dev/schemas/2.0.0/schema.json',
  extends: ['ultracite'],
};

const vsCodeSettings = {
  'typescript.tsdk': 'node_modules/typescript/lib',
  'editor.defaultFormatter': 'biomejs.biome',
  'editor.formatOnSave': true,
  'editor.formatOnPaste': true,
  'emmet.showExpandedAbbreviation': 'never',
  'editor.codeActionsOnSave': {
    'source.fixAll.biome': 'explicit',
    'source.organizeImports.biome': 'explicit',
  },
  '[typescript]': {
    'editor.defaultFormatter': 'biomejs.biome',
  },
  '[json]': {
    'editor.defaultFormatter': 'biomejs.biome',
  },
  '[javascript]': {
    'editor.defaultFormatter': 'biomejs.biome',
  },
  '[jsonc]': {
    'editor.defaultFormatter': 'biomejs.biome',
  },
  '[typescriptreact]': {
    'editor.defaultFormatter': 'biomejs.biome',
  },
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
      execSync('cat tsconfig.json', { encoding: 'utf-8' })
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

    // TODO: update settings.json

    s.stop('settings.json updated.');

    return;
  }

  s.message('settings.json not found, creating...');

  execSync(
    `echo '${JSON.stringify(vsCodeSettings, null, 2)}' > .vscode/settings.json`
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

const initializeCursorRules = () => {
  const s = spinner();

  s.start('Initializing Cursor rules...');

  execSync(`echo '${rules}' > .cursor/rules/ultracite.mdc`);

  s.stop('Cursor rules initialized.');
};

const initializeWindsurfRules = () => {
  const s = spinner();

  s.start('Initializing Windsurf rules...');

  execSync(`echo '${rules}' > .windsurf/rules/ultracite.md`);

  s.stop('Windsurf rules initialized.');
};

export const initialize = async () => {
  intro(title);

  try {
    const packageManager = await select({
      message: 'Which package manager do you use?',
      initialValue: 'pnpm',
      options: [
        { value: 'npm install', label: 'npm' },
        { value: 'yarn add', label: 'yarn' },
        { value: 'pnpm add', label: 'pnpm', hint: 'Recommended' },
        { value: 'bun add', label: 'bun' },
      ],
    });

    const editorRules = await multiselect({
      message: 'Which editor rules do you want to enable (optional)?',
      required: false,
      options: [
        { value: 'cursor', label: 'Cursor' },
        { value: 'windsurf', label: 'Windsurf' },
      ],
    });

    const extraFeatures = await multiselect({
      message: 'Would you like any of the following (optional)?',
      required: false,
      options: [
        { value: 'precommit-hooks', label: 'Pre-commit hook with Husky' },
        { value: 'lint-staged', label: 'Lint-staged' },
      ],
    });

    if (typeof packageManager !== 'string') {
      throw new Error('No package manager selected');
    }

    installDependencies(packageManager);
    await upsertTsConfig();
    await upsertVSCodeSettings();
    await upsertBiomeConfig();

    if (Array.isArray(editorRules)) {
      if (editorRules.includes('cursor')) {
        initializeCursorRules();
      }
      if (editorRules.includes('windsurf')) {
        initializeWindsurfRules();
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
