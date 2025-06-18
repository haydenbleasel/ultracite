#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { Command } from 'commander';

const program = new Command();

program
  .name('Ultracite')
  .description(
    'Strict, opinionated linting config for modern TypeScript apps.'
  );

program
  .command('init')
  .description('Initialize Ultracite in the current directory')
  .action(() => {
    try {
      // Create biome.json config
      const biomeConfig = {
        $schema: 'https://biomejs.dev/schemas/1.9.4/schema.json',
        extends: ['ultracite'],
      };

      // Create .vscode/settings.json
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
      execSync(`echo '${JSON.stringify(biomeConfig, null, 2)}' > biome.json`);
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
  });

program
  .command('lint')
  .description('Run Biome linter without fixing files')
  .argument('[files...]', 'specific files to lint (optional)')
  .action((files) => {
    try {
      const target = files.length > 0 ? files.join(' ') : './';
      execSync(`npx biome check ${target}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to run Ultracite:', error.message);
      process.exit(1);
    }
  });

program
  .command('format')
  .description('Run Biome linter and fixes files')
  .argument('[files...]', 'specific files to format (optional)')
  .action((files) => {
    try {
      const target = files.length > 0 ? files.join(' ') : './';
      execSync(`npx biome check --write ${target}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to run Ultracite:', error.message);
      process.exit(1);
    }
  });

program.parse();
