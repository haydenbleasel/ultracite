import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { parseFilePaths } from '../utils';

export const lint = (files: string[]) => {
  const args = ['@biomejs/biome', 'check'];

  // Add files or default to current directory
  if (files.length > 0) {
    args.push(...parseFilePaths(files));
  } else {
    args.push('./');
  }

  const fullCommand = args.join(' ');

  const result = spawnSync(fullCommand, {
    stdio: 'inherit',
    shell: true,
  });

  if (result.error) {
    // biome-ignore lint/suspicious/noConsole: "We want to log the error to the console"
    console.error('Failed to run Ultracite:', result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};
