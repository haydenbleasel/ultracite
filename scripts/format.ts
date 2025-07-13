import { execSync } from 'node:child_process';
import process from 'node:process';
import { escapeShellPath } from './utils';

type FormatOptions = {
  unsafe?: boolean;
};

export const format = (files: string[], options: FormatOptions = {}) => {
  try {
    const target =
      files.length > 0
        ? files.map((file) => `"${escapeShellPath(file)}"`).join(' ')
        : './';
    const unsafeFlag = options.unsafe ? ' --unsafe' : '';
    execSync(`npx @biomejs/biome check --write${unsafeFlag} ${target}`, {
      stdio: 'inherit',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // biome-ignore lint/suspicious/noConsole: "We want to log the error to the console"
    console.error('Failed to run Ultracite:', message);
    process.exit(1);
  }
};
