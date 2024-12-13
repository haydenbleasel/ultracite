#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { Command } from 'commander';
import packageJson from '../package.json' assert { type: 'json' };

const program = new Command();

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version);

program
  .command('lint')
  .description('Run Biome linter without fixing files')
  .action(() => {
    try {
      execSync('npx biome check ./', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to run Ultracite:', error.message);
      process.exit(1);
    }
  });

program
  .command('format')
  .description('Run Biome linter and fixes files')
  .action(() => {
    try {
      execSync('npx biome check --write ./', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to run Ultracite:', error.message);
      process.exit(1);
    }
  });

program.parse();
