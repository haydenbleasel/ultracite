import { execSync } from 'node:child_process';
import process from 'node:process';

const biomeConfig = {
  $schema: 'https://biomejs.dev/schemas/1.9.4/schema.json',
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

export const initialize = () => {
  try {
    // Create or merge tsconfig.json
    let tsConfig = {
      compilerOptions: {
        strictNullChecks: true,
      },
    };

    try {
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
    } catch (e) {
      // tsconfig.json doesn't exist, use default config
    }

    // Install dependencies
    execSync('pnpm add -D --save-exact ultracite @biomejs/biome@1.9.4');

    // Write the config files
    execSync('mkdir -p .vscode');
    execSync(`echo '${JSON.stringify(biomeConfig, null, 2)}' > biome.jsonc`);
    execSync(
      `echo '${JSON.stringify(
        vsCodeSettings,
        null,
        2
      )}' > .vscode/settings.json`
    );
    execSync(`echo '${JSON.stringify(tsConfig, null, 2)}' > tsconfig.json`);

    console.log('Successfully initialized Ultracite configuration!');
  } catch (error) {
    console.error('Failed to run Ultracite:', error.message);
    process.exit(1);
  }
};
