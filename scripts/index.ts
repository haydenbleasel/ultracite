#!/usr/bin/env node

import { Command } from 'commander';
import { format } from './format';
import { initialize } from './initialize';
import { lint } from './lint';

const program = new Command();

program
  .name('Ultracite')
  .description('Ship code faster and with more confidence.');

program
  .command('init')
  .description('Initialize Ultracite in the current directory')
  .action(initialize);

program
  .command('lint')
  .description('Run Biome linter without fixing files')
  .argument('[files...]', 'specific files to lint (optional)')
  .action(lint);

program
  .command('format')
  .description('Run Biome linter and fixes files')
  .argument('[files...]', 'specific files to format (optional)')
  .action(format);

program.parse();
