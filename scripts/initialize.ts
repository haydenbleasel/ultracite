import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';
import { intro, log, multiselect, select, spinner } from '@clack/prompts';
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

const installDependencies = (packageManagerAdd: string) => {
  const s = spinner();

  s.start('Installing dependencies...');
  execSync(
    `${packageManagerAdd} -D --save-exact ultracite @biomejs/biome@2.0.0`
  );
  s.stop('Dependencies installed.');
};

const upsertTsConfig = () => {
  const s = spinner();

  s.start('Checking for tsconfig.json...');

  const tsConfigExists = existsSync('tsconfig.json');

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

const upsertVSCodeSettings = () => {
  const s = spinner();

  s.start('Checking for .vscode/settings.json...');

  const vsCodeSettingsExists = existsSync('.vscode/settings.json');

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

const upsertBiomeConfig = () => {
  const s = spinner();

  s.start('Checking for biome.jsonc...');

  const biomeConfigExists = existsSync('biome.jsonc');

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

const initializePrecommitHook = (packageManagerAdd: string) => {
  const s = spinner();
  const huskyCommand = 'npx ultracite format';

  s.start('Initializing pre-commit hooks...');

  s.message('Installing Husky...');
  execSync(`${packageManagerAdd} -D husky`);

  const preCommitHookExists = existsSync('.husky/pre-commit');

  if (!preCommitHookExists) {
    s.message('Pre-commit hook not found, creating...');

    execSync('touch .husky/pre-commit');
  }

  s.message('Updating pre-commit hook...');

  execSync(`echo '\n${huskyCommand}' >> .husky/pre-commit`);

  s.stop('Pre-commit hooks initialized.');
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
    upsertTsConfig();
    upsertVSCodeSettings();
    upsertBiomeConfig();

    if (Array.isArray(extraFeatures)) {
      if (extraFeatures.includes('precommit-hooks')) {
        initializePrecommitHook(packageManager);
      }
      if (extraFeatures.includes('lint-staged')) {
        initializeLintStaged();
      }
    }

    log.success('Successfully initialized Ultracite configuration!');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    log.error(`Failed to initialize Ultracite configuration: ${message}`);
    process.exit(1);
  }
};
